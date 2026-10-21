import api from './api';

export const partsService = {
  getParts: async (params = {}) => {
    const res = await api.get('/parts', { params });
    if (res.data && res.data.parts) {
      const partsArr = res.data.parts;
      partsArr.total = res.data.total ?? partsArr.length;
      partsArr.parts = partsArr;
      return partsArr;
    }
    return res.data;
  },

  getPartById: async (id) => {
    const res = await api.get(`/parts/${id}`);
    return res.data.part;
  },

  createPart: async (partData) => {
    const res = await api.post('/parts', partData);
    return res.data.part;
  },

  updatePart: async (id, partData) => {
    const res = await api.put(`/parts/${id}`, partData);
    return res.data.part;
  },

  adjustStock: async (id, data) => {
    const res = await api.post(`/parts/${id}/adjust-stock`, data);
    return res.data.part;
  },

  deletePart: async (id) => {
    const res = await api.delete(`/parts/${id}`);
    return res.data;
  },

  bulkDeleteParts: async (ids) => {
    const res = await api.post('/parts/bulk-delete', { ids });
    return res.data;
  },
};
