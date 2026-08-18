/** Rutas de viajes e itinerario. DUENO: Jeshua (modulo C). */
const { Router } = require('express');
const { z } = require('zod');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const { writeLimiter } = require('../../middlewares/rateLimit');
const { auditRoute } = require('../../middlewares/audit');
const asyncHandler = require('../../core/asyncHandler');
const { PERMISSIONS: P } = require('../../config/roles');
const schemas = require('./trips.schema');
const controller = require('./trips.controller');

const router = Router();

// Toda la seccion exige sesion. La autorizacion se declara ruta por ruta.
router.use(authenticate);

router.get('/', authorize(P.TRIP_READ_OWN),
  validate({ query: z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) }).strict() }),
  asyncHandler(controller.list));

router.post('/', authorize(P.TRIP_CREATE), writeLimiter,
  validate({ body: schemas.createTripSchema }),
  auditRoute('trip.created', 'trip'),
  asyncHandler(controller.create));

router.patch('/:id', authorize(P.TRIP_UPDATE_OWN), writeLimiter,
  validate({ params: schemas.tripIdParam, body: schemas.updateTripSchema }),
  auditRoute('trip.updated', 'trip'),
  asyncHandler(controller.update));

router.get('/:id', authorize(P.TRIP_READ_OWN),
  validate({ params: schemas.tripIdParam }), asyncHandler(controller.detail));

router.get('/:id/budget', authorize(P.BUDGET_READ_OWN),
  validate({ params: schemas.tripIdParam }), asyncHandler(controller.budget));

router.patch('/:id/travelers', authorize(P.TRIP_UPDATE_OWN), writeLimiter,
  validate({ params: schemas.tripIdParam, body: z.object({ travelers: z.coerce.number().int().min(1).max(20) }).strict() }),
  auditRoute('trip.travelers.updated', 'trip'),
  asyncHandler(controller.updateTravelers));

router.post('/:id/items', authorize(P.TRIP_UPDATE_OWN), writeLimiter,
  validate({ params: schemas.tripIdParam, body: schemas.addTripItemSchema }),
  auditRoute('trip.item.added', 'trip'),
  asyncHandler(controller.addItem));

router.patch('/:id/items/:itemId', authorize(P.TRIP_UPDATE_OWN), writeLimiter,
  validate({ params: schemas.tripItemParam, body: schemas.updateTripItemSchema }),
  auditRoute('trip.item.updated', 'trip'),
  asyncHandler(controller.updateItemQuantity));

router.delete('/:id/items/:itemId', authorize(P.TRIP_UPDATE_OWN), writeLimiter,
  validate({ params: schemas.tripItemParam }),
  auditRoute('trip.item.removed', 'trip'),
  asyncHandler(controller.removeItem));

router.delete('/:id', authorize(P.TRIP_DELETE_OWN), writeLimiter,
  validate({ params: schemas.tripIdParam }),
  auditRoute('trip.deleted', 'trip'),
  asyncHandler(controller.remove));

const openapiPaths = {
  '': {
    get: {
      tags: ['trips'], summary: 'Listar mis viajes',
      responses: { 200: { description: 'Lista' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['trips'], summary: 'Crear viaje',
      responses: { 201: { description: 'Viaje creado' }, 400: { description: 'Solicitud invalida' } },
    },
  },
  '/{id}': {
    get: {
      tags: ['trips'], summary: 'Detalle de un viaje',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Viaje' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { description: 'No encontrado' } },
    },
    patch: {
      tags: ['trips'], summary: 'Actualizar datos del viaje',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Viaje actualizado' }, 400: { description: 'Solicitud invalida' } },
    },
    delete: {
      tags: ['trips'], summary: 'Eliminar viaje (soft delete)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 204: { description: 'Eliminado' }, 404: { description: 'No encontrado' } },
    },
  },
  '/{id}/budget': { get: { tags: ['trips'], summary: 'Presupuesto calculado del viaje', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Desglose' } } } },
  '/{id}/travelers': {
    patch: {
      tags: ['trips'], summary: 'Actualizar cantidad de viajeros y recalcular presupuesto',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Presupuesto recalculado' }, 400: { description: 'Solicitud invalida' } },
    },
  },
  '/{id}/items': {
    post: {
      tags: ['trips'], summary: 'Agregar concepto al itinerario',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 201: { description: 'Concepto agregado' }, 400: { description: 'Solicitud invalida' } },
    },
  },
  '/{id}/items/{itemId}': {
    patch: {
      tags: ['trips'], summary: 'Actualizar cantidad de un concepto y recalcular presupuesto',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: { 200: { description: 'Presupuesto recalculado' }, 404: { description: 'Concepto no encontrado' } },
    },
    delete: {
      tags: ['trips'], summary: 'Eliminar concepto del itinerario y recalcular presupuesto',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: { 200: { description: 'Presupuesto recalculado' }, 404: { description: 'Concepto no encontrado' } },
    },
  },
};

module.exports = { basePath: '/trips', router, openapiPaths };
