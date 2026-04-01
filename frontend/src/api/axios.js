import axios from 'axios';

function safeParseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeApiBase(rawValue) {
  const value = (rawValue || '/api').trim();

  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/+$/, '');
    url.pathname = pathname.endsWith('/api') ? pathname : `${pathname || ''}/api`;
    return url.toString().replace(/\/+$/, '');
  }

  const clean = value.replace(/\/+$/, '');
  if (clean === '' || clean === '/') return '/api';
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);

const API_ORIGIN = /^https?:\/\//i.test(API_BASE)
  ? new URL(API_BASE).origin
  : window.location.origin;

export const MEDIA_BASE = (import.meta.env.VITE_MEDIA_BASE_URL || `${API_ORIGIN}/media`).replace(/\/+$/, '');

export function toAbsoluteMediaUrl(path) {
  if (!path) return null;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
  if (path.startsWith('/media/')) return `${API_ORIGIN}${path}`;
  if (path.startsWith('media/')) return `${API_ORIGIN}/${path}`;
  if (path.startsWith('/')) return `${API_ORIGIN}${path}`;
  return `${API_ORIGIN}/media/${path}`;
}

const API = axios.create({
  baseURL: API_BASE,
});

API.interceptors.request.use((config) => {
  const tokens = safeParseJson(localStorage.getItem('mytube_tokens'), null);
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = safeParseJson(localStorage.getItem('mytube_tokens'), null);
      if (tokens?.refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/users/token/refresh/`, { refresh: tokens.refresh });
          const newTokens = { access: data.access, refresh: data.refresh || tokens.refresh };
          localStorage.setItem('mytube_tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return API(originalRequest);
        } catch {
          localStorage.removeItem('mytube_tokens');
          localStorage.removeItem('mytube_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
