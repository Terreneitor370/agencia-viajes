/** DUENO: Isa (modulo A). */
import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../../core/auth/useAuth';
import { authApi } from '../api';

// Google vuelve por un redirect de pagina completa, no por un fetch: el
// backend no puede mandar un mensaje de error en el cuerpo, solo esta marca
// en la URL. Se traduce aqui a algo que la persona pueda leer.
const OAUTH_ERROR_MESSAGES = {
  no_configurado: 'El inicio de sesion con Google no esta disponible por ahora.',
  denegado: 'Cancelaste el inicio de sesion con Google.',
  estado_invalido: 'Tu sesion con Google expiro, intenta de nuevo.',
  solicitud_invalida: 'No pudimos completar el inicio de sesion con Google.',
  fallo: 'No fue posible iniciar sesion con Google. Intenta de nuevo.',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(() => {
    const motivo = searchParams.get('oauth_error');
    return motivo ? (OAUTH_ERROR_MESSAGES[motivo] || OAUTH_ERROR_MESSAGES.fallo) : '';
  });
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/viajes', { replace: true });
    } catch (err) {
      // Se muestra el mensaje generico del backend. No detallamos si fallo el
      // correo o la contrasena: eso permitiria enumerar cuentas validas.
      setError(err.message || 'No fue posible iniciar sesion');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Iniciar sesion</h1>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">Correo</label>
          <input id="email" type="email" required autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">Contrasena</label>
          <input id="password" type="password" required autoComplete="current-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" />
        </div>

        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={busy}
          className="w-full rounded-md bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> o <span className="h-px flex-1 bg-slate-200" />
      </div>

      <a href={authApi.googleUrl()}
        className="block w-full rounded-md border border-slate-300 py-2 text-center text-sm font-medium hover:bg-slate-50">
        Continuar con Google
      </a>

      <p className="mt-5 text-center text-sm text-slate-500">
        No tienes cuenta? <Link to="/registro" className="text-sky-700 hover:underline">Registrate</Link>
      </p>
    </div>
  );
}
