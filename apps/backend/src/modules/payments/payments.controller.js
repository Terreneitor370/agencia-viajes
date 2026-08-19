/** Controller de pagos. DUENO: Kassie (modulo B). */
const service = require('./payments.service');
const logger = require('../../core/logger');

exports.createCheckout = async (req, res) => {
  const { tripId, currency } = req.body;
  const result = await service.createCheckoutSession(req.user.id, tripId, currency);
  res.status(201).json({ success: true, data: result });
};

exports.webhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  await service.handleWebhook(req.body, signature);
  res.json({ received: true });
};

exports.orderStatus = async (req, res) => {
  const order = await service.getOrderStatus(req.params.id, req.user.id);
  res.json({ success: true, data: order });
};

exports.orderBySession = async (req, res) => {
  const order = await service.getOrderBySession(req.query.session_id, req.user.id);
  res.json({ success: true, data: order });
};
