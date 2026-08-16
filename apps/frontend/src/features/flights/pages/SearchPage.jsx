/**
 * Buscador de vuelos. DUENO: Kassie (modulo B).
 */
import { useEffect, useState } from 'react';
import { flightsApi } from '../api';
import { getRate, convertList } from '../../../core/api/rates';
import FlightCard from '../components/FlightCard';
import Hero from '../../shared/Hero';
import PopularOptions from '../../shared/PopularOptions';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=60';

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const maxDate = new Date(today);
maxDate.setMonth(maxDate.getMonth() + 11);
const maxDateStr = maxDate.toISOString().split('T')[0];

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number.isNaN(n) ? min : n));

const initialForm = { tripType: 'round_trip', origin: '', destination: '', departureDate: '', returnDate: '', adults: 1, children: 0, infants: 0, cabinClass: 'economy', currency: 'MXN', baggageFilter: 'cualquiera' };

const RUTAS = [
  { key: 'mex-cun', origin: 'MEX', destination: 'CUN', label: 'Ciudad de México → Cancún', hint: 'La playa más buscada' },
  { key: 'mex-gdl', origin: 'MEX', destination: 'GDL', label: 'Ciudad de México → Guadalajara', hint: 'Ideal para una escapada' },
  { key: 'gdl-mex', origin: 'GDL', destination: 'MEX', label: 'Guadalajara → Ciudad de México', hint: 'Negocios y cultura' },
  { key: 'mex-oax', origin: 'MEX', destination: 'OAX', label: 'Ciudad de México → Oaxaca', hint: 'Gastronomía y magia' },
  { key: 'mty-cun', origin: 'MTY', destination: 'CUN', label: 'Monterrey → Cancún', hint: 'Sol todo el año' },
  { key: 'gdl-cun', origin: 'GDL', destination: 'CUN', label: 'Guadalajara → Cancún', hint: 'Riviera Maya' },
];

