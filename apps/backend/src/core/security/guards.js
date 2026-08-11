/**
 * Capa RASP (Runtime Application Self-Protection) - version ligera y didactica.
 *
 * La idea: como TODO el SQL pasa por core/db.js y TODA la salida HTTP pasa por
 * core/httpClient.js, basta con instrumentar estos dos puntos para inspeccionar
 * y bloquear comportamiento anomalo en tiempo de ejecucion, sin tocar los modulos.
 *
 * SECURITY_ENFORCE=monitor -> solo registra (util para no romper la demo)
 * SECURITY_ENFORCE=block   -> corta la peticion
 *
 * Este archivo es el punto de sustitucion natural si mas adelante integran un
 * agente comercial (Contrast, Datadog ASM, Sqreen, etc.).
 */
const env = require('../../config/env');
const logger = require('../logger');
const ApiError = require('../ApiError');

// Firmas clasicas de inyeccion SQL que NUNCA deberian aparecer en un parametro.
const SQLI_PATTERNS = [
  /(\b(union)\b[\s\S]{0,20}\bselect\b)/i,
  /(\bor\b|\band\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /;\s*(drop|delete|update|insert|alter|truncate)\b/i,
  /\/\*[\s\S]*?\*\/|--\s|#\s*$/,
  /\b(information_schema|sleep\s*\(|benchmark\s*\(|load_file\s*\(|into\s+outfile)\b/i,
];

// Hosts a los que la aplicacion tiene permitido salir (OWASP A10: SSRF).
const EGRESS_ALLOWLIST = new Set([
  'api.duffel.com',
  'api.geoapify.com',
  'oauth2.googleapis.com',
  'www.googleapis.com',
  'api.frankfurter.dev',
  'api.open-meteo.com',
  'geocoding-api.open-meteo.com',
  'api.unsplash.com',
]);

function violation(event, detail) {
  logger.security(event, detail);
  if (env.SECURITY_ENFORCE === 'block') {
    throw ApiError.badRequest('La solicitud fue bloqueada por la politica de seguridad');
  }
}

/** Hook previo a cada query. Instrumentado desde core/db.js. */
function preQuery(sql, params) {
  // 1. El SQL debe ser parametrizado: si trae comillas con datos pegados, huele a concatenacion.
  if (/=\s*'[^']*\$\{/.test(sql)) {
    violation('SQL_TEMPLATE_INTERPOLATION', { sql: sql.slice(0, 160) });
  }
  // 2. Ningun valor de usuario deberia contener firmas de inyeccion.
  for (const value of Array.isArray(params) ? params : Object.values(params || {})) {
    if (typeof value !== 'string' || value.length < 4) continue;
    for (const pattern of SQLI_PATTERNS) {
      if (pattern.test(value)) {
        violation('SQLI_PATTERN_IN_PARAM', { sample: value.slice(0, 80) });
        return;
      }
    }
  }
}

/** Hook previo a cada llamada HTTP saliente. Instrumentado desde core/httpClient.js. */
function preEgress(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    throw ApiError.internal('URL de proveedor externo invalida');
  }
  if (url.protocol !== 'https:') {
    violation('EGRESS_INSECURE_PROTOCOL', { host: url.hostname, protocol: url.protocol });
  }
  if (!EGRESS_ALLOWLIST.has(url.hostname)) {
    logger.security('EGRESS_HOST_NOT_ALLOWED', { host: url.hostname });
    throw ApiError.upstream(`Host externo no permitido: ${url.hostname}`);
  }
  return url;
}

module.exports = { preQuery, preEgress, EGRESS_ALLOWLIST };
