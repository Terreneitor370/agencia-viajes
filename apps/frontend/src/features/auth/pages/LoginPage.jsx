/** DUENO: Isa (modulo A). */
import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import CampoContrasena from '../components/CampoContrasena';
import PasoCodigoOtp from '../components/PasoCodigoOtp';
import Tarjeta from '../../../components/ui/Tarjeta';
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
  correo_registrado: 'Ya existe una cuenta con este correo. Inicia sesion con tu contrasena.',
  fallo: 'No fue posible iniciar sesion con Google. Intenta de nuevo.',
};

/** Logotipo oficial de Google a 4 colores. Solo se usa aqui, por eso vive local. */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

export default function LoginPage() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(() => {
    const motivo = searchParams.get('oauth_error');
    return motivo ? (OAUTH_ERROR_MESSAGES[motivo] || OAUTH_ERROR_MESSAGES.fallo) : '';
  });
  const [busy, setBusy] = useState(false);
  const [ayudaContrasena, setAyudaContrasena] = useState(false);
  const [challengeId, setChallengeId] = useState(null);

  const irA = location.state?.from?.pathname || '/viajes';

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const resultado = await login(form);
      if (resultado?.mfaRequired) {
        setChallengeId(resultado.challengeId);
      } else {
        navigate(irA, { replace: true });
      }
    } catch (err) {
      // Se muestra el mensaje generico del backend. No detallamos si fallo el
      // correo o la contrasena: eso permitiria enumerar cuentas validas.
      setError(err.message || 'No fue posible iniciar sesion');
    } finally {
      setBusy(false);
    }
  };

  if (challengeId) {
    return (
      <PasoCodigoOtp
        challengeId={challengeId}
        correo={form.email}
        verifyOtp={verifyOtp}
        onExito={() => navigate(irA, { replace: true })}
        onVolver={() => setChallengeId(null)}
      />
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Tarjeta comoElemento="form" onSubmit={onSubmit} className="mx-auto w-full max-w-sm p-6">
        <h1 className="text-seccion text-tinta-900">Iniciar sesion</h1>

        <div className="mt-5 space-y-4">
          <Campo
            etiqueta="Correo"
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />

          <div>
            <CampoContrasena
              etiqueta="Contraseña"
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setAyudaContrasena((v) => !v)}
              className="mt-1.5 text-menor font-semibold text-azul-600 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
            {ayudaContrasena && (
              <p className="mt-1.5 text-menor text-tinta-500">
                Por ahora no hay recuperacion automatica por correo. Pide a un administrador que revise tu cuenta.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-criticoSuave px-3 py-2 text-menor text-critico">{error}</p>
          )}

          <Boton type="submit" variante="primario" anchoCompleto cargando={busy}>
            Iniciar sesion
          </Boton>
        </div>

        <div className="my-4 flex items-center gap-3 text-menor text-tinta-300">
          <span className="h-px flex-1 bg-borde" /> o <span className="h-px flex-1 bg-borde" />
        </div>

        <a
          href={authApi.googleUrl()}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-bordeInteractivo bg-superficie text-cuerpo font-semibold text-tinta-900 transition-colors hover:bg-lienzo"
        >
          <LogoGoogle />
          Continuar con Google
        </a>

        <p className="mt-5 text-center text-cuerpo text-tinta-500">
          ¿No tienes cuenta? <Link to="/registro" className="font-semibold text-azul-600 hover:underline">Registrate</Link>
        </p>
      </Tarjeta>
    </div>
  );
}
