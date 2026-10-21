import api from './api';

export const backupService = {
  triggerBackup: async () => {
    const res = await api.post('/backups');
    return res.data || res;
  },

  getBackupHistory: async ({ limit = 20, offset = 0 } = {}) => {
    const res = await api.get('/backups', { params: { limit, offset } });
    return res.data || res;
  },

  getBackupStatus: async () => {
    const res = await api.get('/backups/status');
    return res.data || res;
  },

  restoreBackup: async (payload) => {
    const res = await api.post('/backups/restore', payload);
    return res.data || res;
  },
};

