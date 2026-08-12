/** DUENO: Isa (modulo A). */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Tarjeta from '../../../components/ui/Tarjeta';
import { adminApi } from '../api';

const PAGE_SIZE = 25;

const formatoFechaHora = (iso) => new Date(iso).toLocaleString('es-MX', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function AuditLogPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [eventos, setEventos] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, pages: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    const id = setTimeout(async () => {
      setCargando(true);
      setError('');
      try {
        const { data, pagination } = await adminApi.audit({ page, pageSize: PAGE_SIZE, q: q || undefined });
        if (cancelado) return;
        setEventos(data);
        setPaginacion(pagination);
      } catch (err) {
        if (!cancelado) setError(err.message || 'No fue posible cargar la bitácora');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, q ? 300 : 0);
    return () => { cancelado = true; clearTimeout(id); };
  }, [page, q]);

  const onBuscar = (event) => {
    setQ(event.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <nav className="flex gap-4 text-menor font-semibold">
        <Link to="/admin" className="text-tinta-500 hover:text-azul-600 hover:underline">Usuarios</Link>
        <span className="text-azul-600">Bitácora de auditoría</span>
      </nav>

      <Tarjeta className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-seccion text-tinta-900">
            Bitácora de auditoría {paginacion.total > 0 && <span className="text-tinta-500">· {paginacion.total}</span>}
          </h1>
          <input
            type="search"
            value={q}
            onChange={onBuscar}
            placeholder="Filtrar por acción, ej. login"
            className="h-10 w-64 rounded-md border border-bordeInteractivo bg-superficie px-3 text-cuerpo text-tinta-900 placeholder:text-tinta-300 focus:border-azul-600 focus:outline-none"
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-criticoSuave px-3 py-2 text-menor text-critico">{error}</p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-cuerpo">
            <thead>
              <tr className="border-b border-borde text-etiqueta text-tinta-500">
                <th className="py-2 pr-3 font-semibold">Fecha</th>
                <th className="py-2 pr-3 font-semibold">Actor</th>
                <th className="py-2 pr-3 font-semibold">Acción</th>
                <th className="py-2 pr-3 font-semibold">Entidad</th>
                <th className="py-2 pr-3 font-semibold">IP</th>
                <th className="py-2 pr-0 font-semibold">Correlación</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id} className="border-b border-borde last:border-0 align-top">
                  <td className="py-2.5 pr-3 whitespace-nowrap text-tinta-500">{formatoFechaHora(evento.created_at)}</td>
                  <td className="py-2.5 pr-3 text-tinta-900">
                    {evento.actor_name || <span className="text-tinta-300">— sin sesión —</span>}
                    {evento.actor_email && <div className="text-menor text-tinta-500">{evento.actor_email}</div>}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-menor text-tinta-900">{evento.action}</td>
                  <td className="py-2.5 pr-3 text-tinta-500">
                    {evento.entity ? `${evento.entity}${evento.entity_id ? ` · ${evento.entity_id.slice(0, 8)}…` : ''}` : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-menor text-tinta-500">{evento.ip || '—'}</td>
                  <td className="py-2.5 pr-0 font-mono text-menor text-tinta-300" title={evento.correlation_id}>
                    {evento.correlation_id ? `${evento.correlation_id.slice(0, 8)}…` : '—'}
                  </td>
                </tr>
              ))}
              {!cargando && eventos.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-tinta-500">No hay eventos que coincidan.</td></tr>
              )}
            </tbody>
          </table>
          {cargando && <p className="py-4 text-center text-menor text-tinta-500">Cargando...</p>}
        </div>

        <div className="mt-4 flex items-center justify-between text-menor text-tinta-500">
          <span>
            {paginacion.total > 0
              ? `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, paginacion.total)} de ${paginacion.total}`
              : ''}
          </span>
          <div className="flex gap-2">
            <Boton type="button" variante="secundario" tamano="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Boton>
            <Boton type="button" variante="secundario" tamano="sm" disabled={page >= paginacion.pages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Boton>
          </div>
        </div>
      </Tarjeta>
    </div>
  );
}
