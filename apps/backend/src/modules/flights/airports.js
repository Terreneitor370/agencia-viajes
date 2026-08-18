/**
 * Catalogo de aeropuertos para resolver ciudad/nombre -> codigo IATA.
 * DUENO: Kassie (modulo B).
 *
 * Duffel solo acepta codigos IATA, pero casi nadie sabe que Cancun es CUN.
 * Este catalogo permite buscar por nombre de ciudad o de aeropuerto y lo
 * traduce al codigo que la API necesita. Es una tabla estatica (sin llamada
 * externa): aeropuertos de Mexico + destinos internacionales comunes.
 *
 * Un codigo IATA de 3 letras siempre se acepta tal cual, aunque no este en el
 * catalogo: la busqueda debe funcionar "desde cualquier lugar".
 */

const AIRPORTS = [
  // ------------------------- Mexico -------------------------
  { city: 'ciudad de mexico', name: 'Aeropuerto Internacional Benito Juarez', iata: 'MEX', country: 'MX', alias: ['mexico city', 'cdmx', 'df'] },
  { city: 'cancun', name: 'Aeropuerto Internacional de Cancun', iata: 'CUN', country: 'MX' },
  { city: 'guadalajara', name: 'Aeropuerto Internacional de Guadalajara', iata: 'GDL', country: 'MX' },
  { city: 'monterrey', name: 'Aeropuerto Internacional de Monterrey', iata: 'MTY', country: 'MX' },
  { city: 'tijuana', name: 'Aeropuerto Internacional de Tijuana', iata: 'TIJ', country: 'MX' },
  { city: 'mexicali', name: 'Aeropuerto Internacional de Mexicali', iata: 'MXL', country: 'MX', alias: ['general rodolfo sanchez taboada'] },
  { city: 'puerto vallarta', name: 'Aeropuerto Internacional de Puerto Vallarta', iata: 'PVR', country: 'MX' },
  { city: 'los cabos', name: 'Aeropuerto Internacional de Los Cabos', iata: 'SJD', country: 'MX', alias: ['san jose del cabo', 'cabo san lucas'] },
  { city: 'leon', name: 'Aeropuerto Internacional del Bajio', iata: 'BJX', country: 'MX', alias: ['guanajuato', 'bajio', 'silo'] },
  { city: 'ixtapa zihuatanejo', name: 'Aeropuerto Internacional de Ixtapa-Zihuatanejo', iata: 'ZIH', country: 'MX', alias: ['zihuatanejo', 'ixtapa'] },
  { city: 'oaxaca', name: 'Aeropuerto Internacional de Oaxaca', iata: 'OAX', country: 'MX' },
  { city: 'merida', name: 'Aeropuerto Internacional de Merida', iata: 'MID', country: 'MX' },
  { city: 'toluca', name: 'Aeropuerto Internacional de Toluca', iata: 'TLC', country: 'MX' },
  { city: 'queretaro', name: 'Aeropuerto Intercontinental de Queretaro', iata: 'QRO', country: 'MX' },
  { city: 'puebla', name: 'Aeropuerto Internacional de Puebla', iata: 'PBC', country: 'MX' },
  { city: 'cozumel', name: 'Aeropuerto Internacional de Cozumel', iata: 'CZM', country: 'MX' },
  { city: 'mazatlan', name: 'Aeropuerto Internacional de Mazatlan', iata: 'MZT', country: 'MX' },
  { city: 'villahermosa', name: 'Aeropuerto Internacional de Villahermosa', iata: 'VSA', country: 'MX' },
  { city: 'tampico', name: 'Aeropuerto Internacional de Tampico', iata: 'TAM', country: 'MX' },
  { city: 'huatulco', name: 'Aeropuerto Internacional de Huatulco', iata: 'HUX', country: 'MX', alias: ['bajos de huatulco'] },
  { city: 'torreon', name: 'Aeropuerto Internacional de Torreon', iata: 'TRC', country: 'MX' },
  { city: 'ciudad juarez', name: 'Aeropuerto Internacional de Ciudad Juarez', iata: 'CJS', country: 'MX', alias: ['juarez'] },
  { city: 'la paz', name: 'Aeropuerto Internacional de La Paz', iata: 'LAP', country: 'MX' },
  { city: 'hermosillo', name: 'Aeropuerto Internacional de Hermosillo', iata: 'HMO', country: 'MX' },
  { city: 'manzanillo', name: 'Aeropuerto Internacional de Manzanillo', iata: 'ZLO', country: 'MX' },
  { city: 'morelia', name: 'Aeropuerto Internacional de Morelia', iata: 'MLM', country: 'MX' },
  { city: 'aguascalientes', name: 'Aeropuerto Internacional de Aguascalientes', iata: 'AGU', country: 'MX' },
  { city: 'campeche', name: 'Aeropuerto Internacional de Campeche', iata: 'CPE', country: 'MX' },
  { city: 'tuxtla gutierrez', name: 'Aeropuerto Internacional de Tuxtla Gutierrez', iata: 'TGZ', country: 'MX', alias: ['tuxtla', 'chiapa de corzo'] },
  { city: 'veracruz', name: 'Aeropuerto Internacional de Veracruz', iata: 'VER', country: 'MX' },
  { city: 'acapulco', name: 'Aeropuerto Internacional de Acapulco', iata: 'ACA', country: 'MX' },
  { city: 'chihuahua', name: 'Aeropuerto Internacional de Chihuahua', iata: 'CUU', country: 'MX' },
  { city: 'durango', name: 'Aeropuerto Internacional de Durango', iata: 'DGO', country: 'MX' },
  { city: 'salina cruz', name: 'Aeropuerto de Salina Cruz', iata: 'SCX', country: 'MX' },

  // ----------------------- Internacional ---------------------
  { city: 'nueva york', name: 'Aeropuerto Internacional John F. Kennedy', iata: 'JFK', country: 'US', alias: ['new york'] },
  { city: 'los angeles', name: 'Aeropuerto Internacional de Los Angeles', iata: 'LAX', country: 'US', alias: ['l.a.'] },
  { city: 'san francisco', name: 'Aeropuerto Internacional de San Francisco', iata: 'SFO', country: 'US' },
  { city: 'chicago', name: 'Aeropuerto Internacional O Hare', iata: 'ORD', country: 'US' },
  { city: 'miami', name: 'Aeropuerto Internacional de Miami', iata: 'MIA', country: 'US' },
  { city: 'houston', name: 'Aeropuerto Intercontinental de Houston', iata: 'IAH', country: 'US' },
  { city: 'dallas', name: 'Aeropuerto Internacional de Dallas-Fort Worth', iata: 'DFW', country: 'US', alias: ['dallas fort worth', 'fort worth'] },
  { city: 'atlanta', name: 'Aeropuerto Internacional Hartsfield-Jackson', iata: 'ATL', country: 'US' },
  { city: 'las vegas', name: 'Aeropuerto Internacional McCarran', iata: 'LAS', country: 'US' },
  { city: 'denver', name: 'Aeropuerto Internacional de Denver', iata: 'DEN', country: 'US' },
  { city: 'orlando', name: 'Aeropuerto Internacional de Orlando', iata: 'MCO', country: 'US' },
  { city: 'toronto', name: 'Aeropuerto Internacional Pearson', iata: 'YYZ', country: 'CA' },
  { city: 'vancouver', name: 'Aeropuerto Internacional de Vancouver', iata: 'YVR', country: 'CA' },
  { city: 'madrid', name: 'Aeropuerto Adolfo Suarez Madrid-Barajas', iata: 'MAD', country: 'ES' },
  { city: 'barcelona', name: 'Aeropuerto Josep Tarradellas Barcelona-El Prat', iata: 'BCN', country: 'ES' },
  { city: 'paris', name: 'Aeropuerto Charles de Gaulle', iata: 'CDG', country: 'FR' },
  { city: 'londres', name: 'Aeropuerto de Heathrow', iata: 'LHR', country: 'GB', alias: ['london'] },
  { city: 'amsterdam', name: 'Aeropuerto de Schiphol', iata: 'AMS', country: 'NL' },
  { city: 'frankfurt', name: 'Aeropuerto de Frankfurt', iata: 'FRA', country: 'DE', alias: ['francfurt'] },
  { city: 'sao paulo', name: 'Aeropuerto Internacional de Sao Paulo-Guarulhos', iata: 'GRU', country: 'BR' },
  { city: 'rio de janeiro', name: 'Aeropuerto Internacional de Rio de Janeiro', iata: 'GIG', country: 'BR', alias: ['rio'] },
  { city: 'buenos aires', name: 'Aeropuerto Internacional Ezeiza', iata: 'EZE', country: 'AR' },
  { city: 'santiago de chile', name: 'Aeropuerto Internacional Arturo Merino Benitez', iata: 'SCL', country: 'CL', alias: ['santiago'] },
  { city: 'lima', name: 'Aeropuerto Internacional Jorge Chavez', iata: 'LIM', country: 'PE' },
  { city: 'bogota', name: 'Aeropuerto Internacional El Dorado', iata: 'BOG', country: 'CO' },
  { city: 'medellin', name: 'Aeropuerto Internacional Jose Maria Cordova', iata: 'MDE', country: 'CO' },
  { city: 'ciudad de panama', name: 'Aeropuerto Internacional de Tocumen', iata: 'PTY', country: 'PA', alias: ['panama', 'tocumen'] },
  { city: 'la habana', name: 'Aeropuerto Internacional Jose Marti', iata: 'HAV', country: 'CU', alias: ['habana', 'havana'] },
  { city: 'aruba', name: 'Aeropuerto Internacional Reina Beatrix', iata: 'AUA', country: 'AW' },
  { city: 'san juan', name: 'Aeropuerto Internacional Luis Munoz Marin', iata: 'SJU', country: 'PR' },
  { city: 'san jose', name: 'Aeropuerto Internacional Juan Santamaria', iata: 'SJO', country: 'CR', alias: ['costa rica'] },
  { city: 'shanghai', name: 'Aeropuerto Internacional de Pudong', iata: 'PVG', country: 'CN' },
  { city: 'tokio', name: 'Aeropuerto Internacional de Narita', iata: 'NRT', country: 'JP', alias: ['tokyo'] },
];

