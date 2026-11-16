import api from './api';

export const recycleBinService = {
  getItems: async (params = {}) => {
    const res = await api.get('/recycle-bin', { params });
    return res;
  },

  restoreItem: async (id) => {
    const res = await api.post(`/recycle-bin/${id}/restore`);
    return res;
  },

  bulkRestore: async (ids = []) => {
    const res = await api.post('/recycle-bin/bulk-restore', { ids });
    return res;
  },

  permanentlyDelete: async (id) => {
    const res = await api.delete(`/recycle-bin/${id}`);
    return res;
  },

  bulkPermanentlyDelete: async (ids = []) => {
    const res = await api.post('/recycle-bin/bulk-delete', { ids });
    return res;
  },

  emptyRecycleBin: async (type = 'ALL') => {
    const res = await api.post('/recycle-bin/empty', { type });
    return res;
  },
};
