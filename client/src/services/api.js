import axios from 'axios';

const rawApiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = rawApiBase.endsWith('/api')
  ? rawApiBase
  : `${rawApiBase.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;

    // Handle token expiration or unauthorized access
    if (status === 401) {
      const isAuthRoute = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/repair/');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?expired=true';
      }
    }

    const message = errorData?.message || error.message || 'An unexpected error occurred. Please try again.';
    const customError = new Error(message);
    customError.status = status;
    customError.code = errorData?.code || 'API_ERROR';
    customError.errors = errorData?.errors || [];

    return Promise.reject(customError);
  }
);

export default api;
