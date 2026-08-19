import { api, qs } from '../../core/api/client';

export const paymentsApi = {
  createCheckout: (payload) => api.post('/payments/checkout', payload),
  getOrder: (id) => api.get(`/payments/orders/${id}`),
  listOrders: (params = {}) => api.get(`/payments/orders${qs(params)}`),
};
