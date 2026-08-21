/**
 * Cliente HTTP unico del frontend. DUENO: core (compartido).
 *
 * Decisiones de seguridad:
 *  1. `credentials: 'include'` -> la sesion viaja en cookies httpOnly. En este
 *     proyecto NO se guarda ningun token en localStorage: cualquier XSS lo
 *     leeria en una linea.
 *  2. Renovacion automatica y unica: si llega un 401 por token expirado, se
 *     llama a /auth/refresh UNA sola vez (promesa compartida) y se reintenta.
 *     Sin esa promesa compartida, 6 peticiones en paralelo disparan 6 refresh
 *     y la rotacion con deteccion de reuso cierra la sesion del usuario.
 *  3. Nunca se construye HTML con las respuestas: React escapa por defecto y
 *     en este proyecto `dangerouslySetInnerHTML` esta prohibido.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshPromise = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// AuthProvider se suscribe a esto para enterarse cuando CUALQUIER llamada
// descubre que la sesion ya no es valida (ni el refresh la salvo) -- sin
// esto, isAuthenticated podia quedar "creyendo" que habia sesion mucho
// despues de que el backend ya la habia cerrado (ej. si la rotacion del
// refresh token detecto reuso en dos pestañas, o goteo del cookie): la nav
// seguia mostrando el perfil, ProtectedRoute seguia mostrando la pantalla
// protegida, y cada llamada de esa pantalla fallaba por separado con su
// propio "Se requiere iniciar sesion" en vez de mandar a login.
const sessionExpiredListeners = new Set();

export function onSessionExpired(callback) {
  sessionExpiredListeners.add(callback);
  return () => sessionExpiredListeners.delete(callback);
}

function notifySessionExpired() {
  sessionExpiredListeners.forEach((callback) => callback());
}

async function request(path, { method = 'GET', body, signal, retry = true } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401 && retry) {
    const payload = await res.clone().json().catch(() => ({}));
    if (payload?.error?.code === 'TOKEN_EXPIRED' && (await refreshSession())) {
      return request(path, { method, body, signal, retry: false });
    }
  }

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) notifySessionExpired();
    const err = payload.error || {};
    // err.message del backend suele ser generico ("Datos de entrada invalidos"):
    // si Zod mando el detalle de que campo/por que, ese es mas util para mostrar.
    const mensaje = err.details?.[0]?.message || err.message || 'Error en la solicitud';
    throw new ApiError(res.status, err.code || 'UNKNOWN', mensaje, err.details);
  }
  return payload;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

/** Construye un querystring descartando valores vacios. */
export const qs = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
};
