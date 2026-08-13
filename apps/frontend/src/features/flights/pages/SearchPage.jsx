/**
 * Buscador de vuelos. DUENO: Kassie (modulo B).
 */
import { useEffect, useState } from 'react';
import { flightsApi } from '../api';
import FlightCard from '../components/FlightCard';
import Hero from '../../shared/Hero';
import PopularOptions from '../../shared/PopularOptions';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=60';

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const maxDate = new Date(today);
maxDate.setMonth(maxDate.getMonth() + 11);
const maxDateStr = maxDate.toISOString().split('T')[0];

const clamp = (n) => Math.min(9, Math.max(1, Number.isNaN(n) ? 1 : n));

const initialForm = { tripType: 'round_trip', origin: '', destination: '', departureDate: '', returnDate: '', travelers: 1, cabinClass: 'economy', currency: 'MXN' };

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

  const update = (field) => (e) => {
    const value = e.target.value;
    // Al pasar a "solo ida" se limpia la fecha de regreso que ya no aplica.
    setForm(field === 'tripType'
      ? { ...form, tripType: value, returnDate: value === 'one_way' ? '' : form.returnDate }
      : { ...form, [field]: value });
  };
  const updateTravelers = (e) => setForm({ ...form, travelers: clamp(parseInt(e.target.value, 10)) });

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
    doSearch(form);
  };

  const quickSearch = ({ origin, destination }) => {
    setForm({ ...form, origin, destination });
  };

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
            <select
              value={form.tripType}
              onChange={update('tripType')}
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
            >
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
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
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
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
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
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
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
                className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
              />
            </label>
          )}

          <label className="text-sm">
            <span className="text-tinta-500">Viajeros (1-9)</span>
            <input
              type="number"
              min={1}
              max={9}
              value={form.travelers}
              onChange={updateTravelers}
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
            />
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Clase</span>
            <select
              value={form.cabinClass}
              onChange={update('cabinClass')}
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
            >
              <option value="economy">Económica</option>
              <option value="premium_economy">Económica premium</option>
              <option value="business">Ejecutiva</option>
              <option value="first">Primera clase</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Moneda</span>
            <select
              value={form.currency}
              onChange={update('currency')}
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
            >
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
            {state.busy ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </Hero>

      {!state.searched && (
        <PopularOptions
          eyebrow="Descubrimiento · Vuelos"
          title="Rutas populares"
          subtitle="Elige una ruta frecuente para llenar el origen y destino; tú completas fechas y viajeros."
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
        {offers.map((offer) => (
          <FlightCard key={offer.externalId} offer={offer} travelers={Number(form.travelers)} />
        ))}
        {state.searched && !state.busy && offers.length === 0 && !state.error && (
          <p className="text-sm text-tinta-500">No se encontraron vuelos para esos criterios.</p>
        )}
      </section>
    </div>
  );
}
