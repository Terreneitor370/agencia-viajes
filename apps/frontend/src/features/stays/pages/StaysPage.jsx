import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

export default function StaysPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { stays, loading, error, metadata, searched, search, changeCurrency } = useStays();
  const [seedOverrides, setSeedOverrides] = useState({});
  const selectedCityRef = useRef('');

  const flowTripId = searchParams.get('tripId') || '';
  const flowEnabled = searchParams.get('flow') === 'create' && Boolean(flowTripId);

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

  const onStayAdded = () => {
    if (!flowEnabled) return;
    const city = selectedCityRef.current || formDefaults.city || queryDefaults.city;
    const next = new URLSearchParams({
      tripId: flowTripId,
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
        tripId={flowTripId}
        onStayAdded={onStayAdded}
      />
    </div>
  );
}
