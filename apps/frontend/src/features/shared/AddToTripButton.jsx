import { useState } from 'react';
import { api } from '../../core/api/client';
import Boton from '../../components/ui/Boton';

export default function AddToTripButton({ item, type, onAdded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Obtener el nombre del tipo para mostrar en mensajes
  const getTypeName = () => {
    if (type === 'flight') return 'vuelo';
    if (type === 'stay') return 'hospedaje';
    return 'elemento';
  };

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setShowLoginPrompt(false);

    try {
      // 1. Verificar si hay sesión activa
      let user = null;
      try {
        const meRes = await api.get('/auth/me');
        user = meRes.data;
      } catch (authErr) {
        if (authErr.status === 401) {
          setShowLoginPrompt(true);
          setLoading(false);
          return;
        }
        throw authErr;
      }

      if (!user) {
        setShowLoginPrompt(true);
        setLoading(false);
        return;
      }

      // 2. Obtener el primer viaje del usuario
      const tripsRes = await api.get('/trips');
      const trips = tripsRes.data || [];
      
      if (trips.length === 0) {
        setError('Primero crea un viaje desde "Mis viajes"');
        setLoading(false);
        return;
      }

      const tripId = trips[0].id;

      // 3. Construir el payload según el tipo
      let title = '';
      let unitPriceCents = 0;
      let currency = 'MXN';
      let pricingMode = 'per_person';
      let estimated = false;

      if (type === 'flight') {
        title = `${item.origin} → ${item.destination} (${item.airline})`;
        unitPriceCents = Math.round(item.price.amount * 100);
        currency = item.price.currency || 'MXN';
        pricingMode = item.pricingMode || 'per_person';
        estimated = item.price.estimated || false;
      } else if (type === 'stay') {
        title = item.name || 'Hospedaje sin nombre';
        unitPriceCents = Math.round((item.price?.amount || 0) * 100);
        currency = item.price?.currency || 'MXN';
        pricingMode = item.pricingMode || 'per_night_per_room';
        estimated = item.price?.estimated || true;
      }

      const payload = {
        type: type,
        provider: item.provider || 'unknown',
        externalId: item.externalId || null,
        title,
        unitPriceCents,
        currency,
        pricingMode,
        quantity: 1,
        estimated,
      };

      await api.post(`/trips/${tripId}/items`, payload);
      
      setSuccess(true);
      if (onAdded) onAdded(item);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (err.status === 401) {
        setShowLoginPrompt(true);
      } else {
        setError(err.message || `Error al agregar ${getTypeName()}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <span className="text-exito text-sm font-medium">
        {type === 'flight' ? 'Vuelo' : type === 'stay' ? 'Hospedaje' : 'Elemento'} Agregado al viaje
      </span>
    );
  }

  if (showLoginPrompt) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="bg-ambar-50 border border-dashed border-ambar-400 rounded-md px-3 py-2 text-sm text-ambar-700 max-w-[200px]">
          <p className="font-medium">Inicia sesión</p>
          <p className="text-xs text-ambar-600">
            Para guardar este {getTypeName()} en tu viaje
          </p>
        </div>
        <button
          onClick={() => setShowLoginPrompt(false)}
          className="text-xs text-tinta-400 hover:text-tinta-600"
        >
          ✕ Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Boton
        variante="secundario"
        tamano="sm"
        cargando={loading}
        onClick={handleAdd}
        disabled={loading}
        className="border-ambar-400 text-ambar-900 hover:bg-ambar-50"
      >
        {loading ? 'Agregando...' : 'Agregar al viaje'}
      </Boton>
      {error && (
        <span className="text-critico text-xs">{error}</span>
      )}
    </div>
  );
}
