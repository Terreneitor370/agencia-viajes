import { api, qs } from '../../core/api/client';

export const adminApi = {
  users: (params = {}) => api.get(`/admin/users${qs(params)}`),
  setRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  audit: (params = {}) => api.get(`/admin/audit${qs(params)}`),
  purgeCache: () => api.post('/admin/cache/purge'),
};
