// ============================================================
//  API Service — hardcoded to your Render backend
// ============================================================
import axios from 'axios';

const BASE_URL = 'https://inviteflow-3.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('inviteflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('inviteflow_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:          (data)  => api.post('/auth/login', data),
  logout:         ()      => api.post('/auth/logout'),
  getMe:          ()      => api.get('/auth/me'),
  updateMe:       (data)  => api.put('/auth/me', data),
  changePassword: (data)  => api.post('/auth/change-password', data),
};

export const eventsAPI = {
  list:    (params) => api.get('/events', { params }),
  create:  (data)   => api.post('/events', data),
  getOne:  (id)     => api.get(`/events/${id}`),
  update:  (id, d)  => api.put(`/events/${id}`, d),
  remove:  (id)     => api.delete(`/events/${id}`),
  summary: (id)     => api.get(`/events/${id}/summary`),
};

export const guestsAPI = {
  list:       (params) => api.get('/guests', { params }),
  create:     (data)   => api.post('/guests', data),
  getOne:     (id)     => api.get(`/guests/${id}`),
  update:     (id, d)  => api.put(`/guests/${id}`, d),
  remove:     (id)     => api.delete(`/guests/${id}`),
  bulkUpload: (fd)     => api.post('/guests/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  generateQR: (id)     => api.post(`/guests/${id}/qr`),
  downloadQR: (id)     => api.get(`/guests/${id}/qr/image`, { responseType: 'blob' }),
};

export const invitationsAPI = {
  list:     (params) => api.get('/invitations', { params }),
  send:     (data)   => api.post('/invitations/send', data),
  sendAll:  (data)   => api.post('/invitations/send-all', data),
  sendTest: (data)   => api.post('/invitations/test', data),
};

export const qrAPI = {
  verify:       (token)   => api.get(`/qr/verify/${token}`),
  scan:         (token)   => api.post(`/qr/scan/${token}`),
  generate:     (guestId) => api.post(`/qr/generate/${guestId}`),
  bulkGenerate: (eventId) => api.get(`/qr/bulk/${eventId}`),
};

export const rsvpAPI = {
  getByToken:    (token)    => api.get(`/rsvp/${token}`),
  respond:       (token, d) => api.post(`/rsvp/${token}`, d),
  listByEvent:   (id)       => api.get(`/rsvp/event/${id}`),
  updateByAdmin: (gid, d)   => api.put(`/rsvp/guest/${gid}`, d),
};

export const reportsAPI = {
  dashboard:  ()    => api.get('/reports/dashboard'),
  event:      (id)  => api.get(`/reports/event/${id}`),
  exportCSV:  (id)  => api.get(`/reports/export/${id}?format=csv`, { responseType: 'blob' }),
  exportJSON: (id)  => api.get(`/reports/export/${id}?format=json`),
};

export const cardsAPI = {
  get:         (eventId)       => api.get(`/cards/${eventId}`),
  upsert:      (eventId, data) => api.post(`/cards/${eventId}`, data),
  uploadBg:    (eventId, fd)   => api.post(`/cards/${eventId}/background`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  preview:     (eventId, data) => api.post(`/cards/${eventId}/preview`, data, { responseType: 'blob' }),
  generateAll: (eventId)       => api.post(`/cards/${eventId}/generate-all`),
};

export default api;
