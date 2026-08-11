/**
 * Rutas del modulo Identidad. DUENO: integrante A.
 *
 * Contrato con el loader: exportar { basePath, router } y, opcionalmente,
 * `openapiPaths` para que el endpoint quede cubierto por el escaneo DAST.
 */
const { Router } = require('express');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const { authLimiter, writeLimiter } = require('../../middlewares/rateLimit');
const asyncHandler = require('../../core/asyncHandler');
const schemas = require('./auth.schema');
const controller = require('./auth.controller');

const router = Router();

router.post('/register', authLimiter, validate({ body: schemas.registerSchema }), asyncHandler(controller.register));
router.post('/login', authLimiter, validate({ body: schemas.loginSchema }), asyncHandler(controller.login));
router.post('/refresh', authLimiter, asyncHandler(controller.refresh));
router.post('/logout', authenticate, asyncHandler(controller.logout));
router.get('/me', authenticate, asyncHandler(controller.me));
router.post('/change-password', authenticate, writeLimiter, validate({ body: schemas.changePasswordSchema }), asyncHandler(controller.changePassword));

// OAuth Google (Authorization Code + PKCE). El intercambio de codigo por token
// ocurre SOLO en el backend: el client_secret jamas toca el navegador.
router.get('/google', authLimiter, asyncHandler(controller.googleStart));
router.get('/google/callback', authLimiter, asyncHandler(controller.googleCallback));

const openapiPaths = {
  '/register': {
    post: {
      tags: ['auth'], summary: 'Registro de viajero', security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 80 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 12 },
          },
        } } },
      },
      responses: { 201: { description: 'Usuario creado' }, 400: { description: 'Datos invalidos' }, 429: { $ref: '#/components/responses/RateLimited' } },
    },
  },
  '/login': {
    post: {
      tags: ['auth'], summary: 'Inicio de sesion', security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['email', 'password'],
          properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
        } } },
      },
      responses: { 200: { description: 'Sesion iniciada' }, 401: { $ref: '#/components/responses/Unauthorized' }, 429: { $ref: '#/components/responses/RateLimited' } },
    },
  },
  '/me': {
    get: { tags: ['auth'], summary: 'Perfil de la sesion actual', responses: { 200: { description: 'Perfil' }, 401: { $ref: '#/components/responses/Unauthorized' } } },
  },
  '/logout': {
    post: { tags: ['auth'], summary: 'Cerrar sesion', responses: { 204: { description: 'Sesion cerrada' } } },
  },
};

module.exports = { basePath: '/auth', router, openapiPaths };
