import api from './api';

export const partsService = {
  getParts: async (params = {}) => {
    const res = await api.get('/parts', { params });
    return res.data.parts;
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
    return res;
  },
};
