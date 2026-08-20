/**
 * Punto de entrada del servidor. Solo se encarga del ciclo de vida del proceso.
 */
const app = require('./app');
const env = require('./config/env');
const logger = require('./core/logger');
const db = require('./core/db');

// En produccion el contenedor corre con network_mode: host (el MySQL del VPS
// solo acepta conexiones por 127.0.0.1, ver docker-compose.yml), asi que sin
// este bind explicito el puerto quedaria expuesto en TODAS las interfaces del
// servidor compartido en vez de solo loopback. En dev se deja sin restringir
// (undefined = todas las interfaces) para no romper pruebas desde otro
// dispositivo en la misma red.
const server = app.listen(env.PORT, env.isProd ? '127.0.0.1' : undefined, () => {
  logger.info(`Backend escuchando en http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`Politica de seguridad en runtime: SECURITY_ENFORCE=${env.SECURITY_ENFORCE}`);
});

// Apagado ordenado: cierra conexiones antes de morir (evita queries a medias).
const shutdown = (signal) => async () => {
  logger.info(`${signal} recibido, cerrando servidor...`);
  server.close(async () => {
    try { await db.pool.end(); } catch { /* ya cerrado */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));

// Nunca dejar el proceso en estado indefinido tras un error no capturado.
process.on('unhandledRejection', (reason) => {
  logger.error('Promesa rechazada sin manejar', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Excepcion no capturada, terminando proceso', { message: err.message, stack: err.stack });
  process.exit(1);
});
