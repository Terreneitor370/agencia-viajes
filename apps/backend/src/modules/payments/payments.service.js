/** Servicio de pagos con Stripe. DUENO: Kassie (modulo B). */
const crypto = require('node:crypto');
const stripe = require('stripe')(require('../../config/env').STRIPE_SECRET_KEY);
const db = require('../../core/db');
const ApiError = require('../../core/ApiError');
const logger = require('../../core/logger');

const FRONTEND_URL = require('../../config/env').FRONTEND_URL || 'http://localhost:5173';

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
    customer_email: undefined,
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
  const webhookSecret = require('../../config/env').STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn('STRIPE_WEBHOOK_SECRET no configurado, ignorando webhook');
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
    if (orderId) {
      await db.query(
        `UPDATE orders SET status = 'paid', stripe_payment_intent = ?
         WHERE id = ? AND status = 'pending'`,
        [session.payment_intent, orderId],
      );
      logger.info('Orden pagada', { orderId, sessionId: session.id });
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
 */
async function getOrderStatus(orderId, userId) {
  const order = await db.queryOne(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId],
  );
  if (!order) throw ApiError.notFound('Orden no encontrada');
  return order;
}

/**
 * Consulta el estado de una orden por session_id de Stripe.
 */
async function getOrderBySession(sessionId, userId) {
  const order = await db.queryOne(
    'SELECT * FROM orders WHERE stripe_session_id = ? AND user_id = ?',
    [sessionId, userId],
  );
  if (!order) throw ApiError.notFound('Orden no encontrada');
  return order;
}

module.exports = { createCheckoutSession, handleWebhook, getOrderStatus, getOrderBySession };
