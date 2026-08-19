/**
 * Panel de presupuesto dinamico. DUENO: Jeshua (modulo C).
 *
 * El calculo lo hace SIEMPRE el backend: este componente solo renderiza lo que
 * llega de la API y envia cambios de viajeros.
 */
import { useMemo, useState } from 'react';
import Distintivo from '../../../components/ui/Distintivo';
import { dinero } from '../../../core/utils/formato';

const LABELS = {
  flight: 'Vuelos',
  stay: 'Hospedaje',
  experience: 'Experiencias',
  other: 'Otros',
};

const ORDER = ['flight', 'stay', 'experience', 'other'];

function clampTravelers(value) {
  return Math.max(1, Math.min(20, Number(value) || 1));
}

function Breakdown({ budget, currency }) {
  const categories = ORDER
    .map((key) => [key, Number(budget?.byCategory?.[key] || 0)])
    .filter(([, value]) => value > 0);
  const contingencyPct = Number(budget?.contingencyRate ?? 0.1) * 100;
  const contingencyLabel = Number.isInteger(contingencyPct)
    ? contingencyPct.toFixed(0)
    : contingencyPct.toFixed(1).replace(/\.0$/, '');

  return (
    <dl className="space-y-2 text-cuerpo">
      {categories.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <dt className="text-tinta-500">{LABELS[key] ?? key}</dt>
          <dd className="precio-col-sm text-tinta-900">{dinero(value, currency)}</dd>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3 border-t border-borde pt-2">
        <dt className="text-tinta-500">Subtotal</dt>
        <dd className="precio-col-sm text-tinta-900">{dinero(budget?.subtotal, currency)}</dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-tinta-500">Fondo de imprevistos {contingencyLabel}%</dt>
        <dd className="precio-col-sm text-tinta-900">{dinero(budget?.contingency, currency)}</dd>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-borde pt-2">
        <dt className="text-tarjeta text-tinta-900">Total estimado</dt>
        <dd className="precio-col text-precioSm text-tinta-900">{dinero(budget?.total, currency)}</dd>
      </div>
      <div className="flex items-center justify-between gap-3 text-menor text-tinta-500">
        <dt>Por persona</dt>
        <dd className="precio-col-sm text-tinta-700">{dinero(budget?.perPerson, currency)}</dd>
      </div>
    </dl>
  );
}

function TravelersControl({ travelers, onChange, busy }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-menor font-semibold text-tinta-700">Viajeros</p>
        <div className="flex h-9 items-center gap-2 rounded-md border border-bordeInteractivo px-2">
          <button
            type="button"
            onClick={() => onChange(travelers - 1)}
            className="h-6 w-6 rounded border border-borde text-tinta-700 hover:bg-lienzo"
            aria-label="Disminuir viajeros"
            disabled={busy}
          >
            -
          </button>
          <span className="w-8 text-center text-cuerpo font-semibold tabular-nums">{travelers}</span>
          <button
            type="button"
            onClick={() => onChange(travelers + 1)}
            className="h-6 w-6 rounded border border-borde text-tinta-700 hover:bg-lienzo"
            aria-label="Aumentar viajeros"
            disabled={busy}
          >
            +
          </button>
        </div>
      </div>

      <input
        type="range"
        min={1}
        max={20}
        value={travelers}
        disabled={busy}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-lienzo accent-azul-600 disabled:cursor-not-allowed"
      />

      {busy && <p className="mt-1 text-menor text-tinta-500">Recalculando...</p>}
    </div>
  );
}

