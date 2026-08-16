import { useState } from 'react';
import { api } from '../../core/api/client';
import Boton from '../../components/ui/Boton';
import { quotesApi } from '../quotes/api';

/** Contrato identico al de trips (addTripItemSchema), para migrar sin cambios. */
function buildPayload(item, type) {
  let unitPriceCents = 0;
  let currency = 'MXN';
  let pricingMode = type === 'flight' ? 'per_person' : 'per_night_per_room';
  let estimated = false;
  let title = item.name || item.title || 'Elemento sin nombre';

  if (type === 'flight') {
    title = `${item.origin} → ${item.destination} (${item.airline})`;
    unitPriceCents = Math.round(item.price.amount * 100);
    currency = item.price.currency || 'MXN';
    pricingMode = item.pricingMode || 'per_person';
    estimated = item.price.estimated || false;
  } else if (type === 'stay') {
    unitPriceCents = Math.round((item.price?.amount || 0) * 100);
    currency = item.price?.currency || 'MXN';
    pricingMode = item.pricingMode || 'per_night_per_room';
    estimated = item.price?.estimated || true;
  }

  return {
    type,
    provider: item.provider || 'unknown',
    externalId: item.externalId || null,
    title,
    unitPriceCents,
    currency,
    pricingMode,
    quantity: 1,
    estimated,
    meta: null,
  };
}

export default function AddToTripButton({ item, type, onAdded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const getTypeName = () => {
    if (type === 'flight') return 'vuelo';
    if (type === 'stay') return 'hospedaje';
    return 'elemento';
  };

  const saveToTrip = async () => {
    const payload = buildPayload(item, type);
    const meRes = await api.get('/auth/me');
    const user = meRes.data;
    if (!user) throw Object.assign(new Error('Sin sesion'), { status: 401 });

    const tripsRes = await api.get('/trips');
    const trips = tripsRes.data || [];
    if (trips.length === 0) throw new Error('Primero crea un viaje desde "Mis viajes"');

    await api.post(`/trips/${trips[0].id}/items`, payload);
    return 'guardado en tu viaje';
  };

  const saveAsGuest = async () => {
    const payload = buildPayload(item, type);
    await quotesApi.create(payload);
    return 'cotización guardada';
  };

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let message;
      try {
        message = await saveToTrip();
      } catch (authErr) {
        if (authErr.status === 401) {
          // Sin sesion: se guarda como cotizacion de invitado (sin registro).
          message = await saveAsGuest();
        } else {
          throw authErr;
        }
      }

      setSuccess(message);
      if (onAdded) onAdded(item);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message || `Error al guardar ${getTypeName()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Boton
        variante="secundario"
        tamano="sm"
        cargando={loading}
        onClick={handleAdd}
        disabled={loading}
        className="border-ambar-400 text-ambar-900 hover:bg-ambar-50"
      >
        {loading ? 'Guardando...' : 'Agregar al viaje'}
      </Boton>

      {success && (
        <span className="text-exito text-xs font-medium">
          {type === 'flight' ? 'Vuelo' : type === 'stay' ? 'Hospedaje' : 'Elemento'} {success}
        </span>
      )}
      {success && success.includes('cotización') && (
        <a href="/cotizaciones" className="text-xs text-azul-700 underline">
          Ver mis cotizaciones
        </a>
      )}
      {error && <span className="text-critico text-xs">{error}</span>}
    </div>
  );
}
