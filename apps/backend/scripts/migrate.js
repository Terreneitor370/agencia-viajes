/**
 * Ejecutor de migraciones y semillas.
 *
 * Deliberadamente simple: aplica en orden alfabetico todos los .sql de
 * db/migrations. Como cada integrante tiene SU PROPIO archivo numerado, dos
 * personas nunca editan el mismo .sql y no hay conflictos de merge en el
 * esquema (que es donde suelen doler mas).
 *
 *   npm run db:migrate        aplica las migraciones
 *   npm run db:seed           aplica migraciones + datos de prueba
 */
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const withSeed = process.argv.includes('--seed');

async function runDirectory(connection, dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    process.stdout.write(`  -> ${file} ... `);
    await connection.query(sql);
    console.log('ok');
  }
}

(async () => {
  // multipleStatements se habilita SOLO en este script de administracion.
  // La aplicacion en runtime lo tiene deshabilitado a proposito (anti SQLi).
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    console.log('Aplicando migraciones:');
    await runDirectory(connection, path.join(__dirname, '..', 'db', 'migrations'));
    if (withSeed) {
      console.log('Aplicando semillas:');
      await runDirectory(connection, path.join(__dirname, '..', 'db', 'seeds'));
    }
    console.log('Listo.');
  } catch (err) {
    console.error('Fallo la migracion:', err.message);
    await connection.end();
    process.exit(1);
  }
  await connection.end();
})();
