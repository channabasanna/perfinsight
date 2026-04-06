import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Redirect to login on 401 (but not for the login/me endpoints themselves)
      if (
        error.response.status === 401 &&
        !error.config?.url?.includes('/auth/')
      ) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_username');
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
      const message = error.response.data?.message || `HTTP ${error.response.status}: ${error.response.statusText}`;
      console.error('API Error:', message);
      return Promise.reject(new Error(message));
    } else if (error.request) {
      console.error('Network Error: No response received from server');
      return Promise.reject(new Error('Network error: Could not connect to the server. Make sure the backend is running on port 3001.'));
    } else {
      console.error('Request Error:', error.message);
      return Promise.reject(new Error(error.message));
    }
  }
);

export default client;
