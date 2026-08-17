/**
 * Cache de respuestas de vuelos respaldada en la tabla `external_cache`.
 * DUENO: Kassie (modulo B).
 *
 * `core/httpClient` solo cachea GET y la busqueda de Duffel es un POST, asi
 * que cacheamos a nivel de modulo. RF-B-07: una busqueda identica dentro de
 * la ventana NO debe volver a consumir cuota del proveedor.
 *
 * Ante cualquier fallo de base de datos se degrada a la cache en memoria
 * (core/cache): un cache nunca puede tumbar una busqueda.
 */
const crypto = require('crypto');
const db = require('../../core/db');
const mem = require('../../core/cache');
const logger = require('../../core/logger');

const TTL_SECONDS = 30 * 60; // 30 minutos
const MEM_PREFIX = 'duffel:';

/** Llave determinista a partir de los parametros de busqueda. */
const keyOf = (params) =>
  crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex');

async function get(key) {
  try {
    const row = await db.queryOne(
      'SELECT payload FROM external_cache WHERE cache_key = ? AND expires_at > NOW() LIMIT 1',
      [key],
    );
    if (row) {
      logger.debug('Vuelos: cache HIT (external_cache)');
      // mysql2 devuelve las columnas JSON ya parseadas como objeto.
      return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    }
  } catch (err) {
    logger.warn('external_cache no disponible, usando cache en memoria', { message: err.message });
  }
  return mem.get(`${MEM_PREFIX}${key}`) || null;
}

async function set(key, payload) {
  try {
    await db.query(
      `INSERT INTO external_cache (cache_key, provider, payload, expires_at)
       VALUES (?, 'duffel', ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), expires_at = VALUES(expires_at)`,
      [key, JSON.stringify(payload), TTL_SECONDS],
    );
  } catch (err) {
    logger.warn('external_cache sin conexion, guardando en memoria', { message: err.message });
    mem.set(`${MEM_PREFIX}${key}`, payload, TTL_SECONDS);
  }
}

module.exports = { keyOf, get, set, TTL_SECONDS };
