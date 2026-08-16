/** Servicio de vuelos. DUENO: Kassie (modulo B). */
const duffel = require('./providers/duffel.provider');
const logger = require('../../core/logger');
const seed = require('./flights.seed.json');
const { rate } = require('./currency');

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Convierte todas las ofertas con UNA sola tasa de cambio (no 1 request por
 * oferta: Frankfurter no la necesita y el grupo completo comparte la misma
 * moneda base). Si falla, conserva cada precio original.
 */
async function applyCurrency(offers, currency) {
  const from = offers[0]?.price?.currency;
  if (!from || from === currency) return offers;
  const r = await rate(from, currency);
  if (r === null) return offers;
  return offers.map((offer) => ({
    ...offer,
    price: { ...offer.price, amount: round2(offer.price.amount * r), currency },
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
  const { origin, destination, departureDate, returnDate, tripType, cabinClass, currency } = params;
  // El desglose adulto/nino/bebe alimenta al proveedor; el precio por persona
  // ya sale dividido entre el total de pasajeros en duffel.provider.
  const adults = params.adults ?? params.travelers ?? 1;
  const children = params.children ?? 0;
  const infants = params.infants ?? 0;
  try {
    const offers = dedupeByOutbound(await duffel.searchOffers({ origin, destination, departureDate, returnDate, adults, children, infants, cabinClass, tripType }));
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
