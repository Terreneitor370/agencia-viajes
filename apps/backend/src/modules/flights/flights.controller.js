/** Controlador de vuelos. DUENO: Kassie (modulo B). */
const service = require('./flights.service');
const respond = require('../../core/respond');
const ApiError = require('../../core/ApiError');
const db = require('../../core/db');
const logger = require('../../core/logger');
const { airportsOptions } = require('./airports');
const { rate, CURRENCIES } = require('./currency');

/** Catalogo para el autocompletado de origen/destino del formulario. */
exports.airports = (req, res) => respond.ok(res, airportsOptions());

/** Tasa de cambio: permite convertir precios en el frontend sin re-buscar. */
exports.rates = async (req, res) => {
  const from = String(req.query.from || '').toUpperCase();
  const to = String(req.query.to || '').toUpperCase();
  if (!CURRENCIES.includes(from) || !CURRENCIES.includes(to)) {
    throw ApiError.badRequest('Indica monedas validas: MXN, USD o EUR');
  }
  const value = await rate(from, to);
  if (value === null) throw ApiError.upstream('No se pudo obtener la tasa de cambio');
  return respond.ok(res, { from, to, rate: value });
};

exports.search = async (req, res) => {
  const { offers, degraded } = await service.search(req.query);
  saveHistory(req, 'flight', offers.length);
  return respond.ok(res, offers, { degraded, count: offers.length });
};

/** Mapa de asientos de una oferta de Duffel. */
exports.seatMap = async (req, res) => {
  const seatMap = await service.getSeatMap(req.query.offer_id);
  if (!seatMap) {
    return respond.ok(res, null, { message: 'Mapa de asientos no disponible para esta oferta' });
  }
  return respond.ok(res, seatMap);
};

/** Verifica qué ofertas tienen mapa de asientos (batch). */
exports.checkSeatMaps = async (req, res) => {
  const ids = String(req.query.offer_ids || '').split(',').filter(Boolean).slice(0, 20);
  if (ids.length === 0) return respond.ok(res, {});
  const result = await service.checkSeatMaps(ids);
  return respond.ok(res, result);
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
