/** Rutas de pagos. DUENO: Kassie (modulo B). */
const { Router } = require('express');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const { writeLimiter } = require('../../middlewares/rateLimit');
const asyncHandler = require('../../core/asyncHandler');
const { createCheckoutSchema } = require('./payments.schema');
const { z } = require('zod');
const controller = require('./payments.controller');

const router = Router();

// Webhook de Stripe: NO usa authenticate (Stripe firma con su propio secreto).
// El body raw se maneja en app.js ANTES de express.json().
router.post('/webhook', asyncHandler(controller.webhook));

// Rutas protegidas
router.get('/orders', authenticate,
  validate({ query: z.object({ trip_id: z.string().uuid().optional(), session_id: z.string().optional() }).strict() }),
  asyncHandler(controller.listOrders),
);

router.post('/checkout', authenticate, writeLimiter,
  validate({ body: createCheckoutSchema }),
  asyncHandler(controller.createCheckout),
);

router.post('/intent', authenticate, writeLimiter,
  validate({ body: createCheckoutSchema }),
  asyncHandler(controller.createPaymentIntent),
);

router.post('/orders/:id/confirm', authenticate,
  asyncHandler(controller.confirmOrder),
);

router.get('/orders/:id', authenticate,
  asyncHandler(controller.orderStatus),
);

const openapiPaths = {
  '/checkout': {
    post: {
      tags: ['payments'], summary: 'Crear sesion de checkout con Stripe',
      responses: { 201: { description: 'Sesion creada' }, 400: { description: 'Solicitud invalida' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
  '/webhook': {
    post: {
      tags: ['payments'], summary: 'Webhook de Stripe (sin auth)',
      responses: { 200: { description: 'Recibido' } },
    },
  },
  '/orders/{id}': {
    get: {
      tags: ['payments'], summary: 'Estado de una orden',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Orden' }, 404: { description: 'No encontrada' } },
    },
  },
};

module.exports = { basePath: '/payments', router, openapiPaths };
