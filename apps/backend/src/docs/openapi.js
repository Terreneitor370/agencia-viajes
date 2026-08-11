/**
 * Especificacion OpenAPI 3.1 de la API.
 *
 * NO es solo documentacion: es el insumo que hace posible el DAST.
 * OWASP ZAP puede importar este JSON y atacar cada endpoint con sus parametros
 * reales, en lugar de intentar descubrirlos "a ciegas" con un spider (que en una
 * SPA React practicamente no encuentra nada).
 *
 * Comando de referencia:
 *   zap-api-scan.py -t http://localhost:3000/api/v1/openapi.json -f openapi -r zap.html
 *
 * Cada integrante documenta SOLO sus rutas dentro de su modulo, exportando
 * `openapiPaths` desde su archivo *.routes.js. Aqui solo se ensamblan.
 */
const fs = require('node:fs');
const path = require('node:path');
const { MODULES_DIR } = require('../loaders/routes.loader');

const base = {
  openapi: '3.1.0',
  info: {
    title: 'API Agencia de Viajes',
    version: '1.0.0',
    description: 'API de sugerencias y planeacion de viajes. Especificacion usada tambien como objetivo para escaneo DAST.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'FORBIDDEN' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: { description: 'No autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden: { description: 'Sin permisos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      RateLimited: { description: 'Limite de tasa excedido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {},
};

function buildSpec() {
  const spec = structuredClone(base);
  if (!fs.existsSync(MODULES_DIR)) return spec;

  for (const moduleName of fs.readdirSync(MODULES_DIR).sort()) {
    const routeFile = path.join(MODULES_DIR, moduleName, `${moduleName}.routes.js`);
    if (!fs.existsSync(routeFile)) continue;
    const mod = require(routeFile);
    if (!mod.openapiPaths) continue;
    const basePath = mod.basePath || `/${moduleName}`;
    for (const [route, definition] of Object.entries(mod.openapiPaths)) {
      spec.paths[`${basePath}${route}`.replace(/\/$/, '') || basePath] = definition;
    }
  }
  return spec;
}

module.exports = { buildSpec };
