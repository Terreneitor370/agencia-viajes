/**
 * Logica de negocio del modulo Identidad. DUENO: Isa (modulo A).
 *
 * ESQUELETO: la firma de cada funcion y las decisiones de seguridad ya estan
 * fijadas. Completa los TODO sin cambiar el contrato ni relajar los controles.
 */
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const repo = require('./auth.repository');
const tokens = require('./auth.tokens');
const ApiError = require('../../core/ApiError');
const logger = require('../../core/logger');
const audit = require('../../middlewares/audit');
const env = require('../../config/env');

const BCRYPT_ROUNDS = 12; // ~250ms: caro para un atacante, tolerable para un login.

/**
 * Hash señuelo. Si el correo no existe, igual comparamos contra este hash para
 * que el tiempo de respuesta sea el mismo. Sin esto, un atacante enumera
 * usuarios validos midiendo la latencia (timing attack / user enumeration).
 */
const DUMMY_HASH = bcrypt.hashSync('contrasena-inexistente-de-relleno', BCRYPT_ROUNDS);

async function register({ name, email, password }, req) {
  const existing = await repo.findByEmail(email);
  if (existing) {
    // Mensaje deliberadamente identico al del registro exitoso desde la vista
    // del atacante: el controlador responde 201 generico en ambos casos.
    logger.security('REGISTER_DUPLICATE_EMAIL', { email });
    throw ApiError.conflict('No fue posible completar el registro');
  }
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await repo.create({ id, name, email, passwordHash });
  await audit.record('auth.register', { req, entity: 'user', entityId: id });
  return repo.findById(id);
}

async function login({ email, password }, req) {
  const user = await repo.findByEmail(email);

  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    logger.security('LOGIN_ACCOUNT_LOCKED', { email });
    throw ApiError.unauthorized('Cuenta bloqueada temporalmente. Intenta en unos minutos.');
  }

  const matches = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);

  if (!user || !matches || user.status !== 'active') {
    if (user) await repo.registerFailedAttempt(email);
    logger.security('LOGIN_FAILED', { email, ip: req.ip });
    await audit.record('auth.login.failed', { req, entity: 'user', meta: { email } });
    // Mensaje generico: no revelamos si fallo el correo o la contrasena.
    throw ApiError.unauthorized('Credenciales invalidas');
  }

  await repo.resetFailedAttempts(user.id);
  await audit.record('auth.login.success', { req, entity: 'user', entityId: user.id });
  return issueSession(user);
}

/** Emite access token + refresh token nuevos y persiste el hash del refresh. */
async function issueSession(user, familyId = crypto.randomUUID()) {
  const accessToken = tokens.signAccessToken(user);
  const refresh = tokens.generateRefreshToken();
  const refreshId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000);

  await repo.saveRefreshToken({
    id: refreshId, userId: user.id, tokenHash: refresh.hash, familyId, expiresAt,
  });

  return {
    accessToken,
    refreshToken: refresh.raw,
    refreshId,
    familyId,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

/** Rotacion con deteccion de reuso. */
async function refresh(rawToken, req) {
  if (!rawToken) throw ApiError.unauthorized('Sesion no encontrada');
  const stored = await repo.findRefreshToken(tokens.sha256(rawToken));
  if (!stored) throw ApiError.unauthorized('Sesion invalida');

  if (stored.used_at || stored.revoked_at) {
    // El token ya se habia canjeado: alguien mas lo tiene. Se quema la familia.
    logger.security('REFRESH_TOKEN_REUSE', { userId: stored.user_id, familyId: stored.family_id, ip: req.ip });
    await repo.revokeFamily(stored.family_id);
    await audit.record('auth.refresh.reuse_detected', { req, entity: 'user', entityId: stored.user_id });
    throw ApiError.unauthorized('Sesion invalida');
  }
  if (new Date(stored.expires_at) < new Date()) throw ApiError.unauthorized('La sesion expiro');

  const user = await repo.findByEmail((await repo.findById(stored.user_id)).email);
  const session = await issueSession(user, stored.family_id);
  await repo.markRefreshTokenUsed(stored.id, session.refreshId);
  return session;
}

async function logout(userId, req) {
  await repo.revokeAllForUser(userId);
  await audit.record('auth.logout', { req, entity: 'user', entityId: userId });
}

async function changePassword(userId, { currentPassword, newPassword }, req) {
  const profile = await repo.findById(userId);
  const user = await repo.findByEmail(profile.email);
  const ok = await bcrypt.compare(currentPassword, user.password_hash || DUMMY_HASH);
  if (!ok) {
    logger.security('PASSWORD_CHANGE_WRONG_CURRENT', { userId });
    throw ApiError.unauthorized('La contrasena actual no es correcta');
  }
  await repo.updatePassword(userId, await bcrypt.hash(newPassword, BCRYPT_ROUNDS));
  // Cambiar contrasena invalida todas las sesiones activas.
  await repo.revokeAllForUser(userId);
  await audit.record('auth.password.changed', { req, entity: 'user', entityId: userId });
}

// TODO(A): googleExchange(code, verifier) -> intercambia el codigo en
// https://oauth2.googleapis.com/token usando core/httpClient (ya esta en la
// allowlist de egress), verifica el id_token con google-auth-library y vincula
// o crea el usuario por `sub`. Nunca confies en el campo `email` sin
// comprobar `email_verified === true`.

module.exports = { register, login, refresh, logout, changePassword, issueSession, BCRYPT_ROUNDS };
