import axios from 'axios';
import { showToast } from '../components/Toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor to attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (import.meta.env.DEV) {
      console.log(`📡 [API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    // Intercept response to show simulated OTP Toast if present
    const simulatedOtp = response.headers['x-simulated-otp'];
    if (simulatedOtp) {
      showToast(`🔑 Dev Mode Simulated OTP: ${simulatedOtp}`, 'info', 15000);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 response and we haven't already retried this request
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          if (import.meta.env.DEV) {
            console.log('🔒 Token expired, attempting refresh...');
          }
          
          // Use axios directly to avoid adding auth header to the refresh request
          const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
            refreshToken: refreshToken
          });

          if (res.status === 200 && res.data.accessToken) {
            const newAccessToken = res.data.accessToken;
            localStorage.setItem('accessToken', newAccessToken);
            
            // Retry the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Session expired, logging out...', refreshError);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('smart_bank_user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    // Extraction of friendly messages
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.userMessage = '⏳ Request timed out. Please try again.';
      } else if (error.message?.includes('Network Error')) {
        error.userMessage = '🌐 Cannot reach the server. Check your connection.';
      } else {
        error.userMessage = '❌ An unexpected connection error occurred.';
      }
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    error.userMessage = data?.message || `Error (${status})`;

    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) => {
  if (error.userMessage) return error.userMessage;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return 'Something went wrong. Please try again.';
};

export default api;
