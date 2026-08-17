/**
 * DUENO: Isa (modulo A).
 * Espejo de los patrones del backend (auth.schema.js / users.routes.js),
 * solo para avisar en vivo. La validacion que cuenta es siempre la del
 * servidor. Usan `*` (no `+`) a proposito: mientras el campo esta vacio
 * no queremos que se vea invalido, eso lo cubre `required` aparte.
 */
export const PATRON_NOMBRE = /^[\p{L}\s'-]*$/u;
export const PATRON_CIUDAD = /^[\p{L}\s'.-]*$/u;

export const esNombreValido = (valor) => PATRON_NOMBRE.test(valor);
export const esCiudadValida = (valor) => PATRON_CIUDAD.test(valor);
