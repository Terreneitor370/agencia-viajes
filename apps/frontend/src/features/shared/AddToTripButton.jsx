import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../core/api/client';
import Boton from '../../components/ui/Boton';
import { construirPayload, guardarPendiente } from './pendingTripItem';

const toDate = (value) => (value ? String(value).slice(0, 10) : '');

function tripPatchFromFlight(item) {
  const patch = {};

  const originCity = String(item.originCity || item.origin || '').trim();
  const destinationCity = String(item.destinationCity || item.destination || '').trim();
  if (originCity && destinationCity && originCity !== destinationCity) {
    patch.originCity = originCity;
    patch.destinationCity = destinationCity;
  }

  const travelers = Number(item.selectedTravelers);
  if (Number.isFinite(travelers) && travelers >= 1 && travelers <= 20) {
    patch.travelers = travelers;
  }

  const startDate = toDate(item.selectedStartDate);
  const endDate = toDate(item.selectedEndDate);
  if (startDate && endDate && new Date(`${endDate}T00:00:00`) > new Date(`${startDate}T00:00:00`)) {
    patch.startDate = startDate;
    patch.endDate = endDate;
  }

  return patch;
}

export default function AddToTripButton({ item, type, tripId = '', onAdded }) {
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

  const resolveTripId = async () => {
    const tripsRes = await api.get('/trips');
    const trips = tripsRes.data || [];

    if (tripId) {
      const selected = trips.find((trip) => trip.id === tripId);
      if (!selected) {
        setError('El viaje seleccionado no existe o ya no esta disponible.');
        return '';
      }
      if (selected.is_paid ?? selected.isPaid) {
        setError('Ese viaje ya fue pagado y no acepta cambios.');
        return '';
      }
      return tripId;
    }

    const editableTrips = trips.filter((trip) => !(trip.is_paid ?? trip.isPaid));
    if (editableTrips.length === 0) {
      setError('No tienes viajes editables. Los viajes pagados no aceptan cambios.');
      return '';
    }

    return editableTrips[0].id;
  };

  /** El POST real. Asume que ya hay sesion: la checa quien la llame. */
  const agregar = async () => {
    const targetTripId = await resolveTripId();
    if (!targetTripId) return;

    await api.post(`/trips/${targetTripId}/items`, construirPayload(item, type));

    if (type === 'flight') {
      const patch = tripPatchFromFlight(item);
      if (Object.keys(patch).length > 0) {
        try {
          await api.patch(`/trips/${targetTripId}`, patch);
        } catch {
          // La compra/seleccion del vuelo ya se guardo; no se bloquea por fallo de sincronizacion.
        }
      }
    }

    setSuccess(true);
    if (onAdded) onAdded(item, { tripId: targetTripId });
    setTimeout(() => setSuccess(false), 3000);
  };

  const irALoginYRecordar = () => {
    // Se guarda QUE se queria agregar y se manda a login. PendingTripItemResolver
    // (montado en AppLayout) termina la accion sola en cuanto haya sesion,
    // sin importar a que pantalla se vuelva -- los resultados de esta
    // busqueda no sobreviven el viaje de ida y vuelta a /login.
    guardarPendiente(item, type, tripId);
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
