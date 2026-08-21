/** DUENO: Jeshua (modulo C). */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Distintivo, { PrecioEstimado } from '../../../components/ui/Distintivo';
import PildoraEscala, { MultiplicadorEscala } from '../../../components/ui/PildoraEscala';
import Tarjeta, { EncabezadoSeccion } from '../../../components/ui/Tarjeta';
import {
  dinero,
  dineroDeCentavos,
  formulaDeConcepto,
  habitacionesPara,
  plural,
} from '../../../core/utils/formato';
import { paymentsApi } from '../../payments/api';
import BudgetPanel from '../../budget/components/BudgetPanel';
import { tripsApi } from '../api';

const SECCIONES = {
  flight: 'Vuelos',
  stay: 'Hospedaje',
  experience: 'Experiencias',
  other: 'Otros',
};

const ORDEN = ['flight', 'stay', 'experience', 'other'];

const toDate = (value) => (value ? String(value).slice(0, 10) : '');

const fechaDia = (iso) => {
  const texto = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${iso}T00:00:00`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const fechaCorta = (iso) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
  .format(new Date(`${iso}T00:00:00`));

const diasEntre = (startDate, endDate) => {
  const diff = new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`);
  return Math.max(1, Math.round(diff / 86400000));
};

const safeMeta = (meta) => {
  if (!meta) return null;
  if (typeof meta === 'object') return meta;
  if (typeof meta !== 'string') return null;
  try {
    return JSON.parse(meta);
  } catch {
    return null;
  }
};

const normalizeItem = (item) => ({
  id: item.id,
  type: item.type,
  provider: item.provider,
  externalId: item.external_id ?? item.externalId,
  title: item.title,
  unitPriceCents: Number(item.unit_price_cents ?? item.unitPriceCents ?? 0),
  currency: item.currency || 'MXN',
  pricingMode: item.pricing_mode ?? item.pricingMode,
  quantity: Number(item.quantity || 1),
  estimated: Boolean(item.estimated),
  meta: safeMeta(item.meta),
});

const normalizeTrip = (trip) => ({
  id: trip.id,
  title: trip.title,
  originCity: trip.origin_city ?? trip.originCity,
  destinationCity: trip.destination_city ?? trip.destinationCity,
  startDate: toDate(trip.start_date ?? trip.startDate),
  endDate: toDate(trip.end_date ?? trip.endDate),
  travelers: Number(trip.travelers || 1),
  currency: trip.currency || 'MXN',
  budgetLimit: trip.budget_limit ?? trip.budgetLimit ?? null,
  isPaid: Boolean(trip.is_paid ?? trip.isPaid),
  items: Array.isArray(trip.items) ? trip.items.map(normalizeItem) : [],
});

const hasPaidOrder = (data) => {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.some((row) => row?.status === 'paid');
};

// Este subtotal es informativo para la tabla. El total oficial siempre viene del backend.
const subtotalItem = (item, tripStats) => {
  const qty = Math.max(1, Number(item.quantity || 1));
  const unit = Number(item.unitPriceCents || 0) / 100;

  switch (item.pricingMode) {
    case 'per_person': return unit * tripStats.travelers * qty;
    case 'per_group': return unit * qty;
    case 'per_night_per_room': return unit * tripStats.nights * tripStats.rooms * qty;
    case 'per_person_per_day': return unit * tripStats.travelers * tripStats.days * qty;
    default: return unit * qty;
  }
};

