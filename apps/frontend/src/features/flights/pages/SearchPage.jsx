/**
 * Buscador de vuelos. DUENO: Kassie (modulo B).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../core/auth/useAuth';
import { flightsApi } from '../api';
import { getRate, convertList } from '../../../core/api/rates';
import FlightCard from '../components/FlightCard';
import Hero from '../../shared/Hero';
import PopularOptions from '../../shared/PopularOptions';
import { tripsApi } from '../../trips/api';
import { guardarBusqueda, leerBusqueda } from '../../shared/searchSessionMemory';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=60';

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const maxDate = new Date(today);
maxDate.setMonth(maxDate.getMonth() + 11);
const maxDateStr = maxDate.toISOString().split('T')[0];

const MAX_PAX = 9;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));

const addDays = (iso, days) => {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const initialForm = (seed = {}) => ({
  tripType: 'round_trip',
  origin: seed.origin || '',
  destination: seed.destination || '',
  departureDate: seed.departureDate || '',
  returnDate: seed.returnDate || '',
  adults: clamp(seed.travelers || 1, 1, MAX_PAX),
  children: 0,
  infants: 0,
  cabinClass: 'economy',
  currency: seed.currency || 'MXN',
  baggageFilter: 'cualquiera',
});

const RUTAS = [
  { key: 'mex-cun', origin: 'MEX', destination: 'CUN', label: 'Ciudad de México → Cancún', hint: 'La playa más buscada' },
  { key: 'mex-gdl', origin: 'MEX', destination: 'GDL', label: 'Ciudad de México → Guadalajara', hint: 'Ideal para una escapada' },
  { key: 'gdl-mex', origin: 'GDL', destination: 'MEX', label: 'Guadalajara → Ciudad de México', hint: 'Negocios y cultura' },
  { key: 'mex-oax', origin: 'MEX', destination: 'OAX', label: 'Ciudad de México → Oaxaca', hint: 'Gastronomía y magia' },
  { key: 'mty-cun', origin: 'MTY', destination: 'CUN', label: 'Monterrey → Cancún', hint: 'Sol todo el año' },
  { key: 'gdl-cun', origin: 'GDL', destination: 'CUN', label: 'Guadalajara → Cancún', hint: 'Riviera Maya' },
];

const normalizeTrip = (trip) => ({
  id: trip.id,
  title: trip.title,
  destinationCity: trip.destination_city ?? trip.destinationCity,
  isPaid: Boolean(trip.is_paid ?? trip.isPaid),
});

export default function SearchPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const flowTripId = searchParams.get('tripId') || '';
  const flowMode = searchParams.get('flow') || '';
  const replaceTarget = searchParams.get('replace') || '';
  const returnToParam = searchParams.get('returnTo') || '';
  const flowEnabled = flowMode === 'create' && Boolean(flowTripId);
  const replaceFlightFlow = flowMode === 'replace' && replaceTarget === 'flight' && Boolean(flowTripId);
  const safeReturnTo = returnToParam.startsWith('/')
    ? returnToParam
    : (flowTripId ? `/viajes/${flowTripId}` : '/viajes');
  const seed = useMemo(() => ({
    origin: searchParams.get('origin') || '',
    destination: searchParams.get('destination') || '',
    departureDate: searchParams.get('departureDate') || '',
    returnDate: searchParams.get('returnDate') || '',
    travelers: searchParams.get('travelers') || 1,
    currency: searchParams.get('currency') || 'MXN',
  }), [searchParams]);

  // Si no viene de un deep-link (flow=create/replace, que trae su propio
  // criterio) y hay una busqueda guardada de antes de un redirect a login,
  // se recupera esa en vez de arrancar en blanco -- ver searchSessionMemory.
  const memoriaGuardada = !flowEnabled && !replaceFlightFlow ? leerBusqueda('flights') : null;

  const [form, setForm] = useState(() => (memoriaGuardada ? memoriaGuardada.form : initialForm(seed)));
  const [offers, setOffers] = useState(() => memoriaGuardada?.offers || []);
  const [airports, setAirports] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState(flowTripId);
  // Si la memoria vino de la cookie (login con Google, sin resultados por
  // limite de tamaño -- ver searchSessionMemory.js) hay formulario pero no
  // offers: se marca para rebuscar de verdad una sola vez al montar, en vez
  // de mostrar "sin resultados" con un formulario que si tiene datos.
  const [state, setState] = useState(() => (memoriaGuardada?.offers
    ? { busy: false, error: '', degraded: memoriaGuardada.degraded || false, searched: true }
    : { busy: false, error: '', degraded: false, searched: false }));
  const rebuscarAlMontar = useRef(memoriaGuardada && !memoriaGuardada.offers ? memoriaGuardada.form : null);

  useEffect(() => {
    let mounted = true;
    flightsApi.airports()
      .then((res) => { if (mounted) setAirports(res.data || []); })
      .catch(() => { if (mounted) setAirports([]); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTrips = async () => {
      if (!isAuthenticated) {
        setTrips([]);
        setTripId(flowTripId || '');
        return;
      }

      try {
        const res = await tripsApi.list({ page: 1, pageSize: 50 });
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data.map(normalizeTrip) : [];
        const editableRows = rows.filter((row) => !row.isPaid);
        setTrips(editableRows);
        setTripId((prev) => {
          if (flowTripId && editableRows.some((row) => row.id === flowTripId)) return flowTripId;
          if (prev && editableRows.some((row) => row.id === prev)) return prev;
          return editableRows[0]?.id || '';
        });
      } catch {
        if (cancelled) return;
        setTrips([]);
        setTripId(flowTripId || '');
      }
    };

    loadTrips();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, flowTripId]);

  const cityByIata = useMemo(() => Object.fromEntries(
    airports
      .filter((airport) => airport?.iata && airport?.value)
      .map((airport) => [String(airport.iata).toUpperCase(), airport.value]),
  ), [airports]);

  const cityFromCode = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return cityByIata[raw.toUpperCase()] || raw;
  };

  const totalTravelers = form.adults + form.children + form.infants;

  const update = (field) => (e) => {
    const value = e.target.value;
    // Al pasar a "solo ida" se limpia la fecha de regreso que ya no aplica.
    setForm((f) => (field === 'tripType'
      ? { ...f, tripType: value, returnDate: value === 'one_way' ? '' : f.returnDate }
      : { ...f, [field]: value }));
  };

  const updateCount = (field, min) => (e) => {
    const raw = parseInt(e.target.value, 10);
    const value = Number.isNaN(raw) ? min : raw;
    setForm((f) => {
      // Como en Volaris: el total de pasajeros (adultos+ninos+bebes) no
      // puede pasar de 9, aunque cada categoria tenga su propio minimo.
      const others = f.adults + f.children + f.infants - f[field];
      const capped = Math.max(min, Math.min(value, MAX_PAX - others));
      return { ...f, [field]: capped };
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
      guardarBusqueda('flights', { form, offers: res.data, degraded: Boolean(res.degraded) });
    } catch (err) {
      setOffers([]);
      setState({ busy: false, error: err.message, degraded: false, searched: true });
    }
  };

  useEffect(() => {
    const f = rebuscarAlMontar.current;
    if (!f) return;
    rebuscarAlMontar.current = null;
    doSearch({
      tripType: f.tripType,
      origin: f.origin,
      destination: f.destination,
      departureDate: f.departureDate,
      returnDate: f.returnDate,
      adults: f.adults,
      children: f.children,
      infants: f.infants,
      cabinClass: f.cabinClass,
      currency: f.currency,
    });
    // Solo al montar, con el formulario ya restaurado de la cookie -- no
    // depende de nada que cambie despues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (event) => {
    event.preventDefault();
    if (totalTravelers < 1 || totalTravelers > 9) return;
    if (form.tripType === 'round_trip' && form.returnDate && form.departureDate && form.returnDate <= form.departureDate) {
      setState((s) => ({ ...s, error: 'La fecha de regreso debe ser posterior a la de salida.' }));
      return;
    }
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

  const onFlightAdded = (offer, context = {}) => {
    const targetTripId = context.tripId || tripId || flowTripId;
    if (!targetTripId) return;

    if (replaceFlightFlow) {
      const replaceCurrentFlight = async () => {
        if (!context.itemId) {
          throw new Error('No se pudo confirmar el nuevo vuelo. Intenta de nuevo.');
        }

        const detailRes = await tripsApi.detail(targetTripId);
        const items = Array.isArray(detailRes.data?.items) ? detailRes.data.items : [];
        const obsolete = items.filter((item) => item.type === 'flight' && item.id !== context.itemId);
        await Promise.all(obsolete.map((item) => tripsApi.removeItem(targetTripId, item.id)));
      };

      replaceCurrentFlight()
        .then(() => {
          navigate(safeReturnTo);
        })
        .catch((err) => {
          setState((prev) => ({
            ...prev,
            error: err.message || 'Se agrego el vuelo, pero no se pudo completar el reemplazo.',
          }));
        });
      return;
    }

    if (!flowEnabled) return;

    const destinationCity = cityFromCode(offer.destinationCity || offer.destination);
    const checkIn = form.departureDate;
    const checkOut = form.returnDate || addDays(form.departureDate || todayStr, 1);

    const next = new URLSearchParams();
    next.set('tripId', targetTripId);
    next.set('flow', 'create');
    next.set('city', destinationCity);
    next.set('travelers', String(totalTravelers));
    next.set('currency', form.currency);
    if (checkIn) next.set('checkIn', checkIn);
    if (checkOut) next.set('checkOut', checkOut);

    navigate(`/hospedaje?${next.toString()}`);
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
                min={form.departureDate ? new Date(new Date(form.departureDate).getTime() + 86400000).toISOString().split('T')[0] : todayStr}
                max={maxDateStr}
                required
                className={inputCls}
              />
            </label>
          )}

          <label className="text-sm">
            <span className="text-tinta-500">Adultos (13+ años)</span>
            <input
              type="number"
              min={1}
              max={9}
              value={form.adults}
              onChange={updateCount('adults', 1)}
              className={inputCls}
            />
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Niños (2-12 años)</span>
            <input
              type="number"
              min={0}
              max={9}
              value={form.children}
              onChange={updateCount('children', 0)}
              className={inputCls}
            />
          </label>

          <label className="text-sm">
            <span className="text-tinta-500">Bebés (0-23 meses)</span>
            <input
              type="number"
              min={0}
              max={9}
              value={form.infants}
              onChange={updateCount('infants', 0)}
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
            {state.busy ? 'Consultando vuelos' : `Buscar (${totalTravelers} pasajero${totalTravelers === 1 ? '' : 's'})`}
          </button>
        </form>
      </Hero>

      {flowEnabled && (
        <p className="rounded-md border border-azul-200 bg-azul-50 px-4 py-3 text-sm text-azul-800">
          Paso 1 de 3: elige un vuelo para este viaje. Al agregarlo te llevamos a hospedaje con el destino precargado.
        </p>
      )}

      {replaceFlightFlow && (
        <p className="rounded-md border border-azul-200 bg-azul-50 px-4 py-3 text-sm text-azul-800">
          Modo actualizacion: al agregar un nuevo vuelo reemplazaremos el vuelo actual y volveras al detalle del viaje.
        </p>
      )}

      {isAuthenticated && trips.length > 0 && (
        <div className="rounded-md border border-borde bg-superficie px-4 py-3">
          <label htmlFor="flight-trip-select" className="block text-sm font-semibold text-tinta-700">
            Dirigir reserva al viaje
          </label>
          <select
            id="flight-trip-select"
            value={tripId}
            onChange={(event) => setTripId(event.target.value)}
            disabled={replaceFlightFlow}
            className="mt-1 h-10 w-full rounded-md border border-bordeInteractivo bg-superficie px-2 text-cuerpo text-tinta-900"
          >
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title} · {trip.destinationCity || 'Destino por definir'}
              </option>
            ))}
          </select>
        </div>
      )}

      {isAuthenticated && trips.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ambar-100 bg-ambar-50 px-4 py-3">
          <p className="text-sm text-ambar-700">Necesitas crear un viaje antes de agendar vuelos.</p>
          <button
            type="button"
            onClick={() => navigate('/viajes')}
            className="rounded-md border border-borde px-3 py-1.5 text-sm font-semibold text-tinta-700 hover:bg-superficie"
          >
            Ir a mis viajes
          </button>
        </div>
      )}

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
        {state.busy && (
          <div className="grid gap-3" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-md border border-borde bg-superficie p-4">
                <div className="h-4 w-1/3 rounded bg-tinta-300/50 mb-3" />
                <div className="h-3 w-2/3 rounded bg-tinta-300/40" />
              </div>
            ))}
          </div>
        )}
        {!state.busy && visibleOffers.map((offer) => {
          const enrichedOffer = {
            ...offer,
            originCity: cityFromCode(offer.originCity || offer.origin),
            destinationCity: cityFromCode(offer.destinationCity || offer.destination),
            selectedTravelers: totalTravelers,
            selectedStartDate: form.departureDate,
            selectedEndDate: form.returnDate,
          };

          return (
            <FlightCard
              key={offer.externalId}
              offer={enrichedOffer}
              travelers={totalTravelers}
              tripId={tripId}
              onAdded={onFlightAdded}
            />
          );
        })}
        {state.searched && !state.busy && offers.length === 0 && !state.error && (
          <p className="text-sm text-tinta-500">No se encontraron vuelos para esos criterios.</p>
        )}
        {state.searched && !state.busy && offers.length > 0 && visibleOffers.length === 0 && (
          <div className="rounded-md bg-realce px-4 py-3 text-sm text-tinta-700 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>
              {form.baggageFilter === 'solo_mano'
                ? `Ninguno de los ${offers.length} vuelos encontrados es solo de mano en esa clase.`
                : `Ninguno de los ${offers.length} vuelos encontrados incluye maleta documentada en esa clase.`}
            </span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, baggageFilter: 'cualquiera' }))}
              className="rounded-md bg-azul-600 px-3 py-1 text-xs font-medium text-white hover:bg-azul-700"
            >
              Ver todos los vuelos
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
