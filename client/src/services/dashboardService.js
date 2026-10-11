import api from './api';

export const dashboardService = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
};

export const settingsService = {
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },

  updateShopProfile: async (shopData) => {
    const res = await api.put('/settings/profile', shopData);
    return res.data.shop;
  },

  updateNotifications: async (config) => {
    const res = await api.put('/settings/notifications', config);
    return res.data.settings;
  },
};

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
