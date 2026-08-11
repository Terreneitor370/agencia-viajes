/** Rutas de hospedaje. DUENO: integrante B. */
const { Router } = require('express');
const validate = require('../../middlewares/validate');
const { optionalAuth } = require('../../middlewares/authenticate');
const { externalApiLimiter } = require('../../middlewares/rateLimit');
const asyncHandler = require('../../core/asyncHandler');
const { searchStaysSchema } = require('./stays.schema');
const controller = require('./stays.controller');

const router = Router();
router.get('/search', optionalAuth, externalApiLimiter, validate({ query: searchStaysSchema }), asyncHandler(controller.search));

const openapiPaths = {
  '/search': {
    get: {
      tags: ['stays'], summary: 'Buscar hospedaje por ciudad', security: [],
      parameters: [
        { name: 'city', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'checkIn', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'checkOut', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'travelers', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20 } },
      ],
      responses: { 200: { description: 'Lista de hospedajes' }, 400: { description: 'Parametros invalidos' } },
    },
  },
};

module.exports = { basePath: '/stays', router, openapiPaths };
