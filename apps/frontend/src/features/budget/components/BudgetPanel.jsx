/**
 * Panel de presupuesto dinamico. DUENO: integrante C.
 *
 * Decision de arquitectura importante: el calculo NO se duplica en el frontend.
 * Al mover el selector de viajeros se llama a la API y se pinta lo que responde.
 * Tener la formula en dos lugares garantiza que tarde o temprano dejen de
 * coincidir, y ademas el numero que ve el usuario debe ser el mismo que el
 * servidor considera valido.
 */
import { useEffect, useState } from 'react';
import { tripsApi } from '../../trips/api';

const money = (amount, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount ?? 0);

const LABELS = { flight: 'Vuelos', stay: 'Hospedaje', experience: 'Experiencias', other: 'Otros' };

export default function BudgetPanel({ tripId }) {
  const [budget, setBudget] = useState(null);
  const [travelers, setTravelers] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    tripsApi.budget(tripId).then((res) => setBudget(res.data)).catch(() => setBudget(null));
  }, [tripId]);

  const changeTravelers = async (value) => {
    setTravelers(value);
    setBusy(true);
    try {
      const res = await tripsApi.setTravelers(tripId, value);
      setBudget(res.data);
    } catch { /* el error se muestra en la pagina contenedora */ }
    setBusy(false);
  };

  return (
    <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Presupuesto</h2>

      <label className="mt-4 block text-sm">
        <span className="text-slate-600">Viajeros: {travelers}</span>
        <input type="range" min={1} max={20} value={travelers}
          onChange={(e) => changeTravelers(Number(e.target.value))}
          className="mt-2 w-full accent-sky-600" />
      </label>

      {!budget ? (
        <p className="mt-4 text-sm text-slate-400">Agrega elementos al itinerario para ver el presupuesto.</p>
      ) : (
        <dl className={`mt-4 space-y-2 text-sm ${busy ? 'opacity-50' : ''}`}>
          {Object.entries(budget.byCategory || {}).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <dt className="text-slate-600">{LABELS[key] ?? key}</dt>
              <dd>{money(value, budget.currency)}</dd>
            </div>
          ))}

          <div className="flex justify-between border-t border-slate-200 pt-2">
            <dt className="text-slate-600">Subtotal</dt>
            <dd>{money(budget.subtotal, budget.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Imprevistos</dt>
            <dd>{money(budget.contingency, budget.currency)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{money(budget.total, budget.currency)}</dd>
          </div>
          <div className="flex justify-between text-slate-500">
            <dt>Por persona</dt>
            <dd>{money(budget.perPerson, budget.currency)}</dd>
          </div>

          {budget.overBudget && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              El plan supera tu limite de {money(budget.budgetLimit, budget.currency)}.
            </p>
          )}
        </dl>
      )}
    </aside>
  );
}
