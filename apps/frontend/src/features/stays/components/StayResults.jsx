import StayCard from './StayCard';

export default function StayResults({ stays, loading, metadata }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-600"></div>
      </div>
    );
  }

  if (!stays || stays.length === 0) {
    return (
      <p className="text-sm text-tinta-500 text-center py-12">
        No se encontraron hospedajes para esos criterios.
      </p>
    );
  }

  return (
    <section className="grid gap-3">
      {/* Lista de hospedajes */}
      {stays.map((stay, index) => (
        <StayCard key={stay.externalId || index} stay={stay} />
      ))}
    </section>
  );
}