import httpClient from '../../core/httpClient.js';
import logger from '../../core/logger.js';

const DUFFEL_API = 'https://api.duffel.com/air/offer_requests';

export async function searchDuffelFlights(params) {
  const { origin, destination, departureDate, travelers, cabinClass } = params;

  // Si no hay token, devolver datos de ejemplo (degradación elegante)
  if (!process.env.DUFFEL_API_TOKEN) {
    logger.warn('DUFFEL_API_TOKEN no configurado, usando datos de ejemplo');
    return getFallbackFlights(params);
  }

  try {
    const response = await httpClient(DUFFEL_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Duffel-Version': 'v2',
        'Authorization': `Bearer ${process.env.DUFFEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          slices: [{
            origin,
            destination,
            departure_date: departureDate,
          }],
          passengers: [{ type: 'adult', count: travelers }],
          cabin_class: cabinClass || 'economy',
          max_connections: 1,
        },
      }),
    });

    return normalizeDuffelResponse(response.data, travelers);
  } catch (error) {
    logger.error({ error, params }, 'Error en Duffel API');
    return getFallbackFlights(params);
  }
}

function normalizeDuffelResponse(data, travelers) {
  if (!data.data || !data.data.length) {
    return [];
  }

  return data.data.map((offer) => {
    const slice = offer.slices[0];
    const segments = slice.segments || [];
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    return {
      id: offer.id,
      provider: 'duffel',
      airline: offer.owner?.name || 'Duffel Airways',
      airlineIata: offer.owner?.iata_code || '',
      origin: slice.origin?.iata_code || '',
      destination: slice.destination?.iata_code || '',
      departureTime: firstSegment?.departing_at || new Date().toISOString(),
      arrivalTime: lastSegment?.arriving_at || new Date().toISOString(),
      stops: segments.length - 1,
      pricePerPersonCents: Math.round(parseFloat(offer.total_amount) * 100),
      currency: offer.total_currency || 'MXN',
      pricingMode: 'per_person',
      estimated: false,
      totalPriceCents: Math.round(parseFloat(offer.total_amount) * 100 * travelers),
    };
  });
}

function getFallbackFlights({ origin, destination, travelers }) {
  return [{
    id: `fallback-${Date.now()}`,
    provider: 'duffel',
    airline: 'Duffel Airways (datos de ejemplo)',
    airlineIata: 'DF',
    origin,
    destination,
    departureTime: new Date().toISOString(),
    arrivalTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    stops: 0,
    pricePerPersonCents: 250000,
    currency: 'MXN',
    pricingMode: 'per_person',
    estimated: true,
    degraded: true,
    totalPriceCents: 250000 * travelers,
  }];
}