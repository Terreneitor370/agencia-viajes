/**
 * Adaptador de Geoapify Places. DUENO: integrante B (hospedaje) / C (experiencias).
 *
 * Una sola clave gratuita (3000 creditos/dia, sin tarjeta) cubre hospedaje,
 * experiencias y geocodificacion. Menos secretos que gestionar = menos superficie.
 *
 * IMPORTANTE: los resultados se cachean 1 hora. Con 3 personas desarrollando
 * contra la misma clave, sin cache la cuota diaria se agota antes de comer.
 */
const { z } = require('zod');
const httpClient = require('../../../core/httpClient');
const env = require('../../../config/env');
const ApiError = require('../../../core/ApiError');

const PLACES_URL = 'https://api.geoapify.com/v2/places';
const GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search';

const featureCollection = z.object({
  features: z.array(z.object({
    properties: z.record(z.string(), z.unknown()),
    geometry: z.object({ coordinates: z.array(z.number()).optional() }).optional(),
  })).default([]),
});

function requireKey() {
  if (!env.GEOAPIFY_API_KEY) throw ApiError.upstream('Proveedor de lugares no configurado');
  return env.GEOAPIFY_API_KEY;
}

/** Ciudad -> coordenadas. Se cachea agresivamente: las ciudades no se mueven. */
async function geocodeCity(city, countryCode) {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set('text', city);
  url.searchParams.set('type', 'city');
  url.searchParams.set('format', 'geojson');
  url.searchParams.set('limit', '1');
  if (countryCode) url.searchParams.set('filter', `countrycode:${countryCode.toLowerCase()}`);
  url.searchParams.set('apiKey', requireKey());

  const data = await httpClient.request({
    url: url.toString(), provider: 'geoapify-geocode', schema: featureCollection, cacheTtl: 86400,
  });
  const hit = data.features[0];
  if (!hit) throw ApiError.notFound(`No se encontro la ciudad "${city}"`);
  const [lon, lat] = hit.geometry?.coordinates || [];
  return { lat, lon, formatted: hit.properties.formatted };
}

/**
 * @param {object} p
 * @param {string} p.categories  ej. 'accommodation.hotel' | 'tourism.attraction,entertainment'
 * @param {number} p.lat @param {number} p.lon @param {number} p.radiusMeters @param {number} p.limit
 */
async function searchPlaces({ categories, lat, lon, radiusMeters = 8000, limit = 20 }) {
  const url = new URL(PLACES_URL);
  url.searchParams.set('categories', categories);
  url.searchParams.set('filter', `circle:${lon},${lat},${radiusMeters}`);
  url.searchParams.set('bias', `proximity:${lon},${lat}`);
  url.searchParams.set('limit', String(Math.min(limit, 40)));
  url.searchParams.set('apiKey', requireKey());

  const data = await httpClient.request({
    url: url.toString(),
    provider: 'geoapify-places',
    schema: featureCollection,
    cacheTtl: env.EXTERNAL_CACHE_TTL_SECONDS,
  });

  return data.features.map((f) => {
    const p = f.properties;
    return {
      provider: 'geoapify',
      externalId: p.place_id,
      name: p.name || p.address_line1 || 'Sin nombre',
      address: p.formatted,
      categories: p.categories || [],
      lat: p.lat,
      lon: p.lon,
      website: typeof p.website === 'string' ? p.website : null,
      // Geoapify NO entrega precios. El precio se estima en el modulo de
      // presupuesto a partir de categoria + destino. Ver budget.engine.js.
      price: null,
    };
  });
}

module.exports = { geocodeCity, searchPlaces };
