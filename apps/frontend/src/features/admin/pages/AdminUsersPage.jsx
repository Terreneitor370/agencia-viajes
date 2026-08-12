/** DUENO: Isa (modulo A). */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import Distintivo from '../../../components/ui/Distintivo';
import Tarjeta from '../../../components/ui/Tarjeta';
import { useAuth } from '../../../core/auth/useAuth';
import { adminApi } from '../api';

const PAGE_SIZE = 20;
const ROLES_LEGIBLES = { admin: 'Administrador', traveler: 'Viajero' };
const ROL_DESTINO = { admin: 'traveler', traveler: 'admin' };

const formatoFecha = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminUsersPage() {
  const { user: sesion } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [usuarios, setUsuarios] = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, pages: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    const id = setTimeout(async () => {
      setCargando(true);
      setError('');
      try {
        const { data, pagination } = await adminApi.users({ page, pageSize: PAGE_SIZE, q: q || undefined });
        if (cancelado) return;
        setUsuarios(data);
        setPaginacion(pagination);
      } catch (err) {
        if (!cancelado) setError(err.message || 'No fue posible cargar los usuarios');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, q ? 300 : 0);
    return () => { cancelado = true; clearTimeout(id); };
  }, [page, q, refreshKey]);

  const onBuscar = (event) => {
    setQ(event.target.value);
    setPage(1);
  };

  // --- panel de cambio de rol ---
  const [objetivo, setObjetivo] = useState(null);
  const [confirmacion, setConfirmacion] = useState('');
  const [cambiandoRol, setCambiandoRol] = useState(false);
  const [errorRol, setErrorRol] = useState('');

  const abrirCambioRol = (usuario) => { setObjetivo(usuario); setConfirmacion(''); setErrorRol(''); };
  const cerrarCambioRol = () => setObjetivo(null);

  const rolDestino = objetivo ? ROL_DESTINO[objetivo.role] : null;
  const fraseRequerida = rolDestino ? ROLES_LEGIBLES[rolDestino].toUpperCase() : '';

  const confirmarCambioRol = async () => {
    setCambiandoRol(true);
    setErrorRol('');
    try {
      await adminApi.setRole(objetivo.id, rolDestino);
      setObjetivo(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setErrorRol(err.message || 'No fue posible cambiar el rol');
    } finally {
      setCambiandoRol(false);
    }
  };

  return (
    <div className="space-y-4">
      <nav className="flex gap-4 text-menor font-semibold">
        <span className="text-azul-600">Usuarios</span>
        <Link to="/admin/auditoria" className="text-tinta-500 hover:text-azul-600 hover:underline">Bitácora de auditoría</Link>
      </nav>

      <Tarjeta className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-seccion text-tinta-900">
            Usuarios {paginacion.total > 0 && <span className="text-tinta-500">· {paginacion.total}</span>}
          </h1>
          <input
            type="search"
            value={q}
            onChange={onBuscar}
            placeholder="Buscar por correo o nombre"
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
                <th className="py-2 pr-3 font-semibold">Usuario</th>
                <th className="py-2 pr-3 font-semibold">Correo</th>
                <th className="py-2 pr-3 font-semibold">Rol</th>
                <th className="py-2 pr-3 font-semibold">Alta</th>
                <th className="py-2 pr-0 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => {
                const esUnoMismo = usuario.id === sesion?.id;
                return (
                  <tr key={usuario.id} className="border-b border-borde last:border-0">
                    <td className="py-2.5 pr-3 font-semibold text-tinta-900">
                      {usuario.name} {esUnoMismo && <span className="font-normal text-tinta-500">(tú)</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-tinta-500">{usuario.email}</td>
                    <td className="py-2.5 pr-3">
                      <Distintivo tono={usuario.role === 'admin' ? 'info' : 'neutro'}>
                        {ROLES_LEGIBLES[usuario.role] || usuario.role}
                      </Distintivo>
                    </td>
                    <td className="py-2.5 pr-3 text-tinta-500">{formatoFecha(usuario.created_at)}</td>
                    <td className="py-2.5 pr-0 text-right">
                      {esUnoMismo ? (
                        <span className="text-menor text-tinta-300">No puedes cambiar tu propio rol</span>
                      ) : (
                        <button type="button" onClick={() => abrirCambioRol(usuario)}
                          className="text-menor font-semibold text-azul-600 hover:underline">
                          Cambiar rol
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!cargando && usuarios.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-tinta-500">No se encontraron usuarios.</td></tr>
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

      {objetivo && (
        <Tarjeta className="border-azul-100 p-6">
          <h2 className="text-tarjeta text-tinta-900">Cambiar rol de {objetivo.name}</h2>
          <p className="mt-1 text-menor text-tinta-500">
            Pasará de <strong>{ROLES_LEGIBLES[objetivo.role]}</strong> a <strong>{ROLES_LEGIBLES[rolDestino]}</strong>.
            {rolDestino === 'admin'
              ? ' Podrá ver y editar los datos de todas las personas usuarias. Queda registrado en la bitácora.'
              : ' Perderá el acceso al panel de administración. Queda registrado en la bitácora.'}
          </p>

          <div className="mt-4 max-w-sm">
            <Campo
              etiqueta={`Escribe ${fraseRequerida} para confirmar`}
              value={confirmacion}
              onChange={(event) => setConfirmacion(event.target.value)}
              autoComplete="off"
            />
          </div>

          {errorRol && (
            <p role="alert" className="mt-3 rounded-md bg-criticoSuave px-3 py-2 text-menor text-critico">{errorRol}</p>
          )}

          <div className="mt-4 flex gap-3">
            <Boton type="button" variante="secundario" onClick={cerrarCambioRol}>Cancelar</Boton>
            <Boton
              type="button"
              variante="primario"
              disabled={confirmacion.trim() !== fraseRequerida}
              cargando={cambiandoRol}
              onClick={confirmarCambioRol}
            >
              Cambiar rol
            </Boton>
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
