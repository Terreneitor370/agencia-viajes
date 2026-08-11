/** Llamadas HTTP del modulo Identidad. DUENO: integrante A. */
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
