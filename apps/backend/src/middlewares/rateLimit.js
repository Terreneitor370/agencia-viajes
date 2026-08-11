/**
 * Limites de tasa por tipo de endpoint (OWASP A04 / A07).
 * `authLimiter` es la defensa contra fuerza bruta y credential stuffing.
 * `externalApiLimiter` protege ademas NUESTRA cuota gratuita de los proveedores.
 */
const rateLimit = require('express-rate-limit');
const logger = require('../core/logger');
const env = require('../config/env');

const onLimit = (name) => (req, res, next, options) => {
  logger.security('RATE_LIMIT_EXCEEDED', { limiter: name, ip: req.ip, path: req.originalUrl });
  res.status(options.statusCode).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Intenta de nuevo mas tarde.' },
  });
};

const build = (name, windowMs, max, extra = {}) => rateLimit({
  windowMs,
  limit: env.isTest ? 100000 : max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimit(name),
  ...extra,
});

module.exports = {
  /** Global: 300 req / 15 min por IP. */
  globalLimiter: build('global', 15 * 60 * 1000, 300),
  /** Login, registro, recuperacion: 10 intentos / 15 min por IP. */
  authLimiter: build('auth', 15 * 60 * 1000, 10, { skipSuccessfulRequests: true }),
  /** Endpoints que consumen APIs de terceros: 60 / 15 min por usuario. */
  externalApiLimiter: build('external', 15 * 60 * 1000, 60, {
    keyGenerator: (req) => req.user?.id || req.ip,
  }),
  /** Escrituras: 100 / 15 min. */
  writeLimiter: build('write', 15 * 60 * 1000, 100),
};
