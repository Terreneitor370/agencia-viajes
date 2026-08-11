/**
 * Contexto por peticion basado en AsyncLocalStorage.
 * Es el hilo conductor que permite correlacionar: request -> query SQL -> llamada externa.
 * Punto de enganche natural para un agente IAST/RASP.
 */
const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();

module.exports = {
  run: (ctx, fn) => storage.run(ctx, fn),
  get: () => storage.getStore() || {},
  correlationId: () => (storage.getStore() || {}).correlationId || 'no-ctx',
  actor: () => (storage.getStore() || {}).user || null,
};
