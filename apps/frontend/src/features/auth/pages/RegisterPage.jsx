/** DUENO: Isa (modulo A). */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import Tarjeta from '../../../components/ui/Tarjeta';
import { ApiError } from '../../../core/api/client';
import { authApi } from '../api';
import { LONGITUD_MINIMA_CONTRASENA as LONGITUD_MINIMA, evaluarContrasena } from '../utils/contrasena';
import { esNombreValido } from '../utils/validacion';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [busy, setBusy] = useState(false);
  const [creada, setCreada] = useState(false);

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
      await authApi.register(form);
      setCreada(true);
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

  if (creada) {
    return (
      <Tarjeta className="mx-auto max-w-sm p-6 text-center">
        <p className="text-[28px] text-exito" aria-hidden="true">✓</p>
        <h1 className="mt-1 text-seccion text-tinta-900">Cuenta creada</h1>
        <p className="mt-2 text-cuerpo text-tinta-500">
          Ya puedes iniciar sesion con {form.email}.
        </p>
        <Boton type="button" variante="primario" anchoCompleto className="mt-5" onClick={() => navigate('/login')}>
          Iniciar sesion
        </Boton>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta comoElemento="form" onSubmit={onSubmit} className="mx-auto max-w-sm p-6">
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
          <Campo
            etiqueta="Contrasena"
            ayuda={`minimo ${LONGITUD_MINIMA} caracteres`}
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={editarCampo('password')}
            error={erroresCampo.password || (contrasena.comun ? 'Es una contrasena muy comun, elige otra' : undefined)}
            contador={`${contrasena.longitud} de ${LONGITUD_MINIMA}${contrasena.cumple ? ' ✓' : ''}`}
            minLength={LONGITUD_MINIMA}
            maxLength={128}
            required
          />
          {/* Progreso hacia el minimo, no un puntaje de "fuerza": el backend no calcula entropia, solo longitud y lista de comunes. */}
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lienzo" aria-hidden="true">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                contrasena.comun ? 'bg-critico' : contrasena.cumple ? 'bg-exito' : 'bg-ambar-400'
              }`}
              style={{ width: `${Math.min(100, (contrasena.longitud / LONGITUD_MINIMA) * 100)}%` }}
            />
          </div>
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
        Ya tienes cuenta? <Link to="/login" className="font-semibold text-azul-600 hover:underline">Inicia sesion</Link>
      </p>
    </Tarjeta>
  );
}
