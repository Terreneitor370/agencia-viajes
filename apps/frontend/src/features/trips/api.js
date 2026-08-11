import { api, qs } from '../../core/api/client';

export const tripsApi = {
  list: (params = {}) => api.get(`/trips${qs(params)}`),
  create: (payload) => api.post('/trips', payload),
  detail: (id) => api.get(`/trips/${id}`),
  budget: (id) => api.get(`/trips/${id}/budget`),
  setTravelers: (id, travelers) => api.patch(`/trips/${id}/travelers`, { travelers }),
  addItem: (id, item) => api.post(`/trips/${id}/items`, item),
  remove: (id) => api.del(`/trips/${id}`),
};
