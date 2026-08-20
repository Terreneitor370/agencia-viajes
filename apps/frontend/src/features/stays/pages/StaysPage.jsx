import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../core/auth/useAuth';
import { tripsApi } from '../../trips/api';
import { useStays } from '../hooks/useStays';
import StaySearchForm from '../components/StaySearchForm';
import StayResults from '../components/StayResults';
import Hero from '../../shared/Hero';
import PopularOptions from '../../shared/PopularOptions';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=60';

const DESTINOS = [
  { key: 'oaxaca', city: 'Oaxaca', label: 'Oaxaca', hint: 'Centro histórico y mezcal' },
  { key: 'cancun', city: 'Cancún', label: 'Cancún', hint: 'Playas del Caribe' },
  { key: 'cdmx', city: 'Ciudad de México', label: 'Ciudad de México', hint: 'Cultura y gastronomía' },
  { key: 'gdl', city: 'Guadalajara', label: 'Guadalajara', hint: 'Tequila y mariachi' },
  { key: 'puerto', city: 'Puerto Escondido', label: 'Puerto Escondido', hint: 'Olas y atardeceres' },
  { key: 'san-cris', city: 'San Cristóbal de las Casas', label: 'San Cristóbal de las Casas', hint: 'Pueblos mágicos' },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));

const normalizeTrip = (trip) => ({
  id: trip.id,
  title: trip.title,
  destinationCity: trip.destination_city ?? trip.destinationCity,
  isPaid: Boolean(trip.is_paid ?? trip.isPaid),
});

