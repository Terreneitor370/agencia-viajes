/** Servicio de pagos con Stripe. DUENO: Kassie (modulo B). */
const crypto = require('node:crypto');
const env = require('../../config/env');
const stripe = env.STRIPE_SECRET_KEY ? require('stripe')(env.STRIPE_SECRET_KEY) : null;
const db = require('../../core/db');
const ApiError = require('../../core/ApiError');
const logger = require('../../core/logger');
const { enviarComprobante } = require('./payments.email');

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
        `SELECT oi.title, oi.subtotal_cents, oi.quantity, ti.type, ti.meta
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
 * Calcula el total de un viaje a partir de sus trip_items (misma logica que budget.engine.js).
 */
function computeTotalCents(items, travelers, nights, rooms) {
  let total = 0;
  for (const item of items) {
    const unit = Number(item.unit_price_cents || 0);
    const qty = Math.max(1, Number(item.quantity || 1));
    switch (item.pricing_mode) {
      case 'per_person': total += unit * travelers * qty; break;
      case 'per_group': total += unit * qty; break;
      case 'per_night_per_room': total += unit * nights * rooms * qty; break;
      case 'per_person_per_day': total += unit * travelers * (nights + 1) * qty; break;
      default: total += unit * qty;
    }
  }
  const contingency = Math.round(total * 0.10);
  return total + contingency;
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
  const totalCents = computeTotalCents(items, travelers, nights, rooms);

  const orderId = crypto.randomUUID();
  await db.query(
    `INSERT INTO orders (id, user_id, trip_id, total_cents, currency, item_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [orderId, userId, tripId, totalCents, currency || trip.currency, items.length],
  );

  for (const item of items) {
    const unitPrice = Number(item.unit_price_cents || 0);
    const qty = Math.max(1, Number(item.quantity || 1));
    const subtotal = unitPrice * qty;
    await db.query(
      `INSERT INTO order_items (id, order_id, trip_item_id, title, unit_price_cents, quantity, subtotal_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), orderId, item.id, item.title, unitPrice, qty, subtotal],
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
    line_items: items.map((item) => ({
      price_data: {
        currency: stripeCurrency,
        product_data: { name: item.title },
        unit_amount: Number(item.unit_price_cents || 0),
      },
      quantity: Math.max(1, Number(item.quantity || 1)),
    })),
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
 * Consulta el estado de una orden.
 * Sincroniza con Stripe si la orden sigue pending.
 */
async function getOrderStatus(orderId, userId) {
  const order = await db.queryOne(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId],
  );
  if (!order) throw ApiError.notFound('Orden no encontrada');

  if (order.status === 'pending' && order.stripe_session_id && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.payment_status === 'paid') {
        const result = await db.query(
          "UPDATE orders SET status = 'paid', stripe_payment_intent = ? WHERE id = ? AND status = 'pending'",
          [session.payment_intent, order.id],
        );
        order.status = 'paid';
        order.stripe_payment_intent = session.payment_intent;
        if (result.affectedRows > 0) notificarComprobante(order.id, userId);
      } else if (session.status === 'expired') {
        await db.query("UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'", [order.id]);
        order.status = 'failed';
      }
    } catch (err) {
      logger.warn('No se pudo sincronizar estado con Stripe', { orderId: order.id, error: err.message });
    }
  }

  return order;
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

  if (order.status === 'pending' && order.stripe_session_id && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.payment_status === 'paid') {
        const result = await db.query(
          "UPDATE orders SET status = 'paid', stripe_payment_intent = ? WHERE id = ? AND status = 'pending'",
          [session.payment_intent, order.id],
        );
        order.status = 'paid';
        order.stripe_payment_intent = session.payment_intent;
        if (result.affectedRows > 0) notificarComprobante(order.id, userId);
      } else if (session.status === 'expired') {
        await db.query("UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'", [order.id]);
        order.status = 'failed';
      }
    } catch (err) {
      logger.warn('No se pudo sincronizar estado con Stripe', { orderId: order.id, error: err.message });
    }
  }

  return order;
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
  const totalCents = computeTotalCents(items, travelers, nights, rooms);
  if (totalCents <= 0) throw ApiError.badRequest('El total del viaje es $0');

  const orderId = crypto.randomUUID();
  await db.query(
    `INSERT INTO orders (id, user_id, trip_id, total_cents, currency, item_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [orderId, userId, tripId, totalCents, currency || trip.currency, items.length],
  );

  for (const item of items) {
    const unitPrice = Number(item.unit_price_cents || 0);
    const qty = Math.max(1, Number(item.quantity || 1));
    const subtotal = unitPrice * qty;
    await db.query(
      `INSERT INTO order_items (id, order_id, trip_item_id, title, unit_price_cents, quantity, subtotal_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), orderId, item.id, item.title, unitPrice, qty, subtotal],
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

  if (order.status === 'paid') return order;

  if (order.stripe_session_id && stripe) {
    try {
      const pi = await stripe.paymentIntents.retrieve(order.stripe_session_id);
      if (pi.status === 'succeeded') {
        const result = await db.query(
          "UPDATE orders SET status = 'paid', stripe_payment_intent = ? WHERE id = ? AND status = 'pending'",
          [pi.id, order.id],
        );
        order.status = 'paid';
        order.stripe_payment_intent = pi.id;
        if (result.affectedRows > 0) notificarComprobante(order.id, userId);
      }
    } catch (err) {
      logger.warn('No se pudo confirmar orden con Stripe', { orderId: order.id, error: err.message });
    }
  }

  return order;
}

module.exports = { createCheckoutSession, createPaymentIntent, confirmOrder, handleWebhook, getOrderStatus, getOrderBySession, listOrders };
