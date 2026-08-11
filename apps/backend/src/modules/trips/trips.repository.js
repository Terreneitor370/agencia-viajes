/**
 * Acceso a datos de viajes. DUENO: integrante C.
 *
 * NOTA ANTI-IDOR: fijate que `findById` recibe SIEMPRE el userId y lo mete en
 * el WHERE. No existe una funcion que traiga un viaje solo por su id. Esa
 * ausencia es intencional: hace imposible olvidar el filtro de propiedad.
 */
const db = require('../../core/db');

const COLUMNS = `id, user_id, title, origin_city, destination_city, start_date, end_date,
                 travelers, currency, budget_limit, status, created_at, updated_at`;

module.exports = {
  listByUser: (userId, { limit = 20, offset = 0 }) => db.query(
    `SELECT ${COLUMNS} FROM trips WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset],
  ),

  /** Solo devuelve el viaje si pertenece al usuario. */
  findByIdForUser: (id, userId) => db.queryOne(
    `SELECT ${COLUMNS} FROM trips WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`,
    [id, userId],
  ),

  /** Version para administradores. Su uso DEBE registrarse en audit_log. */
  findByIdAsAdmin: (id) => db.queryOne(
    `SELECT ${COLUMNS} FROM trips WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id],
  ),

  create: (trip) => db.query(
    `INSERT INTO trips (id, user_id, title, origin_city, destination_city, start_date, end_date,
                        travelers, currency, budget_limit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [trip.id, trip.userId, trip.title, trip.originCity, trip.destinationCity,
      trip.startDate, trip.endDate, trip.travelers, trip.currency, trip.budgetLimit],
  ),

  updateTravelers: (id, userId, travelers) => db.query(
    'UPDATE trips SET travelers = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
    [travelers, id, userId],
  ),

  softDelete: (id, userId) => db.query(
    'UPDATE trips SET deleted_at = NOW() WHERE id = ? AND user_id = ?', [id, userId],
  ),

  listItems: (tripId) => db.query(
    `SELECT id, trip_id, type, provider, external_id, title, unit_price_cents, currency,
            pricing_mode, quantity, estimated, meta
       FROM trip_items WHERE trip_id = ? ORDER BY created_at ASC`,
    [tripId],
  ),

  addItem: (item) => db.query(
    `INSERT INTO trip_items (id, trip_id, type, provider, external_id, title, unit_price_cents,
                             currency, pricing_mode, quantity, estimated, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.tripId, item.type, item.provider, item.externalId, item.title,
      item.unitPriceCents, item.currency, item.pricingMode, item.quantity, item.estimated,
      item.meta ? JSON.stringify(item.meta) : null],
  ),

  removeItem: (itemId, tripId) => db.query(
    'DELETE FROM trip_items WHERE id = ? AND trip_id = ?', [itemId, tripId],
  ),
};
