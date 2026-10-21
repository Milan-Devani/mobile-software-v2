import api from './api';

export const jobService = {
  getJobs: async (params = {}) => {
    const res = await api.get('/jobs', { params });
    return res.data;
  },

  getJobById: async (id) => {
    const res = await api.get(`/jobs/${id}`);
    return res.data.job;
  },

  createJob: async (jobData) => {
    const res = await api.post('/jobs', jobData);
    return res.data.job;
  },

  updateJob: async (id, updates) => {
    const res = await api.put(`/jobs/${id}`, updates);
    return res.data.job;
  },

  startDiagnosis: async (id) => {
    const res = await api.post(`/jobs/${id}/start-diagnosis`);
    return res.data.job;
  },

  saveDiagnosis: async (id, diagnosisData) => {
    const res = await api.post(`/jobs/${id}/diagnosis`, diagnosisData);
    return res.data;
  },

  saveEstimate: async (id, estimateData) => {
    const res = await api.post(`/jobs/${id}/estimate`, estimateData);
    return res.data;
  },

  // Public customer approval endpoints
  getPublicApproval: async (tokenOrJobNumber) => {
    const res = await api.get(`/jobs/public/approval/${tokenOrJobNumber}`);
    return res.data;
  },

  submitPublicApproval: async (tokenOrJobNumber, decision, reason) => {
    const res = await api.post(`/jobs/public/approval/${tokenOrJobNumber}`, { decision, reason });
    return res.data;
  },

  startRepair: async (id) => {
    const res = await api.post(`/jobs/${id}/start-repair`);
    return res.data.job;
  },

  completeRepair: async (id) => {
    const res = await api.post(`/jobs/${id}/complete-repair`);
    return res.data.job;
  },

  saveTests: async (id, tests) => {
    const res = await api.post(`/jobs/${id}/testing`, { tests });
    return res.data;
  },

  markReadyForPickup: async (id) => {
    const res = await api.post(`/jobs/${id}/ready-for-pickup`);
    return res.data.job;
  },

  recordPickup: async (id, pickupData) => {
    const res = await api.post(`/jobs/${id}/pickup`, pickupData);
    return res.data.job;
  },

  cancelJob: async (id, reason) => {
    const res = await api.post(`/jobs/${id}/cancel`, { reason });
    return res.data.job;
  },

  reopenJob: async (id, data = {}) => {
    const res = await api.post(`/jobs/${id}/reopen`, data);
    return res.data;
  },

  authorizeWarrantyRework: async (id, data = {}) => {
    const res = await api.post(`/jobs/${id}/warranty-authorize`, data);
    return res.data;
  },

  updateJobStatus: async (id, data = {}) => {
    const res = await api.post(`/jobs/${id}/status`, data);
    return res.data;
  },

  deleteJob: async (id) => {
    const res = await api.delete(`/jobs/${id}`);
    return res.data;
  },

  bulkDeleteJobs: async (ids) => {
    const res = await api.post('/jobs/bulk-delete', { ids });
    return res.data;
  },

  bulkUpdateStatus: async (ids, status, notes = '') => {
    const res = await api.post('/jobs/bulk-status', { ids, status, notes });
    return res.data;
  },

  applyDiscount: async (id, { discount_type = 'AMOUNT', discount_value = 0, notes = '' }) => {
    const res = await api.post(`/jobs/${id}/discount`, { discount_type, discount_value, notes });
    return res.data;
  },

  uploadFile: async (formData) => {
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
