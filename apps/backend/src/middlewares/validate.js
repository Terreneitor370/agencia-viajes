/**
 * Validacion y saneamiento de entrada con Zod (OWASP A03).
 *
 * Principio: allowlist, no denylist. El schema define exactamente que se acepta;
 * cualquier campo no declarado se descarta (usar .strict() en los schemas).
 * Ademas REEMPLAZA req.body/query/params por la version validada, de modo que el
 * controlador es incapaz de leer datos sin validar.
 */
const ApiError = require('../core/ApiError');
const logger = require('../core/logger');

const format = (error) => error.issues.map((i) => ({
  field: i.path.join('.') || '(raiz)',
  message: i.message,
}));

/**
 * @param {{body?: import('zod').ZodType, query?: import('zod').ZodType, params?: import('zod').ZodType}} schemas
 */
module.exports = (schemas) => (req, res, next) => {
  for (const source of ['params', 'query', 'body']) {
    if (!schemas[source]) continue;
    const result = schemas[source].safeParse(req[source]);
    if (!result.success) {
      logger.warn('Validacion de entrada fallida', { source, path: req.originalUrl, issues: format(result.error) });
      return next(ApiError.badRequest('Datos de entrada invalidos', format(result.error)));
    }
    if (source === 'query') {
      Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
    } else {
      req[source] = result.data;
    }
  }
  return next();
};
