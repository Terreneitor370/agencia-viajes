import AddToTripButton from '../../shared/AddToTripButton';
import { useStayImage } from '../hooks/useStayImage';

export default function StayCard({ stay }) {
  const { image, loading: imageLoading } = useStayImage(stay);

  const formatPrice = (cents) => {
    if (!cents) return 'N/A';
    return (cents / 100).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const price = stay.price || { amount: 0, estimated: true };
  const pricePerNight = price.amount || 0;

  // Si hay imagen, úsala; si no, usa un placeholder con color
  const displayImage = image;

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

          {stay.categories && stay.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {stay.categories.slice(0, 3).map((cat, idx) => (
                <span key={idx} className="text-xs bg-lienzo text-tinta-500 px-2 py-1 rounded-full truncate">
                  {cat.split('.').pop()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-right ml-4 min-w-[120px]">
        <p className="text-lg font-semibold text-ambar-700">
          {formatPrice(pricePerNight * 100)}
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