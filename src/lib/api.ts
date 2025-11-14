import axios from 'axios';

const env = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env;
const API_BASE_URL = env?.VITE_API_BASE_URL || 'http://localhost:3003/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});


