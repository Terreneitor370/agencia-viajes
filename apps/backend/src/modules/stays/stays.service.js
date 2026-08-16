/** Servicio de hospedaje. DUENO: Kassie (modulo B). */
const geoapify = require('../../core/providers/geoapify.provider');
const { estimateNightlyRate } = require('../../core/estimacion');
const logger = require('../../core/logger');
const seed = require('./stays.seed.json');
const { rate } = require('../flights/currency');

const round2 = (n) => Math.round(n * 100) / 100;

const nightsBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));

/** Hash determinista: el mismo lugar siempre da el mismo precio. */
const hashStr = (s) => {
  let h = 0;
  for (const ch of s || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/**
 * El estimador de core solo mira la categoria y Geoapify devuelve casi todo
 * como "accommodation.hotel": todas las tarjetas salian con el mismo costo.
 * Aqui se agrega una variacion determinista (rating + nombre) para que cada
 * hospedaje muestre un precio distinto y mas realista.
 */
const varyEstimatedRate = (base, place) => {
  const rating = place.rating || 3.5;
  const jitter = ((hashStr(place.name) % 11) - 5) / 100; // -5% .. +5%
  const factor = 0.55 + rating * 0.13 + jitter;
  return Math.round(base * factor);
};

/** Aplica la moneda pedida con UNA sola tasa (los precios base son MXN). */
async function applyCurrency(stays, currency) {
  const from = stays[0]?.price?.currency;
  if (!from || from === currency) return stays;
  const r = await rate(from, currency);
  if (r === null) return stays;
  return stays.map((stay) => ({
    ...stay,
    price: { ...stay.price, amount: round2(stay.price.amount * r), currency },
  }));
}

/** Datos semilla: la UI muestra que vienen de respaldo con `degraded: true`. */
const fallbackStays = (city) =>
  seed.map((s) => ({
    ...s,
    name: `${s.name} en ${city}`,
    lat: null,
    lon: null,
    distance: 0,
    degraded: true,
  }));

async function search({ city, countryCode, checkIn, checkOut, travelers, radiusKm, limit, currency }) {
  const nights = nightsBetween(checkIn, checkOut);
  const rooms = Math.ceil(travelers / 2);
  try {
    const location = await geoapify.geocodeCity(city, countryCode);
    const places = await geoapify.searchPlaces({
      categories: 'accommodation.hotel,accommodation.hostel,accommodation.apartment',
      lat: location.lat, lon: location.lon, radiusMeters: radiusKm * 1000, limit,
    });

    const stays = places.map((p) => {
      const base = estimateNightlyRate(p);
      return {
        ...p,
        price: { ...base, amount: varyEstimatedRate(base.amount, p) },
        pricingMode: 'per_night_per_room',
      };
    });

    return {
      location,
      nights,
      // Se necesita 1 habitacion por cada 2 viajeros (regla de negocio explicita).
      rooms,
      stays: await applyCurrency(stays, currency),
      degraded: false,
    };
  } catch (err) {
    logger.warn('Proveedor de hospedaje no disponible', { message: err.message });
    return {
      location: null,
      nights,
      rooms,
      stays: await applyCurrency(fallbackStays(city), currency),
      degraded: true,
    };
  }
}

module.exports = { search };
