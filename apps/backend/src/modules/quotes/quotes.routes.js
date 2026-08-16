/** Rutas de cotizaciones de invitado (sin sesion). DUENO: Kassie (modulo B). */
const { Router } = require('express');
const { z } = require('zod');
const validate = require('../../middlewares/validate');
const { writeLimiter } = require('../../middlewares/rateLimit');
const asyncHandler = require('../../core/asyncHandler');
const schemas = require('./quotes.schema');
const controller = require('./quotes.controller');

const router = Router();

const tokenQuery = z.object({ token: z.string().regex(schemas.TOKEN_PATTERN, 'Token de invitado invalido') }).strict();
const idParam = z.object({ id: z.string().uuid() }).strict();

// La propiedad se demuestra con el `token` del cliente, no con sesion.
router.get('/', validate({ query: schemas.listQuotesSchema }), asyncHandler(controller.list));
router.post('/', writeLimiter, validate({ body: schemas.createQuoteSchema }), asyncHandler(controller.create));
router.delete('/:id', writeLimiter, validate({ params: idParam, query: tokenQuery }), asyncHandler(controller.remove));

const openapiPaths = {
  '/': {
    get: {
      tags: ['quotes'], summary: 'Listar cotizaciones de invitado', security: [],
      parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Lista de cotizaciones' }, 400: { description: 'Token invalido' } },
    },
    post: {
      tags: ['quotes'], summary: 'Guardar cotizacion de invitado', security: [],
      requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
      responses: { 201: { description: 'Cotizacion creada' }, 400: { description: 'Cuerpo invalido' } },
    },
  },
  '/{id}': {
    delete: {
      tags: ['quotes'], summary: 'Eliminar cotizacion de invitado', security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'token', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: { 204: { description: 'Eliminada' }, 404: { description: 'No encontrada' } },
    },
  },
};

module.exports = { basePath: '/quotes', router, openapiPaths };
