/** Controlador de vuelos. DUENO: Kassie (modulo B). */
const service = require('./flights.service');
const respond = require('../../core/respond');
const db = require('../../core/db');
const logger = require('../../core/logger');
const { airportsOptions } = require('./airports');

/** Catalogo para el autocompletado de origen/destino del formulario. */
exports.airports = (req, res) => respond.ok(res, airportsOptions());

exports.search = async (req, res) => {
  const { offers, degraded } = await service.search(req.query);
  saveHistory(req, 'flight', offers.length);
  return respond.ok(res, offers, { degraded, count: offers.length });
};

/**
 * Registro de busqueda en `search_history` (tabla del modulo B).
 * Nunca debe romper la busqueda: si falla, solo se registra en el log.
 */
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
