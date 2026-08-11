import { api, qs } from '../../core/api/client';

export const staysApi = {
  search: (params, signal) => api.get(`/stays/search${qs(params)}`, { signal }),
};
