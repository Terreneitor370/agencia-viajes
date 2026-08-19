/**
 * Rutas del modulo Identidad. DUENO: Isa (modulo A).
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
// Un solo par de rutas para los dos casos que abren un desafio de codigo
// (verificar correo al registrarse, o retomarlo en el login si esa
// verificacion nunca se completo): el challengeId ya dice de cual se trata,
// no hace falta duplicar el endpoint. authLimiter (por IP) es ademas de los
// 5 intentos por desafio que ya cuenta login_otp_challenges.attempts.
router.post('/otp/verify', authLimiter, validate({ body: schemas.verifyOtpSchema }), asyncHandler(controller.verifyOtp));
router.post('/otp/resend', authLimiter, validate({ body: schemas.resendOtpSchema }), asyncHandler(controller.resendOtp));
router.post('/refresh', authLimiter, asyncHandler(controller.refresh));
router.post('/logout', authenticate, asyncHandler(controller.logout));
router.get('/me', authenticate, asyncHandler(controller.me));
router.post('/change-password', authenticate, writeLimiter, validate({ body: schemas.changePasswordSchema }), asyncHandler(controller.changePassword));
// "Olvide mi contrasena": publicas por definicion (la persona no tiene
// sesion). forgotPassword() nunca revela si el correo existe, asi que
// tambien sirve como su propio reenvio (pedirlo otra vez invalida el
// desafio anterior y manda uno nuevo, ver auth.service.js).
router.post('/forgot-password', authLimiter, validate({ body: schemas.forgotPasswordSchema }), asyncHandler(controller.forgotPassword));
router.post('/reset-password', authLimiter, validate({ body: schemas.resetPasswordSchema }), asyncHandler(controller.resetPassword));

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
      responses: {
        201: { description: 'Usuario creado, junto con { mfaRequired: true, challengeId } para confirmar el correo en /otp/verify' },
        400: { description: 'Datos invalidos' },
        429: { $ref: '#/components/responses/RateLimited' },
      },
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
      responses: {
        200: { description: 'Sesion iniciada, o { mfaRequired: true, challengeId } si la cuenta nunca confirmo el correo del registro' },
        401: { $ref: '#/components/responses/Unauthorized' },
        429: { $ref: '#/components/responses/RateLimited' },
      },
    },
  },
  '/otp/verify': {
    post: {
      tags: ['auth'], summary: 'Verifica el codigo (de registro o de login) y emite la sesion', security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['challengeId', 'code'],
          properties: { challengeId: { type: 'string', format: 'uuid' }, code: { type: 'string', pattern: '^\\d{6}$' } },
        } } },
      },
      responses: { 200: { description: 'Sesion iniciada' }, 401: { $ref: '#/components/responses/Unauthorized' }, 429: { $ref: '#/components/responses/RateLimited' } },
    },
  },
  '/otp/resend': {
    post: {
      tags: ['auth'], summary: 'Cancela el codigo vigente y envia uno nuevo', security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['challengeId'],
          properties: { challengeId: { type: 'string', format: 'uuid' } },
        } } },
      },
      responses: { 200: { description: 'Nuevo codigo enviado' }, 401: { $ref: '#/components/responses/Unauthorized' }, 429: { $ref: '#/components/responses/RateLimited' } },
    },
  },
  '/me': {
    get: { tags: ['auth'], summary: 'Perfil de la sesion actual', responses: { 200: { description: 'Perfil' }, 401: { $ref: '#/components/responses/Unauthorized' } } },
  },
  '/logout': {
    post: { tags: ['auth'], summary: 'Cerrar sesion', responses: { 204: { description: 'Sesion cerrada' } } },
  },
  '/refresh': {
    post: {
      tags: ['auth'], summary: 'Renueva la sesion con el refresh token de la cookie', security: [],
      responses: { 200: { description: 'Sesion renovada' }, 401: { $ref: '#/components/responses/Unauthorized' }, 429: { $ref: '#/components/responses/RateLimited' } },
    },
  },
  '/change-password': {
    post: {
      tags: ['auth'], summary: 'Cambia la contrasena e invalida el resto de las sesiones',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['currentPassword', 'newPassword'],
          properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 12 } },
        } } },
      },
      responses: { 204: { description: 'Contrasena actualizada' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
  '/forgot-password': {
    post: {
      tags: ['auth'], summary: 'Solicita un codigo para restablecer la contrasena', security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['email'],
          properties: { email: { type: 'string', format: 'email' } },
        } } },
      },
      responses: {
        200: { description: 'Respuesta generica: no indica si el correo tiene cuenta o no' },
        429: { $ref: '#/components/responses/RateLimited' },
      },
    },
  },
  '/reset-password': {
    post: {
      tags: ['auth'], summary: 'Cambia la contrasena usando el codigo de recuperacion', security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['email', 'code', 'newPassword'],
          properties: {
            email: { type: 'string', format: 'email' },
            code: { type: 'string', pattern: '^\\d{6}$' },
            newPassword: { type: 'string', minLength: 12 },
          },
        } } },
      },
      responses: {
        204: { description: 'Contrasena actualizada, todas las sesiones anteriores quedaron revocadas' },
        401: { $ref: '#/components/responses/Unauthorized' },
        429: { $ref: '#/components/responses/RateLimited' },
      },
    },
  },
  '/google': {
    get: {
      tags: ['auth'], summary: 'Inicia el flujo OAuth con Google (Authorization Code + PKCE)', security: [],
      responses: { 302: { description: 'Redirige a Google, o a /login?oauth_error=no_configurado si el servidor no tiene credenciales' } },
    },
  },
  '/google/callback': {
    get: {
      tags: ['auth'], summary: 'Retorno de Google: canjea el code, verifica el id_token y emite sesion', security: [],
      parameters: [
        { name: 'code', in: 'query', schema: { type: 'string' } },
        { name: 'state', in: 'query', schema: { type: 'string' } },
        { name: 'error', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 302: { description: 'Redirige al frontend, con sesion iniciada o con ?oauth_error=... si algo fallo' } },
    },
  },
};

module.exports = { basePath: '/auth', router, openapiPaths };
