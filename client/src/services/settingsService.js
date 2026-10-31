import api from './api';

export const settingsService = {
  getSettings: async () => {
    const res = await api.get('/settings');
    const data = res?.data || res;
    return {
      ...data,
      data,
    };
  },

  updateShopProfile: async (shopData) => {
    const res = await api.put('/settings/profile', shopData);
    return res?.shop || res?.data?.shop || res;
  },

  updateNotifications: async (config) => {
    const res = await api.put('/settings/notifications', config);
    return res?.settings || res?.data?.settings || res;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res?.data || res;
  },
};
