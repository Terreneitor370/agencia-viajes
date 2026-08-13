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

export default function StayCard({ stay }) {
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

  // Si hay imagen, úsala; si no, usa un placeholder con color
  const displayImage = image;

  const facilities = Object.entries(stay.facilities || {})
    .filter(([key, value]) => value && FACILITY_LABELS[key])
    .map(([key]) => FACILITY_LABELS[key]);

  return (
    <article className="flex items-center justify-between rounded-lg border border-borde bg-superficie p-4">
      <div className="flex gap-4 flex-1">
        <div className="w-24 h-24 rounded-md flex-shrink-0 overflow-hidden bg-lienzo">
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
          <p className="font-medium text-tinta-900 truncate">{stay.name}</p>
          <p className="text-sm text-tinta-500 truncate">{stay.address}</p>

          {stay.stars && (
            <p className="text-sm text-ambar-700" aria-label={`${stay.stars} estrellas`}>
              {'★'.repeat(stay.stars)}
              <span className="text-sm text-bordeFuerte">{'★'.repeat(Math.max(0, 5 - stay.stars))}</span>
            </p>
          )}

          {facilities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {facilities.slice(0, 4).map((label) => (
                <span key={label} className="text-xs bg-lienzo text-tinta-700 px-2 py-0.5 rounded-full">
                  {label}
                </span>
              ))}
            </div>
          )}

          {stay.rooms && (
            <p className="mt-1 text-xs text-tinta-500">{stay.rooms} habitaciones</p>
          )}

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
        </div>
      </div>

      <div className="text-right ml-4 min-w-[120px]">
        <p className="text-lg font-semibold text-ambar-700">
          {formatPrice(pricePerNight, currency)}
        </p>
        <p className="text-xs text-tinta-500">por noche</p>

        {price.estimated && (
          <div className="mt-1 inline-block border border-dashed border-borde rounded px-2 py-0.5">
            <span className="text-[11px] text-tinta-500 font-medium">
              ⚡ Precio estimado
            </span>
          </div>
        )}

        {stay.degraded && (
          <div className="mt-1 inline-block border border-dashed border-ambar-400 rounded px-2 py-0.5 bg-ambar-50">
            <span className="text-[11px] text-ambar-700">
              Datos de ejemplo
            </span>
          </div>
        )}

        <div className="mt-3">
          <AddToTripButton 
            item={stay} 
            type="stay"
          />
        </div>
      </div>
    </article>
  );
}