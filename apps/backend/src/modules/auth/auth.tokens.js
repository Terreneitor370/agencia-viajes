/**
 * Emision y rotacion de tokens. DUENO: Isa (modulo A).
 *
 * Modelo de sesion:
 *   access_token  - JWT HS256, 15 min, cookie httpOnly. Lleva sub, role, email.
 *   refresh_token - opaco (64 bytes aleatorios), 7 dias, cookie httpOnly con
 *                   Path=/api/v1/auth/refresh. En BD se guarda SOLO su hash
 *                   SHA-256: si nos roban la base, no sirven para nada.
 *
 * Rotacion con deteccion de reuso: cada refresh emite un token nuevo y marca el
 * anterior como usado. Si llega un token ya usado, se revoca TODA la familia de
 * sesiones del usuario (senal clara de token robado).
 */
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { ISSUER, AUDIENCE } = require('../../middlewares/authenticate');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const signAccessToken = (user) => jwt.sign(
  { sub: String(user.id), role: user.role, email: user.email },
  env.JWT_ACCESS_SECRET,
  { algorithm: 'HS256', expiresIn: env.ACCESS_TOKEN_TTL, issuer: ISSUER, audience: AUDIENCE },
);

const generateRefreshToken = () => {
  const raw = crypto.randomBytes(64).toString('base64url');
  return { raw, hash: sha256(raw) };
};

/** Opciones de cookie endurecidas. Secure se activa solo con HTTPS (produccion). */
const cookieBase = {
  httpOnly: true,           // inaccesible desde JavaScript -> un XSS no roba la sesion
  secure: env.isProd,       // solo por HTTPS en produccion
  sameSite: 'lax',          // mitiga CSRF conservando el flujo OAuth de retorno
  domain: env.isProd ? env.COOKIE_DOMAIN : undefined,
};

const accessCookie = { ...cookieBase, path: '/', maxAge: 15 * 60 * 1000 };
const refreshCookie = {
  ...cookieBase,
  path: '/api/v1/auth/refresh', // el navegador solo la envia a ESTE endpoint
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

module.exports = { sha256, signAccessToken, generateRefreshToken, accessCookie, refreshCookie };
