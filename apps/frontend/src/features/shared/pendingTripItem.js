/**
 * "Agregar al viaje" pendiente de sesion: se guarda cuando alguien sin login
 * intenta agregar algo, y se completa solo despues de iniciar sesion.
 *
 * En memoria del modulo como via principal (rapido, y de entrada no
 * sobrevive un cierre de pestana). Respaldado ademas en una cookie de corta
 * vida (ver clientCookie.js -- NUNCA localStorage/sessionStorage, eso si lo
 * prohibe la regla del proyecto) porque el login con Google exige salir de
 * la SPA por completo hacia accounts.google.com y volver por un redirect
 * del servidor: eso borra la memoria de JS igual que cerrar la pestana, y
 * sin este respaldo el intento quedaba huerfano (Isa lo reporto: "me
 * logueo con Google y no se guarda nada del viaje").
 */
import { borrarCookie, guardarCookie, leerCookie } from './clientCookie';

const COOKIE_PENDIENTE = 'viaja_pendiente';
let pendiente = null;

export function guardarPendiente(item, type, tripId = '', continueUrl = '') {
  pendiente = { item, type, tripId: tripId || '', continueUrl: continueUrl || '' };
  guardarCookie(COOKIE_PENDIENTE, pendiente);
}

export function leerPendiente() {
  return pendiente || leerCookie(COOKIE_PENDIENTE);
}

export function limpiarPendiente() {
  pendiente = null;
  borrarCookie(COOKIE_PENDIENTE);
}

/** Reduce los asientos de MapaAsientos.jsx (designator, available, price, currency,
 * disclosures, name) a solo lo que vale la pena guardar en el itinerario. */
function resumenAsientos(seats) {
  return seats?.length ? seats.map((s) => ({ designator: s.designator, price: s.price || 0, currency: s.currency || null })) : null;
}

/** Campos que dependen del tipo de resultado (vuelo, hospedaje, o cualquier otro). */
function camposPorTipo(item, type) {
  if (type === 'flight') {
    const originCity = item.originCity || item.origin || '';
    const destinationCity = item.destinationCity || item.destination || '';
    const seatsOut = resumenAsientos(item.seats?.outbound);
    const seatsRet = resumenAsientos(item.seats?.return);
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
        // Seleccionados en SeatSelectionPage.jsx: antes se descartaban al
        // guardar el vuelo en el viaje, aunque la pantalla de asientos ya le
        // mostraba al usuario cual eligio y cuanto costaba de mas.
        // extraChargeCents ya viene sumado dentro de unitPriceCents (ver
        // buildFlightOffer en SeatSelectionPage.jsx): se repite aqui solo
        // para poder mostrar el desglose en el detalle del viaje.
        seats: (seatsOut || seatsRet) ? { outbound: seatsOut, return: seatsRet, extraChargeCents: item.seats?.extraChargeCents || 0 } : null,
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
