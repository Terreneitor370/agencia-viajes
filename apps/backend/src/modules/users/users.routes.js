/** Perfil del usuario autenticado. DUENO: integrante A. */
const { Router } = require('express');
const { z } = require('zod');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const { writeLimiter } = require('../../middlewares/rateLimit');
const asyncHandler = require('../../core/asyncHandler');
const respond = require('../../core/respond');
const db = require('../../core/db');
const { PERMISSIONS: P } = require('../../config/roles');

const router = Router();
router.use(authenticate);

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  homeCity: z.string().trim().min(2).max(80).optional(),
  preferredCurrency: z.enum(['MXN', 'USD', 'EUR']).optional(),
}).strict(); // sin `role`, sin `status`, sin `email`: no se cambian por aqui.

router.get('/me', authorize(P.PROFILE_READ_OWN), asyncHandler(async (req, res) => {
  const user = await db.queryOne(
    'SELECT id, name, email, role, home_city, preferred_currency, avatar_url, created_at FROM users WHERE id = ?',
    [req.user.id],
  );
  return respond.ok(res, user);
}));

router.patch('/me', authorize(P.PROFILE_UPDATE_OWN), writeLimiter, validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    // TODO(A): construir el UPDATE solo con los campos presentes, siempre con `?`.
    return respond.ok(res, { updated: Object.keys(req.body) });
  }));

module.exports = { basePath: '/users', router };
