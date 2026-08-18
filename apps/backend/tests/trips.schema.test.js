/**
 * Pruebas de esquemas del modulo C (trips).
 * Validan bordes de patch y operaciones de itinerario.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  updateTripSchema,
  updateTripItemSchema,
  tripItemParam,
} = require('../src/modules/trips/trips.schema');

test('updateTripSchema exige al menos un campo', () => {
  const parsed = updateTripSchema.safeParse({});
  assert.equal(parsed.success, false);
});

test('updateTripSchema rechaza rango de fechas invalido cuando vienen ambas', () => {
  const parsed = updateTripSchema.safeParse({ startDate: '2026-11-20', endDate: '2026-11-18' });
  assert.equal(parsed.success, false);
});

test('updateTripSchema acepta patch parcial valido', () => {
  const parsed = updateTripSchema.safeParse({ title: 'Nuevo titulo', budgetLimit: 50000 });
  assert.equal(parsed.success, true);
});

test('updateTripItemSchema valida quantity en rango', () => {
  assert.equal(updateTripItemSchema.safeParse({ quantity: 0 }).success, false);
  assert.equal(updateTripItemSchema.safeParse({ quantity: 2 }).success, true);
});

test('tripItemParam exige UUIDs validos para viaje e item', () => {
  const ok = tripItemParam.safeParse({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    itemId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });
  assert.equal(ok.success, true);

  const bad = tripItemParam.safeParse({ id: 'no-uuid', itemId: 'tampoco' });
  assert.equal(bad.success, false);
});
