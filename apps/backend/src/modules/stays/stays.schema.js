const { z } = require('zod');

const searchStaysSchema = z.object({
  city: z.string().trim().min(2).max(80),
  countryCode: z.string().trim().length(2).optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  travelers: z.coerce.number().int().min(1).max(20).default(1),
  radiusKm: z.coerce.number().min(1).max(30).default(8),
  limit: z.coerce.number().int().min(1).max(40).default(20),
}).strict().refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
  message: 'La salida debe ser posterior a la entrada', path: ['checkOut'],
});

module.exports = { searchStaysSchema };
