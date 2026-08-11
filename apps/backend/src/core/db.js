/**
 * PUNTO UNICO DE ACCESO A LA BASE DE DATOS.
 *
 * Regla de arquitectura no negociable: ningun modulo importa `mysql2` ni el pool
 * directamente. Todo SQL pasa por aqui. Esto nos da:
 *   1. Sentencias preparadas obligatorias (OWASP A03: Injection).
 *   2. Un unico punto donde instrumentar un agente IAST/RASP (hook preQuery).
 *   3. Trazabilidad: cada query queda ligada al correlationId de su peticion.
 *
 * DUENO: core (compartido) - cambios requieren PR con label `core`.
 */
const pool = require('../config/database');
const logger = require('./logger');
const context = require('./context');
const guards = require('./security/guards');
const ApiError = require('./ApiError');

const SLOW_QUERY_MS = 300;

/**
 * Ejecuta SQL parametrizado. `sql` DEBE ser una constante literal y los valores
 * DEBEN ir en `params`. Nunca concatenes input del usuario dentro de `sql`.
 */
async function query(sql, params = []) {
  guards.preQuery(sql, params); // hook RASP: detecta concatenacion y patrones peligrosos
  const startedAt = process.hrtime.bigint();
  try {
    // .execute() usa prepared statements del lado del servidor MySQL.
    const [rows] = await pool.execute(sql, params);
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (ms > SLOW_QUERY_MS) logger.warn('Query lenta', { ms: Math.round(ms), sql: sql.slice(0, 120) });
    return rows;
  } catch (err) {
    logger.error('Fallo de base de datos', { code: err.code, sql: sql.slice(0, 120) });
    // Nunca propagamos el error crudo de MySQL al cliente (fuga de informacion).
    throw ApiError.internal('Error al consultar la base de datos');
  }
}

/** Devuelve la primera fila o null. */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/** Ejecuta varias operaciones en una transaccion. Rollback automatico ante error. */
async function transaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const tx = {
      query: async (sql, params = []) => {
        guards.preQuery(sql, params);
        const [rows] = await conn.execute(sql, params);
        return rows;
      },
      queryOne: async (sql, params = []) => {
        guards.preQuery(sql, params);
        const [rows] = await conn.execute(sql, params);
        return rows[0] || null;
      },
    };
    const result = await work(tx);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    logger.error('Transaccion revertida', { correlationId: context.correlationId(), message: err.message });
    throw err;
  } finally {
    conn.release();
  }
}

async function healthcheck() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0].ok === 1;
}

module.exports = { query, queryOne, transaction, healthcheck, pool };
