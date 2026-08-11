/** Proveedores globales. DUENO: core (compartido). */
import AuthProvider from '../core/auth/AuthProvider';

export default function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
