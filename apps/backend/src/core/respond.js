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
  paginated: (res, items, { page, pageSize, total }) => {
    const safePage = Number(page) || 1;
    const safePageSize = Math.max(1, Number(pageSize) || 1);
    const safeTotal = Math.max(0, Number(total) || 0);
    const pages = Math.max(1, Math.ceil(safeTotal / safePageSize));

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total: safeTotal,
        pages,
        hasMore: safePage < pages,
      },
      meta: meta(),
    });
  },
};