function BudgetContent({ budget, travelers, onChangeTravelers, busy }) {
  const currency = budget?.currency || 'MXN';
  const limit = budget?.budgetLimit == null ? null : Number(budget.budgetLimit);
  const total = Number(budget?.total || 0);
  const hasLimit = Number.isFinite(limit) && limit > 0;
  const pct = hasLimit ? (total / limit) * 100 : 0;
  const progress = hasLimit ? Math.max(2, Math.min(100, pct)) : 0;
  const nearLimit = hasLimit && !budget?.overBudget && pct >= 90;
  const remaining = Number(budget?.remaining || 0);

  return (
    <div className="space-y-4">
      <header>
        <p className="etiqueta-seccion">Total del viaje</p>
        <p className={`mt-1 text-precio ${busy ? 'text-azul-700/70' : 'text-azul-600'}`}>
          {dinero(total, currency)}
        </p>
        <p className="text-menor text-tinta-500">{dinero(budget?.perPerson, currency)} por persona</p>
      </header>

      <TravelersControl travelers={travelers} onChange={onChangeTravelers} busy={busy} />

      <div className={busy ? 'opacity-60 transition-opacity duration-realce' : 'transition-opacity duration-realce'}>
        {!budget ? (
          <p className="text-cuerpo text-tinta-500">Agrega conceptos al itinerario para ver el presupuesto.</p>
        ) : (
          <>
            <Breakdown budget={budget} currency={currency} />

            {hasLimit && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-menor text-tinta-500">
                  <span>Tu limite</span>
                  <span>{dinero(limit, currency)}</span>
                </div>
                <div className="h-2 rounded-full bg-lienzo">
                  <div
                    className={`h-2 rounded-full ${budget?.overBudget ? 'bg-critico' : nearLimit ? 'bg-ambar-400' : 'bg-exito'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-menor text-tinta-500">
                  <span>{Math.round(Math.max(0, Math.min(100, pct)))}% del limite</span>
                  <span>{budget?.overBudget ? 'Excedido' : 'En rango'}</span>
                </div>
              </div>
            )}

            {budget?.overBudget && (
              <p className="rounded-md border border-critico/20 bg-criticoSuave px-3 py-2 text-menor text-critico">
                ▲ {dinero(Math.abs(remaining), currency)} arriba de tu limite.
              </p>
            )}

            {nearLimit && (
              <p className="rounded-md border border-ambar-100 bg-ambar-50 px-3 py-2 text-menor text-ambar-700">
                ★ Estas cerca del limite. Revisa hospedaje y conceptos por dia.
              </p>
            )}

            {!budget?.overBudget && !nearLimit && hasLimit && (
              <p className="rounded-md border border-exito/20 bg-exitoSuave px-3 py-2 text-menor text-exito">
                ✓ Te quedan {dinero(Math.max(0, remaining), currency)} antes de alcanzar tu limite.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BudgetPanel({ budget, travelers = 1, onChangeTravelers, busy = false, className = '' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const safeTravelers = clampTravelers(travelers);

  const changeTravelers = (next) => {
    const value = clampTravelers(next);
    if (value !== safeTravelers) onChangeTravelers?.(value);
  };

  const mobileSummary = useMemo(() => {
    if (!budget) {
      return { total: 'Sin datos', status: null };
    }
    const currency = budget.currency || 'MXN';
    const status = budget.overBudget ? 'critico' : 'exito';
    return { total: dinero(budget.total, currency), status };
  }, [budget]);

  return (
    <>
      <aside className={`hidden h-fit rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta lg:block ${className}`}>
        <BudgetContent
          budget={budget}
          travelers={safeTravelers}
          onChangeTravelers={changeTravelers}
          busy={busy}
        />
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-superficie shadow-hoja lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div>
            <p className="text-menor text-tinta-500">Total estimado</p>
            <p className="text-seccion text-azul-700">{mobileSummary.total}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded border border-borde px-2 py-1 text-menor text-tinta-700">
              {safeTravelers} viajeros
            </span>
            {mobileSummary.status && (
              <Distintivo tono={mobileSummary.status}>
                {budget?.overBudget ? 'Sobre limite' : 'En rango'}
              </Distintivo>
            )}
            <span className="text-menor font-semibold text-azul-700">{mobileOpen ? 'Cerrar' : 'Abrir'}</span>
          </div>
        </button>

        {mobileOpen && (
          <div className="border-t border-borde px-4 pb-4 pt-3">
            <BudgetContent
              budget={budget}
              travelers={safeTravelers}
              onChangeTravelers={changeTravelers}
              busy={busy}
            />
          </div>
        )}
      </div>
    </>
  );
}
