/**
 * Reglas de fechas del modulo de descubrimiento. DUENO: Kassie (modulo B).
 * Uso compartido: flights y stays.
 *
 * La busqueda solo acepta fechas desde HOY hasta HOY + 11 meses (ventana que
 * tambien aplica el frontend). Vivir aqui evita duplicar la logica en los dos
 * schemas y en el frontend basta un select min/max nativo.
 */

const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayStr = () => toLocalDateStr(new Date());

/** Hoy + 11 meses, como string YYYY-MM-DD. */
const maxDateStr = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 11);
  return toLocalDateStr(d);
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Valida formato y ventana [hoy, hoy+11 meses]. Devuelve true si es valida. */
const isInWindow = (date) =>
  DATE_PATTERN.test(date) && date >= todayStr() && date <= maxDateStr();

module.exports = { todayStr, maxDateStr, isInWindow, DATE_PATTERN };
