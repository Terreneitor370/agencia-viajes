/**
 * Backoffice. DUENO: Isa (modulo A).
 *
 * Todo lo que hay aqui exige permisos de administrador Y queda registrado en
 * audit_log. Un panel de administracion sin bitacora es un punto ciego: si un
 * admin cambia un rol, tiene que quedar rastro de quien, cuando y desde donde.
 */
const { Router } = require('express');
const { z } = require('zod');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const { auditRoute } = require('../../middlewares/audit');
const { writeLimiter } = require('../../middlewares/rateLimit');
const asyncHandler = require('../../core/asyncHandler');
const respond = require('../../core/respond');
const db = require('../../core/db');
const cache = require('../../core/cache');
const ApiError = require('../../core/ApiError');
const { PERMISSIONS: P, ROLE_NAMES } = require('../../config/roles');

const router = Router();
router.use(authenticate);

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(80).optional(),
}).strict();

router.get('/users', authorize(P.USER_READ_ANY), validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q } = req.query;
    // LIKE parametrizado: el comodin se arma en JS, nunca dentro del SQL.
    const term = q ? `%${q}%` : '%';
    // LIMIT/OFFSET van como literal, no como `?`: MySQL rechaza placeholders ahi
    // en modo prepared statement (execute() truena con ER_WRONG_ARGUMENTS).
    // Es seguro porque page/pageSize ya vienen coercionados a entero acotado
    // por Zod (listQuery) antes de llegar aqui, nunca texto libre del usuario.
    const limit = Number(pageSize);
    const offset = Number(page - 1) * limit;
    const rows = await db.query(
      `SELECT id, name, email, role, status, created_at, last_login_at
         FROM users WHERE (name LIKE ? OR email LIKE ?)
         ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      [term, term],
    );
    const [{ total }] = await db.query('SELECT COUNT(*) AS total FROM users');
    return respond.paginated(res, rows, { page, pageSize, total });
  }));

router.patch('/users/:id/role', authorize(P.USER_UPDATE_ROLE), writeLimiter,
  validate({
    params: z.object({ id: z.string().uuid() }).strict(),
    body: z.object({ role: z.enum(ROLE_NAMES) }).strict(),
  }),
  auditRoute('admin.user.role_changed', 'user'),
  asyncHandler(async (req, res) => {
    // Un admin no puede degradarse a si mismo: evita quedarse sin ningun admin.
    if (req.params.id === req.user.id) throw ApiError.badRequest('No puedes cambiar tu propio rol');
    await db.query('UPDATE users SET role = ? WHERE id = ?', [req.body.role, req.params.id]);
    // Cambiar el rol invalida las sesiones: el token viejo aun lleva el rol anterior.
    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [req.params.id]);
    return respond.noContent(res);
  }));

router.get('/audit', authorize(P.AUDIT_READ), validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    // Mismo motivo que en /users: LIMIT/OFFSET como literal, no como `?`.
    const limit = Number(pageSize);
    const offset = Number(page - 1) * limit;
    const rows = await db.query(
      `SELECT id, actor_id, action, entity, entity_id, ip, correlation_id, created_at
         FROM audit_log ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      [],
    );
    const [{ total }] = await db.query('SELECT COUNT(*) AS total FROM audit_log');
    return respond.paginated(res, rows, { page, pageSize, total });
  }));

router.post('/cache/purge', authorize(P.CACHE_PURGE), auditRoute('admin.cache.purged'),
  asyncHandler(async (req, res) => { cache.flush(); return respond.noContent(res); }));

const openapiPaths = {
  '/users': { get: { tags: ['admin'], summary: 'Listar usuarios (solo admin)', responses: { 200: { description: 'Lista' }, 403: { $ref: '#/components/responses/Forbidden' } } } },
  '/audit': { get: { tags: ['admin'], summary: 'Bitacora de auditoria (solo admin)', responses: { 200: { description: 'Eventos' }, 403: { $ref: '#/components/responses/Forbidden' } } } },
};

module.exports = { basePath: '/admin', router, openapiPaths };
