/**
 * DUENO: Isa (modulo A).
 * Espejo del patron de auth.schema.js (backend), solo para avisar en vivo.
 * La validacion que cuenta es siempre la del servidor.
 */
export const LONGITUD_MINIMA_CONTRASENA = 12;
const PATRON_COMUN = /^(?:password|contrasena|12345678|qwerty)/i;

export function evaluarContrasena(valor) {
  const longitud = valor.length;
  const comun = longitud > 0 && PATRON_COMUN.test(valor);
  return { longitud, comun, cumple: longitud >= LONGITUD_MINIMA_CONTRASENA && !comun };
}
