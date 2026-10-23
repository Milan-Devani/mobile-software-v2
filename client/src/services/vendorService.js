import api from './api';

export const vendorService = {
  // 1. Vendors Master CRUD
  getVendors: async (params = {}) => {
    const res = await api.get('/vendors', { params });
    return res.data;
  },

  getVendorStats: async () => {
    const res = await api.get('/vendors/stats');
    return res.data;
  },

  getVendorById: async (id) => {
    const res = await api.get(`/vendors/${id}`);
    return res.data;
  },

  createVendor: async (data) => {
    const res = await api.post('/vendors', data);
    return res.data;
  },

  updateVendor: async (id, updates) => {
    const res = await api.put(`/vendors/${id}`, updates);
    return res.data;
  },

  deleteVendor: async (id) => {
    const res = await api.delete(`/vendors/${id}`);
    return res.data;
  },

  // 2. Transactions & Multi-Mobile Workflows
  getNextTxnNumber: async (type = 'SEND_TO_VENDOR') => {
    const res = await api.get('/vendors/next-number', { params: { type } });
    return res.data;
  },

  getPendingMobilesWithVendor: async (vendorId) => {
    const res = await api.get(`/vendors/${vendorId}/pending-mobiles`);
    return res.data;
  },

  sendMobilesToVendor: async (data) => {
    const res = await api.post('/vendors/transactions/send', data);
    return res.data;
  },

  receiveMobilesFromVendor: async (data) => {
    const res = await api.post('/vendors/transactions/receive', data);
    return res.data;
  },

  recordVendorJobInward: async (data) => {
    const res = await api.post('/vendors/transactions/vendor-job-inward', data);
    return res.data;
  },

  recordVendorJobReturn: async (data) => {
    const res = await api.post('/vendors/transactions/vendor-job-return', data);
    return res.data;
  },

  getVendorTransactions: async (params = {}) => {
    const res = await api.get('/vendors/transactions', { params });
    return res.data;
  },

  getTransactionById: async (id) => {
    const res = await api.get(`/vendors/transactions/${id}`);
    return res.data;
  },

  // 3. Mobiles & Status Tracking
  getVendorMobiles: async (params = {}) => {
    const res = await api.get('/vendors/mobiles', { params });
    return res.data;
  },

  getMobileById: async (id) => {
    const res = await api.get(`/vendors/mobiles/${id}`);
    return res.data;
  },

  updateMobileStatus: async (id, status, remarks = '') => {
    const res = await api.patch(`/vendors/mobiles/${id}/status`, { status, remarks });
    return res.data;
  },

  // 4. Ledger & Payments
  getVendorLedger: async (vendorId, params = {}) => {
    const res = await api.get(`/vendors/${vendorId}/ledger`, { params });
    return res.data;
  },

  recordVendorPayment: async (data) => {
    const res = await api.post('/vendors/payments', data);
    return res.data;
  },

  getVendorPayments: async (params = {}) => {
    const res = await api.get('/vendors/payments', { params });
    return res.data;
  },

  // 5. Reports
  getVendorReports: async (params = {}) => {
    const res = await api.get('/vendors/reports/summary', { params });
    return res.data;
  },
};
