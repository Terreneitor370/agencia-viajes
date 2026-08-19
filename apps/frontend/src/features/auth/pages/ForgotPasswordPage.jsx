/** DUENO: Isa (modulo A). */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import Tarjeta from '../../../components/ui/Tarjeta';
import CampoContrasena from '../components/CampoContrasena';
import ChecklistContrasena from '../components/ChecklistContrasena';
import { authApi } from '../api';
import { LONGITUD_MINIMA_CONTRASENA as LONGITUD_MINIMA, evaluarContrasena } from '../utils/contrasena';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmitEmail = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authApi.forgotPassword({ email });
      setEnviado(true);
    } catch (err) {
      // El backend nunca deberia rechazar esto por "correo no existe" (seria
      // enumeracion): si llega un error aqui es de validacion real (formato).
      setError(err.message || 'No fue posible procesar la solicitud');
    } finally {
      setBusy(false);
    }
  };

  if (enviado) {
    return (
      <PasoCodigoYContrasena
        email={email}
        onExito={() => navigate('/login', { replace: true, state: { contrasenaRestablecida: true } })}
        onVolver={() => setEnviado(false)}
      />
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Tarjeta comoElemento="form" onSubmit={onSubmitEmail} className="mx-auto w-full max-w-sm p-6">
        <h1 className="text-seccion text-tinta-900">Recupera tu cuenta</h1>
        <p className="mt-2 text-cuerpo text-tinta-500">
          Ingresa el correo de tu cuenta y te mandamos un codigo para elegir una contraseña nueva.
        </p>

        <div className="mt-5 space-y-4">
          <Campo
            etiqueta="Correo"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {error && (
            <p role="alert" className="rounded-md bg-criticoSuave px-3 py-2 text-menor text-critico">{error}</p>
          )}

          <Boton type="submit" variante="primario" anchoCompleto cargando={busy}>
            Enviar codigo
          </Boton>
        </div>

        <p className="mt-5 text-center text-cuerpo text-tinta-500">
          <Link to="/login" className="font-semibold text-azul-600 hover:underline">Volver a iniciar sesion</Link>
        </p>
      </Tarjeta>
    </div>
  );
}

/**
 * Codigo + contraseña nueva en un solo paso: a diferencia de PasoCodigoOtp
 * (login/registro), aqui no hay challengeId que guardar entre pantallas — el
 * correo mismo es lo que localiza el desafio en el servidor (ver
 * resetPassword en auth.service.js), asi que "reenviar" es solo volver a
 * pedir forgotPassword() con el mismo correo.
 */
function PasoCodigoYContrasena({ email, onExito, onVolver }) {
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [mensajeReenvio, setMensajeReenvio] = useState('');

  const contrasena = useMemo(() => evaluarContrasena(nuevaContrasena), [nuevaContrasena]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authApi.resetPassword({ email, code: codigo, newPassword: nuevaContrasena });
      onExito();
    } catch (err) {
      setError(err.message || 'No fue posible restablecer la contraseña');
    } finally {
      setBusy(false);
    }
  };

  const onReenviar = async () => {
    setReenviando(true);
    setError('');
    setMensajeReenvio('');
    try {
      await authApi.forgotPassword({ email });
      setCodigo('');
      setMensajeReenvio('Si el correo tiene cuenta, te mandamos un codigo nuevo.');
    } catch (err) {
      setError(err.message || 'No fue posible reenviar el codigo');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Tarjeta comoElemento="form" onSubmit={onSubmit} className="mx-auto w-full max-w-sm p-6">
        <h1 className="text-seccion text-tinta-900">Restablece tu contraseña</h1>
        <p className="mt-2 text-cuerpo text-tinta-500">
          Si <strong className="text-tinta-900">{email}</strong> tiene una cuenta, te llego un codigo de 6 digitos.
        </p>

        <div className="mt-5 space-y-4">
          <Campo
            etiqueta="Codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="[&_input]:text-center [&_input]:text-tarjeta [&_input]:tracking-[0.4em]"
            autoFocus
            required
          />

          <div>
            <CampoContrasena
              etiqueta="Contraseña nueva"
              name="newPassword"
              autoComplete="new-password"
              value={nuevaContrasena}
              onChange={(event) => setNuevaContrasena(event.target.value)}
              minLength={LONGITUD_MINIMA}
              maxLength={128}
              required
            />
            <ChecklistContrasena contrasena={contrasena} />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-criticoSuave px-3 py-2 text-menor text-critico">{error}</p>
          )}
          {mensajeReenvio && !error && (
            <p role="status" className="rounded-md bg-exitoSuave px-3 py-2 text-menor text-exito">{mensajeReenvio}</p>
          )}

          <Boton type="submit" variante="primario" anchoCompleto cargando={busy} disabled={codigo.length !== 6}>
            Restablecer contraseña
          </Boton>
        </div>

        <div className="mt-5 flex items-center justify-between text-menor">
          <button type="button" onClick={onVolver} className="font-semibold text-tinta-500 hover:text-tinta-700">
            Volver
          </button>
          <button
            type="button"
            onClick={onReenviar}
            disabled={reenviando}
            className="font-semibold text-azul-600 hover:underline disabled:opacity-50"
          >
            {reenviando ? 'Enviando...' : 'Reenviar codigo'}
          </button>
        </div>
      </Tarjeta>
    </div>
  );
}
