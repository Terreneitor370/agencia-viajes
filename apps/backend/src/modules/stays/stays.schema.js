const { z } = require('zod');
const { isInWindow, todayStr } = require('../flights/dates');
const { CURRENCIES } = require('../flights/currency');

const searchStaysSchema = z.object({
  city: z.string().trim().min(2).max(80).regex(/^[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s.\-]+$/, 'Solo se permiten letras, espacios y guiones'),
  countryCode: z.string().trim().length(2).optional(),
  checkIn: z.string().refine((d) => isInWindow(d), { message: `La entrada debe estar entre ${todayStr()} y hasta 11 meses` }),
  checkOut: z.string().refine((d) => isInWindow(d), { message: `La salida debe estar entre ${todayStr()} y hasta 11 meses` }),
  travelers: z.coerce.number().int().min(1).max(20).default(1),
  radiusKm: z.coerce.number().min(1).max(30).default(8),
  limit: z.coerce.number().int().min(1).max(40).default(20),
  currency: z.enum(CURRENCIES).default('MXN'),
}).strict().refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
  message: 'La salida debe ser posterior a la entrada', path: ['checkOut'],
});

module.exports = { searchStaysSchema };
