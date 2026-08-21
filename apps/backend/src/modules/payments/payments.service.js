/** Servicio de pagos con Stripe. DUENO: Kassie (modulo B). */
const crypto = require('node:crypto');
const env = require('../../config/env');
const stripe = env.STRIPE_SECRET_KEY ? require('stripe')(env.STRIPE_SECRET_KEY) : null;
const db = require('../../core/db');
const ApiError = require('../../core/ApiError');
const logger = require('../../core/logger');
const { enviarComprobante } = require('./payments.email');
const { itemSubtotalCents, DEFAULT_CONTINGENCY_RATE } = require('../budget/budget.engine');

const FRONTEND_URL = env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Manda el comprobante por correo. Nunca se espera (fire-and-forget) desde
 * quien la llama: el webhook de Stripe y las rutas de confirmacion necesitan
 * responder rapido, y un correo lento (o que falle) no debe demorar ni
 * tumbar esa respuesta -- el pago ya sucedio de todas formas.
 */
async function notificarComprobante(orderId, userId) {
  try {
    const [user, order] = await Promise.all([
      db.queryOne('SELECT email FROM users WHERE id = ?', [userId]),
      db.queryOne('SELECT * FROM orders WHERE id = ?', [orderId]),
    ]);
    if (!user?.email || !order) return;

    // ti.type/ti.meta (no viven en order_items) son lo que arma el
    // itinerario por dia: dayIndex solo lo traen las experiencias, que son
    // las unicas con fecha de reservacion propia (ver payments.email.js).
    const [items, trip] = await Promise.all([
      db.query(
        `SELECT oi.title, oi.unit_price_cents, oi.subtotal_cents, oi.quantity, ti.type, ti.pricing_mode, ti.meta
           FROM order_items oi
           JOIN trip_items ti ON ti.id = oi.trip_item_id
          WHERE oi.order_id = ?`,
        [orderId],
      ),
      db.queryOne('SELECT start_date, end_date FROM trips WHERE id = ?', [order.trip_id]),
    ]);

    await enviarComprobante(user.email, order, items, trip);
  } catch (err) {
    logger.warn('No se pudo enviar el comprobante de pago', { orderId, message: err.message });
  }
}

function assertStripeConfigured() {
  if (!stripe) {
    throw ApiError.badRequest('Pagos no configurados: falta STRIPE_SECRET_KEY en apps/backend/.env');
  }
}

/**
 * Subtotal de UN renglon (fila cruda de trip_items, snake_case), usando la
 * MISMA formula de escalado que budget.engine.js -- antes este archivo tenia
 * su propia copia que solo escalaba per_group (unit * qty) sin importar el
 * pricingMode. El total de la orden salia bien (el switch de aqui abajo si
 * escalaba), pero cada order_items.subtotal_cents individual no, asi que en
 * el comprobante (payments.email.js) la suma de renglones no cuadraba con el
 * total -- y en Stripe Checkout, cuyo line_items usa este mismo subtotal por
 * renglon, se le cobraba de menos a la tarjeta en cualquier concepto que no
 * fuera per_group.
 */
function subtotalDeRenglon(item, tripStats) {
  return itemSubtotalCents({
    unitPriceCents: Number(item.unit_price_cents || 0),
    pricingMode: item.pricing_mode,
    quantity: item.quantity,
  }, tripStats);
}

/**
 * Aplica subtotalDeRenglon a cada trip_item y calcula subtotal + fondo de
 * imprevistos + total, todo en centavos. Una sola fuente de verdad: lo mismo
 * que se guarda en order_items, se cobra en Stripe y se guarda como
 * orders.total_cents sale de aqui, asi no se pueden desincronizar.
 */
function computeOrderTotals(items, tripStats) {
  const withSubtotal = items.map((item) => ({ ...item, subtotalCents: subtotalDeRenglon(item, tripStats) }));
  const subtotalCents = withSubtotal.reduce((sum, item) => sum + item.subtotalCents, 0);
  const contingencyCents = Math.round(subtotalCents * DEFAULT_CONTINGENCY_RATE);
  return { items: withSubtotal, subtotalCents, contingencyCents, totalCents: subtotalCents + contingencyCents };
}

function nightsBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

/**
 * Crea una orden y una sesion de Stripe Checkout.
 */
