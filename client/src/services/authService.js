import api from './api';

export const authService = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getProfile: async () => {
    const res = await api.get('/auth/me');
    return res.data.user;
  },

  getUsers: async () => {
    const res = await api.get('/auth/users');
    return res.data.users;
  },

  createUser: async (userData) => {
    const res = await api.post('/auth/users', userData);
    return res.data.user;
  },

  deleteUser: async (id) => {
    const res = await api.delete(`/auth/users/${id}`);
    return res.data;
  },

  bulkDeleteUsers: async (ids) => {
    const res = await api.post('/auth/users/bulk-delete', { ids });
    return res.data;
  },
};
