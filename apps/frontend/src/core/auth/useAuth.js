import { useContext } from 'react';
import { AuthContext } from './authContext';

/** Acceso al estado de sesion. Recuerda: esto es UX, la autorizacion real es del backend. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
