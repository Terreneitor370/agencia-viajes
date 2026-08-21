/**
 * Lectura/escritura de cookies para datos efimeros de UI (que se estaba por
 * agregar al viaje, que se estaba buscando) que necesitan sobrevivir una
 * navegacion COMPLETA del navegador -- como la que exige "Continuar con
 * Google" (sale del SPA hacia accounts.google.com y regresa por un
 * redirect del servidor), que borra cualquier estado en memoria de JS.
 *
 * OJO: esto NO es lo que prohibe la regla del proyecto de "nada de
 * localStorage/sessionStorage". Esa regla es sobre datos DE SESION
 * (tokens): la sesion en si sigue viviendo solo en cookies httpOnly que
 * este archivo ni siquiera puede leer. Esta cookie es deliberadamente
 * JS-legible (document.cookie normal, no httpOnly), de corta duracion, y
 * nunca lleva nada sensible -- solo la forma de una busqueda o el item que
 * se queria agregar. Es el mismo mecanismo (cookies) que ya usa el
 * proyecto para la sesion, aplicado a un dato distinto.
 */
const MAX_EDAD_SEGUNDOS = 15 * 60; // alcanza de sobra para un login, no para "recordar para siempre"
const LIMITE_BYTES = 3500; // margen bajo el limite tipico de ~4093 bytes por cookie

export function guardarCookie(nombre, valor) {
  try {
    const codificado = encodeURIComponent(JSON.stringify(valor));
    if (codificado.length > LIMITE_BYTES) return false;
    document.cookie = `${nombre}=${codificado}; path=/; max-age=${MAX_EDAD_SEGUNDOS}; samesite=lax`;
    return true;
  } catch {
    return false;
  }
}

export function leerCookie(nombre) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function borrarCookie(nombre) {
  document.cookie = `${nombre}=; path=/; max-age=0`;
}
