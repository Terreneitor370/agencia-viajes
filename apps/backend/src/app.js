/**
 * Ensamblado de la aplicacion Express.
 *
 * EL ORDEN DE LOS MIDDLEWARES ES PARTE DEL DISENO DE SEGURIDAD. No lo cambies
 * sin entender por que: cada capa asume que la anterior ya se ejecuto.
 *
 * DUENO: core (compartido). Cambios = PR con label `core` + aprobacion de los 3.
 */
const express = require('express');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const applySecurity = require('./middlewares/security');
const correlationId = require('./middlewares/correlationId');
const sanitize = require('./middlewares/sanitize');
const { globalLimiter } = require('./middlewares/rateLimit');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { loadRoutes } = require('./loaders/routes.loader');
const { buildSpec } = require('./docs/openapi');
const db = require('./core/db');
const logger = require('./core/logger');

const app = express();
const API_PREFIX = '/api/v1';

// 1. Trazabilidad primero: todo lo demas ocurre dentro de este contexto.
app.use(correlationId);

// 2. Cabeceras de seguridad, CORS y HPP.
applySecurity(app);

// 3. Limite de tasa global (antes de parsear el cuerpo: no gastamos CPU en floods).
app.use(globalLimiter);

// 4. Parseo del cuerpo con limite de tamano (defensa contra DoS por payload gigante).
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());

// 5. Saneamiento defensivo (prototype pollution, caracteres de control).
app.use(sanitize);

// 6. Endpoints de plataforma.
app.get(`${API_PREFIX}/health`, async (req, res) => {
  let database;
  try { database = (await db.healthcheck()) ? 'up' : 'down'; } catch { database = 'down'; }
  res.status(database === 'up' ? 200 : 503).json({
    success: database === 'up',
    data: { status: database === 'up' ? 'ok' : 'degraded', database, env: env.NODE_ENV, uptime: Math.round(process.uptime()) },
  });
});

// Especificacion OpenAPI: objetivo del escaneo DAST (ZAP).
// Se expone solo fuera de produccion para no regalar el mapa de la API.
if (!env.isProd) {
  app.get(`${API_PREFIX}/openapi.json`, (req, res) => res.json(buildSpec()));
}

// 7. Modulos de negocio: se auto-descubren. Nadie edita este archivo para anadir uno.
const mounted = loadRoutes(app, API_PREFIX);
logger.info(`Modulos activos: ${mounted.length}`, { modules: mounted.map((m) => m.module) });

// 8. 404 y manejador central de errores: SIEMPRE al final.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
module.exports.API_PREFIX = API_PREFIX;
