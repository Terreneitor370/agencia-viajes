/**
 * Validacion de variables de entorno.
 * El servidor NO arranca si falta una variable critica (OWASP A05: Security Misconfiguration).
 * DUENO: core (compartido) - cambios requieren PR con label `core`.
 */
require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Base de datos
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),

  // Seguridad / sesiones
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener >= 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener >= 32 caracteres'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_DOMAIN: z.string().default('localhost'),

  // OAuth Google
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:3000/api/v1/auth/google/callback'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // SMTP (segundo factor por correo, modulo A). Opcional con default vacio,
  // mismo criterio que Google OAuth: si falta, la funcion se apaga con un
  // mensaje claro en vez de tumbar el arranque del servidor.
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  // OJO: NO usar z.coerce.boolean() aqui. Coerce.boolean hace Boolean(valor),
  // y todo lo que llega de process.env es string: Boolean("false") da true.
  // Con eso el transporte pedia TLS implicito en el puerto 587 (que espera
  // STARTTLS), y el sintoma era "wrong version number" en cada envio.
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default('Viaja <no-responder@viaja.local>'),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),

  // APIs externas (SOLO backend: nunca exponer en el frontend)
  DUFFEL_API_TOKEN: z.string().default(''),
  DUFFEL_API_VERSION: z.string().default('v2'),
  GEOAPIFY_API_KEY: z.string().default(''),
  UNSPLASH_ACCESS_KEY: z.string().default(''),

  // Postura de seguridad en runtime: monitor = solo registra, block = corta la peticion (RASP)
  SECURITY_ENFORCE: z.enum(['monitor', 'block']).default('block'),
  EXTERNAL_CACHE_TTL_SECONDS: z.coerce.number().int().default(3600),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Configuracion invalida. Revisa tu archivo .env:');
  console.error(parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'));
  process.exit(1);
}

const env = Object.freeze({
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
});

module.exports = env;
