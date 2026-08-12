/** Controlador de vuelos. DUENO: Kassie (modulo B). */
const service = require('./flights.service');
const respond = require('../../core/respond');

exports.search = async (req, res) => {
  const { offers, degraded } = await service.search(req.query);
  return respond.ok(res, offers, { degraded, count: offers.length });
};
