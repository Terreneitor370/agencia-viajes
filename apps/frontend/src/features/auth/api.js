/** Llamadas HTTP del modulo Identidad. DUENO: Isa (modulo A). */
import { api } from '../../core/api/client';

export const authApi = {
  // register() puede devolver { mfaRequired: true, challengeId }: la cuenta
  // ya existe, pero falta confirmar el correo antes de dar por completado el
  // registro. Mismo mecanismo que el segundo factor de login (ver abajo).
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  // La verificacion del codigo vive en useAuth().verifyOtp: ese wrapper carga
  // la sesion despues del 200, igual que hace login(). El reenvio no crea
  // sesion, por eso llama la API directo sin pasar por AuthProvider.
  resendOtp: (payload) => api.post('/auth/otp/resend', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (payload) => api.post('/auth/change-password', payload),
  // Misma llamada sirve para pedir el primer codigo Y para reenviarlo: la
  // respuesta es identica exista o no la cuenta, asi que no hay nada que
  // "recordar" de la primera llamada para poder reenviar.
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  // El flujo OAuth es una navegacion completa del navegador, no un fetch:
  // el intercambio del codigo ocurre en el backend.
  googleUrl: () => `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/google`,
};

/** Perfil propio. Distinto de /auth/me: ese trae solo lo que arma el menu, este trae el perfil completo editable. */
export const usersApi = {
  me: () => api.get('/users/me'),
  updateMe: (payload) => api.patch('/users/me', payload),
};
