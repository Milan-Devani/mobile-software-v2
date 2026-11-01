import api from './api';

export const recycleBinService = {
  getItems: async (params = {}) => {
    const res = await api.get('/recycle-bin', { params });
    return res.data;
  },

  restoreItem: async (id) => {
    const res = await api.post(`/recycle-bin/${id}/restore`);
    return res.data;
  },

  bulkRestore: async (ids = []) => {
    const res = await api.post('/recycle-bin/bulk-restore', { ids });
    return res.data;
  },

  permanentlyDelete: async (id) => {
    const res = await api.delete(`/recycle-bin/${id}`);
    return res.data;
  },

  bulkPermanentlyDelete: async (ids = []) => {
    const res = await api.post('/recycle-bin/bulk-delete', { ids });
    return res.data;
  },

  emptyRecycleBin: async (type = 'ALL') => {
    const res = await api.post('/recycle-bin/empty', { type });
    return res.data;
  },
};

