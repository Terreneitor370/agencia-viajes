/**
 * Bitacora de auditoria (OWASP A09: Security Logging and Monitoring Failures).
 *
 * Registra en la tabla `audit_log` toda accion sensible: quien, que, sobre que,
 * desde donde y cuando. Se escribe de forma no bloqueante: si falla la bitacora
 * NO debe tumbar la peticion del usuario, pero SI debe quedar en el log de error.
 */
const db = require('../core/db');
const logger = require('../core/logger');
const context = require('../core/context');

/**
 * @param {string} action  ej. 'auth.login.success', 'user.role.changed', 'trip.deleted'
 * @param {object} opts    { req, entity, entityId, meta }
 */
async function record(action, { req, entity = null, entityId = null, meta = null } = {}) {
  try {
    await db.query(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id, ip, user_agent, correlation_id, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req?.user?.id ?? null,
        action,
        entity,
        entityId,
        req?.ip ?? null,
        (req?.headers?.['user-agent'] ?? '').slice(0, 255),
        context.correlationId(),
        meta ? JSON.stringify(meta) : null,
      ],
    );
  } catch (err) {
    logger.error('No se pudo escribir en audit_log', { action, message: err.message });
  }
}

/** Version middleware: registra automaticamente si la respuesta fue exitosa. */
const auditRoute = (action, entity) => (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode < 400) {
      record(action, { req, entity, entityId: req.params?.id ?? null });
    }
  });
  next();
};

module.exports = { record, auditRoute };
