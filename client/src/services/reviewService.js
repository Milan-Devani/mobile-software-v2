import api from './api';

export const reviewService = {
  // Admin APIs
  getSettings: async () => {
    const res = await api.get('/reviews/settings');
    return res.data;
  },

  updateSettings: async (settingsData) => {
    const res = await api.put('/reviews/settings', settingsData);
    return res.data;
  },

  getDashboard: async () => {
    const res = await api.get('/reviews/dashboard');
    return res.data;
  },

  getRequests: async (params = {}) => {
    const res = await api.get('/reviews/requests', { params });
    return res.data;
  },

  retryRequest: async (id) => {
    const res = await api.post(`/reviews/requests/${id}/retry`);
    return res;
  },

  revokeRequest: async (id) => {
    const res = await api.post(`/reviews/requests/${id}/revoke`);
    return res;
  },

  // Public Customer APIs
  getPublicPage: async (token) => {
    const res = await api.get(`/public/reviews/${token}`);
    return res.data;
  },

  generateAiReview: async (token, { rating, customerFeedback }) => {
    const res = await api.post(`/public/reviews/${token}/generate`, { rating, customerFeedback });
    return res.data;
  },

  submitFeedback: async (token, { rating, customerFeedback, editedReview }) => {
    const res = await api.post(`/public/reviews/${token}/feedback`, {
      rating,
      customerFeedback,
      editedReview,
    });
    return res.data;
  },

  continueToGoogle: async (token, { rating, editedReview }) => {
    const res = await api.post(`/public/reviews/${token}/continue`, {
      rating,
      editedReview,
    });
    return res.data;
  },
};