async function createCheckoutSession(userId, tripId, currency) {
  assertStripeConfigured();

  const trip = await db.queryOne(
    'SELECT * FROM trips WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [tripId, userId],
  );
  if (!trip) throw ApiError.notFound('Viaje no encontrado');

  const items = await db.query(
    'SELECT * FROM trip_items WHERE trip_id = ?',
    [tripId],
  );
  if (!items.length) throw ApiError.badRequest('El viaje no tiene conceptos para pagar');

  const travelers = Number(trip.travelers || 1);
  const nights = nightsBetween(trip.start_date, trip.end_date);
  const rooms = Math.ceil(travelers / 2);
  const { items: itemsConSubtotal, contingencyCents, totalCents } = computeOrderTotals(items, { travelers, nights, rooms });

  const orderId = crypto.randomUUID();
  await db.query(
    `INSERT INTO orders (id, user_id, trip_id, total_cents, currency, item_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [orderId, userId, tripId, totalCents, currency || trip.currency, items.length],
  );

  for (const item of itemsConSubtotal) {
    await db.query(
      `INSERT INTO order_items (id, order_id, trip_item_id, title, unit_price_cents, quantity, subtotal_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), orderId, item.id, item.title, Number(item.unit_price_cents || 0), Math.max(1, Number(item.quantity || 1)), item.subtotalCents],
    );
  }

  const stripeCurrency = (currency || trip.currency).toLowerCase();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    submit_type: 'pay',
    billing_address_collection: 'auto',
    customer_creation: 'if_required',
    phone_number_collection: { enabled: false },
    // unit_amount es el subtotal YA escalado por pricing_mode, no el precio
    // unitario crudo -- Stripe no sabe de viajeros/noches/habitaciones. Por
    // eso quantity siempre es 1 aqui: la cantidad del concepto (item.quantity)
    // ya quedo multiplicada dentro de ese subtotal, ponerla tambien en
    // quantity la cobraria dos veces. El fondo de imprevistos va como un
    // renglon aparte para que lo que Stripe cobra sume exactamente totalCents
    // (lo mismo que se guarda en orders.total_cents).
    line_items: [
      ...itemsConSubtotal.map((item) => ({
        price_data: {
          currency: stripeCurrency,
          product_data: { name: item.title },
          unit_amount: item.subtotalCents,
        },
        quantity: 1,
      })),
      ...(contingencyCents > 0 ? [{
        price_data: {
          currency: stripeCurrency,
          product_data: { name: 'Fondo de imprevistos (10%)' },
          unit_amount: contingencyCents,
        },
        quantity: 1,
      }] : []),
    ],
    metadata: { orderId, tripId, userId },
    success_url: `${FRONTEND_URL}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/viajes/${tripId}`,
  });

  await db.query(
    'UPDATE orders SET stripe_session_id = ? WHERE id = ?',
    [session.id, orderId],
  );

  logger.info('Sesion de checkout creada', { orderId, sessionId: session.id, totalCents });

  return {
    sessionId: session.id,
    sessionUrl: session.url,
    orderId,
    totalCents,
    currency: currency || trip.currency,
  };
}

/**
 * Maneja el webhook de Stripe. Verifica la firma y actualiza el estado de la orden.
 */
async function handleWebhook(rawBody, signature) {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    logger.warn('Stripe no configurado por completo, ignorando webhook');
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.warn('Webhook signature verification failed', { error: err.message });
    throw ApiError.badRequest('Webhook signature invalida');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    const userId = session.metadata?.userId;
    if (orderId) {
      const result = await db.query(
        `UPDATE orders SET status = 'paid', stripe_payment_intent = ?
         WHERE id = ? AND status = 'pending'`,
        [session.payment_intent, orderId],
      );
      logger.info('Orden pagada', { orderId, sessionId: session.id });
      if (result.affectedRows > 0 && userId) notificarComprobante(orderId, userId);
    }
  }

  // Simetrico al bloque de arriba, pero para el flujo de createPaymentIntent
  // (Stripe Elements embebido): esas ordenes nunca disparan
  // checkout.session.completed porque no pasan por Checkout, solo por
  // PaymentIntents directo. Sin este bloque, si el confirmOrder explicito del
  // frontend fallaba (pestaña cerrada, parpadeo de red), la orden se quedaba
  // en 'pending' para siempre aunque Stripe ya hubiera cobrado -- este es el
  // unico camino de recuperacion del lado servidor para ese flujo.
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;
    const userId = paymentIntent.metadata?.userId;
    if (orderId) {
      const result = await db.query(
        `UPDATE orders SET status = 'paid', stripe_payment_intent = ?
         WHERE id = ? AND status = 'pending'`,
        [paymentIntent.id, orderId],
      );
      logger.info('Orden pagada (PaymentIntent)', { orderId, paymentIntentId: paymentIntent.id });
      if (result.affectedRows > 0 && userId) notificarComprobante(orderId, userId);
    }
  }

  if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await db.query(
        `UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'`,
        [orderId],
      );
      logger.info('Orden fallida', { orderId });
    }
  }
}

/**
 * `orders.stripe_session_id` guarda dos cosas distintas segun de donde vino
 * el pago: un Checkout Session id (cs_..., de createCheckoutSession) o un
 * PaymentIntent id (pi_..., de createPaymentIntent). Son dos namespaces
 * distintos de la API de Stripe -- checkout.sessions.retrieve() no entiende
 * un id pi_... ni viceversa -- asi que hay que despachar segun el prefijo,
 * que Stripe garantiza. Sin esto, sincronizar una orden del flujo que no
 * "esperaba" el codigo fallaba en silencio (atrapado por el catch de quien
 * llama) y se quedaba pending para siempre.
 */
