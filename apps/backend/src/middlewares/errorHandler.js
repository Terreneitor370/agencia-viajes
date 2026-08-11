/**
 * Manejador central de errores (OWASP A05).
 *
 * Regla: el cliente NUNCA ve stack traces, nombres de tablas, ni mensajes de
 * MySQL. Todo error 5xx se responde con un mensaje generico + el correlationId,
 * que es lo unico que el usuario necesita para reportar el incidente y lo unico
 * que nosotros necesitamos para encontrarlo en los logs.
 */
const ApiError = require('../core/ApiError');
const logger = require('../core/logger');
const env = require('../config/env');

function errorHandler(err, req, res, next) {
  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.status : 500;
  const code = isApiError ? err.code : 'INTERNAL_ERROR';

  if (status >= 500) {
    logger.error('Error no controlado', { message: err.message, stack: err.stack, path: req.originalUrl });
  } else {
    logger.warn('Error controlado', { code, message: err.message, path: req.originalUrl });
  }

  const body = {
    success: false,
    error: {
      code,
      message: isApiError && err.expose ? err.message : 'Ocurrio un error al procesar la solicitud',
      ...(isApiError && err.details ? { details: err.details } : {}),
    },
    meta: { correlationId: req.correlationId },
  };

  // El stack solo se expone fuera de produccion, y solo para 5xx.
  if (!env.isProd && status >= 500) body.error.debug = err.message;

  res.status(status).json(body);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
    meta: { correlationId: req.correlationId },
  });
}

module.exports = { errorHandler, notFoundHandler };