function ItineraryRow({ item, tripStats, defaultCurrency, showRemove = false, removing = false, onRemove }) {
  const currency = item.currency || defaultCurrency;
  const total = subtotalItem(item, tripStats);

  const routeLabel = item.type === 'flight'
    ? [item.meta?.originCity || item.meta?.originCode, item.meta?.destinationCity || item.meta?.destinationCode]
      .filter(Boolean)
      .join(' → ')
    : '';

  const placeLabel = (item.type === 'stay' || item.type === 'experience')
    ? String(item.meta?.address || '').trim()
    : '';

  const reservationDateLabel = item.type === 'experience' && item.meta?.reservationDate
    ? `Reservada para ${fechaCorta(item.meta.reservationDate)}`
    : '';

  const seatsLabel = item.type === 'flight' && item.meta?.seats
    ? [
        item.meta.seats.outbound?.length ? `Asiento ida ${item.meta.seats.outbound.map((s) => s.designator).join(', ')}` : '',
        item.meta.seats.return?.length ? `regreso ${item.meta.seats.return.map((s) => s.designator).join(', ')}` : '',
      ].filter(Boolean).join(' · ')
    : '';

  const detailLabel = [routeLabel, placeLabel, reservationDateLabel, seatsLabel].filter(Boolean).join(' · ');

  return (
    <li className="border-b border-borde px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-cuerpo font-semibold text-tinta-900">{item.title}</p>
          <p className="mt-0.5 text-menor text-tinta-500">
            x{item.quantity}
          </p>
          {detailLabel && (
            <p className="mt-1 text-menor text-tinta-500">{detailLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.estimated && <PrecioEstimado />}
          <PildoraEscala modo={item.pricingMode} />
          {showRemove && (
            <Boton
              variante="destructivo"
              tamano="sm"
              onClick={onRemove}
              disabled={removing}
            >
              {removing ? 'Eliminando...' : 'Eliminar'}
            </Boton>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-menor text-tinta-500">
          {formulaDeConcepto({
            modo: item.pricingMode,
            precioUnitario: item.unitPriceCents / 100,
            moneda: currency,
            viajeros: tripStats.travelers,
            noches: tripStats.nights,
            habitaciones: tripStats.rooms,
            dias: tripStats.days,
          })}
        </p>

        <div className="text-right">
          <p className="text-tarjeta text-tinta-900">{dinero(total, currency)}</p>
          <p className="text-menor text-tinta-500">{dineroDeCentavos(item.unitPriceCents, currency)} unitario</p>
        </div>
      </div>
    </li>
  );
}

function EscalaConceptos({ tripStats }) {
  const filas = [
    { label: 'Vuelo redondo', mode: 'per_person' },
    { label: 'Hotel', mode: 'per_night_per_room' },
    { label: 'Tour privado', mode: 'per_group' },
    { label: 'Comidas y transporte', mode: 'per_person_per_day' },
  ];

  return (
    <Tarjeta className="p-4">
      <h2 className="text-tarjeta text-tinta-900">Como escala cada concepto</h2>
      <ul className="mt-3 space-y-2">
        {filas.map((row) => (
          <li key={row.mode} className="flex items-center justify-between gap-3 text-menor text-tinta-700">
            <span>{row.label}</span>
            <MultiplicadorEscala
              modo={row.mode}
              viajeros={tripStats.travelers}
              noches={tripStats.nights}
              habitaciones={tripStats.rooms}
              dias={tripStats.days}
            />
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

export default function TripDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [travelersBusy, setTravelersBusy] = useState(false);
  const [removingItemId, setRemovingItemId] = useState('');
  const [paidByOrder, setPaidByOrder] = useState(false);
  const [viewMode, setViewMode] = useState('type');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [detailRes, budgetRes, ordersRes] = await Promise.all([
          tripsApi.detail(id),
          tripsApi.budget(id),
          paymentsApi.listOrders({ trip_id: id }).catch(() => null),
        ]);
        if (cancelled) return;
        setTrip(normalizeTrip(detailRes.data));
        setBudget(budgetRes.data);
        setPaidByOrder(hasPaidOrder(ordersRes?.data));
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'No fue posible cargar el viaje.');
        setTrip(null);
        setBudget(null);
        setPaidByOrder(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tripIsPaid = Boolean(trip?.isPaid || paidByOrder);

  const refreshPaidLock = async () => {
    if (!trip?.id) return false;
    try {
      const ordersRes = await paymentsApi.listOrders({ trip_id: trip.id });
      const paid = hasPaidOrder(ordersRes.data);
      setPaidByOrder(paid);
      return paid;
    } catch {
      return false;
    }
  };

  const tripStats = useMemo(() => {
    if (!trip) {
      return { travelers: 1, nights: 1, days: 2, rooms: 1 };
    }
    const nights = diasEntre(trip.startDate, trip.endDate);
    return {
      travelers: trip.travelers,
      nights,
      days: nights + 1,
      rooms: habitacionesPara(trip.travelers),
    };
  }, [trip]);

  const byType = useMemo(() => {
    if (!trip?.items?.length) return [];

    return ORDEN
      .map((type) => {
        const items = trip.items.filter((item) => item.type === type);
        if (!items.length) return null;
        return {
          type,
          items,
          total: items.reduce((acc, item) => acc + subtotalItem(item, tripStats), 0),
        };
      })
      .filter(Boolean);
  }, [trip, tripStats]);

  const byDay = useMemo(() => {
    if (!trip?.items?.length) return [];
    const days = Math.max(1, tripStats.days);

    const buckets = Array.from({ length: days }, (_, index) => {
      const date = new Date(`${trip.startDate}T00:00:00`);
      date.setDate(date.getDate() + index);
      const iso = date.toISOString().slice(0, 10);
      return {
        index,
        date: iso,
        items: [],
      };
    });

    for (const item of trip.items) {
      const metaDay = Number(item.meta?.dayIndex ?? item.meta?.day ?? 1);
      const dayIndex = Number.isFinite(metaDay)
        ? Math.max(0, Math.min(days - 1, Math.round(metaDay) - 1))
        : 0;
      buckets[dayIndex].items.push(item);
    }

    return buckets
      .filter((bucket) => bucket.items.length > 0)
      .map((bucket) => ({
        ...bucket,
        total: bucket.items.reduce((acc, item) => acc + subtotalItem(item, tripStats), 0),
      }));
  }, [trip, tripStats]);

  const onTravelersChange = async (value) => {
    if (!trip) return;
    if (tripIsPaid) {
      setError('Este viaje ya fue pagado y no admite cambios.');
      return;
    }
    if (await refreshPaidLock()) {
      setError('Este viaje ya fue pagado y no admite cambios.');
      return;
    }
    const next = Math.max(1, Math.min(20, Number(value) || 1));
    if (next === trip.travelers) return;

    const previous = trip.travelers;
    setTrip((prev) => ({ ...prev, travelers: next }));
    setTravelersBusy(true);
    setError('');

    try {
      const res = await tripsApi.setTravelers(trip.id, next);
      setBudget(res.data);
    } catch (err) {
      setTrip((prev) => ({ ...prev, travelers: previous }));
      setError(err.message || 'No fue posible recalcular el presupuesto.');
    } finally {
      setTravelersBusy(false);
    }
  };

  const onRemoveExperience = async (itemId) => {
    if (!trip || !itemId || removingItemId) return;
    if (tripIsPaid) {
      setError('Este viaje ya fue pagado y no admite cambios.');
      return;
    }
    if (await refreshPaidLock()) {
      setError('Este viaje ya fue pagado y no admite cambios.');
      return;
    }

    const previousItems = trip.items;
    setError('');
    setRemovingItemId(itemId);
    setTrip((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));

    try {
      const res = await tripsApi.removeItem(trip.id, itemId);
      setBudget(res.data);
    } catch (err) {
      setTrip((prev) => ({ ...prev, items: previousItems }));
      setError(err.message || 'No fue posible eliminar la experiencia.');
    } finally {
      setRemovingItemId('');
    }
  };

  const onReplaceFlight = () => {
    if (!trip || tripIsPaid) return;

    const next = new URLSearchParams({
      tripId: trip.id,
      flow: 'replace',
      replace: 'flight',
      returnTo: `/viajes/${trip.id}`,
      origin: trip.originCity || '',
      destination: trip.destinationCity || '',
      departureDate: trip.startDate || '',
      returnDate: trip.endDate || '',
      travelers: String(trip.travelers || 1),
      currency: trip.currency || 'MXN',
    });

    navigate(`/buscar?${next.toString()}`);
  };

  const onReplaceStay = () => {
    if (!trip || tripIsPaid) return;

    const next = new URLSearchParams({
      tripId: trip.id,
      flow: 'replace',
      replace: 'stay',
      returnTo: `/viajes/${trip.id}`,
      city: trip.destinationCity || '',
      checkIn: trip.startDate || '',
      checkOut: trip.endDate || '',
      travelers: String(trip.travelers || 1),
      currency: trip.currency || 'MXN',
    });

    navigate(`/hospedaje?${next.toString()}`);
  };

  if (loading) {
    return (
      <Tarjeta className="p-6">
        <p className="text-cuerpo text-tinta-500">Cargando viaje...</p>
      </Tarjeta>
    );
  }

  if (!trip) {
    return (
      <Tarjeta className="p-6">
        <p role="alert" className="text-cuerpo text-critico">{error || 'No se encontro el viaje.'}</p>
      </Tarjeta>
    );
  }

  return (
    <div className="space-y-4 pb-28 lg:pb-0">
      <Tarjeta className="overflow-hidden">
        <header className="bg-marca px-4 py-3 text-white sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-seccion">{trip.title}</h1>
            <p className="mt-1 text-menor text-azul-100">
              {trip.originCity} - {trip.destinationCity} · {fechaCorta(trip.startDate)} - {fechaCorta(trip.endDate)}
              {' '}· {plural(trip.travelers, 'viajero', 'viajeros')}
            </p>
            {tripIsPaid && (
              <div className="mt-2">
                <Distintivo tono="exito">Pagado · Edicion bloqueada</Distintivo>
              </div>
            )}
          </div>

          <div className="mt-3 inline-flex rounded-md border border-white/30 p-0.5 sm:mt-0">
            <button
              type="button"
              onClick={() => setViewMode('type')}
              className={`rounded px-3 py-1.5 text-menor font-semibold transition ${
                viewMode === 'type' ? 'bg-white text-azul-700' : 'text-white hover:bg-white/10'
              }`}
            >
              Por tipo
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`rounded px-3 py-1.5 text-menor font-semibold transition ${
                viewMode === 'day' ? 'bg-white text-azul-700' : 'text-white hover:bg-white/10'
              }`}
            >
              Por dia
            </button>
          </div>
        </header>

        <div className="grid gap-4 border-t border-borde p-4 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="etiqueta-seccion">Resumen del viaje</p>
            <p className="mt-2 text-cuerpo text-tinta-700">
              {trip.items.length} conceptos · {plural(tripStats.nights, 'noche', 'noches')} · {plural(tripStats.rooms, 'habitacion', 'habitaciones')}
            </p>
            <p className="mt-1 text-menor text-tinta-500">
              El presupuesto se recalcula al cambiar viajeros y considera que no todos los conceptos escalan igual.
            </p>
          </div>
          <EscalaConceptos tripStats={tripStats} />
        </div>
      </Tarjeta>

      {error && (
        <p role="alert" className="rounded-md border border-critico/20 bg-criticoSuave px-3 py-2 text-menor text-critico">
          {error}
        </p>
      )}

      {!tripIsPaid && (
        <Tarjeta className="p-4">
          <p className="etiqueta-seccion">Actualizar reservaciones</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Boton variante="secundario" tamano="sm" onClick={onReplaceFlight}>Cambiar vuelo</Boton>
            <Boton variante="secundario" tamano="sm" onClick={onReplaceStay}>Cambiar hospedaje</Boton>
          </div>
          <p className="mt-2 text-menor text-tinta-500">
            Al guardar una nueva opcion, reemplazaremos la anterior y volveras automaticamente a este viaje.
          </p>
        </Tarjeta>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(310px,1fr)]">
        <section className="space-y-3">
          {viewMode === 'type' && byType.map((section) => (
            <Tarjeta key={section.type}>
              <EncabezadoSeccion
                titulo={SECCIONES[section.type] || section.type}
                monto={dinero(section.total, trip.currency)}
              />
              <ul>
                {section.items.map((item) => (
                  <ItineraryRow
                    key={item.id}
                    item={item}
                    tripStats={tripStats}
                    defaultCurrency={trip.currency}
                    showRemove={section.type === 'experience' && !tripIsPaid}
                    removing={removingItemId === item.id}
                    onRemove={() => onRemoveExperience(item.id)}
                  />
                ))}
              </ul>
            </Tarjeta>
          ))}

          {viewMode === 'day' && byDay.map((day) => (
            <Tarjeta key={day.index}>
              <EncabezadoSeccion
                titulo={fechaDia(day.date)}
                monto={dinero(day.total, trip.currency)}
              />
              <ul>
                {day.items.map((item) => (
                  <ItineraryRow
                    key={item.id}
                    item={item}
                    tripStats={tripStats}
                    defaultCurrency={trip.currency}
                    showRemove={item.type === 'experience' && !tripIsPaid}
                    removing={removingItemId === item.id}
                    onRemove={() => onRemoveExperience(item.id)}
                  />
                ))}
              </ul>
            </Tarjeta>
          ))}

          {!trip.items.length && (
            <Tarjeta className="p-4">
              <p className="text-cuerpo text-tinta-500">
                Este viaje aun no tiene conceptos. Puedes agregar vuelos, hospedajes o experiencias desde sus modulos.
              </p>
            </Tarjeta>
          )}
        </section>

        <BudgetPanel
          budget={budget}
          travelers={trip.travelers}
          onChangeTravelers={onTravelersChange}
          busy={travelersBusy}
          tripId={trip.id}
          currency={trip.currency}
          isReadOnly={tripIsPaid}
          className="lg:sticky lg:top-4"
        />
      </div>
    </div>
  );
}
