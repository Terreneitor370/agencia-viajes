/**
 * DUENO: Isa (modulo A).
 * Paso de codigo de 6 digitos compartido por LoginPage (segundo factor) y
 * RegisterPage (verificar el correo recien registrado): el backend expone un
 * unico par de endpoints /auth/otp/verify y /auth/otp/resend para los dos.
 */
import { useState } from 'react';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import Tarjeta from '../../../components/ui/Tarjeta';
import { authApi } from '../api';

export default function PasoCodigoOtp({
  challengeId: challengeIdInicial,
  correo,
  verifyOtp,
  onExito,
  onVolver,
  titulo = 'Verifica tu acceso',
  descripcion = 'Te enviamos un codigo de 6 digitos a',
}) {
  const [challengeId, setChallengeId] = useState(challengeIdInicial);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [mensajeReenvio, setMensajeReenvio] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await verifyOtp(challengeId, codigo);
      onExito();
    } catch (err) {
      setError(err.message || 'No fue posible verificar el codigo');
    } finally {
      setBusy(false);
    }
  };

  const onReenviar = async () => {
    setReenviando(true);
    setError('');
    setMensajeReenvio('');
    try {
      const { data } = await authApi.resendOtp({ challengeId });
      setChallengeId(data.challengeId);
      setCodigo('');
      setMensajeReenvio('Te mandamos un codigo nuevo.');
    } catch (err) {
      setError(err.message || 'No fue posible reenviar el codigo');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Tarjeta comoElemento="form" onSubmit={onSubmit} className="mx-auto w-full max-w-sm p-6">
        <h1 className="text-seccion text-tinta-900">{titulo}</h1>
        <p className="mt-2 text-cuerpo text-tinta-500">
          {descripcion} <strong className="text-tinta-900">{correo}</strong>.
        </p>

        <div className="mt-5 space-y-4">
          <Campo
            etiqueta="Codigo de acceso"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="[&_input]:text-center [&_input]:text-tarjeta [&_input]:tracking-[0.4em]"
            autoFocus
            required
          />

          {error && (
            <p role="alert" className="rounded-md bg-criticoSuave px-3 py-2 text-menor text-critico">{error}</p>
          )}
          {mensajeReenvio && !error && (
            <p role="status" className="rounded-md bg-exitoSuave px-3 py-2 text-menor text-exito">{mensajeReenvio}</p>
          )}

          <Boton type="submit" variante="primario" anchoCompleto cargando={busy} disabled={codigo.length !== 6}>
            Verificar
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
