/** DUENO: Jeshua (modulo C). */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import Distintivo from '../../../components/ui/Distintivo';
import Tarjeta from '../../../components/ui/Tarjeta';
import { dinero, plural } from '../../../core/utils/formato';
import { tripsApi } from '../api';

const fechaMxCorta = (iso) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
  .format(new Date(`${iso}T00:00:00`));

const toInputDate = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
};

const dateOnly = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const normalizeTrip = (row) => ({
  id: row.id,
  title: row.title,
  originCity: row.origin_city ?? row.originCity,
  destinationCity: row.destination_city ?? row.destinationCity,
  startDate: dateOnly(row.start_date ?? row.startDate),
  endDate: dateOnly(row.end_date ?? row.endDate),
  travelers: Number(row.travelers ?? 1),
  currency: row.currency ?? 'MXN',
  budgetLimit: row.budget_limit ?? row.budgetLimit ?? null,
});

const PAGE_SIZE = 20;

function initialForm() {
  const startDate = toInputDate(new Date());
  return {
    title: '',
    originCity: 'Ciudad de Mexico',
    destinationCity: 'Oaxaca',
    startDate,
    endDate: addDays(startDate, 4),
    travelers: 6,
    budgetLimit: '65000',
    currency: 'MXN',
  };
}

function tripStatus(trip, budget) {
  if (!budget) return { tono: 'neutro', texto: 'Calculando presupuesto' };

  const limit = trip.budgetLimit == null ? null : Number(trip.budgetLimit);
  if (!Number.isFinite(limit) || limit == null || limit <= 0) {
    return { tono: 'neutro', texto: 'Sin limite definido' };
  }

  if (budget.overBudget) return { tono: 'critico', texto: 'Excede el limite' };

  const pct = (Number(budget.total) / limit) * 100;
  if (pct >= 90) return { tono: 'oferta', texto: 'Cerca del limite' };

  return { tono: 'exito', texto: 'Dentro del limite' };
}

