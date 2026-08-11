/** Controlador de viajes. DUENO: integrante C. */
const crypto = require('node:crypto');
const repo = require('./trips.repository');
const respond = require('../../core/respond');
const ApiError = require('../../core/ApiError');
const { computeBudget } = require('../budget/budget.engine');

const nightsOf = (trip) => Math.max(1, Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000));

/** Carga el viaje aplicando SIEMPRE el filtro de propiedad. */
async function loadOwnTrip(req) {
  const trip = await repo.findByIdForUser(req.params.id, req.user.id);
  if (!trip) throw ApiError.notFound('Viaje no encontrado'); // 404, no 403: no confirmamos existencia
  return trip;
}

exports.list = async (req, res) => {
  const { page, pageSize } = req.query;
  const trips = await repo.listByUser(req.user.id, { limit: pageSize, offset: (page - 1) * pageSize });
  return respond.ok(res, trips);
};

exports.create = async (req, res) => {
  const id = crypto.randomUUID();
  await repo.create({ id, userId: req.user.id, ...req.body }); // userId viene del token, nunca del body
  return respond.created(res, await repo.findByIdForUser(id, req.user.id));
};

exports.detail = async (req, res) => {
  const trip = await loadOwnTrip(req);
  return respond.ok(res, { ...trip, items: await repo.listItems(trip.id) });
};

exports.budget = async (req, res) => {
  const trip = await loadOwnTrip(req);
  const rows = await repo.listItems(trip.id);
  const nights = nightsOf(trip);
  const budget = computeBudget({
    items: rows.map((r) => ({
      type: r.type, unitPriceCents: r.unit_price_cents, pricingMode: r.pricing_mode, quantity: r.quantity,
    })),
    trip: { travelers: trip.travelers, nights, days: nights + 1, rooms: Math.ceil(trip.travelers / 2) },
    currency: trip.currency,
    budgetLimit: trip.budget_limit,
  });
  return respond.ok(res, budget);
};

exports.updateTravelers = async (req, res) => {
  await loadOwnTrip(req);
  await repo.updateTravelers(req.params.id, req.user.id, req.body.travelers);
  return exports.budget(req, res); // devuelve el presupuesto ya recalculado
};

exports.addItem = async (req, res) => {
  const trip = await loadOwnTrip(req);
  const id = crypto.randomUUID();
  await repo.addItem({ id, tripId: trip.id, ...req.body });
  return respond.created(res, { id });
};

exports.remove = async (req, res) => {
  await loadOwnTrip(req);
  await repo.softDelete(req.params.id, req.user.id);
  return respond.noContent(res);
};