export default function StaysPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { stays, loading, error, metadata, searched, search, changeCurrency } = useStays();
  const [seedOverrides, setSeedOverrides] = useState({});
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState('');
  const [actionError, setActionError] = useState('');
  const selectedCityRef = useRef('');

  const flowTripId = searchParams.get('tripId') || '';
  const flowMode = searchParams.get('flow') || '';
  const replaceTarget = searchParams.get('replace') || '';
  const returnToParam = searchParams.get('returnTo') || '';
  const flowEnabled = flowMode === 'create' && Boolean(flowTripId);
  const replaceStayFlow = flowMode === 'replace' && replaceTarget === 'stay' && Boolean(flowTripId);
  const safeReturnTo = returnToParam.startsWith('/')
    ? returnToParam
    : (flowTripId ? `/viajes/${flowTripId}` : '/viajes');

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

  const queryDefaults = useMemo(() => ({
    city: searchParams.get('city') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    travelers: clamp(searchParams.get('travelers') || 1, 1, 20),
    currency: searchParams.get('currency') || 'MXN',
    radiusKm: 8,
    limit: 20,
  }), [searchParams]);

  const formDefaults = useMemo(() => ({
    ...queryDefaults,
    ...seedOverrides,
  }), [queryDefaults, seedOverrides]);

  const autoSearchDone = useRef(false);

  const handleSearch = useCallback(async (params) => {
    selectedCityRef.current = params.city || '';
    return search(params);
  }, [search]);

  useEffect(() => {
    if (autoSearchDone.current) return;
    if (!queryDefaults.city || !queryDefaults.checkIn || !queryDefaults.checkOut) return;

    autoSearchDone.current = true;
    handleSearch({
      city: queryDefaults.city,
      checkIn: queryDefaults.checkIn,
      checkOut: queryDefaults.checkOut,
      travelers: queryDefaults.travelers,
      radiusKm: queryDefaults.radiusKm,
      limit: queryDefaults.limit,
      currency: queryDefaults.currency,
    });
  }, [queryDefaults, handleSearch]);

  const formKey = [
    formDefaults.city,
    formDefaults.checkIn,
    formDefaults.checkOut,
    formDefaults.travelers,
    formDefaults.currency,
  ].join('|');

  const quickSearch = ({ city }) => setSeedOverrides((prev) => ({ ...prev, city }));

  const onStayAdded = (_stay, context = {}) => {
    setActionError('');

    const targetTripId = context.tripId || tripId || flowTripId;
    if (!targetTripId) return;

    if (replaceStayFlow) {
      const replaceCurrentStay = async () => {
        if (!context.itemId) {
          throw new Error('No se pudo confirmar el nuevo hospedaje. Intenta de nuevo.');
        }

        const detailRes = await tripsApi.detail(targetTripId);
        const items = Array.isArray(detailRes.data?.items) ? detailRes.data.items : [];
        const obsolete = items.filter((item) => item.type === 'stay' && item.id !== context.itemId);
        await Promise.all(obsolete.map((item) => tripsApi.removeItem(targetTripId, item.id)));
      };

      replaceCurrentStay()
        .then(() => {
          navigate(safeReturnTo);
        })
        .catch((err) => {
          setActionError(err.message || 'Se agrego el hospedaje, pero no se pudo completar el reemplazo.');
        });
      return;
    }

    if (!flowEnabled) return;

    const city = selectedCityRef.current || formDefaults.city || queryDefaults.city;
    const next = new URLSearchParams({
      tripId: targetTripId,
      flow: 'create',
      city,
    });
    navigate(`/experiencias?${next.toString()}`);
  };

  return (
    <div className="min-h-screen bg-lienzo space-y-6 p-4">
      <Hero
        image={HERO_IMAGE}
        eyebrow="Descubrimiento · Hospedaje"
        title="Buscar hospedaje"
        subtitle="Hoteles, apartamentos y hostales con precio estimado por noche."
      >
        <StaySearchForm
          key={formKey}
          defaultValues={formDefaults}
          onSearch={handleSearch}
          onCurrencyChange={changeCurrency}
          loading={loading}
        />
      </Hero>

      {flowEnabled && (
        <p className="rounded-md border border-azul-200 bg-azul-50 px-4 py-3 text-sm text-azul-800">
          Paso 2 de 3: elige hospedaje. Al agregarlo te llevamos a experiencias en el mismo destino.
        </p>
      )}

      {replaceStayFlow && (
        <p className="rounded-md border border-azul-200 bg-azul-50 px-4 py-3 text-sm text-azul-800">
          Modo actualizacion: al agregar un nuevo hospedaje reemplazaremos el actual y volveras al detalle del viaje.
        </p>
      )}

      {isAuthenticated && trips.length > 0 && (
        <div className="rounded-md border border-borde bg-superficie px-4 py-3">
          <label htmlFor="stay-trip-select" className="block text-sm font-semibold text-tinta-700">
            Dirigir reserva al viaje
          </label>
          <select
            id="stay-trip-select"
            value={tripId}
            onChange={(event) => setTripId(event.target.value)}
            disabled={replaceStayFlow}
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
          <p className="text-sm text-ambar-700">Necesitas crear un viaje antes de agendar hospedajes.</p>
          <button
            type="button"
            onClick={() => navigate('/viajes')}
            className="rounded-md border border-borde px-3 py-1.5 text-sm font-semibold text-tinta-700 hover:bg-superficie"
          >
            Ir a mis viajes
          </button>
        </div>
      )}

      {!searched && (
        <PopularOptions
          eyebrow="Descubrimiento · Hospedaje"
          title="Destinos populares"
          subtitle="Toca un destino para llenar la ciudad; tú completas fechas y personas."
          items={DESTINOS}
          onPick={quickSearch}
        />
      )}

      {error && (
        <p role="alert" className="rounded-md bg-criticoSuave px-4 py-3 text-sm text-critico">
          {error}
        </p>
      )}

      {actionError && (
        <p role="alert" className="rounded-md bg-criticoSuave px-4 py-3 text-sm text-critico">
          {actionError}
        </p>
      )}

      {metadata.degraded && (
        <p className="rounded-md bg-ambar-50 px-4 py-3 text-sm text-ambar-700 border border-dashed border-ambar-400">
          El proveedor de hospedaje no respondió. Estás viendo resultados de ejemplo.
        </p>
      )}

      <StayResults
        stays={stays}
        loading={loading}
        metadata={metadata}
        searched={searched}
        error={error}
        tripId={tripId}
        onStayAdded={onStayAdded}
      />
    </div>
  );
}
