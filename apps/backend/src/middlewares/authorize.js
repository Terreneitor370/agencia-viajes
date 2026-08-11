/**
 * Autorizacion basada en permisos (OWASP A01: Broken Access Control).
 *
 * Uso en una ruta:
 *   router.get('/', authenticate, authorize(P.TRIP_READ_OWN), ctrl.list)
 *
 * Regla de oro: la autorizacion se declara EN LA RUTA, nunca dentro del
 * controlador con `if (user.role === 'admin')`. Asi la matriz de acceso de todo
 * el sistema es auditable leyendo unicamente los archivos *.routes.js, y una
 * herramienta DAST puede enumerarla contra el OpenAPI.
 */
const ApiError = require('../core/ApiError');
const logger = require('../core/logger');

/** Exige TODOS los permisos indicados. */
function authorize(...required) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Se requiere iniciar sesion'));
    const granted = new Set(req.user.permissions || []);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      logger.security('AUTHZ_DENIED', {
        userId: req.user.id, role: req.user.role, missing, path: req.originalUrl, method: req.method,
      });
      // 403 generico: no revelamos que permiso falta (fuga de modelo de acceso).
      return next(ApiError.forbidden('No tienes permiso para realizar esta accion'));
    }
    return next();
  };
}

/** Exige AL MENOS UNO de los permisos indicados (ej. leer propio O leer cualquiera). */
function authorizeAny(...options) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Se requiere iniciar sesion'));
    const granted = new Set(req.user.permissions || []);
    if (options.some((p) => granted.has(p))) return next();
    logger.security('AUTHZ_DENIED', { userId: req.user.id, role: req.user.role, options, path: req.originalUrl });
    return next(ApiError.forbidden('No tienes permiso para realizar esta accion'));
  };
}

/**
 * Guarda de propiedad del recurso (anti-IDOR).
 * Se usa DESPUES de cargar el recurso. Si el usuario no es dueno y no tiene el
 * permiso de alcance `any`, responde 404 (no 403) para no confirmar que el
 * recurso existe.
 */
function assertOwnership(req, resource, anyPermission) {
  if (!resource) throw ApiError.notFound();
  const isOwner = String(resource.user_id) === String(req.user.id);
  const canSeeAny = anyPermission && req.user.permissions.includes(anyPermission);
  if (!isOwner && !canSeeAny) {
    logger.security('IDOR_ATTEMPT', {
      userId: req.user.id, resourceOwner: resource.user_id, path: req.originalUrl,
    });
    throw ApiError.notFound();
  }
  return resource;
}

module.exports = authorize;
module.exports.authorize = authorize;
module.exports.authorizeAny = authorizeAny;
module.exports.assertOwnership = assertOwnership;
