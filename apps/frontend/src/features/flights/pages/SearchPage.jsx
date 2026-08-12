/**
 * Buscador de vuelos. DUENO: Kassie (modulo B).
 */
import { useState } from 'react';
import { flightsApi } from '../api';
import FlightCard from '../components/FlightCard';

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const maxDate = new Date(today);
maxDate.setMonth(maxDate.getMonth() + 11);
const maxDateStr = maxDate.toISOString().split('T')[0];

const initialForm = { origin: 'MEX', destination: 'CUN', departureDate: '', travelers: 2, cabinClass: 'economy' };

export default function SearchPage() {
  const [form, setForm] = useState(initialForm);
  const [offers, setOffers] = useState([]);
  const [state, setState] = useState({ busy: false, error: '', degraded: false, searched: false });

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '', degraded: false, searched: true });
    try {
      const res = await flightsApi.search(form);
      setOffers(res.data);
      setState({ busy: false, error: '', degraded: Boolean(res.degraded), searched: true });
    } catch (err) {
      setOffers([]);
      setState({ busy: false, error: err.message, degraded: false, searched: true });
    }
  };

  return (
    <div className="min-h-screen bg-lienzo space-y-6 p-4">
      <section className="rounded-lg border border-borde bg-superficie p-5">
        <h1 className="text-titulo text-tinta-900">Buscar vuelos</h1>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="text-tinta-500">Origen (IATA)</span>
            <input
              value={form.origin}
              onChange={update('origin')}
              maxLength={3}
              required
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-azul-400"
            />
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Destino (IATA)</span>
            <input
              value={form.destination}
              onChange={update('destination')}
              maxLength={3}
              required
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-azul-400"
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

          <label className="text-sm">
            <span className="text-tinta-500">Viajeros</span>
            <input
              type="number"
              min={1}
              max={9}
              value={form.travelers}
              onChange={update('travelers')}
              className="mt-1 w-full rounded-md border border-bordeInteractivo px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azul-400"
            />
          </label>

          <button
            type="submit"
            disabled={state.busy}
            className="self-end rounded-md bg-azul-600 px-4 py-2 text-sm font-medium text-white hover:bg-azul-700 active:bg-azul-800 disabled:opacity-50"
          >
            {state.busy ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </section>

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