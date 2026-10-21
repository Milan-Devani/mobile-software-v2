import api from './api';

export const paymentService = {
  getPayments: async (params = {}) => {
    const res = await api.get('/payments', { params });
    const payload = res.data || res;
    return {
      payments: payload?.payments || [],
      total: payload?.total ?? (payload?.payments?.length || 0),
      stats: payload?.stats || { totalAmount: 0, cashTotal: 0, cardTotal: 0, upiTotal: 0 },
    };
  },

  recordPayment: async (paymentData) => {
    const res = await api.post('/payments', paymentData);
    return res.data;
  },

  getJobPayments: async (jobId) => {
    const res = await api.get(`/payments/job/${jobId}`);
    return res.data.payments;
  },

  deletePayment: async (id) => {
    const res = await api.delete(`/payments/${id}`);
    return res.data;
  },

  bulkDeletePayments: async (ids) => {
    const res = await api.post('/payments/bulk-delete', { ids });
    return res.data;
  },
};
