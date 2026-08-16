/** API de cotizaciones de invitado. DUENO: Kassie (modulo B). */
import { api } from '../../core/api/client';

const GUEST_TOKEN_KEY = 'guest_quote_token';

/**
 * Token de cotizacion de invitado. Se guarda en localStorage a proposito: NO
 * es una credencial de sesion (esa vive en cookies httpOnly), sino la llave
 * de un grupo de cotizaciones anonimas, equivalente a una lista por link.
 */
export function guestToken() {
  // eslint-disable-next-line no-restricted-syntax -- no es un token de sesion, es la llave de cotizaciones de invitado.
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    // eslint-disable-next-line no-restricted-syntax -- no es un token de sesion, es la llave de cotizaciones de invitado.
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

export const quotesApi = {
  create: (item) => api.post('/quotes', { token: guestToken(), item }),
  list: () => api.get(`/quotes?token=${guestToken()}`),
  remove: (id) => api.del(`/quotes/${id}?token=${guestToken()}`),
};
