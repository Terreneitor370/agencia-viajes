/**
 * Controladores del modulo Identidad. DUENO: Isa (modulo A).
 *
 * El controlador SOLO traduce HTTP <-> servicio. Sin SQL, sin reglas de negocio,
 * sin `if (role === 'admin')`. La autorizacion vive en auth.routes.js.
 */
const crypto = require('node:crypto');
const service = require('./auth.service');
const tokens = require('./auth.tokens');
const { googleCallbackSchema } = require('./auth.schema');
const respond = require('../../core/respond');
const logger = require('../../core/logger');
const env = require('../../config/env');

const setSessionCookies = (res, session) => {
  res.cookie('access_token', session.accessToken, tokens.accessCookie);
  res.cookie('refresh_token', session.refreshToken, tokens.refreshCookie);
};

exports.register = async (req, res) => {
  const resultado = await service.register(req.body, req);
  // Igual que login: la cuenta ya existe, pero todavia falta el codigo que
  // confirma que el correo es de quien se registro. Sin cookies todavia.
  return respond.created(res, resultado);
};

exports.login = async (req, res) => {
  const resultado = await service.login(req.body, req);
  // Password correcto pero falta el codigo del segundo factor: todavia no
  // hay cookies que poner. Nunca se manda el challengeId por otro canal, va
  // en el cuerpo de esta misma respuesta porque el frontend lo necesita ya
  // para pintar la pantalla del codigo.
  if (resultado.mfaRequired) return respond.ok(res, resultado);

  setSessionCookies(res, resultado);
  // El access token tambien va en el cuerpo para poder probar con Postman/ZAP.
  return respond.ok(res, { user: resultado.user, accessToken: resultado.accessToken });
};

exports.verifyOtp = async (req, res) => {
  const session = await service.verifyOtp(req.body.challengeId, req.body.code, req);
  setSessionCookies(res, session);
  return respond.ok(res, { user: session.user, accessToken: session.accessToken });
};

