import { api, qs } from '../../core/api/client';

export const paymentsApi = {
  createCheckout: (payload) => api.post('/payments/checkout', payload),
  getOrder: (id) => api.get(`/payments/orders/${id}`),
  orderBySession: (sessionId) => api.get(`/payments/orders${qs({ session_id: sessionId })}`),
};
