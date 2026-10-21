import api from './api';

export const notificationService = {
  getLogs: async (params = {}) => {
    const res = await api.get('/notifications/logs', { params });
    if (res.data && res.data.logs) {
      const logsArr = res.data.logs;
      logsArr.total = res.data.total ?? logsArr.length;
      logsArr.logs = logsArr;
      return logsArr;
    }
    return res.data;
  },

  resend: async (data) => {
    const res = await api.post('/notifications/resend', data);
    return res.data;
  },

  deleteNotification: async (id) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  },

  bulkDeleteNotifications: async (ids) => {
    const res = await api.post('/notifications/bulk-delete', { ids });
    return res.data;
  },
};
