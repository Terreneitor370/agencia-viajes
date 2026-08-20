import StayCard from './StayCard';

export default function StayResults({ stays, loading, metadata, searched, error, tripId = '', onStayAdded }) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-md border border-borde bg-superficie p-4">
              <div className="h-4 w-1/3 rounded bg-tinta-300/50 mb-3" />
              <div className="h-3 w-2/3 rounded bg-tinta-300/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stays || stays.length === 0) {
    if (!searched) {
      return null;
    }
    if (error) return null;
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
          <StayCard
            key={stay.externalId || index}
            stay={stay}
            nights={metadata.nights}
            tripId={tripId}
            onAdded={onStayAdded}
          />
        ))}
      </div>
    </section>
  );
}
