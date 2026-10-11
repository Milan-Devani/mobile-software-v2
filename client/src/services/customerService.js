import api from './api';

export const customerService = {
  getCustomers: async (params = {}) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },

  getCustomerById: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  createCustomer: async (customerData) => {
    const res = await api.post('/customers', customerData);
    return res.data.customer;
  },

  updateCustomer: async (id, customerData) => {
    const res = await api.put(`/customers/${id}`, customerData);
    return res.data.customer;
  },

  deleteCustomer: async (id) => {
    const res = await api.delete(`/customers/${id}`);
    return res;
  },
};