export default function SearchPage() {
  const [form, setForm] = useState(initialForm);
  const [offers, setOffers] = useState([]);
  const [airports, setAirports] = useState([]);
  const [state, setState] = useState({ busy: false, error: '', degraded: false, searched: false });

  useEffect(() => {
    let mounted = true;
    flightsApi.airports()
      .then((res) => { if (mounted) setAirports(res.data || []); })
      .catch(() => { if (mounted) setAirports([]); });
    return () => { mounted = false; };
  }, []);

  const totalTravelers = form.adults + form.children + form.infants;

  const update = (field) => (e) => {
    const value = e.target.value;
    // Al pasar a "solo ida" se limpia la fecha de regreso que ya no aplica.
    setForm((f) => (field === 'tripType'
      ? { ...f, tripType: value, returnDate: value === 'one_way' ? '' : f.returnDate }
      : { ...f, [field]: value }));
  };

  const updateCount = (field, min, max) => (e) => {
    const value = clamp(parseInt(e.target.value, 10), min, max);
    setForm((f) => {
      const next = { ...f, [field]: value };
      return next;
    });
  };

  /** Cambiar moneda NUNCA re-busca: convierte los precios en pantalla. */
  const changeCurrency = async (e) => {
    const next = e.target.value;
    setForm((f) => ({ ...f, currency: next }));
    if (offers.length === 0) return;
    const from = offers[0].price.currency;
    if (from === next) return;
    try {
      const r = await getRate(from, next);
      if (r === null) return;
      setOffers((prev) => convertList(prev, r, next));
    } catch {
      // Si falla la conversion se conserva la moneda actual de los resultados.
    }
  };

  const doSearch = async (payload) => {
    setState({ busy: true, error: '', degraded: false, searched: true });
    try {
      const res = await flightsApi.search(payload);
      setOffers(res.data);
      setState({ busy: false, error: '', degraded: Boolean(res.degraded), searched: true });
    } catch (err) {
      setOffers([]);
      setState({ busy: false, error: err.message, degraded: false, searched: true });
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (totalTravelers < 1 || totalTravelers > 9) return;
    doSearch({
      tripType: form.tripType,
      origin: form.origin,
      destination: form.destination,
      departureDate: form.departureDate,
      returnDate: form.returnDate,
      adults: form.adults,
      children: form.children,
      infants: form.infants,
      cabinClass: form.cabinClass,
      currency: form.currency,
    });
  };

  const quickSearch = ({ origin, destination }) => {
    setForm((f) => ({ ...f, origin, destination }));
  };

  const visibleOffers = offers.filter((offer) => {
    const checked = offer.baggage?.checked || 0;
    if (form.baggageFilter === 'con_documentada') return checked > 0;
    if (form.baggageFilter === 'solo_mano') return checked === 0;
    return true;
  });

  const inputCls = 'mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400';

  return (
    <div className="min-h-screen bg-lienzo space-y-6 p-4">
      <datalist id="lista-aeropuertos">
        {airports.map((a) => (
          <option key={a.iata} value={a.value}>{a.label}</option>
        ))}
      </datalist>

      <Hero
        image={HERO_IMAGE}
        eyebrow="Descubrimiento · Vuelos"
        title="Buscar vuelos"
        subtitle="Compara vuelos por precio por persona y total del grupo."
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="text-tinta-500">Tipo de viaje</span>
            <select value={form.tripType} onChange={update('tripType')} className={inputCls}>
              <option value="round_trip">Redondo</option>
              <option value="one_way">Solo ida</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Origen</span>
            <input
              value={form.origin}
              onChange={update('origin')}
              list="lista-aeropuertos"
              placeholder="Ej. Ciudad de México o MEX"
              required
              className={inputCls}
            />
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Destino</span>
            <input
              value={form.destination}
              onChange={update('destination')}
              list="lista-aeropuertos"
              placeholder="Ej. Cancún o CUN"
              required
              className={inputCls}
            />
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Salida</span>
            <input
              type="date"
              value={form.departureDate}
              onChange={update('departureDate')}
              min={todayStr}
              max={maxDateStr}
              required
              className={inputCls}
            />
          </label>

          {form.tripType === 'round_trip' && (
            <label className="text-sm">
              <span className="text-tinta-500">Regreso</span>
              <input
                type="date"
                value={form.returnDate}
                onChange={update('returnDate')}
                min={form.departureDate || todayStr}
                max={maxDateStr}
                required
                className={inputCls}
              />
            </label>
          )}

          <label className="text-sm">
            <span className="text-tinta-500">Adultos (1-9)</span>
            <input
              type="number"
              min={1}
              max={9}
              value={form.adults}
              onChange={updateCount('adults', 1, 9)}
              className={inputCls}
            />
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Niños</span>
            <input
              type="number"
              min={0}
              max={9}
              value={form.children}
              onChange={updateCount('children', 0, 9)}
              className={inputCls}
            />
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Bebés (sin asiento)</span>
            <input
              type="number"
              min={0}
              max={9}
              value={form.infants}
              onChange={updateCount('infants', 0, 9)}
              className={inputCls}
            />
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Clase</span>
            <select
              value={form.cabinClass}
              onChange={update('cabinClass')}
              className={inputCls}
            >
              <option value="economy">Económica</option>
              <option value="premium_economy">Económica premium</option>
              <option value="business">Ejecutiva</option>
              <option value="first">Primera clase</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Equipaje</span>
            <select value={form.baggageFilter} onChange={update('baggageFilter')} className={inputCls}>
              <option value="cualquiera">Cualquiera</option>
              <option value="solo_mano">Solo de mano</option>
              <option value="con_documentada">Con maleta documentada</option>
            </select>
            <span className="block mt-1 text-xs text-tinta-400">
              Los asientos se asignan al reservar.
            </span>
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Moneda</span>
            <select value={form.currency} onChange={changeCurrency} className={inputCls}>
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={state.busy}
            className="lg:col-span-4 self-start rounded-md bg-azul-600 px-4 py-2 text-sm font-medium text-white hover:bg-azul-700 active:bg-azul-800 disabled:opacity-50"
          >
            {state.busy ? 'Buscando...' : `Buscar (${totalTravelers} pasajero${totalTravelers === 1 ? '' : 's'})`}
          </button>
        </form>
      </Hero>

      {!state.searched && (
        <PopularOptions
          eyebrow="Descubrimiento · Vuelos"
          title="Rutas populares"
          subtitle="Elige una ruta frecuente para llenar el origen y destino; tú completas fechas y pasajeros."
          items={RUTAS}
          onPick={quickSearch}
        />
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-criticoSuave px-4 py-3 text-sm text-critico">
          {state.error}
        </p>
      )}

      {state.degraded && (
        <p className="rounded-md bg-ambar-50 px-4 py-3 text-sm text-ambar-700 border border-dashed border-ambar-400">
          El proveedor de vuelos no respondió. Estás viendo resultados de ejemplo.
        </p>
      )}

      <section className="grid gap-3">
        {visibleOffers.map((offer) => (
          <FlightCard key={offer.externalId} offer={offer} travelers={totalTravelers} />
        ))}
        {state.searched && !state.busy && visibleOffers.length === 0 && !state.error && (
          <p className="text-sm text-tinta-500">No se encontraron vuelos para esos criterios.</p>
        )}
        {state.searched && !state.busy && offers.length > 0 && visibleOffers.length === 0 && (
          <p className="text-sm text-tinta-500">
            Ningún vuelo de los encontrados tiene ese tipo de equipaje.
          </p>
        )}
      </section>
    </div>
  );
}
