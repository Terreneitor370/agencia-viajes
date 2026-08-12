/** DUENO: Isa (modulo A). */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Boton from '../../../components/ui/Boton';
import Campo from '../../../components/ui/Campo';
import Tarjeta from '../../../components/ui/Tarjeta';
import { useAuth } from '../../../core/auth/useAuth';
import { authApi, usersApi } from '../api';
import { LONGITUD_MINIMA_CONTRASENA, evaluarContrasena } from '../utils/contrasena';

const MONEDAS = ['MXN', 'USD', 'EUR'];
const ROLES_LEGIBLES = { admin: 'Administrador', traveler: 'Viajero' };

export default function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState({ name: '', homeCity: '', preferredCurrency: 'MXN' });
  const [guardando, setGuardando] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState('');
  const [errorPerfil, setErrorPerfil] = useState('');

  useEffect(() => {
    let cancelado = false;
    usersApi.me()
      .then(({ data }) => {
        if (cancelado) return;
        setPerfil(data);
        setForm({
          name: data.name || '',
          homeCity: data.home_city || '',
          preferredCurrency: data.preferred_currency || 'MXN',
        });
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, []);

  const editarCampo = (campo) => (event) => setForm((f) => ({ ...f, [campo]: event.target.value }));

  const onSubmitPerfil = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setErrorPerfil('');
    setMensajePerfil('');
    try {
      const { data } = await usersApi.updateMe(form);
      setPerfil(data);
      setMensajePerfil('Tus datos se guardaron.');
    } catch (err) {
      setErrorPerfil(err.message || 'No fue posible guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '' });
  const [cambiandoPass, setCambiandoPass] = useState(false);
  const [errorPass, setErrorPass] = useState('');
  const nuevaContrasena = evaluarContrasena(passForm.newPassword);

  const onSubmitPassword = async (event) => {
    event.preventDefault();
    setCambiandoPass(true);
    setErrorPass('');
    try {
      await authApi.changePassword(passForm);
      // Cambiar la contrasena invalida todas las sesiones activas, la propia
      // incluida: el backend ya limpio las cookies, aqui solo se sincroniza
      // el estado local y se manda a iniciar sesion de nuevo.
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setErrorPass(err.message || 'No fue posible cambiar la contrasena');
    } finally {
      setCambiandoPass(false);
    }
  };

  if (cargando) {
    return <p className="text-center text-cuerpo text-tinta-500">Cargando...</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Tarjeta comoElemento="form" onSubmit={onSubmitPerfil} className="p-6">
        <h1 className="text-seccion text-tinta-900">Mi perfil</h1>
        <p className="mt-1 text-menor text-tinta-500">
          {perfil?.email} · {ROLES_LEGIBLES[perfil?.role] || perfil?.role}
        </p>

        <div className="mt-5 space-y-4">
          <Campo
            etiqueta="Nombre"
            value={form.name}
            onChange={editarCampo('name')}
            minLength={2}
            maxLength={80}
            required
          />
          <Campo
            etiqueta="Ciudad de origen"
            value={form.homeCity}
            onChange={editarCampo('homeCity')}
            maxLength={80}
          />
          <div>
            <label htmlFor="preferredCurrency" className="mb-1 block text-menor font-semibold text-tinta-700">
              Moneda preferida
            </label>
            <select
              id="preferredCurrency"
              value={form.preferredCurrency}
              onChange={editarCampo('preferredCurrency')}
              className="h-11 w-full rounded-md border border-bordeInteractivo bg-superficie px-3 text-cuerpo text-tinta-900 focus:border-azul-600 focus:outline-none"
            >
              {MONEDAS.map((moneda) => <option key={moneda} value={moneda}>{moneda}</option>)}
            </select>
          </div>

          {errorPerfil && (
            <p role="alert" className="rounded-md bg-criticoSuave px-3 py-2 text-menor text-critico">{errorPerfil}</p>
          )}
          {mensajePerfil && (
            <p role="status" className="rounded-md bg-exitoSuave px-3 py-2 text-menor text-exito">{mensajePerfil}</p>
          )}

          <Boton type="submit" variante="primario" cargando={guardando}>Guardar cambios</Boton>
        </div>
      </Tarjeta>

      <Tarjeta comoElemento="form" onSubmit={onSubmitPassword} className="p-6">
        <h2 className="text-tarjeta text-tinta-900">Cambiar contrasena</h2>
        <p className="mt-1 text-menor text-tinta-500">Al terminar, cerramos tu sesion en todos tus dispositivos.</p>

        <div className="mt-4 space-y-4">
          <Campo
            etiqueta="Contrasena actual"
            type="password"
            autoComplete="current-password"
            value={passForm.currentPassword}
            onChange={(event) => setPassForm((f) => ({ ...f, currentPassword: event.target.value }))}
            required
          />
          <Campo
            etiqueta="Contrasena nueva"
            ayuda={`minimo ${LONGITUD_MINIMA_CONTRASENA} caracteres`}
            type="password"
            autoComplete="new-password"
            value={passForm.newPassword}
            onChange={(event) => setPassForm((f) => ({ ...f, newPassword: event.target.value }))}
            error={nuevaContrasena.comun ? 'Es una contrasena muy comun, elige otra' : undefined}
            contador={`${nuevaContrasena.longitud} de ${LONGITUD_MINIMA_CONTRASENA}${nuevaContrasena.cumple ? ' ✓' : ''}`}
            minLength={LONGITUD_MINIMA_CONTRASENA}
            maxLength={128}
            required
          />

          {errorPass && (
            <p role="alert" className="rounded-md bg-criticoSuave px-3 py-2 text-menor text-critico">{errorPass}</p>
          )}

          <Boton type="submit" variante="secundario" cargando={cambiandoPass}>Cambiar contrasena</Boton>
        </div>
      </Tarjeta>
    </div>
  );
}
