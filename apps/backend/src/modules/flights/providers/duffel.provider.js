/**
 * Adaptador del proveedor de vuelos (Duffel, entorno de pruebas).
 * DUENO: Kassie (modulo B).
 *
 * Por que un adaptador y no llamar a la API desde el servicio:
 *  - Amadeus cerro su portal self-service el 17/07/2026. El unico seguro contra
 *    que esto vuelva a pasar es aislar al proveedor detras de una interfaz.
 *  - El resto del sistema solo conoce el tipo `FlightOffer` normalizado.
 *    Cambiar de proveedor = reescribir este archivo, nada mas.
 *  - La clave de API vive SOLO aqui, del lado del servidor.
 */
const { z } = require('zod');
const httpClient = require('../../../core/httpClient');
const env = require('../../../config/env');
const ApiError = require('../../../core/ApiError');
const logger = require('../../../core/logger');
const flightCache = require('../flights.cache');

const BASE_URL = 'https://api.duffel.com';

/** Contrato minimo que esperamos del tercero. Si no lo cumple, fallamos rapido. */
const responseSchema = z.object({
  data: z.object({
    offers: z.array(z.object({
      id: z.string(),
      total_amount: z.string(),
      total_currency: z.string(),
      slices: z.array(z.unknown()),
      owner: z.object({ name: z.string().optional(), iata_code: z.string().optional() }).optional(),
    })).default([]),
  }),
});

const headers = () => ({
  Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
  'Duffel-Version': env.DUFFEL_API_VERSION,
  'Content-Type': 'application/json',
});

/** "PT2H17M" -> minutos (137). Duffel manda duraciones en ISO 8601. */
function parseDuration(iso) {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}

/** Equipaje del primer pasajero del primer tramo: maleta documentada y de mano. */
function baggageSummary(passengers) {
  const bags = (passengers || [])[0]?.baggages || [];
  let carryOn = 0;
  let checked = 0;
  for (const b of bags) {
    if (b.type === 'carry_on') carryOn += b.quantity;
    if (b.type === 'checked') checked += b.quantity;
  }
  return { carryOn, checked };
}

/** Normaliza la respuesta del proveedor al contrato interno `FlightOffer`. */
function normalize(offer) {
  const first = offer.slices?.[0] || {};
  const segments = first.segments || [];
  const pax = segments[0]?.passengers?.[0] || {};
  const cabin = pax.cabin || {};
  const cond = offer.conditions || {};
  
  // Obtener la hora de salida
  const departureTime = segments[0]?.departing_at;
  
  // 🔧 FILTRO: Si el vuelo ya salió, lo marcamos como no disponible
  if (departureTime && new Date(departureTime) < new Date()) {
    return null; // ← Este vuelo se descartará
  }
  
  return {
    provider: 'duffel',
    externalId: offer.id,
    airline: offer.owner?.name || offer.owner?.iata_code || 'Desconocida',
    origin: segments[0]?.origin?.iata_code ?? null,
    destination: segments.at(-1)?.destination?.iata_code ?? null,
    departureAt: departureTime ?? null,
    arrivalAt: segments.at(-1)?.arriving_at ?? null,
    stops: Math.max(segments.length - 1, 0),
    flightNumber: segments[0]?.marketing_carrier_flight_number ?? null,
    aircraft: segments[0]?.aircraft?.name || null,
    durationMin: parseDuration(first.duration),
    originTerminal: segments[0]?.origin_terminal ?? null,
    destinationTerminal: segments[0]?.destination_terminal ?? null,
    baggage: baggageSummary(segments[0]?.passengers),
    cabin: {
      name: cabin.marketing_name || null,
      seat: {
        pitch: cabin.amenities?.seat?.pitch || null,
        legroom: cabin.amenities?.seat?.legroom || null,
      },
      wifi: {
        available: Boolean(cabin.amenities?.wifi?.available),
        cost: cabin.amenities?.wifi?.cost || null,
      },
      power: Boolean(cabin.amenities?.power?.available),
    },
    refundable: Boolean(cond.refund_before_departure?.allowed),
    changeable: Boolean(cond.change_before_departure?.allowed),
    tripType: offer.slices.length > 1 ? 'round_trip' : 'one_way',
    price: { amount: Number(offer.total_amount), currency: offer.total_currency },
    // Clave para el motor de presupuesto: el precio de un vuelo es POR PERSONA.
    pricingMode: 'per_person',
  };
}

async function searchOffers({ origin, destination, departureDate, returnDate, travelers, cabinClass = 'economy', tripType = 'round_trip' }) {
  if (!env.DUFFEL_API_TOKEN) {
    logger.warn('DUFFEL_API_TOKEN sin configurar: se usan datos semilla');
    throw ApiError.upstream('Proveedor de vuelos no configurado');
  }

  // RF-B-07: cache de respuestas (la busqueda es POST; httpClient solo cachea GET).
  // La version invalida entradas cacheadas con un esquema de oferta anterior.
  const cacheKey = flightCache.keyOf({ version: 'v2-details', origin, destination, departureDate, returnDate, travelers, cabinClass, tripType });
  const cached = await flightCache.get(cacheKey);
  if (cached) {
    logger.debug('Vuelos servidos desde cache', { origin, destination, tripType });
    return cached;
  }

  // Redondo = 2 tramos (ida y regreso); sencillo = 1 tramo.
  const slices = [{ origin, destination, departure_date: departureDate }];
  if (tripType === 'round_trip' && returnDate) {
    slices.push({ origin: destination, destination: origin, departure_date: returnDate });
  }

  const payload = {
    data: {
      slices,
      passengers: Array.from({ length: travelers }, () => ({ type: 'adult' })),
      cabin_class: cabinClass,
    },
  };

  const raw = await httpClient.request({
    url: `${BASE_URL}/air/offer_requests?return_offers=true`,
    method: 'POST',
    headers: headers(),
    body: payload,
    provider: 'duffel',
    schema: responseSchema,
    timeoutMs: 12000, // la busqueda de vuelos es lenta por naturaleza
  });

  // 🔧 CORREGIDO: Normalizar y filtrar vuelos que ya salieron
  const offers = raw.data.offers
    .map(normalize)          // Normalizar cada oferta
    .filter(offer => offer !== null); // Eliminar los que ya salieron

  await flightCache.set(cacheKey, offers);
  return offers;
}

module.exports = { searchOffers, normalize };