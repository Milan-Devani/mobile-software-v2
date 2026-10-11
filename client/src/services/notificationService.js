import api from './api';

export const notificationService = {
  getLogs: async (params = {}) => {
    const res = await api.get('/notifications/logs', { params });
    return res.data.logs;
  },

  resend: async (data) => {
    const res = await api.post('/notifications/resend', data);
    return res.data;
  },
};
