/**
 * Acceso a datos de cotizaciones de invitado. DUENO: Kassie (modulo B).
 *
 * NOTA: `guest_token` se usa en el WHERE de CADA consulta. No existe una
 * funcion que devuelva una cotizacion solo por su id, para que sea imposible
 * olvidar el filtro de propiedad (misma disciplina anti-IDOR que trips).
 */
const db = require('../../core/db');

const COLUMNS = `id, guest_token, type, provider, external_id, title, unit_price_cents,
                 currency, pricing_mode, quantity, estimated, meta, created_at`;

module.exports = {
  listByToken: (token) => db.query(
    `SELECT ${COLUMNS} FROM quotes WHERE guest_token = ?
      ORDER BY created_at DESC`,
    [token],
  ),

  findByIdForToken: (id, token) => db.queryOne(
    `SELECT ${COLUMNS} FROM quotes WHERE id = ? AND guest_token = ? LIMIT 1`,
    [id, token],
  ),

  create: (quote) => db.query(
    `INSERT INTO quotes (id, guest_token, type, provider, external_id, title, unit_price_cents,
                         currency, pricing_mode, quantity, estimated, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [quote.id, quote.guestToken, quote.type, quote.provider, quote.externalId, quote.title,
      quote.unitPriceCents, quote.currency, quote.pricingMode, quote.quantity, quote.estimated,
      quote.meta ? JSON.stringify(quote.meta) : null],
  ),

  deleteByIdForToken: (id, token) => db.query(
    'DELETE FROM quotes WHERE id = ? AND guest_token = ?',
    [id, token],
  ),
};
