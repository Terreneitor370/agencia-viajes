/**
 * Pruebas del schema de cotizaciones de invitado (modulo B).
 * Puras: no necesitan base de datos ni servidor.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createQuoteSchema } = require('../src/modules/quotes/quotes.schema');

const item = {
  type: 'flight', provider: 'duffel', externalId: 'off_1',
  title: 'MEX -> CUN', unitPriceCents: 174500, currency: 'MXN',
  pricingMode: 'per_person', quantity: 1, estimated: false, meta: null,
};

test('acepta un token de invitado valido con su item', () => {
  const parsed = createQuoteSchema.parse({
    token: 'abcdef0123456789abcdef0123456789', item,
  });
  assert.equal(parsed.token, 'abcdef0123456789abcdef0123456789');
  assert.equal(parsed.item.type, 'flight');
});

test('rechaza tokens cortos o con caracteres invalidos', () => {
  for (const token of ['abc', 'token-arbitrario!!', '', 'a'.repeat(80)]) {
    assert.throws(() => createQuoteSchema.parse({ token, item }));
  }
});

test('rechaza items sin el contrato de trips (sin unitPriceCents)', () => {
  assert.throws(() => createQuoteSchema.parse({
    token: 'abcdef0123456789abcdef0123456789',
    item: { ...item, unitPriceCents: undefined },
  }));
});
