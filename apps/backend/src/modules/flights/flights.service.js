/** Servicio de vuelos. DUENO: Kassie (modulo B). */
const duffel = require('./providers/duffel.provider');
const logger = require('../../core/logger');
const seed = require('./flights.seed.json');
const { convert } = require('./currency');

/** Convierte cada oferta a la moneda pedida; si falla, conserva la original. */
async function applyCurrency(offers, currency) {
  return Promise.all(offers.map(async (offer) => {
    const amount = await convert(offer.price.amount, offer.price.currency, currency);
    if (amount === null) return offer;
    return { ...offer, price: { ...offer.price, amount, currency } };
  }));
}

/**
 * Elimina vuelos repetidos. Duffel devuelve una oferta por cada combinacion
 * ida x regreso en viajes redondos, y como la tarjeta solo muestra el tramo
 * de ida, el mismo vuelo aparecia en muchas tarjetas. Agrupamos por vuelo de
 * ida (aerolinea + horarios + escalas) y conservamos el mas barato.
 */
function dedupeByOutbound(offers) {
  const best = new Map();
  for (const offer of offers) {
    const key = `${offer.airline}|${offer.departureAt}|${offer.arrivalAt}|${offer.stops}`;
    const prev = best.get(key);
    if (!prev || offer.price.amount < prev.price.amount) best.set(key, offer);
  }
  return [...best.values()];
}

/**
 * Patron de degradacion elegante: si el proveedor externo falla o no esta
 * configurado, respondemos con datos semilla marcados como `degraded: true`.
 * Motivo: en una demo de una semana, que la API de un tercero se caiga no
 * puede significar que la aplicacion se caiga.
 */
async function search(params) {
  const { origin, destination, departureDate, returnDate, tripType, travelers, cabinClass, currency } = params;
  try {
    const offers = dedupeByOutbound(await duffel.searchOffers({ origin, destination, departureDate, returnDate, travelers, cabinClass, tripType }));
    return { offers: await applyCurrency(offers, currency), degraded: false };
  } catch (err) {
    logger.warn('Proveedor de vuelos no disponible, se usan datos semilla', { message: err.message });
    // La semilla refleja la ruta buscada (no solo MEX-CUN) y se marca estimada.
    // En redondo el precio semilla cubre ida y regreso (se duplica el por persona).
    const fallback = seed.map((s) => ({
      ...s,
      origin,
      destination,
      tripType,
      estimated: true,
      degraded: true,
      price: tripType === 'round_trip'
        ? { ...s.price, amount: s.price.amount * 2 }
        : s.price,
    }));
    return { offers: await applyCurrency(fallback, currency), degraded: true };
  }
}

module.exports = { search };
