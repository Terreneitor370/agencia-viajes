/** Validacion del modulo de cotizaciones. DUENO: Kassie (modulo B). */
const { z } = require('zod');

const TOKEN_PATTERN = /^[a-f0-9]{16,64}$/i;

/**
 * Mismo contrato que trips `addTripItemSchema` (congelado tras el dia 0): un
 * item de cotizacion puede migrarse a un viaje sin transformacion. Se define
 * aqui (y no se importa de trips) para mantener los modulos independientes.
 */
const quoteItemSchema = z.object({
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

const createQuoteSchema = z.object({
  token: z.string().regex(TOKEN_PATTERN, 'Token de invitado invalido'),
  item: quoteItemSchema,
}).strict();

const listQuotesSchema = z.object({
  token: z.string().regex(TOKEN_PATTERN, 'Token de invitado invalido'),
}).strict();

module.exports = { TOKEN_PATTERN, createQuoteSchema, listQuotesSchema };
