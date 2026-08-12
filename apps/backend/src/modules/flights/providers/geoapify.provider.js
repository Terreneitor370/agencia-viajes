const httpClient = require('../../core/httpClient');
const logger = require('../../core/logger');
const cache = require('../../core/cache');

const GEOAPIFY_GEOCODE = 'https://api.geoapify.com/v1/geocode/search';
const GEOAPIFY_PLACES = 'https://api.geoapify.com/v2/places';
const GEOCODE_CACHE_TTL = 24 * 60 * 60; // 24 horas

async function searchStays(params) {
  const { city, checkIn, checkOut, travelers } = params;

  if (!process.env.GEOAPIFY_API_KEY) {
    logger.warn('GEOAPIFY_API_KEY no configurado');
    return getFallbackStays({ city, travelers });
  }

  try {
    // 1. Geocodificar ciudad → coordenadas
    const coords = await geocodeCity(city);
    if (!coords) {
      throw new Error('No se pudo geocodificar la ciudad');
    }

    // 2. Calcular noches y habitaciones
    const nights = calculateNights(checkIn, checkOut);
    const rooms = Math.ceil(travelers / 2);

    // 3. Buscar hoteles cerca de las coordenadas
    const stays = await searchPlaces(coords.lat, coords.lon);

    // 4. Normalizar respuesta
    return normalizeStays(stays, nights, rooms, travelers);
  } catch (error) {
    logger.error({ error, city }, 'Geoapify API error');
    return getFallbackStays({ city, travelers });
  }
}

async function geocodeCity(city) {
  const cacheKey = `geocode:${city.toLowerCase()}`;

  // Intentar caché
  const cached = await cache.get(cacheKey);
  if (cached) {
    logger.debug({ cacheKey }, 'Geocode desde caché');
    return cached;
  }

  try {
    const response = await httpClient.get(GEOAPIFY_GEOCODE, {
      params: {
        text: city,
        apiKey: process.env.GEOAPIFY_API_KEY,
        limit: 1,
        format: 'json',
      },
    });

    if (response.features && response.features.length > 0) {
      const [lon, lat] = response.features[0].geometry.coordinates;
      const result = { lat, lon };
      await cache.set(cacheKey, result, GEOCODE_CACHE_TTL);
      return result;
    }
    return null;
  } catch (error) {
    logger.error({ error, city }, 'Geocoding error');
    return null;
  }
}

async function searchPlaces(lat, lon) {
  try {
    const response = await httpClient.get(GEOAPIFY_PLACES, {
      params: {
        filter: `circle:${lon},${lat},5000`,
        categories: 'accommodation.hotel',
        limit: 20,
        apiKey: process.env.GEOAPIFY_API_KEY,
        format: 'json',
      },
    });
    return response.features || [];
  } catch (error) {
    logger.error({ error }, 'Places search error');
    return [];
  }
}

function calculateNights(checkIn, checkOut) {
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function normalizeStays(features, nights, rooms, travelers) {
  if (!features || features.length === 0) {
    return [];
  }

  return features.map((feature, index) => {
    const props = feature.properties || {};
    const pricePerNight = estimatePrice(props.categories || []);

    return {
      id: feature.id || `stay-${index}`,
      provider: 'geoapify',
      name: props.name || 'Hotel sin nombre',
      address: props.address_line2 || props.address_line1 || '',
      lat: feature.geometry?.coordinates?.[1] || 0,
      lon: feature.geometry?.coordinates?.[0] || 0,
      distance: props.distance || 0,
      pricePerNightCents: pricePerNight,
      totalPriceCents: pricePerNight * nights * rooms,
      currency: 'MXN',
      pricingMode: 'per_night_per_room',
      estimated: true,
      nights,
      rooms,
      rating: props.rating || null,
    };
  });
}

function estimatePrice(categories) {
  // Estimación simple por categoría
  const categoriesStr = categories.join(' ').toLowerCase();
  if (categoriesStr.includes('luxury') || categoriesStr.includes('5-star')) return 450000;
  if (categoriesStr.includes('4-star')) return 300000;
  if (categoriesStr.includes('3-star')) return 180000;
  if (categoriesStr.includes('2-star')) return 120000;
  return 100000;
}

function getFallbackStays({ city, travelers }) {
  const rooms = Math.ceil(travelers / 2);
  return [{
    id: `fallback-${Date.now()}`,
    provider: 'geoapify',
    name: `Hotel en ${city} (datos de ejemplo)`,
    address: 'Dirección de muestra',
    lat: 0,
    lon: 0,
    distance: 0,
    pricePerNightCents: 200000,
    totalPriceCents: 200000 * 3 * rooms,
    currency: 'MXN',
    pricingMode: 'per_night_per_room',
    estimated: true,
    degraded: true,
    nights: 3,
    rooms,
    rating: null,
  }];
}

module.exports = { searchStays };