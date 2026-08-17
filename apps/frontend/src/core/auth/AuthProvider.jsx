/**
 * Estado de sesion del frontend. DUENO: Isa (modulo A) (congelado tras el dia 0).
 *
 * ADVERTENCIA CONCEPTUAL IMPORTANTE:
 * Lo que hay aqui es experiencia de usuario, no seguridad. Ocultar un boton no
 * protege nada: quien quiera puede llamar al endpoint con curl. La unica
 * autorizacion real es la del backend (middlewares/authorize.js). Este contexto
 * solo evita que el usuario vea opciones que de todos modos le serian negadas.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  /** Consulta la sesion vigente. El backend la lee de la cookie httpOnly. */
  const loadSession = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setPermissions(data.permissions || []);
      return data.user;
    } catch {
      setUser(null);
      setPermissions([]);
      return null;
    }
  }, []);

  // Carga inicial. El flag `cancelled` evita actualizar estado si el componente
  // se desmonta antes de que responda la peticion.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (cancelled) return;
        setUser(data.user);
        setPermissions(data.permissions || []);
      } catch {
        if (cancelled) return;
        setUser(null);
        setPermissions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    // Password correcto pero falta el codigo del segundo factor: todavia no
    // hay sesion que cargar. LoginPage decide que hacer con challengeId.
    if (data?.mfaRequired) return data;
    await loadSession();
    return data;
  }, [loadSession]);

  /** Completa el login o el registro con el codigo enviado por correo. */
  const verifyOtp = useCallback(async (challengeId, code) => {
    await api.post('/auth/otp/verify', { challengeId, code });
    await loadSession();
  }, [loadSession]);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
    setPermissions([]);
  }, []);

  const value = useMemo(() => ({
    user,
    permissions,
    loading,
    isAuthenticated: Boolean(user),
    can: (permission) => permissions.includes(permission),
    login,
    verifyOtp,
    logout,
    reload: loadSession,
  }), [user, permissions, loading, login, verifyOtp, logout, loadSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
