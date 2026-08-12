/** DUENO: Kassie (modulo B). */
import { api, qs } from '../../core/api/client';

export const flightsApi = {
  search: (params, signal) => api.get(`/flights/search${qs(params)}`, { signal }),
};
