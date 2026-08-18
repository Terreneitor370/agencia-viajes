/** Servicio de experiencias. DUENO: Jeshua (modulo C). */
const geoapify = require('../../core/providers/geoapify.provider');
const { CATEGORY_MAP } = require('./experiences.schema');
const { estimateExperiencePrice } = require('../../core/estimacion');
const logger = require('../../core/logger');

function categoriesForInterests(interests) {
  const categories = interests
    .flatMap((interest) => String(CATEGORY_MAP[interest] || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean));
  return [...new Set(categories)];
}

function uniquePlaces(places) {
  const seen = new Set();
  const out = [];
  for (const place of places) {
    const key = place.externalId || `${place.name}:${place.lat}:${place.lon}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
  }
  return out;
}

async function search({ city, countryCode, interests, radiusKm, limit }) {
  try {
    const location = await geoapify.geocodeCity(city, countryCode);
    const categories = categoriesForInterests(interests);
    const perCategoryLimit = Math.max(1, Math.ceil(limit / Math.max(1, categories.length)));

    // Geoapify ya no acepta lotes de categorias en un solo valor; se consulta
    // una categoria por llamada y luego se fusionan resultados sin duplicados.
    const responses = await Promise.all(categories.map((category) => geoapify.searchPlaces({
      categories: category,
      lat: location.lat,
      lon: location.lon,
      radiusMeters: radiusKm * 1000,
      limit: perCategoryLimit,
    })));

    const places = uniquePlaces(responses.flat()).slice(0, limit);

    return {
      location,
      experiences: places.map((p) => ({
        ...p,
        price: estimateExperiencePrice(p),
        pricingMode: 'per_person',
      })),
      degraded: false,
    };
  } catch (err) {
    logger.warn('Proveedor de experiencias no disponible', { message: err.message });
    return { location: null, experiences: [], degraded: true };
  }
}

module.exports = { search };
