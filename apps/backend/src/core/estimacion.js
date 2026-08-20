/**
 * Estimacion de precios cuando el proveedor no entrega tarifas.
 * DUENO: core compartido. Congelado tras el dia 0.
 *
 * Por que vive en core y no en el motor de presupuesto:
 * Geoapify devuelve puntos de interes, no precios. Quien necesita rellenar ese
 * hueco es el modulo de descubrimiento (Kassie) y el de experiencias (Jeshua).
 * Si estas tablas vivieran en budget.engine.js, Kassie quedaria importando
 * codigo de Jeshua para algo que no tiene nada que ver con calcular un
 * presupuesto. El motor de presupuesto se queda como aritmetica pura.
 *
 * NOTA DE PRODUCTO: todo lo que sale de aqui va marcado con `estimated: true`
 * y la interfaz DEBE mostrar la etiqueta "Precio estimado" arriba de la cifra.
 * Presentar un numero que inventamos como si fuera una tarifa firme no es un
 * detalle de diseno: es mentirle al usuario.
 */

const TARIFA_NOCHE_MXN = {
  'accommodation.hotel': 1800,
  'accommodation.apartment': 1400,
  'accommodation.hostel': 600,
};

const PRECIO_EXPERIENCIA_MXN = {
  'entertainment.museum': 120,
  'tourism.sights': 0,
  'catering.restaurant': 350,
  'catering.cafe': 120,
  'catering.bar': 300,
  'leisure.park': 0,
  natural: 0,
  // Agregadas: cubrian solo 3 de los 6 intereses de experiences.schema.js
  // (CATEGORY_MAP). "aventura", "vida_nocturna" y "compras" caian siempre al
  // respaldo de 250 porque ninguna de sus categorias de Geoapify tenia
  // entrada aqui -- lo reporto Kassie probando con esos dos intereses.
  sport: 300,
  'entertainment.activity_park': 450,
  'adult.nightclub': 350,
  'commercial.shopping_mall': 0,
  'commercial.marketplace': 0,
};

const estimar = (tabla, categorias, respaldo) => {
  const coincidencia = (categorias || []).find((c) => tabla[c] !== undefined);
  return { amount: tabla[coincidencia] ?? respaldo, currency: 'MXN', estimated: true };
};

/** Tarifa por noche estimada para un hospedaje. */
const estimateNightlyRate = (lugar) => estimar(TARIFA_NOCHE_MXN, lugar.categories, 1200);

/** Precio por persona estimado para una experiencia. */
const estimateExperiencePrice = (lugar) => estimar(PRECIO_EXPERIENCIA_MXN, lugar.categories, 250);

module.exports = { estimateNightlyRate, estimateExperiencePrice, TARIFA_NOCHE_MXN, PRECIO_EXPERIENCIA_MXN };
