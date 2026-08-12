const { z } = require('zod');

const iata = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Codigo IATA de 3 letras');

// Validación de fecha: no puede ser anterior a hoy (sin hora)
const futureDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD')
  .refine((d) => {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0');
    return d >= todayStr;
  }, 'La fecha no puede ser anterior a hoy');

const searchFlightsSchema = z.object({
  origin: iata,
  destination: iata,
  departureDate: futureDate,
  returnDate: futureDate.optional(),
  travelers: z.coerce.number().int().min(1).max(9).default(1),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
}).strict().refine((v) => v.origin !== v.destination, {
  message: 'El origen y el destino no pueden ser iguales', path: ['destination'],
});

module.exports = { searchFlightsSchema };