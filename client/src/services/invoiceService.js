import api from './api';

export const invoiceService = {
  getJobInvoice: async (jobId) => {
    const res = await api.get(`/invoices/job/${jobId}`);
    return res.data;
  },

  generateInvoice: async (jobId, options = {}) => {
    const res = await api.post(`/invoices/job/${jobId}/generate`, options);
    return res.data;
  },

  resendInvoice: async (jobId, channels = ['EMAIL', 'WHATSAPP', 'SMS']) => {
    const res = await api.post(`/invoices/job/${jobId}/resend`, { channels });
    return res.data;
  },
};
