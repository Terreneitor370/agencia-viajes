import { api, qs } from '../../core/api/client';

export const tripsApi = {
  list: (params = {}) => api.get(`/trips${qs(params)}`),
  create: (payload) => api.post('/trips', payload),
  detail: (id) => api.get(`/trips/${id}`),
  update: (id, patch) => api.patch(`/trips/${id}`, patch),
  budget: (id) => api.get(`/trips/${id}/budget`),
  setTravelers: (id, travelers) => api.patch(`/trips/${id}/travelers`, { travelers }),
  addItem: (id, item) => api.post(`/trips/${id}/items`, item),
  removeItem: (id, itemId) => api.del(`/trips/${id}/items/${itemId}`),
  remove: (id) => api.del(`/trips/${id}`),
};
