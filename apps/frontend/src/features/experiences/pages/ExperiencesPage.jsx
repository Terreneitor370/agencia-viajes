/** DUENO: Jeshua (modulo C). */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import Distintivo, { PrecioEstimado } from '../../../components/ui/Distintivo';
import Tarjeta from '../../../components/ui/Tarjeta';
import { useAuth } from '../../../core/auth/useAuth';
import { dinero } from '../../../core/utils/formato';
import { tripsApi } from '../../trips/api';
import { experiencesApi } from '../api';

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

export default function ExperiencesPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [city, setCity] = useState('Oaxaca');
  const [radiusKm, setRadiusKm] = useState(10);
  const [limit, setLimit] = useState(9);
  const [interests, setInterests] = useState(['cultura', 'gastronomia']);

  const [results, setResults] = useState([]);
  const [location, setLocation] = useState(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [degraded, setDegraded] = useState(false);

  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState('');
  const [addingId, setAddingId] = useState('');
  const [addedByTrip, setAddedByTrip] = useState({});

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
        setTrips(rows);
        setTripId((prev) => prev || rows[0]?.id || '');
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
  }, [isAuthenticated]);

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
    setBusy(true);
    setError('');
    setSearched(true);

    try {
      const res = await experiencesApi.search({
        city,
        interests,
        radiusKm: Number(radiusKm),
        limit: Number(limit),
      });

      setLocation(res.location || null);
      setDegraded(Boolean(res.degraded));
      setResults(Array.isArray(res.data) ? res.data.map(normalizeExperience) : []);
    } catch (err) {
      setResults([]);
      setError(err.message || 'No fue posible buscar experiencias.');
      setLocation(null);
      setDegraded(false);
    } finally {
      setBusy(false);
    }
  };

  const addToTrip = async (experience) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/experiencias' } } });
      return;
    }

    if (!tripId) {
      navigate('/viajes');
      return;
    }

    const key = `${tripId}:${experience.id}`;
    if (addedByTrip[key]) return;

    setAddingId(experience.id);
    setError('');

    try {
      await tripsApi.addItem(tripId, {
        type: 'experience',
        provider: experience.provider,
        externalId: experience.externalId,
        title: experience.name,
        unitPriceCents: Math.round(experience.priceAmount * 100),
        currency: experience.currency,
        pricingMode: experience.pricingMode,
        quantity: 1,
        estimated: experience.estimated,
        meta: {
          address: experience.address,
          categories: experience.categories,
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
              Agregar al viaje
            </label>
            <select
              id="trip-select"
              value={tripId}
              onChange={(event) => setTripId(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-bordeInteractivo bg-superficie px-2 text-cuerpo text-tinta-900"
            >
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title} · {trip.destinationCity}
                </option>
              ))}
            </select>
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

      {degraded && (
        <p className="rounded-md border border-bordeFuerte border-dashed bg-lienzo px-3 py-2 text-menor text-tinta-700">
          El proveedor no respondio en este momento. Intenta de nuevo en unos minutos.
        </p>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {results.map((experience) => {
          const key = `${tripId}:${experience.id}`;
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

                <div className="mt-4">
                  <Boton
                    variante={actionVariant}
                    anchoCompleto
                    cargando={loadingAdd}
                    disabled={added}
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login', { state: { from: { pathname: '/experiencias' } } });
                        return;
                      }
                      if (trips.length === 0) {
                        navigate('/viajes');
                        return;
                      }
                      addToTrip(experience);
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
