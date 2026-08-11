/** DUENO: integrante A. TODO: datos del perfil + cambio de contrasena. */
import { useAuth } from '../../../core/auth/useAuth';

export default function ProfilePage() {
  const { user, permissions } = useAuth();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Mi perfil</h1>
      <p className="mt-2 text-sm text-slate-600">{user?.email} - rol: {user?.role}</p>
      <p className="mt-4 text-xs text-slate-400">Permisos activos: {permissions.length}</p>
    </div>
  );
}
