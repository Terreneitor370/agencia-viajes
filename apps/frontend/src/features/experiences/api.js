import { api, qs } from '../../core/api/client';

export const experiencesApi = {
  search: (params, signal) => api.get(`/experiences/search${qs(params)}`, { signal }),
};
