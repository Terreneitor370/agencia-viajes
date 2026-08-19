/** Rutas de vuelos. DUENO: Kassie (modulo B). */
const { Router } = require('express');
const validate = require('../../middlewares/validate');
const { optionalAuth } = require('../../middlewares/authenticate');
const { externalApiLimiter } = require('../../middlewares/rateLimit');
const asyncHandler = require('../../core/asyncHandler');
const { searchFlightsSchema } = require('./flights.schema');
const controller = require('./flights.controller');

const router = Router();

// Publico con sesion opcional: la landing debe funcionar sin registro,
// pero el rate limit se aplica por usuario cuando hay sesion.
router.get('/search', optionalAuth, externalApiLimiter, validate({ query: searchFlightsSchema }), asyncHandler(controller.search));

// Catalogo para el autocompletado de ciudades (sin validacion de schema).
router.get('/airports', optionalAuth, externalApiLimiter, asyncHandler(controller.airports));

// Tasa de cambio para convertir precios sin re-buscar. Tambien consume un
// proveedor externo (Frankfurter): mismo limite que /search y /airports.
router.get('/rates', optionalAuth, externalApiLimiter, asyncHandler(controller.rates));

const openapiPaths = {
  '/search': {
    get: {
      tags: ['flights'], summary: 'Buscar ofertas de vuelo', security: [],
      parameters: [
        { name: 'origin', in: 'query', required: true, description: 'Nombre de ciudad o codigo IATA', schema: { type: 'string' } },
        { name: 'destination', in: 'query', required: true, description: 'Nombre de ciudad o codigo IATA', schema: { type: 'string' } },
        { name: 'departureDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'returnDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'travelers', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 9 } },
        { name: 'cabinClass', in: 'query', schema: { type: 'string', enum: ['economy', 'premium_economy', 'business', 'first'] } },
        { name: 'currency', in: 'query', schema: { type: 'string', enum: ['MXN', 'USD', 'EUR'] } },
      ],
      responses: { 200: { description: 'Lista de ofertas' }, 400: { description: 'Parametros invalidos' }, 429: { $ref: '#/components/responses/RateLimited' } },
    },
  },
  '/airports': {
    get: {
      tags: ['flights'], summary: 'Catalogo de aeropuertos para autocompletado', security: [],
      responses: { 200: { description: 'Lista de aeropuertos' } },
    },
  },
  '/rates': {
    get: {
      tags: ['flights'], summary: 'Tasa de cambio MXN/USD/EUR', security: [],
      parameters: [
        { name: 'from', in: 'query', required: true, schema: { type: 'string', enum: ['MXN', 'USD', 'EUR'] } },
        { name: 'to', in: 'query', required: true, schema: { type: 'string', enum: ['MXN', 'USD', 'EUR'] } },
      ],
      responses: { 200: { description: 'Tasa' }, 400: { description: 'Monedas invalidas' }, 429: { $ref: '#/components/responses/RateLimited' } },
    },
  },
};

module.exports = { basePath: '/flights', router, openapiPaths };
