/**
 * Guardas de ruta del cliente. Solo mejoran la experiencia; la barrera real
 * esta en el backend. DUENO: integrante A.
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
