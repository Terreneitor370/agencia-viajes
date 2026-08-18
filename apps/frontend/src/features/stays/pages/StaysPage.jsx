import { useState } from 'react';
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

export default function StaysPage() {
  const { stays, loading, error, metadata, searched, search, changeCurrency } = useStays();
  const [citySeed, setCitySeed] = useState('');

  const quickSearch = ({ city }) => setCitySeed(city);

  return (
    <div className="min-h-screen bg-lienzo space-y-6 p-4">
      <Hero
        image={HERO_IMAGE}
        eyebrow="Descubrimiento · Hospedaje"
        title="Buscar hospedaje"
        subtitle="Hoteles, apartamentos y hostales con precio estimado por noche."
      >
        <StaySearchForm
          key={citySeed}
          defaultCity={citySeed}
          onSearch={search}
          onCurrencyChange={changeCurrency}
          loading={loading}
        />
      </Hero>

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

      <StayResults stays={stays} loading={loading} metadata={metadata} searched={searched} error={error} />
    </div>
  );
}
