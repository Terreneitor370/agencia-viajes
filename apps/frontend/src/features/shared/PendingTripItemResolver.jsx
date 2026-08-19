import { useEffect, useState } from 'react';
import { api } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';
import { construirPayload, leerPendiente, limpiarPendiente } from './pendingTripItem';

const NOMBRE_TIPO = { flight: 'vuelo', stay: 'hospedaje' };

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
        if (trips.length === 0) {
          setAviso({ tipo: 'error', texto: 'Inicia sesion pero primero crea un viaje desde "Mis viajes" para poder guardar ahi.' });
          return;
        }
        const payload = construirPayload(pendiente.item, pendiente.type);
        await api.post(`/trips/${trips[0].id}/items`, payload);
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
