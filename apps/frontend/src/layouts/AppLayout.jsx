/**
 * Cascaron de la aplicacion. DUENO: core compartido.
 *
 * Barra azul profunda arriba, como en el sistema de diseno. Cada integrante
 * monta su modulo en el <Outlet />, no dentro de este archivo.
 */
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../core/auth/useAuth';
import Boton from '../components/ui/Boton';
import PendingTripItemResolver from '../features/shared/PendingTripItemResolver';

const enlace = ({ isActive }) => [
  'rounded px-3 py-1.5 text-cuerpo transition-colors',
  isActive ? 'font-semibold text-white' : 'text-azul-100 hover:text-white',
].join(' ');

const enlaceMovil = ({ isActive }) => [
  'rounded px-3 py-2 text-cuerpo transition-colors',
  isActive ? 'bg-white/10 font-semibold text-white' : 'text-azul-100 hover:bg-white/5 hover:text-white',
].join(' ');

export default function AppLayout() {
  const { user, isAuthenticated, can, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = () => setMenuAbierto(false);

  const salir = async () => {
    cerrarMenu();
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
            <span className="mr-3 hidden rounded bg-ambar-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ambar-900 sm:inline-block">
              Admin
            </span>
          )}

          {/* En pantallas angostas la barra no cabe con todos los enlaces:
              se esconde detras del boton de hamburguesa de abajo. */}
          <nav className="hidden flex-1 items-center gap-1 sm:flex">
            <NavLink to="/buscar" className={enlace}>Vuelos</NavLink>
            <NavLink to="/hospedaje" className={enlace}>Hospedaje</NavLink>
            <NavLink to="/experiencias" className={enlace}>Experiencias</NavLink>
            {isAuthenticated && <NavLink to="/viajes" className={enlace}>Mis viajes</NavLink>}
            {can('user:read:any') && <NavLink to="/admin" className={enlace}>Administración</NavLink>}
          </nav>

          <div className="ml-auto hidden items-center gap-2 sm:flex">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/perfil"
                  className="grid h-8 w-8 place-items-center rounded-full bg-azul-400 text-menor font-bold text-white transition-colors hover:bg-azul-300"
                  title={`Mi perfil · ${user?.email || ''}`}
                >
                  {iniciales}
                </Link>
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

          <button
            type="button"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            className="ml-auto grid h-9 w-9 place-items-center rounded text-white hover:bg-white/10 sm:hidden"
            aria-label={menuAbierto ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {menuAbierto && (
          <div className="border-t border-white/10 px-4 py-3 sm:hidden">
            <nav className="flex flex-col gap-1">
              <NavLink to="/buscar" className={enlaceMovil} onClick={cerrarMenu}>Vuelos</NavLink>
              <NavLink to="/hospedaje" className={enlaceMovil} onClick={cerrarMenu}>Hospedaje</NavLink>
              <NavLink to="/experiencias" className={enlaceMovil} onClick={cerrarMenu}>Experiencias</NavLink>
              {isAuthenticated && <NavLink to="/viajes" className={enlaceMovil} onClick={cerrarMenu}>Mis viajes</NavLink>}
              {can('user:read:any') && <NavLink to="/admin" className={enlaceMovil} onClick={cerrarMenu}>Administración</NavLink>}
            </nav>

            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
              {isAuthenticated ? (
                <>
                  <Link to="/perfil" onClick={cerrarMenu} className={enlaceMovil({ isActive: false })}>
                    Mi perfil · {user?.email || ''}
                  </Link>
                  <button
                    type="button"
                    onClick={salir}
                    className="rounded px-3 py-2 text-left text-cuerpo text-azul-100 hover:bg-white/5 hover:text-white"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={cerrarMenu} className={enlaceMovil({ isActive: false })}>
                    Entrar
                  </Link>
                  <Boton variante="oferta" tamano="sm" onClick={() => { cerrarMenu(); navigate('/registro'); }}>
                    Crear cuenta
                  </Boton>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <PendingTripItemResolver />
    </div>
  );
}
