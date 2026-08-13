/**
 * Conversion de moneda para el modulo de descubrimiento. DUENO: Kassie (modulo B).
 * Uso compartido: flights y stays.
 *
 * Frankfurter (https://frankfurter.dev) no pide llave ni registro y ya esta en
 * el allowlist de salida (core/security/guards.js). Las tasas diarias se
 * cachean 24h: dentro del mismo dia no cambian.
 *
 * Convenio: ante cualquier fallo de conversion devolvemos null y el llamador
 * conserva el precio original con su moneda real. Un precio honesto en la
 * moneda equivocada es mejor que un precio falso en la moneda pedida.
 */
const { z } = require('zod');
const httpClient = require('../../core/httpClient');
const logger = require('../../core/logger');

const RATES_URL = 'https://api.frankfurter.dev/v1/latest';
const RATES_TTL = 24 * 60 * 60;

const ratesSchema = z.object({
  base: z.string(),
  rates: z.record(z.string(), z.number()),
});

/**
 * Convierte `amount` de `from` a `to`.
 * @returns {Promise<number|null>} importe convertido (2 decimales) o null si no pudo.
 */
async function convert(amount, from, to) {
  if (amount === null || amount === undefined || from === to) return amount;

  try {
    const url = new URL(RATES_URL);
    url.searchParams.set('base', from);
    const data = await httpClient.request({
      url: url.toString(),
      provider: 'frankfurter',
      schema: ratesSchema,
      cacheTtl: RATES_TTL,
    });
    const rate = data.rates[to];
    if (!rate) return null;
    return Math.round(amount * rate * 100) / 100;
  } catch (err) {
    logger.warn('Conversion de moneda no disponible, se conserva el precio original', { message: err.message });
    return null;
  }
}

const CURRENCIES = ['MXN', 'USD', 'EUR'];

module.exports = { convert, CURRENCIES };
