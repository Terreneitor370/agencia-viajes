/**
 * Cabeceras de seguridad y endurecimiento del servidor (OWASP A05).
 * DUENO: modulo Identidad y Seguridad, pero congelado tras el dia 0.
 */
const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const env = require('../config/env');
const logger = require('../core/logger');

const corsOptions = {
  // Allowlist explicita. NUNCA usar origin:true ni '*' junto a credentials.
  origin(origin, callback) {
    if (!origin) return callback(null, true); // curl / Postman / same-origin
    if (env.corsOrigins.includes(origin)) return callback(null, true);
    logger.security('CORS_ORIGIN_REJECTED', { origin });
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true, // necesario para las cookies httpOnly del refresh token
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
  exposedHeaders: ['X-Correlation-Id'],
  maxAge: 600,
};

const apply = (app) => {
  app.disable('x-powered-by');            // no revelar el stack (fingerprinting)
  app.set('trust proxy', 1);              // IP real detras de un proxy: necesario para rate limit
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", ...env.corsOrigins],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],       // anti clickjacking
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  }));
  app.use(cors(corsOptions));
  app.use(hpp());                         // evita ?role=user&role=admin (HTTP Parameter Pollution)
};

module.exports = apply;
module.exports.corsOptions = corsOptions;
