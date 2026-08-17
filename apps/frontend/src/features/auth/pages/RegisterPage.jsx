/** DUENO: Isa (modulo A). */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import Tarjeta from '../../../components/ui/Tarjeta';
import CampoContrasena from '../components/CampoContrasena';
import ChecklistContrasena from '../components/ChecklistContrasena';
import PasoCodigoOtp from '../components/PasoCodigoOtp';
import { ApiError } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/useAuth';
import { authApi } from '../api';
import { LONGITUD_MINIMA_CONTRASENA as LONGITUD_MINIMA, evaluarContrasena } from '../utils/contrasena';
import { esNombreValido } from '../utils/validacion';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [busy, setBusy] = useState(false);
  const [challengeId, setChallengeId] = useState(null);

  const contrasena = useMemo(() => evaluarContrasena(form.password), [form.password]);
  const nombreValido = esNombreValido(form.name);

  const editarCampo = (campo) => (event) => {
    const { value } = event.target;
    setForm((f) => ({ ...f, [campo]: value }));
    setErroresCampo((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setErrorGeneral('');
    setErroresCampo({});
    setBusy(true);
    try {
      const { data } = await authApi.register(form);
      setChallengeId(data.challengeId);
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setErroresCampo(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      } else {
        // Mismo criterio que el login: mensaje generico del backend, tal cual.
        setErrorGeneral(err.message || 'No fue posible crear la cuenta');
      }
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
        onExito={() => navigate('/viajes', { replace: true })}
        onVolver={() => setChallengeId(null)}
        titulo="Verifica tu correo"
        descripcion="Para terminar de crear tu cuenta, ingresa el codigo que enviamos a"
      />
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Tarjeta comoElemento="form" onSubmit={onSubmit} className="mx-auto w-full max-w-sm p-6">
        <h1 className="text-seccion text-tinta-900">Crear cuenta</h1>

        <div className="mt-5 space-y-4">
          <Campo
            etiqueta="Nombre"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={editarCampo('name')}
            error={erroresCampo.name || (!nombreValido ? 'Solo letras y espacios, sin numeros ni simbolos' : undefined)}
            minLength={2}
            maxLength={80}
            required
          />

          <Campo
            etiqueta="Correo"
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={editarCampo('email')}
            error={erroresCampo.email}
            maxLength={160}
            required
          />

          <div>
            <CampoContrasena
              etiqueta="Contraseña"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={editarCampo('password')}
              error={erroresCampo.password}
              minLength={LONGITUD_MINIMA}
              maxLength={128}
              required
            />
            <ChecklistContrasena contrasena={contrasena} />
          </div>

          {errorGeneral && (
            <p role="alert" className="rounded-md bg-criticoSuave px-3 py-2 text-menor text-critico">
              {errorGeneral}
            </p>
          )}

          <Boton type="submit" variante="primario" anchoCompleto cargando={busy}>
            Crear cuenta
          </Boton>
        </div>

        <p className="mt-5 text-center text-cuerpo text-tinta-500">
          ¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-azul-600 hover:underline">Inicia sesion</Link>
        </p>
      </Tarjeta>
    </div>
  );
}
