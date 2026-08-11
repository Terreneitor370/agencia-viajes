import { api } from '../../core/api/client';

export const budgetApi = {
  simulate: (payload) => api.post('/budget/simulate', payload),
};
