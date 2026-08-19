/**
 * Acceso a datos del modulo Identidad. DUENO: Isa (modulo A).
 *
 * Reglas del repositorio (aplican a los 3 modulos):
 *  1. Todo SQL vive aqui. Los servicios no escriben SQL.
 *  2. Toda consulta es parametrizada con `?`. Cero concatenacion.
 *  3. Nunca se hace `SELECT *`: se listan las columnas para no filtrar
 *     accidentalmente `password_hash` en una respuesta JSON.
 */
const db = require('../../core/db');

const PUBLIC_COLUMNS = 'id, name, email, role, status, avatar_url, email_verified_at, created_at';

module.exports = {
  findByEmail: (email) => db.queryOne(
    `SELECT id, name, email, role, status, password_hash, google_sub, failed_attempts, locked_until, email_verified_at
     FROM users WHERE email = ? LIMIT 1`,
    [email],
  ),

  findById: (id) => db.queryOne(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]),

  findByGoogleSub: (sub) => db.queryOne(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE google_sub = ? LIMIT 1`, [sub],
  ),

  /** El rol NUNCA llega como argumento desde el controlador: se fija aqui. */
  create: ({ id, name, email, passwordHash = null, googleSub = null, avatarUrl = null }) => db.query(
    `INSERT INTO users (id, name, email, password_hash, google_sub, avatar_url, role, status)
     VALUES (?, ?, ?, ?, ?, ?, 'traveler', 'active')`,
    [id, name, email, passwordHash, googleSub, avatarUrl],
  ),

  registerFailedAttempt: (email) => db.query(
    `UPDATE users
        SET failed_attempts = failed_attempts + 1,
            locked_until = IF(failed_attempts + 1 >= 5, DATE_ADD(NOW(), INTERVAL 15 MINUTE), locked_until)
      WHERE email = ?`,
    [email],
  ),

  resetFailedAttempts: (id) => db.query(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?', [id],
  ),

  saveRefreshToken: ({ id, userId, tokenHash, expiresAt, familyId }) => db.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [id, userId, tokenHash, familyId, expiresAt],
  ),

  findRefreshToken: (tokenHash) => db.queryOne(
    `SELECT id, user_id, family_id, expires_at, used_at, revoked_at
       FROM refresh_tokens WHERE token_hash = ? LIMIT 1`,
    [tokenHash],
  ),

  markRefreshTokenUsed: (id, replacedById) => db.query(
    'UPDATE refresh_tokens SET used_at = NOW(), replaced_by = ? WHERE id = ?', [replacedById, id],
  ),

  /** Deteccion de reuso: se quema toda la familia de sesiones del usuario. */
  revokeFamily: (familyId) => db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL', [familyId],
  ),

  revokeAllForUser: (userId) => db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [userId],
  ),

  updatePassword: (id, passwordHash) => db.query(
    'UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?', [passwordHash, id],
  ),

  /** Idempotente: no pisa la fecha si ya se habia verificado antes. */
  markEmailVerified: (id) => db.query(
    'UPDATE users SET email_verified_at = NOW() WHERE id = ? AND email_verified_at IS NULL', [id],
  ),

  createOtpChallenge: ({ id, userId, codeHash, expiresAt }) => db.query(
    'INSERT INTO login_otp_challenges (id, user_id, code_hash, expires_at) VALUES (?, ?, ?, ?)',
    [id, userId, codeHash, expiresAt],
  ),

  findOtpChallenge: (id) => db.queryOne(
    `SELECT id, user_id, code_hash, attempts, expires_at, consumed_at
       FROM login_otp_challenges WHERE id = ? LIMIT 1`,
    [id],
  ),

  /**
   * Igual que findOtpChallenge pero por user_id: lo usa resetPassword(), que
   * solo tiene el correo (nunca un challengeId) para no revelar antes si esa
   * cuenta existe. "Vigente" ya filtra sin consumir y sin vencer en la
   * consulta misma, asi que un desafio viejo no puede colarse por accidente.
   */
  findLatestOtpChallengeForUser: (userId) => db.queryOne(
    `SELECT id, user_id, code_hash, attempts, expires_at, consumed_at
       FROM login_otp_challenges
      WHERE user_id = ? AND consumed_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1`,
    [userId],
  ),

  incrementOtpAttempts: (id) => db.query(
    'UPDATE login_otp_challenges SET attempts = attempts + 1 WHERE id = ?', [id],
  ),

  consumeOtpChallenge: (id) => db.query(
    'UPDATE login_otp_challenges SET consumed_at = NOW() WHERE id = ?', [id],
  ),

  /**
   * "Consumido" tambien cubre "reemplazado por uno nuevo": se llama al abrir
   * un desafio nuevo para no dejar codigos viejos todavia validos sueltos.
   */
  invalidateOtpChallengesForUser: (userId) => db.query(
    'UPDATE login_otp_challenges SET consumed_at = NOW() WHERE user_id = ? AND consumed_at IS NULL',
    [userId],
  ),
};
