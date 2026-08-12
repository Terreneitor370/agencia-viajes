/** Rutas de experiencias. DUENO: Jeshua (modulo C). */
const { Router } = require('express');
const validate = require('../../middlewares/validate');
const { optionalAuth } = require('../../middlewares/authenticate');
const { externalApiLimiter } = require('../../middlewares/rateLimit');
const asyncHandler = require('../../core/asyncHandler');
const { searchExperiencesSchema } = require('./experiences.schema');
const controller = require('./experiences.controller');

const router = Router();
router.get('/search', optionalAuth, externalApiLimiter, validate({ query: searchExperiencesSchema }), asyncHandler(controller.search));

const openapiPaths = {
  '/search': {
    get: {
      tags: ['experiences'], summary: 'Buscar experiencias por ciudad e intereses', security: [],
      parameters: [
        { name: 'city', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'interests', in: 'query', schema: { type: 'string', example: 'cultura,gastronomia' } },
      ],
      responses: { 200: { description: 'Lista de experiencias' } },
    },
  },
};

module.exports = { basePath: '/experiences', router, openapiPaths };
