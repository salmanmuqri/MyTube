import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const API = axios.create({
  baseURL: API_BASE,
});

API.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('mytube_tokens') || 'null');
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
      const tokens = JSON.parse(localStorage.getItem('mytube_tokens') || 'null');
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
