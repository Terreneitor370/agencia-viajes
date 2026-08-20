/**
 * "Agregar al viaje" pendiente de sesion: se guarda cuando alguien sin login
 * intenta agregar algo, y se completa solo despues de iniciar sesion.
 *
 * En memoria del modulo, NUNCA en localStorage/sessionStorage (regla del
 * proyecto: nada de eso, la sesion vive solo en cookies httpOnly). Encaja
 * bien ademas: esta intencion no deberia sobrevivir un cierre de pestana,
 * solo la navegacion de ida y vuelta a /login dentro de la misma SPA.
 */
let pendiente = null;

export function guardarPendiente(item, type, tripId = '') {
  pendiente = { item, type, tripId: tripId || '' };
}

export function leerPendiente() {
  return pendiente;
}

export function limpiarPendiente() {
  pendiente = null;
}

/** Campos que dependen del tipo de resultado (vuelo, hospedaje, o cualquier otro). */
function camposPorTipo(item, type) {
  if (type === 'flight') {
    const originCity = item.originCity || item.origin || '';
    const destinationCity = item.destinationCity || item.destination || '';
    return {
      title: `${item.origin} → ${item.destination} (${item.airline})`,
      unitPriceCents: Math.round(item.price.amount * 100),
      currency: item.price.currency || 'MXN',
      pricingMode: item.pricingMode || 'per_person',
      estimated: item.price.estimated || false,
      meta: {
        originCode: item.origin || null,
        destinationCode: item.destination || null,
        originCity,
        destinationCity,
        departureAt: item.departureAt || null,
        returnDepartureAt: item.return?.departureAt || null,
      },
    };
  }
  if (type === 'stay') {
    return {
      title: item.name || 'Hospedaje sin nombre',
      unitPriceCents: Math.round((item.price?.amount || 0) * 100),
      currency: item.price?.currency || 'MXN',
      pricingMode: item.pricingMode || 'per_night_per_room',
      estimated: item.price?.estimated || true,
      meta: {
        address: item.address || null,
        city: item.city || null,
        stars: item.stars || null,
        phone: item.phone || null,
        website: item.website || null,
      },
    };
  }
  return {
    title: item.name || item.title || 'Elemento sin nombre',
    unitPriceCents: Math.round((item.price?.amount || 0) * 100),
    currency: item.price?.currency || 'MXN',
    pricingMode: item.pricingMode || 'per_person',
    estimated: item.price?.estimated || true,
    meta: item.meta || null,
  };
}

/** Construye el payload de POST /trips/:id/items para un item de busqueda. */
export function construirPayload(item, type) {
  const extras = camposPorTipo(item, type);
  return {
    type,
    provider: item.provider || 'unknown',
    externalId: item.externalId || null,
    quantity: 1,
    ...extras,
  };
}
