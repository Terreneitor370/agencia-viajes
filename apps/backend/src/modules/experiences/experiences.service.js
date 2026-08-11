/** Servicio de experiencias. DUENO: integrante C. */
const geoapify = require('../stays/providers/geoapify.provider');
const { CATEGORY_MAP } = require('./experiences.schema');
const { estimateExperiencePrice } = require('../budget/budget.engine');
const logger = require('../../core/logger');

async function search({ city, countryCode, interests, radiusKm, limit }) {
  try {
    const location = await geoapify.geocodeCity(city, countryCode);
    const categories = interests.map((i) => CATEGORY_MAP[i]).join(',');
    const places = await geoapify.searchPlaces({
      categories, lat: location.lat, lon: location.lon, radiusMeters: radiusKm * 1000, limit,
    });
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
