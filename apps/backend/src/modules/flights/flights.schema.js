const { z } = require('zod');
const { resolveIata } = require('./airports');
const { isInWindow, todayStr } = require('./dates');
const { CURRENCIES } = require('./currency');

// Acepta nombre de ciudad ("Cancun") o codigo IATA ("CUN"), y lo resuelve
// a IATA para Duffel. Un IATA de 3 letras se acepta siempre.
const iata = z.string().trim().min(2, 'Escribe un nombre de ciudad o un codigo IATA').max(80)
  .transform((raw) => resolveIata(raw))
  .refine((code) => code !== null, { message: 'No se encontro esa ciudad o aeropuerto' });

// Ventana de busqueda: de HOY a HOY + 11 meses (RF y UI coinciden).
const windowDate = z.string()
  .refine((d) => isInWindow(d), { message: `La fecha debe estar entre ${todayStr()} y hasta 11 meses` });

// Fecha de regreso: puede ir vacia cuando el vuelo es solo ida.
const optionalWindowDate = z.string()
  .refine((d) => d === '' || isInWindow(d), { message: `La fecha debe estar entre ${todayStr()} y hasta 11 meses` });

const searchFlightsSchema = z.object({
  origin: iata,
  destination: iata,
  departureDate: windowDate,
  returnDate: optionalWindowDate.optional(),
  tripType: z.enum(['round_trip', 'one_way']).default('round_trip'),
  // Viajeros: se descompone en adultos/niños/bebes. `travelers` (total) se
  // mantiene para compatibilidad; si llega `adults`, ese es el que manda.
  travelers: z.coerce.number().int().min(1, 'Minimo 1 viajero').max(9, 'Maximo 9 viajeros').optional(),
  adults: z.coerce.number().int().min(1, 'Minimo 1 adulto').max(9, 'Maximo 9 adultos').optional(),
  children: z.coerce.number().int().min(0).max(9, 'Maximo 9 niños').default(0),
  infants: z.coerce.number().int().min(0).max(9, 'Maximo 9 bebes').default(0),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
  currency: z.enum(CURRENCIES).default('MXN'),
}).strict()
  .refine((v) => v.origin !== v.destination, {
    message: 'El origen y el destino no pueden ser iguales', path: ['destination'],
  })
  .refine((v) => v.tripType === 'one_way' || !!v.returnDate, {
    message: 'Ingresa la fecha de regreso', path: ['returnDate'],
  })
  .refine((v) => !v.returnDate || v.returnDate >= v.departureDate, {
    message: 'La fecha de regreso no puede ser anterior a la salida', path: ['returnDate'],
  })
  .refine((v) => v.adults === undefined || v.adults + v.children + v.infants <= 9, {
    message: 'El grupo no puede superar 9 pasajeros', path: ['adults'],
  });

module.exports = { searchFlightsSchema };
