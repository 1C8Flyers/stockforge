import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('authUser');
      const path = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
      const isPublicVerify = path.startsWith('/verify/');
      const isPublicReset = path === '/request-password-reset' || path === '/reset-password';
      const portalMatch = typeof window !== 'undefined' ? window.location.pathname.match(/^\/t\/([^/]+)\/portal/i) : null;
      if (portalMatch) {
        const tenantSlug = portalMatch[1];
        window.location.href = `/t/${tenantSlug}/portal/login`;
        return Promise.reject(error);
      }
      if (typeof window !== 'undefined' && (path === '/portal' || path.startsWith('/portal/'))) {
        window.location.href = '/portal/login';
        return Promise.reject(error);
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && !isPublicVerify && !isPublicReset) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
