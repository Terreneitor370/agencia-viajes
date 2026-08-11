/**
 * MOTOR DE PRESUPUESTO DINAMICO. DUENO: integrante C.
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

const toCents = (amount) => Math.round(Number(amount) * 100);
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
function computeBudget({ items = [], trip, contingencyRate = 0.10, currency = 'MXN', budgetLimit = null }) {
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

  return {
    currency,
    byCategory: Object.fromEntries(Object.entries(byCategoryCents).map(([k, v]) => [k, toMoney(v)])),
    subtotal: toMoney(subtotalCents),
    contingency: toMoney(contingencyCents),
    total: toMoney(totalCents),
    perPerson: toMoney(totalCents / travelers),
    budgetLimit,
    overBudget: budgetLimit != null && toMoney(totalCents) > budgetLimit,
    remaining: budgetLimit != null ? toMoney(budgetLimit * 100 - totalCents) : null,
  };
}

/**
 * Estimacion de tarifa por noche cuando el proveedor no entrega precio.
 * Geoapify devuelve puntos de interes, no tarifas. Se marca `estimated: true`
 * para que la interfaz lo muestre como estimacion y no como precio real:
 * presentar un numero inventado como si fuera firme es un problema de producto,
 * no solo de codigo.
 */
const NIGHTLY_BASE_MXN = { 'accommodation.hotel': 1800, 'accommodation.apartment': 1400, 'accommodation.hostel': 600 };

function estimateNightlyRate(place) {
  const match = (place.categories || []).find((c) => NIGHTLY_BASE_MXN[c] !== undefined);
  return { amount: NIGHTLY_BASE_MXN[match] ?? 1200, currency: 'MXN', estimated: true };
}

const EXPERIENCE_BASE_MXN = {
  'entertainment.museum': 120, 'tourism.sights': 0, 'catering.restaurant': 350,
  'catering.cafe': 120, 'catering.bar': 300, 'leisure.park': 0, 'natural': 0,
};

function estimateExperiencePrice(place) {
  const match = (place.categories || []).find((c) => EXPERIENCE_BASE_MXN[c] !== undefined);
  return { amount: EXPERIENCE_BASE_MXN[match] ?? 250, currency: 'MXN', estimated: true };
}

module.exports = {
  PRICING_MODES, toCents, toMoney, itemSubtotalCents, computeBudget,
  estimateNightlyRate, estimateExperiencePrice,
};
