/** Controlador de cotizaciones de invitado. DUENO: Kassie (modulo B). */
const crypto = require('node:crypto');
const repo = require('./quotes.repository');
const respond = require('../../core/respond');
const ApiError = require('../../core/ApiError');

exports.list = async (req, res) => {
  const quotes = await repo.listByToken(req.query.token);
  return respond.ok(res, quotes);
};

exports.create = async (req, res) => {
  const id = crypto.randomUUID();
  await repo.create({
    id,
    guestToken: req.body.token,
    ...req.body.item, // `type`, `provider`, ... vienen del contrato validado
  });
  return respond.created(res, { id });
};

exports.remove = async (req, res) => {
  const deleted = await repo.deleteByIdForToken(req.params.id, req.query.token);
  if (!deleted.affectedRows) throw ApiError.notFound('Cotizacion no encontrada');
  return respond.noContent(res);
};
