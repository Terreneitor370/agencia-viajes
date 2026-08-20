/**
 * Acceso a datos de viajes. DUENO: Jeshua (modulo C).
 *
 * NOTA ANTI-IDOR: fijate que `findById` recibe SIEMPRE el userId y lo mete en
 * el WHERE. No existe una funcion que traiga un viaje solo por su id. Esa
 * ausencia es intencional: hace imposible olvidar el filtro de propiedad.
 */
const db = require('../../core/db');

const COLUMNS = `id, user_id, title, origin_city, destination_city, start_date, end_date,
                 travelers, currency, budget_limit, status, created_at, updated_at`;

module.exports = {
  listByUser: (userId, { limit = 20, offset = 0 }) => {
    // MySQL en modo prepared statement falla con LIMIT/OFFSET parametrizado
    // (ER_WRONG_ARGUMENTS). Se inyectan como literales DESPUES de validar.
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
    const safeOffset = Math.max(0, Number(offset) || 0);

    return db.query(
      `SELECT ${COLUMNS} FROM trips WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [userId],
    );
  },

  countByUser: async (userId) => {
    const row = await db.queryOne(
      'SELECT COUNT(*) AS total FROM trips WHERE user_id = ? AND deleted_at IS NULL',
      [userId],
    );
    return Number(row?.total || 0);
  },

  /** Solo devuelve el viaje si pertenece al usuario. */
  findByIdForUser: (id, userId) => db.queryOne(
    `SELECT ${COLUMNS} FROM trips WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`,
    [id, userId],
  ),

  create: (trip) => db.query(
    `INSERT INTO trips (id, user_id, title, origin_city, destination_city, start_date, end_date,
                        travelers, currency, budget_limit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [trip.id, trip.userId, trip.title, trip.originCity, trip.destinationCity,
      trip.startDate, trip.endDate, trip.travelers, trip.currency, trip.budgetLimit],
  ),

  update: (id, userId, trip) => db.query(
    `UPDATE trips
       SET title = ?, origin_city = ?, destination_city = ?,
           start_date = ?, end_date = ?, travelers = ?,
           currency = ?, budget_limit = ?, status = ?,
           updated_at = NOW()
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [
      trip.title,
      trip.originCity,
      trip.destinationCity,
      trip.startDate,
      trip.endDate,
      trip.travelers,
      trip.currency,
      trip.budgetLimit,
      trip.status,
      id,
      userId,
    ],
  ),

  updateTravelers: (id, userId, travelers) => db.query(
    'UPDATE trips SET travelers = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
    [travelers, id, userId],
  ),

  softDelete: (id, userId) => db.query(
    'UPDATE trips SET deleted_at = NOW() WHERE id = ? AND user_id = ?', [id, userId],
  ),

  hasPaidOrder: async (tripId, userId) => {
    const row = await db.queryOne(
      `SELECT id
         FROM orders
        WHERE trip_id = ? AND user_id = ? AND status = 'paid'
        LIMIT 1`,
      [tripId, userId],
    );
    return Boolean(row?.id);
  },

  listItems: (tripId, userId) => db.query(
    `SELECT ti.id, ti.trip_id, ti.type, ti.provider, ti.external_id, ti.title, ti.unit_price_cents, ti.currency,
            ti.pricing_mode, ti.quantity, ti.estimated, ti.meta
       FROM trip_items ti
       JOIN trips t ON t.id = ti.trip_id
      WHERE ti.trip_id = ? AND t.user_id = ? AND t.deleted_at IS NULL
      ORDER BY ti.created_at ASC`,
    [tripId, userId],
  ),

  addItem: (item) => db.query(
    `INSERT INTO trip_items (id, trip_id, type, provider, external_id, title, unit_price_cents,
                             currency, pricing_mode, quantity, estimated, meta)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       FROM trips
      WHERE trips.id = ? AND trips.user_id = ? AND trips.deleted_at IS NULL`,
    [item.id, item.tripId, item.type, item.provider, item.externalId, item.title,
      item.unitPriceCents, item.currency, item.pricingMode, item.quantity, item.estimated,
      item.meta ? JSON.stringify(item.meta) : null, item.tripId, item.userId],
  ),

  updateItemQuantity: (itemId, tripId, userId, quantity) => db.query(
    `UPDATE trip_items ti
      JOIN trips t ON t.id = ti.trip_id
       SET ti.quantity = ?
     WHERE ti.id = ? AND ti.trip_id = ? AND t.user_id = ? AND t.deleted_at IS NULL`,
    [quantity, itemId, tripId, userId],
  ),

  removeItem: (itemId, tripId, userId) => db.query(
    `DELETE ti FROM trip_items ti
      JOIN trips t ON t.id = ti.trip_id
     WHERE ti.id = ? AND ti.trip_id = ? AND t.user_id = ? AND t.deleted_at IS NULL`,
    [itemId, tripId, userId],
  ),
};
