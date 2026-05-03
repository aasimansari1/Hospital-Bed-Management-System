const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let authToken = localStorage.getItem('hbms_token') || null;

export function setToken(token) {
  authToken = token;
  if (token) localStorage.setItem('hbms_token', token);
  else localStorage.removeItem('hbms_token');
}

export function getToken() {
  return authToken;
}

export function getApiUrl() {
  return API_URL;
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const message =
      data?.error?.formErrors?.join(', ') ||
      (typeof data?.error === 'string' ? data.error : null) ||
      data?.message ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  auth: {
    login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
    signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
    me: () => request('/api/auth/me'),
  },
  wards: {
    list: () => request('/api/wards'),
    create: (body) => request('/api/wards', { method: 'POST', body }),
    update: (id, body) => request(`/api/wards/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/api/wards/${id}`, { method: 'DELETE' }),
  },
  beds: {
    list: (params = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) q.set(k, v);
      });
      const s = q.toString();
      return request(`/api/beds${s ? `?${s}` : ''}`);
    },
    get: (id) => request(`/api/beds/${id}`),
    create: (body) => request('/api/beds', { method: 'POST', body }),
    update: (id, body) => request(`/api/beds/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/api/beds/${id}`, { method: 'DELETE' }),
  },
  patients: {
    list: (params = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) q.set(k, v);
      });
      const s = q.toString();
      return request(`/api/patients${s ? `?${s}` : ''}`);
    },
    create: (body) => request('/api/patients', { method: 'POST', body }),
    update: (id, body) => request(`/api/patients/${id}`, { method: 'PUT', body }),
    assignBed: (id, bed_id) =>
      request(`/api/patients/${id}/assign-bed`, { method: 'POST', body: { bed_id } }),
    discharge: (id) => request(`/api/patients/${id}/discharge`, { method: 'POST' }),
    remove: (id) => request(`/api/patients/${id}`, { method: 'DELETE' }),
  },
  stats: {
    summary: () => request('/api/stats/summary'),
    trend: (days = 7) => request(`/api/stats/occupancy-trend?days=${days}`),
    distribution: () => request('/api/stats/ward-distribution'),
  },
};
