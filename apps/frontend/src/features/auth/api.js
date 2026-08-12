/** Llamadas HTTP del modulo Identidad. DUENO: Isa (modulo A). */
import { api } from '../../core/api/client';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (payload) => api.post('/auth/change-password', payload),
  // El flujo OAuth es una navegacion completa del navegador, no un fetch:
  // el intercambio del codigo ocurre en el backend.
  googleUrl: () => `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/google`,
};

/** Perfil propio. Distinto de /auth/me: ese trae solo lo que arma el menu, este trae el perfil completo editable. */
export const usersApi = {
  me: () => api.get('/users/me'),
  updateMe: (payload) => api.patch('/users/me', payload),
};
