import { api, qs } from '../../core/api/client';

export const flightsApi = {
  search: (params, signal) => {
    const url = `/flights/search${qs(params)}`;
    console.log('flightsApi.search URL:', url);
    return api.get(url, { signal });
  },
};