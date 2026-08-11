/** Rutas de vuelos. DUENO: integrante B. */
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

const openapiPaths = {
  '/search': {
    get: {
      tags: ['flights'], summary: 'Buscar ofertas de vuelo', security: [],
      parameters: [
        { name: 'origin', in: 'query', required: true, schema: { type: 'string', pattern: '^[A-Z]{3}$' } },
        { name: 'destination', in: 'query', required: true, schema: { type: 'string', pattern: '^[A-Z]{3}$' } },
        { name: 'departureDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'travelers', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 9 } },
        { name: 'cabinClass', in: 'query', schema: { type: 'string', enum: ['economy', 'premium_economy', 'business', 'first'] } },
      ],
      responses: { 200: { description: 'Lista de ofertas' }, 400: { description: 'Parametros invalidos' }, 429: { $ref: '#/components/responses/RateLimited' } },
    },
  },
};

module.exports = { basePath: '/flights', router, openapiPaths };