function TripCard({ trip, budget, onOpen }) {
  const status = tripStatus(trip, budget);
  const limit = trip.budgetLimit == null ? null : Number(trip.budgetLimit);
  const total = budget ? Number(budget.total) : null;
  const pct = limit && limit > 0 && total != null ? Math.min(100, Math.max(2, (total / limit) * 100)) : null;
  const barra = budget?.overBudget ? 'bg-critico' : status.tono === 'oferta' ? 'bg-ambar-400' : 'bg-exito';

  return (
    <Tarjeta
      comoElemento="button"
      type="button"
      onClick={onOpen}
      className="w-full p-3 text-left transition hover:-translate-y-0.5 hover:shadow-elevada"
    >
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="grid h-24 place-items-center rounded-md border border-dashed border-borde bg-lienzo text-menor text-tinta-500">
          destino
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-tarjeta text-tinta-900">{trip.title}</h2>
              <p className="mt-1 text-menor text-tinta-500">
                {trip.originCity} - {trip.destinationCity} · {fechaMxCorta(trip.startDate)} - {fechaMxCorta(trip.endDate)}
                {' '}· {plural(trip.travelers, 'viajero', 'viajeros')}
              </p>
            </div>
            <Distintivo tono={status.tono}>{status.texto}</Distintivo>
          </div>

          <div className="mt-3">
            {budget ? (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-precioSm text-tinta-900">{dinero(total, budget.currency || trip.currency)}</p>
                    <p className="text-menor text-ambar-700">{dinero(budget.perPerson, budget.currency || trip.currency)} por persona</p>
                  </div>
                  {limit != null && Number.isFinite(limit) && limit > 0 && (
                    <p className="text-menor text-tinta-500">Limite {dinero(limit, trip.currency)}</p>
                  )}
                </div>

                {pct != null && (
                  <>
                    <div className="mt-2 h-1.5 rounded-full bg-lienzo">
                      <div className={`h-1.5 rounded-full ${barra}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-menor text-tinta-500">
                      {budget.overBudget ? '100% del limite' : `${Math.round(pct)}% del limite`}
                    </p>
                  </>
                )}
              </>
            ) : (
              <p className="text-menor text-tinta-500">Cargando total estimado...</p>
            )}
          </div>
        </div>
      </div>
    </Tarjeta>
  );
}

export default function TripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, pages: 1 });
  const [budgetsByTrip, setBudgetsByTrip] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(initialForm);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await tripsApi.list({ page, pageSize: PAGE_SIZE });
        const rows = Array.isArray(res.data) ? res.data.map(normalizeTrip) : [];
        const nextPagination = res.pagination || {};
        const total = Number(nextPagination.total || 0);
        const pages = Math.max(1, Number(nextPagination.pages || Math.ceil(total / PAGE_SIZE) || 1));

        if (cancelled) return;
        setTrips(rows);
        setPagination({
          page: Number(nextPagination.page || page),
          pageSize: Number(nextPagination.pageSize || PAGE_SIZE),
          total,
          pages,
        });

        const budgetEntries = await Promise.all(rows.map(async (trip) => {
          try {
            const budgetRes = await tripsApi.budget(trip.id);
            return [trip.id, budgetRes.data];
          } catch {
            return [trip.id, null];
          }
        }));
        if (cancelled) return;
        setBudgetsByTrip(Object.fromEntries(budgetEntries));
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'No fue posible cargar tus viajes.');
        setTrips([]);
        setPagination({ page: 1, pageSize: PAGE_SIZE, total: 0, pages: 1 });
        setBudgetsByTrip({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const stats = useMemo(() => {
    const activos = pagination.total;
    return `${activos} ${activos === 1 ? 'viaje activo' : 'viajes activos'}`;
  }, [pagination.total]);

  const onForm = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const setTravelers = (next) => {
    const value = Math.max(1, Math.min(20, Number(next) || 1));
    setForm((prev) => ({ ...prev, travelers: value }));
  };

  const onCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    setCreateError('');

    const sanitized = form.budgetLimit.trim().replace(/[\s,$]/g, '');
    const budgetLimit = sanitized ? Number(sanitized) : null;

    if (sanitized && (!Number.isFinite(budgetLimit) || budgetLimit < 0)) {
      setCreateError('El limite debe ser un numero valido mayor o igual a 0.');
      setCreating(false);
      return;
    }

    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setCreateError('La fecha de regreso debe ser posterior a la de salida.');
      setCreating(false);
      return;
    }

    try {
      const res = await tripsApi.create({
        title: form.title,
        originCity: form.originCity,
        destinationCity: form.destinationCity,
        startDate: form.startDate,
        endDate: form.endDate,
        travelers: Number(form.travelers),
        currency: form.currency,
        budgetLimit,
      });

      const createdId = res.data?.id;
      if (createdId) {
        navigate(`/viajes/${createdId}`);
        return;
      }
      navigate('/viajes');
    } catch (err) {
      setCreateError(err.message || 'No fue posible crear el viaje.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="rounded-xl border border-borde bg-realce/40 p-4 shadow-tarjeta sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-titulo text-tinta-900">Mis viajes</h1>
          <p className="mt-1 text-cuerpo text-tinta-500">{stats}</p>
        </div>
        <Boton variante="primario" tamano="sm" onClick={() => document.getElementById('crear-viaje')?.scrollIntoView({ behavior: 'smooth' })}>
          + Crear viaje
        </Boton>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          {loading && (
            <Tarjeta className="p-4">
              <p className="text-cuerpo text-tinta-500">Cargando viajes...</p>
            </Tarjeta>
          )}

          {error && (
            <p role="alert" className="rounded-md border border-critico/20 bg-criticoSuave px-3 py-2 text-menor text-critico">
              {error}
            </p>
          )}

          {!loading && !error && trips.length === 0 && (
            <Tarjeta className="p-4">
              <p className="text-cuerpo text-tinta-500">Aun no tienes viajes. Crea uno para empezar a planear.</p>
            </Tarjeta>
          )}

          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              budget={budgetsByTrip[trip.id]}
              onOpen={() => navigate(`/viajes/${trip.id}`)}
            />
          ))}

          {!loading && !error && pagination.pages > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-borde bg-superficie px-3 py-2">
              <p className="text-menor text-tinta-500">
                Pagina {pagination.page} de {pagination.pages}
              </p>
              <div className="flex items-center gap-2">
                <Boton
                  variante="secundario"
                  tamano="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={pagination.page <= 1}
                >
                  Anterior
                </Boton>
                <Boton
                  variante="secundario"
                  tamano="sm"
                  onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
                  disabled={pagination.page >= pagination.pages}
                >
                  Siguiente
                </Boton>
              </div>
            </div>
          )}
        </div>

        <Tarjeta className="p-4" id="crear-viaje">
          <h2 className="text-seccion text-tinta-900">Crear viaje</h2>
          <p className="mt-1 text-cuerpo text-tinta-500">Solo el titulo y las fechas son obligatorios.</p>

          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <Campo
              etiqueta="Titulo"
              value={form.title}
              onChange={onForm('title')}
              minLength={3}
              maxLength={120}
              required
              placeholder="Puente de noviembre en Oaxaca"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Origen" value={form.originCity} onChange={onForm('originCity')} minLength={2} maxLength={80} required />
              <Campo etiqueta="Destino" value={form.destinationCity} onChange={onForm('destinationCity')} minLength={2} maxLength={80} required />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Salida" type="date" value={form.startDate} onChange={onForm('startDate')} required />
              <Campo etiqueta="Regreso" type="date" value={form.endDate} onChange={onForm('endDate')} required />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 block text-menor font-semibold text-tinta-700">Viajeros (1 a 20)</p>
                <div className="flex h-11 items-center gap-2 rounded-md border border-bordeInteractivo px-2">
                  <button
                    type="button"
                    onClick={() => setTravelers(form.travelers - 1)}
                    className="h-7 w-7 rounded border border-borde text-tinta-700 hover:bg-lienzo"
                    aria-label="Disminuir viajeros"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-cuerpo font-semibold tabular-nums">{form.travelers}</span>
                  <button
                    type="button"
                    onClick={() => setTravelers(form.travelers + 1)}
                    className="h-7 w-7 rounded border border-borde text-tinta-700 hover:bg-lienzo"
                    aria-label="Aumentar viajeros"
                  >
                    +
                  </button>
                </div>
              </div>

              <Campo
                etiqueta="Limite (opcional)"
                inputMode="decimal"
                value={form.budgetLimit}
                onChange={onForm('budgetLimit')}
                placeholder="65000"
              />
            </div>

            {createError && (
              <p role="alert" className="rounded-md border border-critico/20 bg-criticoSuave px-3 py-2 text-menor text-critico">
                {createError}
              </p>
            )}

            <Boton type="submit" cargando={creating} anchoCompleto>
              Crear y abrir viaje
            </Boton>
          </form>
        </Tarjeta>
      </div>
    </section>
  );
}
