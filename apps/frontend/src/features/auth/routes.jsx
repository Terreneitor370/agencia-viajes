/**
 * Rutas del modulo Identidad. DUENO: Isa (modulo A).
 * Contrato: exportar por defecto un arreglo de rutas de react-router.
 */
import { lazy, Suspense } from 'react';
import { ProtectedRoute, GuestRoute } from '../../core/guards/ProtectedRoute';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));

const load = (Component) => (
  <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}>
    <Component />
  </Suspense>
);

export default [
  { path: 'login', element: <GuestRoute>{load(LoginPage)}</GuestRoute> },
  { path: 'registro', element: <GuestRoute>{load(RegisterPage)}</GuestRoute> },
  { path: 'olvide-password', element: <GuestRoute>{load(ForgotPasswordPage)}</GuestRoute> },
  { path: 'perfil', element: <ProtectedRoute>{load(ProfilePage)}</ProtectedRoute> },
];
