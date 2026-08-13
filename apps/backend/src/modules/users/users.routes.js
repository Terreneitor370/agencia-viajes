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
const { name } = require('../auth/auth.schema');

const router = Router();
router.use(authenticate);

// Mismo criterio que el nombre: letras, espacios, apostrofe y guion. Cubre
// "Ciudad de Mexico", "St. Louis" (el punto es la unica diferencia con name).
const homeCity = z.string().trim().min(2).max(80)
  .regex(/^[\p{L}\s'.-]+$/u, 'La ciudad solo puede tener letras y espacios');

const updateProfileSchema = z.object({
  name: name.optional(),
  homeCity: homeCity.optional(),
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

const openapiPaths = {
  '/me': {
    get: {
      tags: ['users'], summary: 'Perfil completo del usuario autenticado',
      responses: { 200: { description: 'Perfil' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    patch: {
      tags: ['users'], summary: 'Actualiza el perfil propio (nombre, ciudad, moneda)',
      requestBody: {
        content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 80 },
            homeCity: { type: 'string', minLength: 2, maxLength: 80 },
            preferredCurrency: { type: 'string', enum: ['MXN', 'USD', 'EUR'] },
          },
        } } },
      },
      responses: { 200: { description: 'Perfil actualizado' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
};

module.exports = { basePath: '/users', router, openapiPaths };
