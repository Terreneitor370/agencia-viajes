import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, TriangleAlert, X } from 'lucide-react';
import { api } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';
import { buildStaysUrl, construirCargosDeAsientos, construirPayload, leerPendiente, limpiarPendiente } from './pendingTripItem';

const NOMBRE_TIPO = { flight: 'vuelo', stay: 'hospedaje' };

const toDate = (value) => (value ? String(value).slice(0, 10) : '');

/** Entre los viajes editables del usuario, el que se tenia en mente al guardar el pendiente si sigue siendo valido, si no el primero disponible. */
async function resolverTripDestino(pendienteTripId) {
  const tripsRes = await api.get('/trips');
  const trips = tripsRes.data || [];
  const editableTrips = trips.filter((trip) => !(trip.is_paid ?? trip.isPaid));
  if (editableTrips.length === 0) {
    throw new Error('SIN_VIAJES_EDITABLES');
  }
  const allowedIds = new Set(editableTrips.map((trip) => trip.id));
  return pendienteTripId && allowedIds.has(pendienteTripId) ? pendienteTripId : editableTrips[0].id;
}

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
  const navigate = useNavigate();
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const pendiente = leerPendiente();
    if (!pendiente) return;
    limpiarPendiente(); // una sola vez: exito o fracaso, no se reintenta solo.

    (async () => {
      try {
        // Vuelo cuya seleccion de asientos (SeatSelectionPage.jsx) se
        // interrumpio para hacer login: antes esto mandaba de vuelta a
        // /asientos con los mismos parametros de busqueda de siempre, sin la
        // seleccion ya hecha -- Isa lo reporto como una regresion de UX real
        // (el usuario terminaba llenando el paso 2 dos veces). Como el
        // pendiente ya trae los asientos elegidos (item.seats, con el precio
        // ya convertido a la moneda del vuelo), se puede guardar directo y
        // seguir al paso 3 sin volver a mostrar el mapa de asientos.
        if (pendiente.continueUrl && pendiente.type === 'flight' && pendiente.item?.seats) {
          const targetTripId = await resolverTripDestino(pendiente.tripId);
          await api.post(`/trips/${targetTripId}/items`, construirPayload(pendiente.item, 'flight'));
          for (const chargeItem of construirCargosDeAsientos(pendiente.item)) {
            await api.post(`/trips/${targetTripId}/items`, chargeItem);
          }

          const patch = tripPatchFromFlight(pendiente.item);
          if (Object.keys(patch).length > 0) {
            try {
              await api.patch(`/trips/${targetTripId}`, patch);
            } catch {
              // El vuelo ya se guardo; solo se omite la sincronizacion de fechas/ciudad.
            }
          }

          const continueParams = new URL(pendiente.continueUrl, window.location.origin).searchParams;
          navigate(buildStaysUrl(continueParams, pendiente.item.seats, targetTripId));
          return;
        }

        // Cualquier otro pendiente con continueUrl (hoy solo pasa con vuelos
        // sin asientos elegidos, ej. aerolinea sin mapa disponible): no hay
        // nada que restaurar, se manda de vuelta tal como antes.
        if (pendiente.continueUrl) {
          navigate(pendiente.continueUrl);
          return;
        }

        const targetTripId = await resolverTripDestino(pendiente.tripId);
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
      } catch (err) {
        const texto = err?.message === 'SIN_VIAJES_EDITABLES'
          ? 'No tienes viajes editables. Los viajes pagados no aceptan cambios.'
          : 'Iniciaste sesion, pero no se pudo agregar lo que buscabas. Intenta de nuevo desde la busqueda.';
        setAviso({ tipo: 'error', texto });
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
        {esExito
          ? <Check className="h-4 w-4 shrink-0 translate-y-0.5" aria-hidden="true" />
          : <TriangleAlert className="h-4 w-4 shrink-0 translate-y-0.5" aria-hidden="true" />}
        <p className="flex-1">{aviso.texto}</p>
        <button
          type="button"
          onClick={() => setAviso(null)}
          className="text-tinta-400 hover:text-tinta-600"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
