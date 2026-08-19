/**
 * Pruebas del motor de presupuesto.
 * Corren con `npm test` (node:test nativo, sin instalar nada).
 * Son puras: no necesitan base de datos ni servidor.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeBudget, itemSubtotalCents } = require('../src/modules/budget/budget.engine');

const trip = (travelers, nights = 4) => ({ travelers, nights, days: nights + 1, rooms: Math.ceil(travelers / 2) });

test('per_person escala con la cantidad de viajeros', () => {
  const vuelo = { unitPriceCents: 200000, pricingMode: 'per_person', quantity: 1 };
  assert.equal(itemSubtotalCents(vuelo, trip(1)), 200000);
  assert.equal(itemSubtotalCents(vuelo, trip(4)), 800000);
});

test('per_group NO escala con la cantidad de viajeros', () => {
  const tour = { unitPriceCents: 500000, pricingMode: 'per_group', quantity: 1 };
  assert.equal(itemSubtotalCents(tour, trip(1)), 500000);
  assert.equal(itemSubtotalCents(tour, trip(8)), 500000);
});

test('per_night_per_room escala con noches y habitaciones (1 habitacion por cada 2 viajeros)', () => {
  const hotel = { unitPriceCents: 180000, pricingMode: 'per_night_per_room', quantity: 1 };
  assert.equal(itemSubtotalCents(hotel, trip(2, 3)), 180000 * 3 * 1);
  assert.equal(itemSubtotalCents(hotel, trip(4, 3)), 180000 * 3 * 2);
});

test('per_person_per_day escala por viajeros y por dias', () => {
  const comida = { unitPriceCents: 2500, pricingMode: 'per_person_per_day', quantity: 1 };
  assert.equal(itemSubtotalCents(comida, trip(2, 4)), 2500 * 2 * 5);
  assert.equal(itemSubtotalCents(comida, trip(5, 2)), 2500 * 5 * 3);
});

test('el total incluye el fondo de imprevistos y detecta exceso de presupuesto', () => {
  const result = computeBudget({
    items: [
      { type: 'flight', unitPriceCents: 200000, pricingMode: 'per_person', quantity: 1 },
      { type: 'stay', unitPriceCents: 180000, pricingMode: 'per_night_per_room', quantity: 1 },
    ],
    trip: trip(4, 4),
    contingencyRate: 0.10,
    budgetLimit: 15000,
  });

  // vuelos: 2000 x 4 = 8000 | hotel: 1800 x 4 noches x 2 habitaciones = 14400
  assert.equal(result.byCategory.flight, 8000);
  assert.equal(result.byCategory.stay, 14400);
  assert.equal(result.subtotal, 22400);
  assert.equal(result.contingency, 2240);
  assert.equal(result.total, 24640);
  assert.equal(result.perPerson, 6160);
  assert.equal(result.overBudget, true);
});

test('no se pierde precision al sumar montos con centavos', () => {
  const result = computeBudget({
    items: Array.from({ length: 3 }, () => ({ type: 'experience', unitPriceCents: 10, pricingMode: 'per_person', quantity: 1 })),
    trip: trip(1),
    contingencyRate: 0,
  });
  assert.equal(result.total, 0.30); // con floats esto daria 0.30000000000000004
});

test('budgetLimit decimal se evalua en centavos sin error de float', () => {
  const result = computeBudget({
    items: [{ type: 'other', unitPriceCents: 10010, pricingMode: 'per_group', quantity: 1 }],
    trip: trip(1),
    contingencyRate: 0,
    budgetLimit: '100.10',
  });

  assert.equal(result.total, 100.10);
  assert.equal(result.remaining, 0);
  assert.equal(result.overBudget, false);
});
