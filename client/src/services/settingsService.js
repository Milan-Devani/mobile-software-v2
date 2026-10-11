import api from './api';

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
