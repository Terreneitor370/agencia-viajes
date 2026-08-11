/**
 * Cache en memoria para respuestas de APIs externas.
 * Motivo tecnico: las cuotas gratuitas (ej. Geoapify 3000 creditos/dia) se agotan
 * rapido con 3 personas desarrollando contra la misma clave.
 * En produccion esto se sustituiria por Redis; para un proyecto de 1 semana, sobra.
 */
const NodeCache = require('node-cache');
const env = require('../config/env');

const store = new NodeCache({
  stdTTL: env.EXTERNAL_CACHE_TTL_SECONDS,
  checkperiod: 120,
  useClones: false,
  maxKeys: 2000,
});

module.exports = {
  get: (key) => store.get(key),
  set: (key, value, ttl) => { try { store.set(key, value, ttl); } catch { /* maxKeys alcanzado */ } },
  del: (key) => store.del(key),
  flush: () => store.flushAll(),
  stats: () => store.getStats(),
};