/** Normaliza para comparar: minusculas, sin acentos, sin espacios sobrantes. */
const normalize = (s) => String(s || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ');

const score = (q, city, name, alias) => {
  const values = [city, name, ...(alias || [])];
  if (values.some((v) => v === q)) return 100;
  if (values.some((v) => v.startsWith(q))) return 80;
  if (values.some((v) => v.includes(q))) return 60;
  return 0;
};

/**
 * Resuelve un texto ("Cancun", "Ciudad de Mexico", "JFK", "MEX") a codigo IATA.
 * - Un codigo IATA de 3 letras se acepta tal cual (aunque no este en el catalogo).
 * - Un nombre de ciudad/aeropuerto se busca en el catalogo.
 * Devuelve null si no puede resolver nada.
 */
function resolveIata(query) {
  const q = normalize(query);
  if (!q) return null;
  if (/^[a-z]{3}$/.test(q)) return q.toUpperCase();

  const best = AIRPORTS
    .map((a) => ({ a, s: score(q, a.city, a.name, a.alias) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)[0];

  return best ? best.a.iata : null;
}

/** Lista para autocompletar en el frontend. `value` es el nombre de ciudad
 *  (para que el datalist filtre por texto); el backend lo resuelve a IATA. */
const airportsOptions = () => AIRPORTS.map((a) => ({
  value: capitalize(a.city),
  iata: a.iata,
  label: `${capitalize(a.city)} (${a.iata})`,
}));

const capitalize = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

module.exports = { AIRPORTS, resolveIata, airportsOptions };
