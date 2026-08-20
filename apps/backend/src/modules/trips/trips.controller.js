/** Controlador de viajes. DUENO: Jeshua (modulo C). */
const crypto = require('node:crypto');
const repo = require('./trips.repository');
const respond = require('../../core/respond');
const ApiError = require('../../core/ApiError');
const { computeBudget } = require('../budget/budget.engine');

const nightsOf = (trip) => Math.max(1, Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000));
const dateOnly = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

/** Carga el viaje aplicando SIEMPRE el filtro de propiedad. */
async function loadOwnTrip(req) {
  const trip = await repo.findByIdForUser(req.params.id, req.user.id);
  if (!trip) throw ApiError.notFound('Viaje no encontrado'); // 404, no 403: no confirmamos existencia
  return trip;
}

async function isTripPaid(tripId, userId) {
  try {
    return await repo.hasPaidOrder(tripId, userId);
  } catch (err) {
    // Compatibilidad con entornos que aun no aplican 040_payments.sql.
    if (err?.code === 'ER_NO_SUCH_TABLE') return false;
    throw err;
  }
}

async function withPaidFlag(trip, userId) {
  return { ...trip, isPaid: await isTripPaid(trip.id, userId) };
}

async function assertTripEditable(trip, userId) {
  if (await isTripPaid(trip.id, userId)) {
    throw ApiError.conflict('El viaje ya fue pagado y no se puede editar');
  }
}

exports.list = async (req, res) => {
  const { page, pageSize } = req.query;
  const [trips, total] = await Promise.all([
    repo.listByUser(req.user.id, { limit: pageSize, offset: (page - 1) * pageSize }),
    repo.countByUser(req.user.id),
  ]);

  const rows = await Promise.all(trips.map((trip) => withPaidFlag(trip, req.user.id)));
  return respond.paginated(res, rows, { page, pageSize, total });
};

exports.create = async (req, res) => {
  const id = crypto.randomUUID();
  await repo.create({ id, userId: req.user.id, ...req.body }); // userId viene del token, nunca del body
  const trip = await repo.findByIdForUser(id, req.user.id);
  return respond.created(res, await withPaidFlag(trip, req.user.id));
};

exports.update = async (req, res) => {
  const trip = await loadOwnTrip(req);
  await assertTripEditable(trip, req.user.id);
  const patch = req.body;

  const next = {
    title: patch.title ?? trip.title,
    originCity: patch.originCity ?? trip.origin_city,
    destinationCity: patch.destinationCity ?? trip.destination_city,
    startDate: patch.startDate ?? dateOnly(trip.start_date),
    endDate: patch.endDate ?? dateOnly(trip.end_date),
    travelers: patch.travelers ?? trip.travelers,
    currency: patch.currency ?? trip.currency,
    budgetLimit: Object.hasOwn(patch, 'budgetLimit') ? patch.budgetLimit : trip.budget_limit,
    status: patch.status ?? trip.status,
  };

  if (new Date(next.endDate) <= new Date(next.startDate)) {
    throw ApiError.badRequest('La fecha de regreso debe ser posterior a la de salida', { path: ['endDate'] });
  }

  await repo.update(req.params.id, req.user.id, next);
  const updated = await repo.findByIdForUser(req.params.id, req.user.id);
  return respond.ok(res, await withPaidFlag(updated, req.user.id));
};

exports.detail = async (req, res) => {
  const trip = await loadOwnTrip(req);
  const [items, isPaid] = await Promise.all([
    repo.listItems(trip.id, req.user.id),
    isTripPaid(trip.id, req.user.id),
  ]);
  return respond.ok(res, { ...trip, isPaid, items });
};

exports.budget = async (req, res) => {
  const trip = await loadOwnTrip(req);
  const rows = await repo.listItems(trip.id, req.user.id);
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
  const trip = await loadOwnTrip(req);
  await assertTripEditable(trip, req.user.id);
  await repo.updateTravelers(trip.id, req.user.id, req.body.travelers);
  return exports.budget(req, res); // devuelve el presupuesto ya recalculado
};

exports.addItem = async (req, res) => {
  const trip = await loadOwnTrip(req);
  await assertTripEditable(trip, req.user.id);
  const id = crypto.randomUUID();
  const result = await repo.addItem({ id, tripId: trip.id, userId: req.user.id, ...req.body });
  if (!result.affectedRows) throw ApiError.notFound('Viaje no encontrado');
  return respond.created(res, { id });
};

exports.updateItemQuantity = async (req, res) => {
  const trip = await loadOwnTrip(req);
  await assertTripEditable(trip, req.user.id);
  const result = await repo.updateItemQuantity(req.params.itemId, trip.id, req.user.id, req.body.quantity);
  if (!result.affectedRows) throw ApiError.notFound('Concepto no encontrado en el viaje');
  return exports.budget(req, res);
};

exports.removeItem = async (req, res) => {
  const trip = await loadOwnTrip(req);
  await assertTripEditable(trip, req.user.id);
  const result = await repo.removeItem(req.params.itemId, trip.id, req.user.id);
  if (!result.affectedRows) throw ApiError.notFound('Concepto no encontrado en el viaje');
  return exports.budget(req, res);
};

exports.remove = async (req, res) => {
  const trip = await loadOwnTrip(req);
  await assertTripEditable(trip, req.user.id);
  await repo.softDelete(trip.id, req.user.id);
  return respond.noContent(res);
};
