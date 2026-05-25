import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  async err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const login = (username, password) =>
  axios.post(`${BASE_URL}/auth/login/`, { username, password });

export const getDashboard = () => api.get('/dashboard/');
export const getRecords = (params = {}) => api.get('/records/', { params });
export const reviewRecord = (id, data) => api.patch(`/records/${id}/review/`, data);
export const bulkReview = (data) => api.post('/records/bulk-review/', data);
export const getRuns = () => api.get('/runs/');
export const getAuditLog = () => api.get('/audit/');
export const getTenant = () => api.get('/tenant/');
export const ingestFile = (sourceType, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/ingest/${sourceType}/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;
