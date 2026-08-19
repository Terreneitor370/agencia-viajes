/**
 * MOTOR DE PRESUPUESTO DINAMICO. DUENO: Jeshua (modulo C).
 *
 * Aritmetica pura y nada mas. La estimacion de precios NO vive aqui: se movio
 * a core/estimacion.js porque la consume el modulo de descubrimiento, y no
 * tiene por que depender de este archivo para eso.
 *
 * Funciones PURAS: sin base de datos, sin HTTP, sin Express. Esto es deliberado:
 *  - Se puede probar con tests unitarios en segundos, sin levantar nada.
 *  - Es el unico lugar del sistema donde vive la aritmetica del dinero, asi que
 *    un error de calculo tiene un solo sitio donde buscarse.
 *
 * REGLA DE ORO DEL DINERO: todo se maneja en la unidad minima (centavos, enteros).
 * Nunca sumar floats: 0.1 + 0.2 !== 0.3 y en un presupuesto eso se nota.
 */

/**
 * Como escala el precio de un concepto al cambiar la cantidad de viajeros.
 *   per_person          -> vuelo, entrada a museo: precio x viajeros
 *   per_group           -> renta de auto, tour privado: precio fijo
 *   per_night_per_room  -> hotel: precio x noches x habitaciones
 *   per_person_per_day  -> comidas, transporte local: precio x viajeros x dias
 */
const PRICING_MODES = ['per_person', 'per_group', 'per_night_per_room', 'per_person_per_day'];

const DEFAULT_CONTINGENCY_RATE = 0.10;

/** Convierte dinero decimal a centavos sin arrastrar error binario de floats. */
function moneyToCents(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;

  const match = text.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!match) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.round(numeric * 100) : null;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const units = Number(match[2]);
  const decimals = (match[3] || '');
  const firstTwo = Number((decimals + '00').slice(0, 2));
  const third = Number((decimals + '000').charAt(2));

  return sign * (units * 100 + firstTwo + (third >= 5 ? 1 : 0));
}

const toCents = (amount) => moneyToCents(amount) ?? 0;
const toMoney = (cents) => Math.round(cents) / 100;

/**
 * Calcula el subtotal de UN concepto, en centavos.
 * @param {object} item  { unitPriceCents, pricingMode, quantity }
 * @param {object} trip  { travelers, nights, days, rooms }
 */
function itemSubtotalCents(item, trip) {
  const qty = Math.max(1, item.quantity ?? 1);
  const travelers = Math.max(1, trip.travelers ?? 1);
  const nights = Math.max(1, trip.nights ?? 1);
  const days = Math.max(1, trip.days ?? nights + 1);
  const rooms = Math.max(1, trip.rooms ?? Math.ceil(travelers / 2));
  const unit = item.unitPriceCents;

  switch (item.pricingMode) {
    case 'per_person': return unit * travelers * qty;
    case 'per_group': return unit * qty;
    case 'per_night_per_room': return unit * nights * rooms * qty;
    case 'per_person_per_day': return unit * travelers * days * qty;
    default: throw new Error(`pricingMode desconocido: ${item.pricingMode}`);
  }
}

/**
 * Recalcula el presupuesto completo de un viaje.
 * Esta es la funcion que se vuelve a ejecutar cada vez que el usuario mueve el
 * selector de "cantidad de viajeros": no se guarda un total, se recalcula.
 *
 * @returns {{ byCategory: object, subtotal: number, contingency: number, total: number,
 *             perPerson: number, currency: string, overBudget: boolean }}
 */
function computeBudget({ items = [], trip, contingencyRate = DEFAULT_CONTINGENCY_RATE, currency = 'MXN', budgetLimit = null }) {
  const byCategoryCents = { flight: 0, stay: 0, experience: 0, other: 0 };

  for (const item of items) {
    const category = byCategoryCents[item.type] !== undefined ? item.type : 'other';
    byCategoryCents[category] += itemSubtotalCents(item, trip);
  }

  const subtotalCents = Object.values(byCategoryCents).reduce((a, b) => a + b, 0);
  // Fondo de imprevistos: estandar en planeacion de viajes, 10% por defecto.
  const contingencyCents = Math.round(subtotalCents * contingencyRate);
  const totalCents = subtotalCents + contingencyCents;
  const travelers = Math.max(1, trip.travelers ?? 1);
  const budgetLimitCents = moneyToCents(budgetLimit);

  return {
    currency,
    contingencyRate,
    byCategory: Object.fromEntries(Object.entries(byCategoryCents).map(([k, v]) => [k, toMoney(v)])),
    subtotal: toMoney(subtotalCents),
    contingency: toMoney(contingencyCents),
    total: toMoney(totalCents),
    perPerson: toMoney(totalCents / travelers),
    budgetLimit: budgetLimitCents != null ? toMoney(budgetLimitCents) : null,
    overBudget: budgetLimitCents != null && totalCents > budgetLimitCents,
    remaining: budgetLimitCents != null ? toMoney(budgetLimitCents - totalCents) : null,
  };
}

module.exports = {
  PRICING_MODES,
  DEFAULT_CONTINGENCY_RATE,
  toCents,
  toMoney,
  moneyToCents,
  itemSubtotalCents,
  computeBudget,
};
