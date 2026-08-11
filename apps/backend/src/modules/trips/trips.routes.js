/** Rutas de viajes e itinerario. DUENO: integrante C. */
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

router.delete('/:id', authorize(P.TRIP_DELETE_OWN), writeLimiter,
  validate({ params: schemas.tripIdParam }),
  auditRoute('trip.deleted', 'trip'),
  asyncHandler(controller.remove));

const openapiPaths = {
  '': { get: { tags: ['trips'], summary: 'Listar mis viajes', responses: { 200: { description: 'Lista' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
  '/{id}': { get: { tags: ['trips'], summary: 'Detalle de un viaje', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Viaje' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { description: 'No encontrado' } } } },
  '/{id}/budget': { get: { tags: ['trips'], summary: 'Presupuesto calculado del viaje', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Desglose' } } } },
};

module.exports = { basePath: '/trips', router, openapiPaths };
