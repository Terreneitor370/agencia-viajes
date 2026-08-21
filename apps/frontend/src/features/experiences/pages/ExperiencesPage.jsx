/** DUENO: Jeshua (modulo C). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import Distintivo, { PrecioEstimado } from '../../../components/ui/Distintivo';
import Tarjeta from '../../../components/ui/Tarjeta';
import { useAuth } from '../../../core/auth/useAuth';
import { dinero } from '../../../core/utils/formato';
import { tripsApi } from '../../trips/api';
import { experiencesApi } from '../api';
import { guardarBusqueda, leerBusqueda } from '../../shared/searchSessionMemory';

const INTERESES = [
  { value: 'cultura', label: 'Cultura' },
  { value: 'gastronomia', label: 'Gastronomia' },
  { value: 'naturaleza', label: 'Naturaleza' },
  { value: 'aventura', label: 'Aventura' },
  { value: 'vida_nocturna', label: 'Vida nocturna' },
  { value: 'compras', label: 'Compras' },
];

const normalizeTrip = (trip) => ({
  id: trip.id,
  title: trip.title,
  destinationCity: trip.destination_city ?? trip.destinationCity,
  startDate: dateOnly(trip.start_date ?? trip.startDate),
  endDate: dateOnly(trip.end_date ?? trip.endDate),
  isPaid: Boolean(trip.is_paid ?? trip.isPaid),
});

const normalizeExperience = (row, index) => ({
  id: row.externalId || row.name || `exp-${index}`,
  provider: row.provider || 'geoapify',
  externalId: row.externalId || null,
  name: row.name || 'Experiencia sin nombre',
  address: row.address || 'Direccion no disponible',
  categories: Array.isArray(row.categories) ? row.categories : [],
  pricingMode: row.pricingMode || 'per_person',
  priceAmount: Number(row.price?.amount || 0),
  currency: row.price?.currency || 'MXN',
  estimated: Boolean(row.price?.estimated ?? true),
});

const fitText = (value, max) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length <= max ? text : text.slice(0, max);
};

const dateOnly = (value) => (value ? String(value).slice(0, 10) : '');

const dateAtMidnight = (isoDate) => {
  if (!isoDate) return null;
  return new Date(`${isoDate}T00:00:00`);
};

const isDateWithinRange = (isoDate, startDate, endDate) => {
  const selected = dateAtMidnight(isoDate);
  const start = dateAtMidnight(startDate);
  const end = dateAtMidnight(endDate);
  if (!selected || !start || !end) return false;
  return selected >= start && selected <= end;
};

const dayIndexForDate = (isoDate, startDate, endDate) => {
  const selected = dateAtMidnight(isoDate);
  const start = dateAtMidnight(startDate);
  const end = dateAtMidnight(endDate);
  if (!selected || !start || !end) return 1;

  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const raw = Math.round((selected - start) / 86400000) + 1;
  return Math.max(1, Math.min(totalDays, raw));
};

export default function ExperiencesPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchParams] = useSearchParams();

  const flowTripId = searchParams.get('tripId') || '';
  const flowEnabled = searchParams.get('flow') === 'create' && Boolean(flowTripId);
  const seededCity = searchParams.get('city') || 'Oaxaca';

  // Si no viene de un deep-link (flow=create, que trae su propia ciudad) y
  // hay una busqueda guardada de antes de un redirect a login, se recupera
  // esa en vez de arrancar en blanco -- ver searchSessionMemory.
  const memoriaGuardada = !flowEnabled ? leerBusqueda('experiences') : null;

  const [city, setCity] = useState(memoriaGuardada?.form.city || seededCity);
  const [radiusKm, setRadiusKm] = useState(memoriaGuardada?.form.radiusKm || 10);
  const [limit, setLimit] = useState(memoriaGuardada?.form.limit || 9);
  const [interests, setInterests] = useState(memoriaGuardada?.form.interests || ['cultura', 'gastronomia']);

  const [results, setResults] = useState(memoriaGuardada?.results || []);
  const [location, setLocation] = useState(memoriaGuardada?.location || null);
  const [searched, setSearched] = useState(Boolean(memoriaGuardada));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState(flowTripId);
  const [reservationDateByExperience, setReservationDateByExperience] = useState({});
  const [addingId, setAddingId] = useState('');
  const [addedByTrip, setAddedByTrip] = useState({});
  const autoSearchDone = useRef(false);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === tripId) || null,
    [trips, tripId],
  );

  const tripHasValidDateRange = Boolean(selectedTrip?.startDate && selectedTrip?.endDate);

  const autoSearchPayload = useMemo(() => {
    const cityFromQuery = searchParams.get('city');
    if (!cityFromQuery) return null;
    return {
      city: cityFromQuery,
      interests,
      radiusKm: Number(radiusKm),
      limit: Number(limit),
    };
  }, [searchParams, interests, radiusKm, limit]);

  useEffect(() => {
    let cancelled = false;

    const loadTrips = async () => {
      if (!isAuthenticated) {
        setTrips([]);
        setTripId('');
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
        setTripId('');
      }
    };

    loadTrips();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, flowTripId]);

  const runSearch = useCallback(async ({ cityValue = city, interestsValue = interests, radiusValue = radiusKm, limitValue = limit } = {}) => {
    setBusy(true);
    setError('');
    setSearched(true);

    try {
      const res = await experiencesApi.search({
        city: cityValue,
        interests: interestsValue,
        radiusKm: Number(radiusValue),
        limit: Number(limitValue),
      });

      const experiencias = Array.isArray(res.data) ? res.data.map(normalizeExperience) : [];
      setLocation(res.location || null);
      setResults(experiencias);
      guardarBusqueda('experiences', {
        form: { city: cityValue, interests: interestsValue, radiusKm: radiusValue, limit: limitValue },
        results: experiencias,
        location: res.location || null,
      });
    } catch (err) {
      setResults([]);
      if (err.status === 404) {
        setError('No se encontro la ciudad. Verifica el nombre e intenta de nuevo.');
      } else {
        setError(err.message || 'No fue posible buscar experiencias.');
      }
      setLocation(null);
    } finally {
      setBusy(false);
    }
  }, [city, interests, radiusKm, limit]);

  useEffect(() => {
    if (!autoSearchPayload || autoSearchDone.current) return;
    autoSearchDone.current = true;
    setCity(autoSearchPayload.city);
    runSearch({
      cityValue: autoSearchPayload.city,
      interestsValue: autoSearchPayload.interests,
      radiusValue: autoSearchPayload.radiusKm,
      limitValue: autoSearchPayload.limit,
    });
  }, [autoSearchPayload, runSearch]);

  const toggleInterest = (interest) => {
    setInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.length === 1 ? prev : prev.filter((item) => item !== interest);
      }
      return [...prev, interest];
    });
  };

  const onSearch = async (event) => {
    event.preventDefault();
    runSearch();
  };

  const reservationStateKey = (experienceId) => `${tripId}:${experienceId}`;

  const reservationDateForExperience = (experienceId) => {
    if (!tripHasValidDateRange) return '';
    const key = reservationStateKey(experienceId);
    const customDate = reservationDateByExperience[key] || '';
    if (isDateWithinRange(customDate, selectedTrip.startDate, selectedTrip.endDate)) {
      return customDate;
    }
    return selectedTrip.startDate;
  };

  const setReservationDateForExperience = (experienceId, dateValue) => {
    const key = reservationStateKey(experienceId);
    setReservationDateByExperience((prev) => ({
      ...prev,
      [key]: dateValue,
    }));
  };

  const addToTrip = async (experience, reservationDateValue) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: routerLocation } });
      return;
    }

    if (!tripId) {
      navigate('/viajes');
      return;
    }

    if (!tripHasValidDateRange) {
      setError('El viaje seleccionado no tiene fechas validas para agendar experiencias.');
      return;
    }

    if (!reservationDateValue) {
      setError('Selecciona la fecha de reservacion para la experiencia.');
      return;
    }

    if (!isDateWithinRange(reservationDateValue, selectedTrip.startDate, selectedTrip.endDate)) {
      setError('La fecha de reservacion debe estar entre la llegada y el regreso del viaje.');
      return;
    }

    const key = `${tripId}:${reservationDateValue}:${experience.id}`;
    if (addedByTrip[key]) return;

    setAddingId(experience.id);
    setError('');

    try {
      const provider = fitText(experience.provider || 'geoapify', 40) || 'geoapify';
      const externalId = fitText(experience.externalId, 120) || null;
      const title = fitText(experience.name, 160) || 'Experiencia sin nombre';

      await tripsApi.addItem(tripId, {
        type: 'experience',
        provider,
        externalId,
        title,
        unitPriceCents: Math.round(experience.priceAmount * 100),
        currency: experience.currency,
        pricingMode: experience.pricingMode,
        quantity: 1,
        estimated: experience.estimated,
        meta: {
          address: experience.address,
          categories: experience.categories,
          reservationDate: reservationDateValue,
          dayIndex: dayIndexForDate(reservationDateValue, selectedTrip.startDate, selectedTrip.endDate),
        },
      });

      setAddedByTrip((prev) => ({ ...prev, [key]: true }));
    } catch (err) {
      setError(err.message || 'No fue posible agregar la experiencia al viaje.');
    } finally {
      setAddingId('');
    }
  };

  return (
    <div className="space-y-4">
      <Tarjeta className="p-4 sm:p-5">
        <p className="etiqueta-seccion">Experiencias por interes</p>
        <h1 className="mt-1 text-titulo text-tinta-900">Que hacer en {city}</h1>
        <p className="mt-1 text-cuerpo text-tinta-500">
          Elige tus intereses. Los precios son una estimacion por persona salvo que se indique lo contrario.
        </p>

        {flowEnabled && (
          <p className="mt-3 rounded-md border border-azul-200 bg-azul-50 px-3 py-2 text-menor text-azul-800">
            Paso 3 de 3: agrega experiencias para cerrar tu itinerario en {city}.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {INTERESES.map((interest) => {
            const active = interests.includes(interest.value);
            return (
              <button
                key={interest.value}
                type="button"
                onClick={() => toggleInterest(interest.value)}
                className={`rounded-md border px-3 py-1.5 text-menor font-semibold transition ${
                  active
                    ? 'border-azul-600 bg-azul-600 text-white'
                    : 'border-bordeInteractivo bg-superficie text-tinta-700 hover:bg-lienzo'
                }`}
              >
                {active ? '✓ ' : ''}
                {interest.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={onSearch} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_120px_auto]">
          <Campo
            etiqueta="Ciudad"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            minLength={2}
            maxLength={80}
            required
          />

          <Campo
            etiqueta="Radio (km)"
            type="number"
            min={1}
            max={30}
            value={radiusKm}
            onChange={(event) => setRadiusKm(event.target.value)}
            required
          />

          <Campo
            etiqueta="Cuantos mostrar"
            type="number"
            min={1}
            max={40}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            required
          />

          <div className="self-end">
            <Boton type="submit" cargando={busy} anchoCompleto>
              Buscar
            </Boton>
          </div>
        </form>

        {location?.formatted && (
          <p className="mt-2 text-menor text-tinta-500">Zona detectada: {location.formatted}</p>
        )}

        {isAuthenticated && trips.length > 0 && (
          <div className="mt-4 rounded-md border border-borde bg-lienzo px-3 py-2">
            <label htmlFor="trip-select" className="block text-menor font-semibold text-tinta-700">
              Dirigir reserva al viaje
            </label>
            <select
              id="trip-select"
              value={tripId}
              onChange={(event) => setTripId(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-bordeInteractivo bg-superficie px-2 text-cuerpo text-tinta-900"
            >
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title} · {trip.destinationCity || 'Destino por definir'}
                </option>
              ))}
            </select>

            {selectedTrip?.startDate && selectedTrip?.endDate && (
              <p className="mt-2 text-menor text-tinta-500">
                Disponible del {selectedTrip.startDate} al {selectedTrip.endDate}. La fecha se selecciona en cada experiencia.
              </p>
            )}
          </div>
        )}

        {isAuthenticated && trips.length === 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-ambar-100 bg-ambar-50 px-3 py-2">
            <p className="text-menor text-ambar-700">Necesitas crear un viaje antes de agregar experiencias.</p>
            <Boton variante="secundario" tamano="sm" onClick={() => navigate('/viajes')}>Ir a mis viajes</Boton>
          </div>
        )}
      </Tarjeta>

      {error && (
        <p role="alert" className="rounded-md border border-critico/20 bg-criticoSuave px-3 py-2 text-menor text-critico">
          {error}
        </p>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {results.map((experience) => {
          const experienceReservationDate = reservationDateForExperience(experience.id);
          const reservationDateReady = tripHasValidDateRange
            && isDateWithinRange(experienceReservationDate, selectedTrip.startDate, selectedTrip.endDate);

          const key = `${tripId}:${experienceReservationDate}:${experience.id}`;
          const added = Boolean(addedByTrip[key]);
          const loadingAdd = addingId === experience.id;

          let actionText = 'Agregar al viaje';
          let actionVariant = 'primario';

          if (!isAuthenticated) {
            actionText = 'Inicia sesion para agregar';
            actionVariant = 'secundario';
          } else if (trips.length === 0) {
            actionText = 'Crear viaje';
            actionVariant = 'secundario';
          } else if (!reservationDateReady) {
            actionText = 'Selecciona fecha';
            actionVariant = 'secundario';
          } else if (added) {
            actionText = 'Agregada';
            actionVariant = 'secundario';
          }

          return (
            <Tarjeta key={experience.id} className="overflow-hidden">
              <div className="grid h-28 place-items-center border-b border-borde bg-lienzo text-menor text-tinta-300">
                foto experiencia
              </div>

              <div className="p-4">
                <h2 className="text-tarjeta text-tinta-900">{experience.name}</h2>
                <p className="mt-1 text-menor text-tinta-500">{experience.address}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {experience.estimated && <PrecioEstimado />}
                  {experience.categories[0] && <Distintivo tono="neutro">{experience.categories[0]}</Distintivo>}
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-precioSm text-tinta-900">{dinero(experience.priceAmount, experience.currency)}</p>
                    <p className="text-menor text-tinta-500">por persona</p>
                  </div>
                </div>

                {isAuthenticated && trips.length > 0 && (
                  <div className="mt-4">
                    <Campo
                      etiqueta="Fecha de reservacion"
                      type="date"
                      value={experienceReservationDate}
                      min={selectedTrip?.startDate || undefined}
                      max={selectedTrip?.endDate || undefined}
                      onChange={(event) => setReservationDateForExperience(experience.id, event.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="mt-4">
                  <Boton
                    variante={actionVariant}
                    anchoCompleto
                    cargando={loadingAdd}
                    disabled={added || (isAuthenticated && trips.length > 0 && !reservationDateReady)}
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login', { state: { from: routerLocation } });
                        return;
                      }
                      if (trips.length === 0) {
                        navigate('/viajes');
                        return;
                      }
                      addToTrip(experience, experienceReservationDate);
                    }}
                  >
                    {actionText}
                  </Boton>
                </div>
              </div>
            </Tarjeta>
          );
        })}
      </section>

      {searched && !busy && results.length === 0 && !error && (
        <Tarjeta className="p-4">
          <p className="text-cuerpo text-tinta-500">No encontramos experiencias con esos filtros.</p>
        </Tarjeta>
      )}
    </div>
  );
}
