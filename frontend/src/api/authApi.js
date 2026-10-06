/**
 * FactoryServSim Auth & Factory API Client
 *
 * Connects to the backend auth and factory endpoints.
 * Manages JWT token storage in localStorage.
 * Auth is factory_id-based: data persists per factory, not per manager.
 */

const API_BASE = 'https://factoryservsim-factory-machine-adjuster.onrender.com';

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

export function getToken() {
  return localStorage.getItem('factoryservsim_token');
}

export function setToken(token) {
  localStorage.setItem('factoryservsim_token', token);
}

export function removeToken() {
  localStorage.removeItem('factoryservsim_token');
  localStorage.removeItem('factoryservsim_user');
}

export function getStoredUser() {
  const raw = localStorage.getItem('factoryservsim_user');
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user) {
  localStorage.setItem('factoryservsim_user', JSON.stringify(user));
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export async function registerUser(factoryId, factoryName, managerName, email, password) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      factory_id: factoryId,
      factory_name: factoryName,
      manager_name: managerName,
      email,
      password,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Registration failed');
  // Registration does NOT auto-login anymore — just return the success message
  return data;
}

export async function loginUser(factoryId, email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factory_id: factoryId, email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Login failed');
  setToken(data.access_token);
  setStoredUser({
    email: data.email,
    manager_name: data.manager_name,
    factory_id: data.factory_id,
    factory_name: data.factory_name,
  });
  return data;
}

export function logoutUser() {
  removeToken();
}

export async function fetchMe() {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    removeToken();
    throw new Error('Session expired');
  }
  return await response.json();
}

// ---------------------------------------------------------------------------
// Factory API
// ---------------------------------------------------------------------------

export async function createFactory(factoryName) {
  const response = await fetch(`${API_BASE}/api/factories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ factory_name: factoryName }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to create factory');
  return data;
}

export async function listFactories() {
  const response = await fetch(`${API_BASE}/api/factories`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to list factories');
  return await response.json();
}

export async function getFactory(factoryId) {
  const response = await fetch(`${API_BASE}/api/factories/${factoryId}`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Factory not found');
  return await response.json();
}

export async function deleteFactory(factoryId) {
  const response = await fetch(`${API_BASE}/api/factories/${factoryId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to delete factory');
}

export async function saveReport(factoryId, reportData) {
  const response = await fetch(`${API_BASE}/api/factories/${factoryId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(reportData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to save report');
  return data;
}

export async function listReports(factoryId) {
  const response = await fetch(`${API_BASE}/api/factories/${factoryId}/reports`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to list reports');
  return await response.json();
}

export async function getManagerHistory() {
  const response = await fetch(`${API_BASE}/api/factories/history`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to fetch simulation history');
  return await response.json();
}
