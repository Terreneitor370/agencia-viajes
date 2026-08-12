/** DUENO: Kassie (modulo B). */
const money = (amount, currency) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);

const time = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '--');

export default function FlightCard({ offer, travelers = 1 }) {
  const total = offer.price.amount * travelers;

  return (
    <article className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <p className="font-medium">{offer.airline}</p>
        <p className="text-sm text-slate-500">
          {offer.origin} → {offer.destination} · {offer.stops === 0 ? 'Directo' : `${offer.stops} escala(s)`}
        </p>
        <p className="mt-1 text-xs text-slate-400">{time(offer.departureAt)}</p>
      </div>

      <div className="text-right">
        <p className="text-lg font-semibold">{money(offer.price.amount, offer.price.currency)}</p>
        <p className="text-xs text-slate-500">por persona</p>
        <p className="mt-1 text-sm text-slate-700">
          Total {travelers} viajero(s): <strong>{money(total, offer.price.currency)}</strong>
        </p>
      </div>
    </article>
  );
}
