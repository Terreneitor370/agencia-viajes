import AddToTripButton from '../../shared/AddToTripButton';

const money = (amount, currency) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);

const time = (iso) =>
  iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '--';

const duration = (min) => {
  if (min == null) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
};

const Detail = ({ label, value }) =>
  value ? (
    <p className="text-xs text-slate-500">
      <span className="text-slate-400">{label}: </span>{value}
    </p>
  ) : null;

const layoverText = (layover) => {
  if (!layover) return null;
  const where = [layover.city, layover.iata].filter(Boolean).join(' (') + (layover.iata ? ')' : '');
  const wait = duration(layover.durationMin);
  return `${where}${wait ? ` · espera ${wait}` : ''}`;
};

export default function FlightCard({ offer, travelers = 1, tripId = '', sinViajes = false, onAdded }) {
  const total = offer.price.amount * travelers;
  const baggage = offer.baggage || {};
  const hasBaggage = (baggage.carryOn || 0) + (baggage.checked || 0) > 0;
  const wifi = offer.cabin?.wifi;
  const seat = offer.cabin?.seat;
  const layovers = (offer.layovers || []).map(layoverText).filter(Boolean);
  const ret = offer.return || null;
  const retLayovers = ret ? (ret.layovers || []).map(layoverText).filter(Boolean) : [];

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{offer.airline}</p>

        <p className="text-sm text-slate-500">
          {offer.origin} → {offer.destination} · {offer.stops === 0 ? 'Directo' : `${offer.stops} escala(s)`}
        </p>
        <p className="mt-1 text-xs text-slate-400">{time(offer.departureAt)}</p>

        {ret && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {ret.origin} → {ret.destination} · {ret.stops === 0 ? 'Directo' : `${ret.stops} escala(s)`}
            </p>
            <p className="mt-1 text-xs text-slate-400">{time(ret.departureAt)}</p>
          </div>
        )}

        <span className="inline-block mt-2 text-xs border border-bordeFuerte px-2 py-0.5 rounded text-tinta-700">
          {offer.tripType === 'round_trip' ? 'Redondo' : 'Solo ida'}
        </span>

        <div className="mt-2 space-y-0.5">
          <Detail label="Vuelo" value={[offer.flightNumber, offer.aircraft].filter(Boolean).join(' · ')} />
          <Detail label="Duración" value={duration(offer.durationMin)} />
          <Detail label="Escala" value={layovers.length ? layovers.join(' · ') : null} />
          {ret && (
            <>
              <Detail label="Vuelo regreso" value={[ret.flightNumber, ret.aircraft].filter(Boolean).join(' · ')} />
              <Detail label="Duración regreso" value={duration(ret.durationMin)} />
              <Detail label="Escala regreso" value={retLayovers.length ? retLayovers.join(' · ') : null} />
            </>
          )}
          <Detail
            label="Terminales"
            value={offer.originTerminal != null && offer.destinationTerminal != null
              ? `${offer.originTerminal} → ${offer.destinationTerminal}`
              : null}
          />
          <Detail
            label="Equipaje"
            value={hasBaggage
              ? [baggage.carryOn ? `${baggage.carryOn} de mano` : '', baggage.checked ? `${baggage.checked} documentado` : '']
                  .filter(Boolean).join(' · ')
              : null}
          />
          <Detail label="Cabina" value={[offer.cabin?.name, offer.fareBrand].filter(Boolean).join(' · ')} />
          <Detail label="Asiento" value={seat?.pitch ? `${seat.pitch}" de espacio${seat.legroom && seat.legroom !== 'n/a' ? ` · ${seat.legroom}` : ''}` : null} />
          <Detail label="Wi-Fi" value={wifi?.available ? (wifi.cost === 'free' ? 'Gratis' : 'De pago') : null} />
          {offer.cabin?.power && <Detail label="Enchufe" value="Disponible" />}
        </div>

        {(offer.refundable || offer.changeable) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {offer.refundable && (
              <span className="text-xs border border-exito px-2 py-0.5 rounded text-exito">Reembolsable</span>
            )}
            {offer.changeable && (
              <span className="text-xs border border-azul-400 px-2 py-0.5 rounded text-azul-700">Cambiable</span>
            )}
          </div>
        )}

        {offer.estimated && (
          <span className="inline-block mt-2 text-xs border border-dashed border-amber-400 px-2 py-0.5 rounded text-amber-600">
            ⚡ Datos de ejemplo
          </span>
        )}
      </div>

      <div className="sm:text-right shrink-0">
        <p className="text-lg font-semibold">{money(offer.price.amount, offer.price.currency)}</p>
        <p className="text-xs text-slate-500">por persona</p>
        <p className="mt-1 text-sm text-slate-700">
          Total {travelers} viajero(s): <strong>{money(total, offer.price.currency)}</strong>
        </p>

        <div className="mt-3">
          <AddToTripButton
            item={offer}
            type="flight"
            tripId={tripId}
            sinViajes={sinViajes}
            onAdded={onAdded}
          />
        </div>
      </div>
    </article>
  );
}
