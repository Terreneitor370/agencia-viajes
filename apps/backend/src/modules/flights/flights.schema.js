const { z } = require('zod');

const iata = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Codigo IATA de 3 letras');
const futureDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD')
  .refine((d) => new Date(d) >= new Date(new Date().toDateString()), 'La fecha no puede ser pasada');

const searchFlightsSchema = z.object({
  origin: iata,
  destination: iata,
  departureDate: futureDate,
  returnDate: futureDate.optional(),
  // Limite de negocio: evita que alguien pida 9999 pasajeros y nos tumbe la cuota.
  travelers: z.coerce.number().int().min(1).max(9).default(1),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
}).strict().refine((v) => v.origin !== v.destination, {
  message: 'El origen y el destino no pueden ser iguales', path: ['destination'],
});

module.exports = { searchFlightsSchema };
