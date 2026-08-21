/**
 * Recuerda la ultima busqueda (formulario + resultados) de cada pantalla de
 * descubrimiento, para que un usuario que se va a /login a medio navegar
 * (por ejemplo, "Agregar al viaje" sin sesion) regrese encontrando lo mismo
 * que tenia en pantalla, en vez de un formulario en blanco.
 *
 * En memoria del modulo como via principal, con la busqueda completa
 * (formulario + resultados). Respaldado ademas en una cookie de corta vida
 * (ver clientCookie.js -- NUNCA localStorage/sessionStorage) SOLO con el
 * formulario, nunca los resultados: el login con Google exige salir de la
 * SPA por completo y volver por un redirect del servidor, lo que borra la
 * memoria de JS igual que cerrar la pestana, y una lista de resultados no
 * cabe con margen en una cookie. Quien restaura desde la cookie sabe que
 * le falta el campo `resultados` y debe volver a buscar con ese formulario
 * (una busqueda real, no instantanea, pero sin que la persona tenga que
 * volver a escribir nada).
 */
import { borrarCookie, guardarCookie, leerCookie } from './clientCookie';

const memoria = {};
const cookieDe = (clave) => `viaja_busqueda_${clave}`;

export function guardarBusqueda(clave, datos) {
  memoria[clave] = datos;
  if (datos?.form) guardarCookie(cookieDe(clave), { form: datos.form });
}

export function leerBusqueda(clave) {
  return memoria[clave] || leerCookie(cookieDe(clave));
}

export function limpiarBusqueda(clave) {
  delete memoria[clave];
  borrarCookie(cookieDe(clave));
}
