const service = require('./experiences.service');
const respond = require('../../core/respond');

exports.search = async (req, res) => {
  const result = await service.search(req.query);
  return respond.ok(res, result.experiences, { location: result.location, degraded: result.degraded });
};
