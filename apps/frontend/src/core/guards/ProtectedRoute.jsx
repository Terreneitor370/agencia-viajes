/**
 * Guardas de ruta del cliente. Solo mejoran la experiencia; la barrera real
 * esta en el backend. DUENO: Isa (modulo A).
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando sesion...</div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function PermissionRoute({ permission, children }) {
  const { can, loading, isAuthenticated } = useAuth();

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando sesion...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!can(permission)) return <Navigate to="/403" replace />;
  return children;
}

/**
 * Inverso de ProtectedRoute: login/registro/recuperar-contrasena son para
 * quien NO tiene sesion. Sin esto, alguien ya autenticado que llegue ahi por
 * cualquier camino (atras del navegador, un link viejo, escribir la URL a
 * mano) ve el formulario en vez de volver a la app -- confuso, aunque nunca
 * fue un hueco de seguridad: la sesion seguia siendo valida de cualquier forma.
 *
 * Respeta location.state.from igual que LoginPage: justo despues de un login
 * exitoso, isAuthenticated cambia a true mientras la ruta /login todavia esta
 * montada, y este guardia reacciona antes de que el navigate(irA) propio de
 * LoginPage alcance a correr. Si aqui se mandara siempre a /viajes fijo,
 * le ganaria la carrera y se perderia a donde en realidad se queria volver
 * (por ejemplo, de vuelta a una busqueda con un "Agregar al viaje" pendiente).
 */
export function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando sesion...</div>;
  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname || '/viajes'} replace />;
  return children;
}
