/**
 * AUTO-REGISTRO DE RUTAS.
 *
 * Este archivo existe por una sola razon: eliminar el `routes/index.js` central
 * donde los 3 integrantes escribirian `app.use(...)` en la misma linea. Ese
 * archivo es la causa numero 1 de conflictos de merge en un monorepo con
 * desarrollo paralelo por modulo.
 *
 * Contrato: cada modulo expone `src/modules/<nombre>/<nombre>.routes.js` que
 * exporta { basePath, router }. El loader los descubre solos.
 * Resultado: agregar un modulo = crear archivos nuevos, cero archivos tocados.
 */
const fs = require('node:fs');
const path = require('node:path');
const logger = require('../core/logger');

const MODULES_DIR = path.join(__dirname, '..', 'modules');

function loadRoutes(app, prefix = '/api/v1') {
  if (!fs.existsSync(MODULES_DIR)) return [];
  const registered = [];

  for (const moduleName of fs.readdirSync(MODULES_DIR).sort()) {
    const routeFile = path.join(MODULES_DIR, moduleName, `${moduleName}.routes.js`);
    if (!fs.existsSync(routeFile)) {
      logger.debug(`Modulo "${moduleName}" sin archivo de rutas, se omite`);
      continue;
    }
    const mod = require(routeFile);
    if (!mod?.router) {
      logger.warn(`Modulo "${moduleName}": ${moduleName}.routes.js no exporta { router }`);
      continue;
    }
    const basePath = mod.basePath || `/${moduleName}`;
    const fullPath = `${prefix}${basePath}`;
    app.use(fullPath, mod.router);
    registered.push({ module: moduleName, path: fullPath });
    logger.info(`Modulo montado: ${moduleName} -> ${fullPath}`);
  }

  return registered;
}

module.exports = { loadRoutes, MODULES_DIR };
