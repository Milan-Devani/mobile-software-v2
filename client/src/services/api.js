import axios from 'axios';

const rawApiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = rawApiBase.endsWith('/api')
  ? rawApiBase
  : `${rawApiBase.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s to accommodate Render / free-tier container cold starts
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

// Response interceptor for unified error formatting and cold-start auto-retry
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const errorData = error.response?.data;

    // Cold-start / dev-restart auto-retry: If request times out, network resets, or returns 502/503/504
    const isColdStartError =
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      error.message?.includes('Network Error');

    const retryCount = config?._retryCount || 0;
    if (config && retryCount < 3 && isColdStartError) {
      config._retryCount = retryCount + 1;
      config._retry = true;
      // Wait progressively (1.5s, 2.5s, 3.5s) to allow server restart/startup
      await new Promise((resolve) => setTimeout(resolve, 1500 + retryCount * 1000));
      return api(config);
    }

    // Handle token expiration or unauthorized access
    if (status === 401) {
      const isAuthRoute = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/repair/');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?expired=true';
      }
    }

    const message =
      errorData?.message ||
      (error.code === 'ECONNABORTED'
        ? 'Server is taking longer to respond while waking up. Please retry in a moment.'
        : error.message || 'An unexpected error occurred. Please try again.');
    const customError = new Error(message);
    customError.status = status;
    customError.code = errorData?.code || 'API_ERROR';
    customError.errors = errorData?.errors || [];

    return Promise.reject(customError);
  }
);

export default api;
