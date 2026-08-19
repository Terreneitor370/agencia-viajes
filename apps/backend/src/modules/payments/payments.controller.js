/** Controller de pagos. DUENO: Kassie (modulo B). */
const service = require('./payments.service');

exports.createCheckout = async (req, res) => {
  const { tripId, currency } = req.body;
  const result = await service.createCheckoutSession(req.user.id, tripId, currency);
  res.status(201).json({ success: true, data: result });
};

exports.createPaymentIntent = async (req, res) => {
  const { tripId, currency } = req.body;
  const result = await service.createPaymentIntent(req.user.id, tripId, currency);
  res.status(201).json({ success: true, data: result });
};

exports.confirmOrder = async (req, res) => {
  const order = await service.confirmOrder(req.params.id, req.user.id);
  res.json({ success: true, data: order });
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

exports.listOrders = async (req, res) => {
  if (req.query.session_id) {
    const order = await service.getOrderBySession(req.query.session_id, req.user.id);
    return res.json({ success: true, data: order });
  }
  const orders = await service.listOrders(req.user.id, req.query.trip_id);
  res.json({ success: true, data: orders });
};
