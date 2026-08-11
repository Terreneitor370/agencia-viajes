/** Servicio de vuelos. DUENO: integrante B. */
const duffel = require('./providers/duffel.provider');
const logger = require('../../core/logger');
const seed = require('./flights.seed.json');

/**
 * Patron de degradacion elegante: si el proveedor externo falla o no esta
 * configurado, respondemos con datos semilla marcados como `degraded: true`.
 * Motivo: en una demo de una semana, que la API de un tercero se caiga no
 * puede significar que la aplicacion se caiga.
 */
async function search(params) {
  try {
    const offers = await duffel.searchOffers(params);
    return { offers, degraded: false };
  } catch (err) {
    logger.warn('Proveedor de vuelos no disponible, se usan datos semilla', { message: err.message });
    return { offers: seed, degraded: true };
  }
}

module.exports = { search };
