/** Perfil del usuario autenticado. DUENO: Isa (modulo A). */
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

// Mapa explicito camelCase -> columna: nunca se arma el nombre de columna con
// input del usuario, aunque venga de las llaves ya validadas por Zod.
const PROFILE_COLUMNS = {
  name: 'name',
  homeCity: 'home_city',
  preferredCurrency: 'preferred_currency',
};

router.patch('/me', authorize(P.PROFILE_UPDATE_OWN), writeLimiter, validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body).filter(([key]) => PROFILE_COLUMNS[key] !== undefined);
    if (entries.length > 0) {
      const assignments = entries.map(([key]) => `${PROFILE_COLUMNS[key]} = ?`).join(', ');
      const values = entries.map(([, value]) => value);
      await db.query(`UPDATE users SET ${assignments} WHERE id = ?`, [...values, req.user.id]);
    }
    const user = await db.queryOne(
      'SELECT id, name, email, role, home_city, preferred_currency, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id],
    );
    return respond.ok(res, user);
  }));

module.exports = { basePath: '/users', router };
