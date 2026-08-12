/** Servicio de hospedaje. DUENO: Kassie (modulo B). */
const geoapify = require('../../core/providers/geoapify.provider');
const { estimateNightlyRate } = require('../../core/estimacion');
const logger = require('../../core/logger');

const nightsBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));

async function search({ city, countryCode, checkIn, checkOut, travelers, radiusKm, limit }) {
  const nights = nightsBetween(checkIn, checkOut);
  try {
    const location = await geoapify.geocodeCity(city, countryCode);
    const places = await geoapify.searchPlaces({
      categories: 'accommodation.hotel,accommodation.hostel,accommodation.apartment',
      lat: location.lat, lon: location.lon, radiusMeters: radiusKm * 1000, limit,
    });

    return {
      location,
      nights,
      // Se necesita 1 habitacion por cada 2 viajeros (regla de negocio explicita).
      rooms: Math.ceil(travelers / 2),
      stays: places.map((p) => ({
        ...p,
        price: estimateNightlyRate(p),
        pricingMode: 'per_night_per_room',
      })),
      degraded: false,
    };
  } catch (err) {
    logger.warn('Proveedor de hospedaje no disponible', { message: err.message });
    return { location: null, nights, rooms: Math.ceil(travelers / 2), stays: [], degraded: true };
  }
}

module.exports = { search };
