/**
 * Formato de dinero y cantidades. DUENO: core compartido.
 *
 * Existe para que los tres modulos muestren "$1,850" igual en todas partes.
 * Que uno escriba "$1850.00" y otro "1,850 MXN" se nota inmediatamente y hace
 * ver la aplicacion como tres aplicaciones pegadas.
 */

const formateadores = new Map();

function formateador(moneda, decimales) {
  const clave = `${moneda}:${decimales}`;
  if (!formateadores.has(clave)) {
    formateadores.set(clave, new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }));
  }
  return formateadores.get(clave);
}

/**
 * Formatea un monto. Por omision sin centavos: en una pantalla con quince
 * cifras a la vez, los decimales son ruido. Usa `decimales: 2` solo donde el
 * centavo importe de verdad.
 */
export const dinero = (monto, moneda = 'MXN', { decimales = 0 } = {}) =>
  formateador(moneda, decimales).format(Number(monto) || 0);

/** Convierte centavos enteros (como los guarda la API) a texto. */
export const dineroDeCentavos = (centavos, moneda = 'MXN', opciones) =>
  dinero((Number(centavos) || 0) / 100, moneda, opciones);

/**
 * Explica en una linea de donde sale un total.
 * Ejemplo: "$3,480 × 6 personas" o "$1,850 × 4 noches × 3 hab."
 * Es lo que convierte una cifra en algo verificable a ojo.
 */
export function formulaDeConcepto({ modo, precioUnitario, moneda = 'MXN', viajeros, noches, habitaciones, dias }) {
  const u = dinero(precioUnitario, moneda);
  switch (modo) {
    case 'per_person': return `${u} × ${viajeros} ${viajeros === 1 ? 'persona' : 'personas'}`;
    case 'per_group': return `${u} precio fijo por grupo`;
    case 'per_night_per_room': return `${u} × ${noches} ${noches === 1 ? 'noche' : 'noches'} × ${habitaciones}`;
    case 'per_person_per_day': return `${u} × ${viajeros} × ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    default: return u;
  }
}

/** Una habitacion por cada dos viajeros. Regla de negocio, no de presentacion. */
export const habitacionesPara = (viajeros) => Math.ceil(Math.max(1, viajeros) / 2);

export const plural = (n, singular, pluralForma) => `${n} ${n === 1 ? singular : pluralForma}`;

/**
 * Fecha de un Date en YYYY-MM-DD, en la zona LOCAL del navegador -- no usar
 * date.toISOString().split('T')[0] para esto: toISOString primero convierte
 * a UTC, asi que en cualquier huso al oeste de UTC (todo Mexico) esa cuenta
 * ya se paso al dia siguiente desde media tarde en adelante. Con eso, un
 * input date con min={hoy calculado asi} bloqueaba justo la fecha de hoy en
 * esas horas -- el sintoma que se reporto ("no deja elegir hoy").
 */
export const fechaLocalISO = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
