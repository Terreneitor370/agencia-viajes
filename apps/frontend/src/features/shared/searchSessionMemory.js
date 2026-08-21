/**
 * Recuerda la ultima busqueda (formulario + resultados) de cada pantalla de
 * descubrimiento, para que un usuario que se va a /login a medio navegar
 * (por ejemplo, "Agregar al viaje" sin sesion) regrese encontrando lo mismo
 * que tenia en pantalla, en vez de un formulario en blanco.
 *
 * En memoria del modulo, NUNCA en localStorage/sessionStorage (misma regla
 * del proyecto que pendingTripItem.js): no deberia sobrevivir un cierre de
 * pestana, solo la navegacion de ida y vuelta a /login dentro de la SPA.
 */
const memoria = {};

export function guardarBusqueda(clave, datos) {
  memoria[clave] = datos;
}

export function leerBusqueda(clave) {
  return memoria[clave] || null;
}

export function limpiarBusqueda(clave) {
  delete memoria[clave];
}
