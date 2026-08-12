import { useStays } from '../hooks/useStays';
import StaySearchForm from '../components/StaySearchForm';
import StayResults from '../components/StayResults';

export default function StaysPage() {
  const { stays, loading, error, metadata, search } = useStays();

  return (
    <div className="min-h-screen bg-lienzo space-y-6 p-4">
      <section className="rounded-lg border border-borde bg-superficie p-5">
        <h1 className="text-titulo text-tinta-900">Buscar hospedaje</h1>

        <StaySearchForm onSearch={search} loading={loading} />
      </section>

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

      <StayResults stays={stays} loading={loading} metadata={metadata} />
    </div>
  );
}