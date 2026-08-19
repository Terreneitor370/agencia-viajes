import { useEffect, useState } from 'react';
import { api } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';
import { construirPayload, leerPendiente, limpiarPendiente } from './pendingTripItem';

const NOMBRE_TIPO = { flight: 'vuelo', stay: 'hospedaje', experience: 'experiencia' };

export default function PendingTripItemResolver() {
  const { isAuthenticated } = useAuth();
  const [aviso, setAviso] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [trips, setTrips] = useState([]);
  const [pendiente, setPendiente] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const p = leerPendiente();
    if (!p) return;
    limpiarPendiente();
    setPendiente(p);

    (async () => {
      try {
        const tripsRes = await api.get('/trips');
        const data = tripsRes.data || [];
        setTrips(data);

        if (data.length === 0) {
          setAviso({ tipo: 'error', texto: 'No tienes viajes creados. Crea uno desde "Mis viajes" y el elemento se agregara automaticamente.' });
          return;
        }
        if (data.length === 1) {
          const payload = construirPayload(p.item, p.type);
          await api.post(`/trips/${data[0].id}/items`, payload);
          const nombre = NOMBRE_TIPO[p.type] || 'elemento';
          setAviso({ tipo: 'exito', texto: `Se agrego el ${nombre} que buscabas a tu viaje.` });
        } else {
          setPickerOpen(true);
        }
      } catch {
        setAviso({ tipo: 'error', texto: 'No se pudo agregar lo que buscabas. Intenta de nuevo desde la busqueda.' });
      }
    })();
  }, [isAuthenticated]);

  const handleConfirm = async () => {
    if (!selectedTripId || !pendiente) return;
    setAdding(true);
    try {
      const payload = construirPayload(pendiente.item, pendiente.type);
      await api.post(`/trips/${selectedTripId}/items`, payload);
      const nombre = NOMBRE_TIPO[pendiente.type] || 'elemento';
      setAviso({ tipo: 'exito', texto: `Se agrego el ${nombre} a tu viaje.` });
      setPickerOpen(false);
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo agregar. Intenta de nuevo.' });
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    if (!aviso) return undefined;
    const id = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(id);
  }, [aviso]);

  if (pickerOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="mx-4 w-full max-w-sm rounded-lg border border-borde bg-superficie p-5 shadow-hoja space-y-3">
          <p className="text-tarjeta font-semibold text-tinta-900">Selecciona un viaje</p>
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="w-full rounded-md border border-bordeInteractivo px-3 py-2 text-sm"
          >
            <option value="">-- Elige un viaje --</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="rounded-md border border-borde px-3 py-1.5 text-sm text-tinta-700 hover:bg-lienzo"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedTripId || adding}
              className="rounded-md bg-azul-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-700 disabled:opacity-50"
            >
              {adding ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <span aria-hidden="true">{esExito ? '\u2713' : '!'}</span>
        <p className="flex-1">{aviso.texto}</p>
        <button
          type="button"
          onClick={() => setAviso(null)}
          className="text-tinta-400 hover:text-tinta-600"
          aria-label="Cerrar aviso"
        >
          X
        </button>
      </div>
    </div>
  );
}
