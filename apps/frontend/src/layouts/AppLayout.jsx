/**
 * Cascaron de la aplicacion: barra superior + area de contenido.
 * DUENO: core (compartido). Cada integrante monta su modulo en el <Outlet />,
 * no dentro de este archivo.
 */
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';

const linkClass = ({ isActive }) => [
  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
  isActive ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100',
].join(' ');

export default function AppLayout() {
  const { user, isAuthenticated, can, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" className="mr-4 text-lg font-semibold text-sky-700">Agencia de Viajes</Link>

          <nav className="flex flex-1 items-center gap-1">
            <NavLink to="/buscar" className={linkClass}>Buscar</NavLink>
            <NavLink to="/experiencias" className={linkClass}>Experiencias</NavLink>
            {isAuthenticated && <NavLink to="/viajes" className={linkClass}>Mis viajes</NavLink>}
            {/* El menu se pinta con los permisos que devuelve el backend, no con
                una comparacion de rol escrita a mano en el cliente. */}
            {can('user:read:any') && <NavLink to="/admin" className={linkClass}>Administracion</NavLink>}
          </nav>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{user?.email}</span>
              <button type="button" onClick={handleLogout}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
                Salir
              </button>
            </div>
          ) : (
            <Link to="/login" className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700">
              Iniciar sesion
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
