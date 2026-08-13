import { api, qs } from '../../core/api/client';

export const flightsApi = {
  search: (params, signal) => api.get(`/flights/search${qs(params)}`, { signal }),
  airports: (signal) => api.get('/flights/airports', { signal }),
};
