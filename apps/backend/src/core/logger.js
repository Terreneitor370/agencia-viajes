/**
 * Logging estructurado (OWASP A09). Nunca se registran passwords, tokens ni cookies.
 * Cada linea lleva el correlationId, para poder reconstruir una peticion completa.
 */
const pino = require('pino');
const env = require('../config/env');
const context = require('./context');

const REDACT = [
  'req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]',
  'password', 'currentPassword', 'newPassword', 'password_hash',
  'token', 'accessToken', 'refreshToken', 'apiKey', 'api_key', 'client_secret',
];

const base = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACT, censor: '[REDACTED]' },
  transport: env.isProd ? undefined : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
});

const withCtx = (extra = {}) => ({ correlationId: context.correlationId(), ...extra });

module.exports = {
  raw: base,
  debug: (msg, extra) => base.debug(withCtx(extra), msg),
  info: (msg, extra) => base.info(withCtx(extra), msg),
  warn: (msg, extra) => base.warn(withCtx(extra), msg),
  error: (msg, extra) => base.error(withCtx(extra), msg),
  /** Evento de seguridad: siempre se emite, sin importar el nivel de log. */
  security: (event, extra) => base.warn(withCtx({ securityEvent: event, ...extra }), `SECURITY:${event}`),
};
