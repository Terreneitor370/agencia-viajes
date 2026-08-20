import { useEffect, useState } from 'react';
import { api } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';
import { construirPayload, leerPendiente, limpiarPendiente } from './pendingTripItem';

const NOMBRE_TIPO = { flight: 'vuelo', stay: 'hospedaje' };

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

/**
 * Sin UI propia salvo un aviso temporal. Se monta una sola vez en AppLayout.
 *
 * Por que aqui y no en el boton que abrio el desafio: SearchPage no conserva
 * los resultados de una busqueda entre un redirect a /login y el regreso, asi
 * que la tarjeta especifica de ese vuelo/hospedaje nunca vuelve a existir
 * para "recordar" su propia intencion. Este resolver vive a nivel de la app
 * completa, asi que no depende de que ningun componente en particular siga
 * montado -- solo de que exista una sesion.
 */
export default function PendingTripItemResolver() {
  const { isAuthenticated } = useAuth();
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const pendiente = leerPendiente();
    if (!pendiente) return;
    limpiarPendiente(); // una sola vez: exito o fracaso, no se reintenta solo.

    (async () => {
      try {
        const tripsRes = await api.get('/trips');
        const trips = tripsRes.data || [];
        const editableTrips = trips.filter((trip) => !(trip.is_paid ?? trip.isPaid));
        if (editableTrips.length === 0) {
          setAviso({ tipo: 'error', texto: 'No tienes viajes editables. Los viajes pagados no aceptan cambios.' });
          return;
        }

        const allowedIds = new Set(editableTrips.map((trip) => trip.id));
        const targetTripId = pendiente.tripId && allowedIds.has(pendiente.tripId)
          ? pendiente.tripId
          : editableTrips[0].id;

        const payload = construirPayload(pendiente.item, pendiente.type);
        await api.post(`/trips/${targetTripId}/items`, payload);

        if (pendiente.type === 'flight') {
          const patch = tripPatchFromFlight(pendiente.item);
          if (Object.keys(patch).length > 0) {
            try {
              await api.patch(`/trips/${targetTripId}`, patch);
            } catch {
              // El pendiente principal ya se guardo; solo se omite la sincronizacion.
            }
          }
        }

        const nombre = NOMBRE_TIPO[pendiente.type] || 'elemento';
        setAviso({ tipo: 'exito', texto: `Se agrego el ${nombre} que buscabas a tu viaje.` });
      } catch {
        setAviso({ tipo: 'error', texto: 'Iniciaste sesion, pero no se pudo agregar lo que buscabas. Intenta de nuevo desde la busqueda.' });
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!aviso) return undefined;
    const id = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(id);
  }, [aviso]);

  if (!aviso) return null;

  const esExito = aviso.tipo === 'exito';
  return (
    <div
      role="status"
      className={[
        'fixed bottom-4 right-4 z-50 max-w-xs rounded-md border px-4 py-3 text-menor shadow-lg',
        esExito ? 'border-exito bg-exitoSuave text-exito' : 'border-ambar-400 bg-ambar-50 text-ambar-700',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true">{esExito ? '✓' : '!'}</span>
        <p className="flex-1">{aviso.texto}</p>
        <button
          type="button"
          onClick={() => setAviso(null)}
          className="text-tinta-400 hover:text-tinta-600"
          aria-label="Cerrar aviso"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
