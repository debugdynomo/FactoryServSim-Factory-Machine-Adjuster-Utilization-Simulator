/**
 * FactoryServSim Auth & Factory API Client
 *
 * Connects to the backend auth and factory endpoints.
 * Manages JWT token storage in localStorage.
 * Auth is factory_id-based: data persists per factory, not per manager.
 *
 * Includes:
 *  - Warm-up ping on import to wake the Render server during cold starts
 *  - Retry logic with timeout to handle transient network / cold-start failures
 */

const API_BASE = 'https://factoryservsim-factory-machine-adjuster.onrender.com';

// ---------------------------------------------------------------------------
// Warm-up: fire a lightweight health-check as soon as this module loads
// so the Render server starts waking up while the user types credentials.
// ---------------------------------------------------------------------------

let _serverReady = false;

(function warmUp() {
  fetch(`${API_BASE}/api/health`, { method: 'GET', mode: 'cors' })
    .then(() => { _serverReady = true; })
    .catch(() => { /* silently ignore — the real request will retry */ });
})();

/** Check if the server has responded to the warm-up ping. */
export function isServerWarmedUp() {
  return _serverReady;
}

// ---------------------------------------------------------------------------
// Retry-aware fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Fetch with automatic retry and per-attempt timeout.
 * - retries:        max number of retries (default 2, so 3 total attempts)
 * - timeoutMs:      abort each attempt after this many ms (default 30 000)
 * - retryDelayMs:   initial delay between retries, doubles each time (default 1 000)
 */
async function fetchWithRetry(url, options = {}, { retries = 2, timeoutMs = 30000, retryDelayMs = 1000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      _serverReady = true;
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

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
  const response = await fetchWithRetry(`${API_BASE}/api/auth/register`, {
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
  const response = await fetchWithRetry(`${API_BASE}/api/auth/login`, {
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
  const response = await fetchWithRetry(`${API_BASE}/api/auth/me`, {
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
  const response = await fetchWithRetry(`${API_BASE}/api/factories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ factory_name: factoryName }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to create factory');
  return data;
}

export async function listFactories() {
  const response = await fetchWithRetry(`${API_BASE}/api/factories`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to list factories');
  return await response.json();
}

export async function getFactory(factoryId) {
  const response = await fetchWithRetry(`${API_BASE}/api/factories/${factoryId}`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Factory not found');
  return await response.json();
}

export async function deleteFactory(factoryId) {
  const response = await fetchWithRetry(`${API_BASE}/api/factories/${factoryId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to delete factory');
}

export async function saveReport(factoryId, reportData) {
  const response = await fetchWithRetry(`${API_BASE}/api/factories/${factoryId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(reportData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to save report');
  return data;
}

export async function listReports(factoryId) {
  const response = await fetchWithRetry(`${API_BASE}/api/factories/${factoryId}/reports`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to list reports');
  return await response.json();
}

export async function getManagerHistory() {
  const response = await fetchWithRetry(`${API_BASE}/api/factories/history`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error('Failed to fetch simulation history');
  return await response.json();
}
