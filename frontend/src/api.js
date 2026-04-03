const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Auth
export const auth = {
  register: (email, password, name) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request('/auth/me'),
};

// Institutions
export const institutions = {
  list: (country) => request(`/institutions/${country}`),
};

// Requisitions
export const requisitions = {
  list: () => request('/requisitions'),
  create: (data) =>
    request('/requisitions', { method: 'POST', body: JSON.stringify(data) }),
  complete: (id, code) =>
    request(`/requisitions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  delete: (id) => request(`/requisitions/${id}`, { method: 'DELETE' }),
};

// Sync
export const sync = {
  account: (accountId) =>
    request(`/sync/account/${accountId}`, { method: 'POST' }),
  all: () => request('/sync/all', { method: 'POST' }),
};

// Transactions
export const transactions = {
  list: (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/transactions?${qs}`);
  },
  top: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/transactions/top?${qs}`);
  },
  thirdPartySummary: (id) => request(`/transactions/summary/third-party/${id}`),
  addTag: (id, tag) =>
    request(`/transactions/${id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag }),
    }),
  removeTag: (id, tagName) =>
    request(`/transactions/${id}/tags/${encodeURIComponent(tagName)}`, {
      method: 'DELETE',
    }),
};

// Third parties
export const thirdParties = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/third-parties?${qs}`);
  },
  get: (id) => request(`/third-parties/${id}`),
  rename: (id, display_name) =>
    request(`/third-parties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ display_name }),
    }),
  merge: (target_id, source_ids) =>
    request('/third-parties/merge', {
      method: 'POST',
      body: JSON.stringify({ target_id, source_ids }),
    }),
  addTag: (id, tag) =>
    request(`/third-parties/${id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag }),
    }),
  removeTag: (id, tagName) =>
    request(`/third-parties/${id}/tags/${encodeURIComponent(tagName)}`, {
      method: 'DELETE',
    }),
};

// Tags
export const tags = {
  list: () => request('/tags'),
  delete: (id) => request(`/tags/${id}`, { method: 'DELETE' }),
};
