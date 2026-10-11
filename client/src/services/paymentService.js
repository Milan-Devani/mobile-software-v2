import api from './api';

export const paymentService = {
  recordPayment: async (paymentData) => {
    const res = await api.post('/payments', paymentData);
    return res.data;
  },

  getJobPayments: async (jobId) => {
    const res = await api.get(`/payments/job/${jobId}`);
    return res.data.payments;
  },
};