async function consultarPagoEnStripe(stripeRef) {
  if (stripeRef.startsWith('pi_')) {
    const pi = await stripe.paymentIntents.retrieve(stripeRef);
    return { paid: pi.status === 'succeeded', expired: false, paymentIntentId: pi.id };
  }
  const session = await stripe.checkout.sessions.retrieve(stripeRef);
  return { paid: session.payment_status === 'paid', expired: session.status === 'expired', paymentIntentId: session.payment_intent };
}

/** Sincroniza una orden pending con Stripe. Usado como red de seguridad cuando el webhook no llego o aun no llega. */
async function sincronizarOrdenConStripe(order, userId) {
  if (!(order.status === 'pending' && order.stripe_session_id && stripe)) return order;
  try {
    const { paid, expired, paymentIntentId } = await consultarPagoEnStripe(order.stripe_session_id);
    if (paid) {
      const result = await db.query(
        "UPDATE orders SET status = 'paid', stripe_payment_intent = ? WHERE id = ? AND status = 'pending'",
        [paymentIntentId, order.id],
      );
      order.status = 'paid';
      order.stripe_payment_intent = paymentIntentId;
      if (result.affectedRows > 0) notificarComprobante(order.id, userId);
    } else if (expired) {
      await db.query("UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'", [order.id]);
      order.status = 'failed';
    }
  } catch (err) {
    logger.warn('No se pudo sincronizar estado con Stripe', { orderId: order.id, error: err.message });
  }
  return order;
}

/**
 * Consulta el estado de una orden.
 * Sincroniza con Stripe si la orden sigue pending.
 */
async function getOrderStatus(orderId, userId) {
  const order = await db.queryOne(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId],
  );
  if (!order) throw ApiError.notFound('Orden no encontrada');
  return sincronizarOrdenConStripe(order, userId);
}

/**
 * Consulta el estado de una orden por session_id de Stripe.
 * Sincroniza con Stripe si la orden sigue pending (para cuando el webhook no llego).
 */
async function getOrderBySession(sessionId, userId) {
  const order = await db.queryOne(
    'SELECT * FROM orders WHERE stripe_session_id = ? AND user_id = ?',
    [sessionId, userId],
  );
  if (!order) throw ApiError.notFound('Orden no encontrada');
  return sincronizarOrdenConStripe(order, userId);
}

/**
 * Lista ordenes de un usuario, opcionalmente filtrado por trip_id.
 */
async function listOrders(userId, tripId) {
  if (tripId) {
    return db.query(
      'SELECT * FROM orders WHERE user_id = ? AND trip_id = ? ORDER BY created_at DESC',
      [userId, tripId],
    );
  }
  return db.query(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [userId],
  );
}

/**
 * Crea un PaymentIntent y una orden para pago embebido (Stripe Elements).
 * Devuelve clientSecret para que el frontend confirme el pago con CardElement.
 */
async function createPaymentIntent(userId, tripId, currency) {
  assertStripeConfigured();

  const trip = await db.queryOne(
    'SELECT * FROM trips WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [tripId, userId],
  );
  if (!trip) throw ApiError.notFound('Viaje no encontrado');

  const items = await db.query(
    'SELECT * FROM trip_items WHERE trip_id = ?',
    [tripId],
  );
  if (!items.length) throw ApiError.badRequest('El viaje no tiene conceptos para pagar');

  const travelers = Number(trip.travelers || 1);
  const nights = nightsBetween(trip.start_date, trip.end_date);
  const rooms = Math.ceil(travelers / 2);
  const { items: itemsConSubtotal, totalCents } = computeOrderTotals(items, { travelers, nights, rooms });
  if (totalCents <= 0) throw ApiError.badRequest('El total del viaje es $0');

  const orderId = crypto.randomUUID();
  await db.query(
    `INSERT INTO orders (id, user_id, trip_id, total_cents, currency, item_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [orderId, userId, tripId, totalCents, currency || trip.currency, items.length],
  );

  for (const item of itemsConSubtotal) {
    await db.query(
      `INSERT INTO order_items (id, order_id, trip_item_id, title, unit_price_cents, quantity, subtotal_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), orderId, item.id, item.title, Number(item.unit_price_cents || 0), Math.max(1, Number(item.quantity || 1)), item.subtotalCents],
    );
  }

  const stripeCurrency = (currency || trip.currency).toLowerCase();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: stripeCurrency,
    metadata: { orderId, tripId, userId },
  });

  await db.query(
    'UPDATE orders SET stripe_session_id = ? WHERE id = ?',
    [paymentIntent.id, orderId],
  );

  logger.info('PaymentIntent creado', { orderId, piId: paymentIntent.id, totalCents });

  return {
    clientSecret: paymentIntent.client_secret,
    orderId,
    totalCents,
    currency: currency || trip.currency,
  };
}

/**
 * Confirma una orden despues de que el frontend confirmo el pago con Stripe Elements.
 */
async function confirmOrder(orderId, userId) {
  const order = await db.queryOne(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId],
  );
  if (!order) throw ApiError.notFound('Orden no encontrada');
  return sincronizarOrdenConStripe(order, userId);
}

module.exports = { createCheckoutSession, createPaymentIntent, confirmOrder, handleWebhook, getOrderStatus, getOrderBySession, listOrders };
