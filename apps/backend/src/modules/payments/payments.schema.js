const { z } = require('zod');

const uuid = z.string().uuid();

const createCheckoutSchema = z.object({
  tripId: uuid,
  currency: z.enum(['MXN', 'USD', 'EUR']).default('MXN'),
}).strict();

const webhookBody = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
}).strict();

module.exports = { createCheckoutSchema, webhookBody };
