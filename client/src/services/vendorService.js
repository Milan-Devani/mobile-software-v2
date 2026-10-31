import api from './api';

/**
 * Normalizes vendor API responses so that all calling conventions work seamlessly:
 * 1. res.data (legacy / standard axios pattern) -> res.data.vendors, res.data.transactions, etc.
 * 2. direct properties -> res.vendors, res.total, res.mobiles, res.transactions, etc.
 * 3. status flags -> res.success, res.message
 */
const normalize = (res) => {
  if (res && typeof res === 'object') {
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
      return {
        ...res.data,
        ...res,
        data: res.data,
      };
    }
  }
  return res;
};

export const vendorService = {
  // 1. Vendors Master CRUD
  getVendors: async (params = {}) => {
    const res = await api.get('/vendors', { params });
    return normalize(res);
  },

  getVendorStats: async () => {
    const res = await api.get('/vendors/stats');
    return normalize(res);
  },

  getVendorById: async (id) => {
    const res = await api.get(`/vendors/${id}`);
    return normalize(res);
  },

  createVendor: async (data) => {
    const res = await api.post('/vendors', data);
    return normalize(res);
  },

  updateVendor: async (id, updates) => {
    const res = await api.put(`/vendors/${id}`, updates);
    return normalize(res);
  },

  deleteVendor: async (id) => {
    const res = await api.delete(`/vendors/${id}`);
    return normalize(res);
  },

  // 2. Transactions & Multi-Mobile Workflows
  getNextTxnNumber: async (type = 'SEND_TO_VENDOR') => {
    const res = await api.get('/vendors/next-number', { params: { type } });
    return normalize(res);
  },

  getPendingMobilesWithVendor: async (vendorId) => {
    const res = await api.get(`/vendors/${vendorId}/pending-mobiles`);
    return normalize(res);
  },

  sendMobilesToVendor: async (data) => {
    const res = await api.post('/vendors/transactions/send', data);
    return normalize(res);
  },

  receiveMobilesFromVendor: async (data) => {
    const res = await api.post('/vendors/transactions/receive', data);
    return normalize(res);
  },

  recordVendorJobInward: async (data) => {
    const res = await api.post('/vendors/transactions/vendor-job-inward', data);
    return normalize(res);
  },

  recordVendorJobReturn: async (data) => {
    const res = await api.post('/vendors/transactions/vendor-job-return', data);
    return normalize(res);
  },

  getVendorTransactions: async (params = {}) => {
    const res = await api.get('/vendors/transactions', { params });
    return normalize(res);
  },

  getTransactionById: async (id) => {
    const res = await api.get(`/vendors/transactions/${id}`);
    return normalize(res);
  },

  // 3. Mobiles & Status Tracking
  getVendorMobiles: async (params = {}) => {
    const res = await api.get('/vendors/mobiles', { params });
    return normalize(res);
  },

  getMobileById: async (id) => {
    const res = await api.get(`/vendors/mobiles/${id}`);
    return normalize(res);
  },

  updateMobileStatus: async (id, status, remarks = '') => {
    const res = await api.patch(`/vendors/mobiles/${id}/status`, { status, remarks });
    return normalize(res);
  },

  // 4. Ledger & Payments
  getVendorLedger: async (vendorId, params = {}) => {
    const res = await api.get(`/vendors/${vendorId}/ledger`, { params });
    return normalize(res);
  },

  recordVendorPayment: async (data) => {
    const res = await api.post('/vendors/payments', data);
    return normalize(res);
  },

  getVendorPayments: async (params = {}) => {
    const res = await api.get('/vendors/payments', { params });
    return normalize(res);
  },

  // 5. Reports
  getVendorReports: async (params = {}) => {
    const res = await api.get('/vendors/reports/summary', { params });
    return normalize(res);
  },
};
