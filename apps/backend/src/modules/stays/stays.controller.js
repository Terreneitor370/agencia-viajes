const service = require('./stays.service');
const respond = require('../../core/respond');

exports.search = async (req, res) => {
  const result = await service.search(req.query);
  return respond.ok(res, result.stays, {
    location: result.location, nights: result.nights, rooms: result.rooms, degraded: result.degraded,
  });
};
