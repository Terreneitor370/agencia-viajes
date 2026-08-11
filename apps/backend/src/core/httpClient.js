/**
 * PUNTO UNICO DE SALIDA HTTP hacia APIs de terceros.
 *
 * Ningun modulo llama a `fetch` directamente. Todo pasa por aqui, lo que nos da:
 *   - Allowlist de hosts (OWASP A10: SSRF).
 *   - Timeout obligatorio + AbortController (evita que un proveedor lento nos cuelgue).
 *   - Sin seguir redirecciones (un redirect es el vector clasico de SSRF).
 *   - Reintentos acotados con backoff solo para errores transitorios.
 *   - Cache de respuestas para no quemar la cuota gratuita del proveedor.
 *   - Punto unico de instrumentacion IAST.
 *
 * DUENO: core (compartido).
 */
const guards = require('./security/guards');
const logger = require('./logger');
const cache = require('./cache');
const ApiError = require('./ApiError');
const env = require('../config/env');

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object} opts
 * @param {string} opts.url        URL absoluta https del proveedor
 * @param {string} [opts.method]
 * @param {object} [opts.headers]
 * @param {object} [opts.body]
 * @param {string} [opts.provider] Etiqueta para logs y metricas
 * @param {number} [opts.cacheTtl] Segundos de cache (0 = sin cache). Solo aplica a GET.
 * @param {import('zod').ZodType} [opts.schema] Valida la respuesta del tercero antes de usarla
 */
async function request({
  url,
  method = 'GET',
  headers = {},
  body,
  provider = 'unknown',
  cacheTtl = 0,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  schema,
}) {
  guards.preEgress(url); // <- allowlist + https obligatorio

  const cacheKey = method === 'GET' ? `${provider}:${url}` : null;
  if (cacheKey && cacheTtl > 0) {
    const hit = cache.get(cacheKey);
    if (hit) {
      logger.debug('Cache HIT proveedor externo', { provider });
      return hit;
    }
  }

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: { Accept: 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'error', // no seguimos redirecciones: vector de SSRF
        signal: controller.signal,
      });

      logger.info('Llamada a proveedor externo', {
        provider, method, status: res.status, ms: Date.now() - startedAt, attempt,
      });

      if (RETRYABLE.has(res.status) && attempt < MAX_RETRIES) {
        await sleep(250 * 2 ** attempt);
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.warn('Proveedor externo respondio con error', { provider, status: res.status, body: text.slice(0, 300) });
        throw ApiError.upstream(`El proveedor ${provider} respondio ${res.status}`);
      }

      let data = await res.json();

      // Nunca confiar en la forma de la respuesta de un tercero.
      if (schema) {
        const parsed = schema.safeParse(data);
        if (!parsed.success) {
          logger.error('Respuesta de proveedor no cumple el contrato', { provider, issues: parsed.error.issues.slice(0, 3) });
          throw ApiError.upstream(`Respuesta inesperada de ${provider}`);
        }
        data = parsed.data;
      }

      if (cacheKey && cacheTtl > 0) cache.set(cacheKey, data, cacheTtl);
      return data;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ApiError) throw err;
      lastError = err;
      if (attempt < MAX_RETRIES) { await sleep(250 * 2 ** attempt); continue; }
    } finally {
      clearTimeout(timer);
    }
  }

  logger.error('Proveedor externo inaccesible', { provider, message: lastError?.message });
  throw ApiError.upstream(`No fue posible contactar a ${provider}`);
}

module.exports = { request, DEFAULT_TIMEOUT_MS, defaultCacheTtl: env.EXTERNAL_CACHE_TTL_SECONDS };
