/**
 * Formato de respuesta unico para toda la API.
 * Que todos los endpoints respondan igual permite que ZAP/Postman/los tests
 * afirmen sobre una unica forma, y que el frontend tenga un solo parser.
 */
const context = require('./context');

const meta = () => ({ correlationId: context.correlationId(), timestamp: new Date().toISOString() });

module.exports = {
  ok: (res, data, extra = {}) => res.status(200).json({ success: true, data, ...extra, meta: meta() }),
  created: (res, data) => res.status(201).json({ success: true, data, meta: meta() }),
  noContent: (res) => res.status(204).end(),
  paginated: (res, items, { page, pageSize, total }) =>
    res.status(200).json({ success: true, data: items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) }, meta: meta() }),
};
