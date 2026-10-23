import api from './api';

export const salesService = {
  getSales: async (params = {}) => {
    const res = await api.get('/sales', { params });
    return res;
  },

  getNextInvoiceNumber: async () => {
    const res = await api.get('/sales/next-number');
    return res;
  },

  getSaleById: async (id) => {
    const res = await api.get(`/sales/${id}`);
    return res;
  },

  createSale: async (saleData) => {
    const res = await api.post('/sales', saleData);
    return res;
  },

  deleteSale: async (id) => {
    const res = await api.delete(`/sales/${id}`);
    return res;
  },

  bulkDeleteSales: async (ids) => {
    const res = await api.post('/sales/bulk-delete', { ids });
    return res;
  },

  downloadSalePdf: async (id, invoiceNumber) => {
    const response = await api.get(`/sales/${id}/download-pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_${invoiceNumber || id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  sendSaleInvoice: async (id) => {
    const res = await api.post(`/sales/${id}/send-invoice`);
    return res;
  },
};

