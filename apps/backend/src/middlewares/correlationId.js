/**
 * Asigna un ID unico a cada peticion y abre el AsyncLocalStorage.
 * Debe ser el PRIMER middleware: todo lo que ocurra despues queda correlacionado.
 * Es la base de un enfoque IAST (seguir un input desde la entrada hasta el sink).
 */
const { randomUUID } = require('node:crypto');
const context = require('../core/context');

module.exports = (req, res, next) => {
  const correlationId = randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  context.run({ correlationId, ip: req.ip, path: req.originalUrl, method: req.method }, () => next());
};
