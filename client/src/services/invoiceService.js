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

  resendInvoice: async (jobId, options = ['EMAIL', 'WHATSAPP', 'SMS']) => {
    let payload = {};
    if (Array.isArray(options)) {
      payload = { channels: options };
    } else if (typeof options === 'object' && options !== null) {
      payload = options;
    }
    const res = await api.post(`/invoices/job/${jobId}/resend`, payload);
    return res.data;
  },
};
