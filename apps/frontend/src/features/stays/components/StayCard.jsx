import AddToTripButton from '../../shared/AddToTripButton';
import { useStayImage } from '../hooks/useStayImage';

const FACILITY_LABELS = {
  internet_access: 'Wi-Fi',
  air_conditioning: 'Aire acondicionado',
  swimming_pool: 'Alberca',
  parking: 'Estacionamiento',
  restaurant: 'Restaurante',
  kitchen: 'Cocina',
  breakfast: 'Desayuno',
  pets: 'Mascotas',
  gym: 'Gimnasio',
};

export default function StayCard({ stay, nights, tripId = '', onAdded }) {
  const { image, loading: imageLoading } = useStayImage(stay);

  const formatPrice = (amount, currency) =>
    (amount || 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: currency || 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const price = stay.price || { amount: 0, currency: 'MXN', estimated: true };
  const pricePerNight = price.amount || 0;
  const currency = price.currency || 'MXN';
  const totalNights = Number(nights) || 1;
  const totalStay = pricePerNight * totalNights;

  // Si hay imagen, úsala; si no, usa un placeholder con color
  const displayImage = image;

  const facilities = Object.entries(stay.facilities || {})
    .filter(([key, value]) => value && FACILITY_LABELS[key])
    .map(([key]) => FACILITY_LABELS[key]);

  return (
    <article className="flex gap-3 rounded-lg border border-borde bg-superficie p-3 sm:gap-4 sm:p-4">
      <div className="w-20 h-20 rounded-md flex-shrink-0 overflow-hidden bg-lienzo sm:w-24 sm:h-24">
        {imageLoading ? (
          <div className="w-full h-full animate-pulse bg-borde"></div>
        ) : displayImage ? (
          <img
            src={displayImage}
            alt={stay.name || 'Hotel'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-azul-100 flex items-center justify-center text-azul-600 font-bold text-lg">
            {stay.name?.charAt(0) || 'H'}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-tinta-900 truncate">{stay.name}</p>
            <p className="text-xs text-tinta-500 truncate sm:text-sm">{stay.address}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-base font-semibold text-ambar-700 sm:text-lg">
              {formatPrice(pricePerNight, currency)}
              <span className="text-[11px] font-normal text-tinta-500"> /noche</span>
            </p>
            {totalNights > 1 && (
              <p className="text-xs text-tinta-700">
                Total {totalNights} noches: <strong>{formatPrice(totalStay, currency)}</strong>
              </p>
            )}
            {price.estimated && (
              <p className="text-[10px] text-tinta-400">estimado</p>
            )}
          </div>
        </div>

        {stay.stars && (
          <p className="mt-1 text-sm text-ambar-700" aria-label={`${stay.stars} estrellas`}>
            {'★'.repeat(stay.stars)}
            <span className="text-sm text-bordeFuerte">{'★'.repeat(Math.max(0, 5 - stay.stars))}</span>
          </p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {facilities.slice(0, 4).map((label) => (
            <span key={label} className="text-[11px] bg-lienzo text-tinta-700 px-2 py-0.5 rounded-full truncate">
              {label}
            </span>
          ))}
          {stay.rooms && (
            <span className="text-[11px] text-tinta-500">{stay.rooms} hab.</span>
          )}
        </div>

        {(stay.phone || stay.website) && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {stay.phone && <a href={`tel:${stay.phone}`} className="text-azul-700 hover:underline">{stay.phone}</a>}
            {stay.website && (
              <a href={stay.website} target="_blank" rel="noreferrer" className="text-azul-700 hover:underline">
                Sitio web
              </a>
            )}
          </div>
        )}

        {stay.degraded && (
          <div className="mt-1 inline-block border border-dashed border-ambar-400 rounded px-2 py-0.5 bg-ambar-50">
            <span className="text-[11px] text-ambar-700">Datos de ejemplo</span>
          </div>
        )}

        <div className="mt-2">
          <AddToTripButton item={stay} type="stay" tripId={tripId} onAdded={onAdded} />
        </div>
      </div>
    </article>
  );
}