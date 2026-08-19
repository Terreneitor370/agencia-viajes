import { useState } from 'react';
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

  const getTypeName = () => {
    if (type === 'flight') return 'vuelo';
    if (type === 'stay') return 'hospedaje';
    return 'elemento';
  };

  /** El POST real. Asume que ya hay sesion: la checa quien la llame. */
  const agregar = async () => {
    const tripsRes = await api.get('/trips');
    const trips = tripsRes.data || [];
    if (trips.length === 0) {
      setError('Primero crea un viaje desde "Mis viajes"');
      return;
    }
    await api.post(`/trips/${trips[0].id}/items`, construirPayload(item, type));
    setSuccess(true);
    if (onAdded) onAdded(item);
    setTimeout(() => setSuccess(false), 3000);
  };

  const irALoginYRecordar = () => {
    // Se guarda QUE se queria agregar y se manda a login. PendingTripItemResolver
    // (montado en AppLayout) termina la accion sola en cuanto haya sesion,
    // sin importar a que pantalla se vuelva -- los resultados de esta
    // busqueda no sobreviven el viaje de ida y vuelta a /login.
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

      await agregar();
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

  if (success) {
    return (
      <span className="text-exito text-sm font-medium">
        {type === 'flight' ? 'Vuelo' : type === 'stay' ? 'Hospedaje' : 'Elemento'} Agregado al viaje
      </span>
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
