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

  saveBackupKeys: async (payload) => {
    const res = await api.post('/backups/keys', payload);
    return res.data || res;
  },

  restoreBackup: async (payload) => {
    const res = await api.post('/backups/restore', payload);
    return res.data || res;
  },

  restoreFromUpload: async (file, confirmationPhrase = 'RESTORE_CONFIRMED', onUploadProgress, decryptionKey = '') => {
    const formData = new FormData();
    formData.append('backup_file', file);
    formData.append('confirmation_phrase', confirmationPhrase);
    if (decryptionKey) {
      formData.append('decryption_key', decryptionKey);
    }

    const res = await api.post('/backups/restore-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
      timeout: 300000, // 5 minutes timeout for large restore operations
    });
    return res.data || res;
  },

  downloadBackup: async (filename) => {
    const data = await api.get(`/backups/download/${filename}`, {
      responseType: 'blob',
    });
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getGoogleAuthUrl: async (account = 1) => {
    const res = await api.get('/backups/auth/google/url', { params: { account } });
    return res.data || res;
  },

  exchangeGoogleAuthCode: async (code, account = 1) => {
    const res = await api.post('/backups/auth/google/exchange', { code, account });
    return res.data || res;
  },

  wipeAllData: async ({ confirmationPhrase = 'WIPE_ALL_DATA', takeSafetyBackup = true } = {}) => {
    const res = await api.post('/backups/wipe', {
      confirmation_phrase: confirmationPhrase,
      take_safety_backup: takeSafetyBackup,
    });
    return res.data || res;
  },

  deleteBackup: async (id) => {
    const res = await api.delete(`/backups/${id}`);
    return res.data || res;
  },

  bulkDeleteBackups: async (ids) => {
    const res = await api.delete('/backups/bulk', { data: { ids } });
    return res.data || res;
  },

  cancelRunningJob: async () => {
    const res = await api.post('/backups/cancel-job');
    return res.data || res;
  },
};

