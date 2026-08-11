/**
 * Verificacion del access token (OWASP A07).
 *
 * Decisiones de diseno:
 *  - El access token viaja en una cookie httpOnly + SameSite=Lax + Secure.
 *    Motivo: guardarlo en localStorage lo hace legible por cualquier XSS.
 *    Se acepta tambien `Authorization: Bearer` para poder probar con
 *    Postman/ZAP sin manipular cookies.
 *  - Algoritmo fijado a HS256. Nunca confiar en el `alg` del header del token
 *    (ataque `alg: none` / confusion de algoritmo).
 *  - Se valida issuer y audience.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../core/ApiError');
const logger = require('../core/logger');
const context = require('../core/context');
const { permissionsFor } = require('../config/roles');

const ISSUER = 'agencia-viajes-api';
const AUDIENCE = 'agencia-viajes-web';

function extractToken(req) {
  if (req.cookies?.access_token) return req.cookies.access_token;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function verify(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

/** Exige sesion valida. Si no la hay, 401. */
function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized('Se requiere iniciar sesion'));
  try {
    const payload = verify(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      permissions: permissionsFor(payload.role),
    };
    Object.assign(context.get(), { user: { id: payload.sub, role: payload.role } });
    return next();
  } catch (err) {
    logger.security('TOKEN_INVALID', { reason: err.name, ip: req.ip, path: req.originalUrl });
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'TOKEN_EXPIRED', 'La sesion expiro'));
    }
    return next(ApiError.unauthorized('Sesion invalida'));
  }
}

/** Sesion opcional: si hay token valido lo usa, si no continua como invitado. */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verify(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email, permissions: permissionsFor(payload.role) };
  } catch {
    // token invalido en ruta publica: se ignora silenciosamente
  }
  return next();
}

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.optionalAuth = optionalAuth;
module.exports.ISSUER = ISSUER;
module.exports.AUDIENCE = AUDIENCE;
