const service = require('./stays.service');
const respond = require('../../core/respond');
const db = require('../../core/db');
const logger = require('../../core/logger');

exports.search = async (req, res) => {
  const result = await service.search(req.query);
  saveHistory(req, 'stay', result.stays.length);
  return respond.ok(res, result.stays, {
    location: result.location, nights: result.nights, rooms: result.rooms, degraded: result.degraded,
  });
};

/** Registro en `search_history` (tabla del modulo B); nunca rompe la busqueda. */
async function saveHistory(req, type, count) {
  try {
    await db.query(
      'INSERT INTO search_history (user_id, search_type, params, results_count) VALUES (?, ?, ?, ?)',
      [req.user?.id || null, type, JSON.stringify(req.query), count],
    );
  } catch (err) {
    logger.warn('No se pudo guardar el historial de busqueda', { message: err.message });
  }
}
