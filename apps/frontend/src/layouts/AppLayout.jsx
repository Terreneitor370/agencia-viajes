/**
 * Cascaron de la aplicacion. DUENO: core compartido.
 *
 * Barra azul profunda arriba, como en el sistema de diseno. Cada integrante
 * monta su modulo en el <Outlet />, no dentro de este archivo.
 */
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';
import Boton from '../components/ui/Boton';

const enlace = ({ isActive }) => [
  'rounded px-3 py-1.5 text-cuerpo transition-colors',
  isActive ? 'font-semibold text-white' : 'text-azul-100 hover:text-white',
].join(' ');

export default function AppLayout() {
  const { user, isAuthenticated, can, logout } = useAuth();
  const navigate = useNavigate();

  const salir = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const iniciales = (user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-lienzo text-tinta-900">
      <header className="bg-marca">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" className="mr-5 text-seccion font-bold tracking-tight text-white">
            Viaja<span className="text-ambar-400">.</span>
          </Link>

          {can('user:read:any') && (
            <span className="mr-3 rounded bg-ambar-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ambar-900">
              Admin
            </span>
          )}

          <nav className="flex flex-1 items-center gap-1">
            <NavLink to="/buscar" className={enlace}>Vuelos</NavLink>
            <NavLink to="/hospedaje" className={enlace}>Hospedaje</NavLink>
            <NavLink to="/experiencias" className={enlace}>Experiencias</NavLink>
            <NavLink to="/cotizaciones" className={enlace}>Cotizaciones</NavLink>
            {isAuthenticated && <NavLink to="/viajes" className={enlace}>Mis viajes</NavLink>}
            {can('user:read:any') && <NavLink to="/admin" className={enlace}>Administración</NavLink>}
          </nav>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-menor text-azul-100 sm:inline">MXN</span>
              <span
                className="grid h-8 w-8 place-items-center rounded-full bg-azul-400 text-menor font-bold text-white"
                title={user?.email}
              >
                {iniciales}
              </span>
              <button
                type="button"
                onClick={salir}
                className="rounded px-2 py-1 text-menor text-azul-100 hover:text-white"
              >
                Salir
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden text-menor text-azul-100 sm:inline">MXN · Español</span>
              <Link
                to="/login"
                className="rounded-md border border-white/50 px-3 py-1.5 text-menor font-semibold text-white hover:bg-white/10"
              >
                Entrar
              </Link>
              <Boton variante="oferta" tamano="sm" onClick={() => navigate('/registro')}>
                Crear cuenta
              </Boton>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
