/**
 * Envuelve controladores async para que cualquier rechazo llegue al errorHandler.
 * Sin esto, una promesa rechazada tumba el proceso (Express 4 no captura async).
 */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
