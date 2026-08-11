const { z } = require('zod');

const CATEGORY_MAP = {
  cultura: 'entertainment.museum,tourism.sights',
  naturaleza: 'natural,leisure.park',
  gastronomia: 'catering.restaurant,catering.cafe',
  aventura: 'sport,entertainment.activity_park',
  vida_nocturna: 'adult.nightclub,catering.bar',
  compras: 'commercial.shopping_mall,commercial.marketplace',
};

const searchExperiencesSchema = z.object({
  city: z.string().trim().min(2).max(80),
  countryCode: z.string().trim().length(2).optional(),
  // Allowlist estricta: el usuario nunca envia la cadena de categorias de
  // Geoapify directamente. Envia una etiqueta nuestra que traducimos aqui.
  interests: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',') : v),
    z.array(z.enum(Object.keys(CATEGORY_MAP))).min(1).max(6),
  ).default(['cultura']),
  radiusKm: z.coerce.number().min(1).max(30).default(10),
  limit: z.coerce.number().int().min(1).max(40).default(20),
}).strict();

module.exports = { searchExperiencesSchema, CATEGORY_MAP };