exports.resendOtp = async (req, res) => {
  const resultado = await service.resendOtp(req.body.challengeId, req);
  return respond.ok(res, resultado);
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

exports.forgotPassword = async (req, res) => {
  await service.forgotPassword(req.body.email, req);
  // Respuesta identica exista o no la cuenta: ver el comentario en el servicio.
  return respond.ok(res, { message: 'Si el correo tiene una cuenta, te enviamos un codigo para restablecer la contrasena.' });
};

exports.resetPassword = async (req, res) => {
  await service.resetPassword(req.body, req);
  // Por si acaso hubiera cookies de una sesion vieja en este navegador: la
  // contrasena cambio, esa sesion ya no deberia seguir viendose como valida.
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
  return respond.noContent(res);
};

// Sin esto, quien inicia sesion con Google desde un boton "Agregar al viaje"
// sin sesion vuelve siempre a FRONTEND_URL (la raiz) en vez de a donde
// estaba -- a diferencia del login con correo/contrasena, que nunca sale de
// la SPA y por eso conserva location.state.from solo. Aqui se valida estricto:
// SOLO una ruta relativa de un solo "/" (nunca "//host" ni "https://host",
// que serian un open redirect a un sitio ajeno).
const RUTA_RELATIVA_SEGURA = /^\/(?!\/)\S*$/;
function rutaReturnToSegura(valor) {
  const ruta = String(valor || '').slice(0, 300);
  return RUTA_RELATIVA_SEGURA.test(ruta) ? ruta : null;
}

/**
 * Inicio del flujo OAuth. El `state` es el token anti-CSRF del flujo: se guarda
 * en una cookie httpOnly de corta vida y se compara al volver. Sin esta
 * verificacion, un atacante puede forzar el inicio de sesion en SU cuenta
 * (login CSRF).
 */
exports.googleStart = async (req, res) => {
  // Es un <a href>, no un fetch: si esto tirara un error normal, el navegador
  // saldria de la SPA a enseñar el JSON crudo. Mejor mandarlo de vuelta al
  // login con el mismo mecanismo de oauth_error que ya usa el callback.
  if (!env.GOOGLE_CLIENT_ID) {
    logger.security('OAUTH_GOOGLE_NOT_CONFIGURED', {});
    return res.redirect(`${env.FRONTEND_URL}/login?oauth_error=no_configurado`);
  }
  const state = crypto.randomBytes(24).toString('base64url');
  const verifier = crypto.randomBytes(32).toString('base64url'); // PKCE
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

  const cookieOpts = { httpOnly: true, secure: env.isProd, sameSite: 'lax', maxAge: 10 * 60 * 1000, path: '/api/v1/auth' };
  res.cookie('oauth_state', state, cookieOpts);
  res.cookie('oauth_verifier', verifier, cookieOpts);

  const returnTo = rutaReturnToSegura(req.query.returnTo);
  if (returnTo) res.cookie('oauth_return_to', returnTo, cookieOpts);

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

/**
 * Retorno de Google. Es una navegacion completa del navegador, no un fetch:
 * por eso CADA salida de esta funcion es un redirect, nunca un JSON de error
 * (el usuario terminaria viendo el JSON crudo en la barra de direcciones).
 */
const oauthCookiePath = { path: '/api/v1/auth' };
const loginWithError = (res, motivo) => res.redirect(`${env.FRONTEND_URL}/login?oauth_error=${motivo}`);

function oauthFailureReason(err) {
  const message = String(err?.message || '').toLowerCase();

  if (err?.status === 409) return 'correo_registrado';
  if (message.includes('no esta verificado')) return 'correo_no_verificado';

  // verifyIdToken: audience/clientId invalido o token para otro cliente OAuth.
  if (message.includes('wrong recipient') || message.includes('audience')) {
    return 'cliente_oauth_invalido';
  }

  // El intercambio de code por token o llamadas de Google fallaron.
  if (err?.code === 'UPSTREAM_ERROR' || err?.status === 502) {
    return 'proveedor_google';
  }

  return 'fallo';
}

exports.googleCallback = async (req, res) => {
  const returnTo = rutaReturnToSegura(req.cookies?.oauth_return_to);
  const destinoFinal = returnTo ? `${env.FRONTEND_URL}${returnTo}` : env.FRONTEND_URL;

  const clearOAuthCookies = () => {
    res.clearCookie('oauth_state', oauthCookiePath);
    res.clearCookie('oauth_verifier', oauthCookiePath);
    res.clearCookie('oauth_return_to', oauthCookiePath);
  };

  // Google manda `error` (sin `code`) cuando el usuario cancela en su pantalla
  // de consentimiento. No es una falla nuestra: se distingue del resto.
  if (req.query.error) {
    clearOAuthCookies();
    return loginWithError(res, 'denegado');
  }

  const parsed = googleCallbackSchema.safeParse(req.query);
  if (!parsed.success) {
    logger.warn('Callback de Google con query invalido', { issues: parsed.error.issues.map((i) => i.path.join('.')) });
    clearOAuthCookies();
    return loginWithError(res, 'solicitud_invalida');
  }

  const { code, state } = parsed.data;
  const savedState = req.cookies?.oauth_state;
  const verifier = req.cookies?.oauth_verifier;
  clearOAuthCookies(); // de un solo uso, se consumen aqui pase lo que pase

  if (!savedState || !verifier || state !== savedState) {
    logger.security('OAUTH_STATE_MISMATCH', { ip: req.ip, hasState: Boolean(savedState) });
    return loginWithError(res, 'estado_invalido');
  }

  try {
    const session = await service.googleExchange(code, verifier, req);
    setSessionCookies(res, session);
    return res.redirect(destinoFinal);
  } catch (err) {
    logger.security('OAUTH_GOOGLE_FAILED', {
      status: err?.status,
      code: err?.code,
      name: err?.name,
      message: err?.message,
    });
    return loginWithError(res, oauthFailureReason(err));
  }
};
