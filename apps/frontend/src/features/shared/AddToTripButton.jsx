import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../core/api/client';
import Boton from '../../components/ui/Boton';
import { construirPayload, guardarPendiente } from './pendingTripItem';

export default function AddToTripButton({ item, type, onAdded }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [trips, setTrips] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');

  const getTypeName = () => {
    if (type === 'flight') return 'vuelo';
    if (type === 'stay') return 'hospedaje';
    return 'elemento';
  };

  /** Carga la lista de viajes del usuario. */
  const loadTrips = async () => {
    const res = await api.get('/trips');
    const data = res.data || [];
    setTrips(data);
    if (data.length === 1) setSelectedTripId(data[0].id);
    return data;
  };

  /** El POST real. */
  const agregar = async (tripId) => {
    await api.post(`/trips/${tripId}/items`, construirPayload(item, type));
    setSuccess(true);
    if (onAdded) onAdded(item);
    setTimeout(() => setSuccess(false), 3000);
  };

  const irALoginYRecordar = () => {
    guardarPendiente(item, type);
    navigate('/login', { state: { from: location } });
  };

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let autenticado = true;
      try {
        await api.get('/auth/me');
      } catch (authErr) {
        if (authErr.status === 401) autenticado = false;
        else throw authErr;
      }

      if (!autenticado) {
        irALoginYRecordar();
        return;
      }

      const data = await loadTrips();
      if (data.length === 0) {
        setError('Primero crea un viaje desde "Mis viajes"');
        setLoading(false);
        return;
      }
      if (data.length === 1) {
        await agregar(data[0].id);
      } else {
        setShowPicker(true);
      }
    } catch (err) {
      if (err.status === 401) {
        irALoginYRecordar();
        return;
      }
      setError(err.message || `Error al agregar ${getTypeName()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTripId) return;
    setLoading(true);
    try {
      await agregar(selectedTripId);
      setShowPicker(false);
    } catch (err) {
      setError(err.message || `Error al agregar ${getTypeName()}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <span className="text-exito text-sm font-medium">
        {type === 'flight' ? 'Vuelo' : type === 'stay' ? 'Hospedaje' : 'Elemento'} agregado al viaje
      </span>
    );
  }

  if (showPicker) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-borde bg-superficie p-3 shadow-tarjeta">
        <p className="text-sm font-semibold text-tinta-700">Selecciona un viaje</p>
        <select
          value={selectedTripId}
          onChange={(e) => setSelectedTripId(e.target.value)}
          className="w-full rounded-md border border-bordeInteractivo px-3 py-2 text-sm"
        >
          <option value="">-- Elege un viaje --</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.origin_city} → {t.destination_city})
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Boton
            variante="primario"
            tamano="sm"
            cargando={loading}
            onClick={handleConfirm}
            disabled={!selectedTripId || loading}
          >
            Agregar
          </Boton>
          <Boton
            variante="secundario"
            tamano="sm"
            onClick={() => setShowPicker(false)}
            disabled={loading}
          >
            Cancelar
          </Boton>
        </div>
        {error && <span className="text-critico text-xs">{error}</span>}
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
