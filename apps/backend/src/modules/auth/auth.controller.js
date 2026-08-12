/**
 * Controladores del modulo Identidad. DUENO: Isa (modulo A).
 *
 * El controlador SOLO traduce HTTP <-> servicio. Sin SQL, sin reglas de negocio,
 * sin `if (role === 'admin')`. La autorizacion vive en auth.routes.js.
 */
const crypto = require('node:crypto');
const service = require('./auth.service');
const tokens = require('./auth.tokens');
const respond = require('../../core/respond');
const ApiError = require('../../core/ApiError');
const env = require('../../config/env');

const setSessionCookies = (res, session) => {
  res.cookie('access_token', session.accessToken, tokens.accessCookie);
  res.cookie('refresh_token', session.refreshToken, tokens.refreshCookie);
};

exports.register = async (req, res) => {
  const user = await service.register(req.body, req);
  return respond.created(res, { user });
};

exports.login = async (req, res) => {
  const session = await service.login(req.body, req);
  setSessionCookies(res, session);
  // El access token tambien va en el cuerpo para poder probar con Postman/ZAP.
  return respond.ok(res, { user: session.user, accessToken: session.accessToken });
};

exports.refresh = async (req, res) => {
  const session = await service.refresh(req.cookies?.refresh_token, req);
  setSessionCookies(res, session);
  return respond.ok(res, { user: session.user, accessToken: session.accessToken });
};

exports.logout = async (req, res) => {
  await service.logout(req.user.id, req);
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
  return respond.noContent(res);
};

exports.me = async (req, res) => respond.ok(res, {
  user: { id: req.user.id, email: req.user.email, role: req.user.role },
  permissions: req.user.permissions, // el frontend pinta el menu con esto
});

exports.changePassword = async (req, res) => {
  await service.changePassword(req.user.id, req.body, req);
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
  return respond.noContent(res);
};

/**
 * Inicio del flujo OAuth. El `state` es el token anti-CSRF del flujo: se guarda
 * en una cookie httpOnly de corta vida y se compara al volver. Sin esta
 * verificacion, un atacante puede forzar el inicio de sesion en SU cuenta
 * (login CSRF).
 */
exports.googleStart = async (req, res) => {
  if (!env.GOOGLE_CLIENT_ID) throw ApiError.badRequest('OAuth con Google no esta configurado');
  const state = crypto.randomBytes(24).toString('base64url');
  const verifier = crypto.randomBytes(32).toString('base64url'); // PKCE
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  const cookieOpts = { httpOnly: true, secure: env.isProd, sameSite: 'lax', maxAge: 10 * 60 * 1000, path: '/api/v1/auth' };
  res.cookie('oauth_state', state, cookieOpts);
  res.cookie('oauth_verifier', verifier, cookieOpts);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return res.redirect(url.toString());
};

exports.googleCallback = async (_req, _res) => {
  // TODO(A): 1) comparar req.query.state con la cookie oauth_state (rechazar si difiere)
  //          2) canjear el codigo en oauth2.googleapis.com con el code_verifier
  //          3) verificar el id_token y exigir email_verified === true
  //          4) service.issueSession(...) y redirigir a env.FRONTEND_URL
  throw ApiError.internal('Callback de Google pendiente de implementar');
};
