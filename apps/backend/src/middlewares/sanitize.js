/**
 * Saneamiento defensivo (segunda capa, despues de Zod).
 *
 * Nota de criterio: NO escapamos HTML aqui. React ya escapa por defecto al
 * renderizar, y escapar en la entrada corrompe datos legitimos ("Fish & Chips").
 * Aqui solo eliminamos lo que nunca es un dato valido: caracteres de control y
 * claves de prototipo (prototype pollution).
 */
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
// Se construye desde codigos para no incrustar caracteres de control en el fuente.
const CONTROL_CHARS = new RegExp(`[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`, 'g');

function clean(value, depth = 0) {
  if (depth > 6) return undefined; // corta payloads anidados maliciosos
  if (typeof value === 'string') return value.replace(CONTROL_CHARS, '').trim();
  if (Array.isArray(value)) return value.slice(0, 500).map((v) => clean(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(k)) continue;
      out[k] = clean(v, depth + 1);
    }
    return out;
  }
  return value;
}

module.exports = (req, res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.params) req.params = clean(req.params);
  next();
};
