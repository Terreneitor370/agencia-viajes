/**
 * Rutas del modulo Identidad. DUENO: Isa (modulo A).
 * Contrato: exportar por defecto un arreglo de rutas de react-router.
 */
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '../../core/guards/ProtectedRoute';

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
  { path: 'login', element: load(LoginPage) },
  { path: 'registro', element: load(RegisterPage) },
  { path: 'olvide-password', element: load(ForgotPasswordPage) },
  { path: 'perfil', element: <ProtectedRoute>{load(ProfilePage)}</ProtectedRoute> },
];
