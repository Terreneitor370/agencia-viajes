import StayCard from './StayCard';

export default function StayResults({ stays, loading, metadata, searched }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-600"></div>
      </div>
    );
  }

  if (!stays || stays.length === 0) {
    if (!searched) {
      return null;
    }
    return (
      <p className="text-sm text-tinta-500 text-center py-12">
        No se encontraron hospedajes para esos criterios.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      {metadata && (metadata.nights != null || metadata.rooms != null) && (
        <div className="rounded-md border border-borde bg-superficie px-4 py-2 text-sm text-tinta-700 flex flex-wrap gap-x-4 gap-y-1">
          {metadata.location?.formatted && (
            <span><strong>{metadata.location.formatted}</strong></span>
          )}
          <span>{metadata.nights} {metadata.nights === 1 ? 'noche' : 'noches'}</span>
          <span>{metadata.rooms} {metadata.rooms === 1 ? 'habitación' : 'habitaciones'}</span>
        </div>
      )}

      <div className="grid gap-3">
        {stays.map((stay, index) => (
          <StayCard key={stay.externalId || index} stay={stay} />
        ))}
      </div>
    </section>
  );
}
