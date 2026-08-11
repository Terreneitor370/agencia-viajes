/**
 * Error de dominio con codigo HTTP. Usalo SIEMPRE en lugar de `throw new Error`.
 * El errorHandler solo expone al cliente los errores marcados como `expose`.
 */
class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = status < 500;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(msg = 'Solicitud invalida', details) { return new ApiError(400, 'BAD_REQUEST', msg, details); }
  static unauthorized(msg = 'No autenticado') { return new ApiError(401, 'UNAUTHENTICATED', msg); }
  static forbidden(msg = 'No autorizado') { return new ApiError(403, 'FORBIDDEN', msg); }
  static notFound(msg = 'Recurso no encontrado') { return new ApiError(404, 'NOT_FOUND', msg); }
  static conflict(msg = 'Conflicto con el estado actual') { return new ApiError(409, 'CONFLICT', msg); }
  static tooMany(msg = 'Demasiadas solicitudes') { return new ApiError(429, 'RATE_LIMITED', msg); }
  static upstream(msg = 'Proveedor externo no disponible') { return new ApiError(502, 'UPSTREAM_ERROR', msg); }
  static internal(msg = 'Error interno') { return new ApiError(500, 'INTERNAL_ERROR', msg); }
}

module.exports = ApiError;
