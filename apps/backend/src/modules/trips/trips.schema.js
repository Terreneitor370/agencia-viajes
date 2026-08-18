const { z } = require('zod');

const uuid = z.string().uuid();
const ymdDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createTripSchema = z.object({
  title: z.string().trim().min(3).max(120),
  originCity: z.string().trim().min(2).max(80),
  destinationCity: z.string().trim().min(2).max(80),
  startDate: ymdDate,
  endDate: ymdDate,
  travelers: z.coerce.number().int().min(1).max(20),
  currency: z.enum(['MXN', 'USD', 'EUR']).default('MXN'),
  budgetLimit: z.coerce.number().min(0).max(10_000_000).nullable().default(null),
  // El campo `user_id` NO existe aqui a proposito: lo pone el servidor desde el
  // token. Aceptarlo del cliente seria un IDOR de manual.
}).strict().refine((v) => new Date(v.endDate) > new Date(v.startDate), {
  message: 'La fecha de regreso debe ser posterior a la de salida', path: ['endDate'],
});

/**
 * CONTRATO ENTRE MODULOS. Los modulos de vuelos/hospedaje/experiencias
 * (integrante B y C) producen objetos que encajan aqui, y el modulo de viajes
 * los recibe por HTTP. Ningun modulo importa codigo de otro: solo comparten
 * esta forma. Congelado tras el dia 0; cambiarlo requiere acuerdo de los 3.
 */
const addTripItemSchema = z.object({
  type: z.enum(['flight', 'stay', 'experience', 'other']),
  provider: z.string().trim().max(40),
  externalId: z.string().trim().max(120).nullable().default(null),
  title: z.string().trim().min(1).max(160),
  unitPriceCents: z.number().int().min(0).max(100_000_000),
  currency: z.enum(['MXN', 'USD', 'EUR']),
  pricingMode: z.enum(['per_person', 'per_group', 'per_night_per_room', 'per_person_per_day']),
  quantity: z.number().int().min(1).max(50).default(1),
  estimated: z.boolean().default(false),
  meta: z.record(z.string(), z.unknown()).nullable().default(null),
}).strict();

const updateTripSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  originCity: z.string().trim().min(2).max(80).optional(),
  destinationCity: z.string().trim().min(2).max(80).optional(),
  startDate: ymdDate.optional(),
  endDate: ymdDate.optional(),
  travelers: z.coerce.number().int().min(1).max(20).optional(),
  currency: z.enum(['MXN', 'USD', 'EUR']).optional(),
  budgetLimit: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  status: z.enum(['draft', 'planned', 'archived']).optional(),
}).strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  })
  .refine((v) => !v.startDate || !v.endDate || new Date(v.endDate) > new Date(v.startDate), {
    message: 'La fecha de regreso debe ser posterior a la de salida', path: ['endDate'],
  });

const updateTripItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(50),
}).strict();

const tripIdParam = z.object({ id: uuid }).strict();
const tripItemParam = z.object({ id: uuid, itemId: uuid }).strict();

module.exports = {
  createTripSchema,
  addTripItemSchema,
  updateTripSchema,
  updateTripItemSchema,
  tripIdParam,
  tripItemParam,
};
