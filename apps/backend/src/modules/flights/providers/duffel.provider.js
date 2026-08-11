/**
 * Adaptador del proveedor de vuelos (Duffel, entorno de pruebas).
 * DUENO: integrante B.
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

/** Normaliza la respuesta del proveedor al contrato interno `FlightOffer`. */
function normalize(offer) {
  const first = offer.slices?.[0] || {};
  const segments = first.segments || [];
  return {
    provider: 'duffel',
    externalId: offer.id,
    airline: offer.owner?.name || offer.owner?.iata_code || 'Desconocida',
    origin: segments[0]?.origin?.iata_code ?? null,
    destination: segments.at(-1)?.destination?.iata_code ?? null,
    departureAt: segments[0]?.departing_at ?? null,
    arrivalAt: segments.at(-1)?.arriving_at ?? null,
    stops: Math.max(segments.length - 1, 0),
    price: { amount: Number(offer.total_amount), currency: offer.total_currency },
    // Clave para el motor de presupuesto: el precio de un vuelo es POR PERSONA.
    pricingMode: 'per_person',
  };
}

async function searchOffers({ origin, destination, departureDate, travelers, cabinClass = 'economy' }) {
  if (!env.DUFFEL_API_TOKEN) {
    logger.warn('DUFFEL_API_TOKEN sin configurar: se usan datos semilla');
    throw ApiError.upstream('Proveedor de vuelos no configurado');
  }

  const payload = {
    data: {
      slices: [{ origin, destination, departure_date: departureDate }],
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

  return raw.data.offers.map(normalize);
}

module.exports = { searchOffers, normalize };
