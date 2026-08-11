/** Rutas de presupuesto. DUENO: integrante C. */
const { Router } = require('express');
const { z } = require('zod');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const asyncHandler = require('../../core/asyncHandler');
const respond = require('../../core/respond');
const { PERMISSIONS: P } = require('../../config/roles');
const { computeBudget } = require('./budget.engine');

const router = Router();

const simulateSchema = z.object({
  travelers: z.coerce.number().int().min(1).max(20),
  nights: z.coerce.number().int().min(1).max(90),
  rooms: z.coerce.number().int().min(1).max(10).optional(),
  contingencyRate: z.coerce.number().min(0).max(0.5).default(0.10),
  budgetLimit: z.coerce.number().min(0).max(10_000_000).nullable().default(null),
  items: z.array(z.object({
    type: z.enum(['flight', 'stay', 'experience', 'other']),
    unitPriceCents: z.number().int().min(0).max(100_000_000),
    pricingMode: z.enum(['per_person', 'per_group', 'per_night_per_room', 'per_person_per_day']),
    quantity: z.number().int().min(1).max(50).default(1),
  })).max(100),
}).strict();

/**
 * Simulador sin persistencia: el frontend lo llama en cada cambio del selector
 * de viajeros. Es idempotente y no toca la base de datos.
 */
router.post('/simulate', authenticate, authorize(P.BUDGET_READ_OWN), validate({ body: simulateSchema }),
  asyncHandler(async (req, res) => {
    const { items, travelers, nights, rooms, contingencyRate, budgetLimit } = req.body;
    const result = computeBudget({
      items,
      trip: { travelers, nights, rooms, days: nights + 1 },
      contingencyRate,
      budgetLimit,
    });
    return respond.ok(res, result);
  }));

const openapiPaths = {
  '/simulate': {
    post: {
      tags: ['budget'], summary: 'Simular presupuesto para N viajeros',
      responses: { 200: { description: 'Desglose del presupuesto' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};

module.exports = { basePath: '/budget', router, openapiPaths };
