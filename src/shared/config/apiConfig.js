/**
 * @file apiConfig.js
 * @description Centralized Universal API Base URL Resolver for Enterprise Management System (EMS).
 * Automatically normalizes Render / Vercel / Localhost environment variables to ensure 100% reliable connectivity.
 * Includes transparent in-memory GET request deduplication, 15s short TTL caching, and automatic mutation invalidation.
 */

export const PRODUCTION_API_URL = 'https://ems-backend-8p5p.onrender.com/api';

export function getApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_URL;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }

  // On localhost dev, Vite proxies /api and /socket.io to local backend if running
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api';
    }
    // On deployed domains (Vercel, mobile, remote devices), always connect to live Render backend
    return PRODUCTION_API_URL;
  }

  return PRODUCTION_API_URL;
}

export const API_BASE = getApiBaseUrl();

/**
 * Centralized Auth Header Builder (attaches signed JWT Bearer token + canonical user identifiers).
 */
export function getAuthHeaders(extra = {}) {
  const headers = { ...extra };
  if (typeof localStorage === 'undefined') return headers;
  try {
    const token = localStorage.getItem('ems_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const raw = localStorage.getItem('ems_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      const u = parsed?.user || parsed;
      if (!headers['Authorization'] && (parsed?.token || u?.token)) {
        headers['Authorization'] = `Bearer ${parsed?.token || u?.token}`;
      }
      if (u) {
        if (u._id || u.id || u.employeeCode || u.email) {
          headers['x-user-id'] = String(u._id || u.id || u.employeeCode || u.email || '');
        }
        if (u.employeeCode) headers['x-user-code'] = String(u.employeeCode);
        if (u.email) headers['x-user-email'] = String(u.email).toLowerCase().trim();
      }
    }
  } catch (_) {}
  return headers;
}

// ============================================================================
// ⚡ High-Efficiency Request Deduplication & 15s Short TTL GET Cache
// Reduces Render backend bandwidth (<5GB/mo) and CPU/RAM without breaking any UI
// ============================================================================

const apiGetCache = new Map();
const inFlightRequests = new Map();
const CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Manually invalidate or clear all cached GET responses (e.g. after mutations).
 */
export function clearApiCache() {
  apiGetCache.clear();
}

function getUrlString(resource) {
  if (typeof resource === 'string') return resource;
  if (resource && typeof resource.url === 'string') return resource.url;
  return String(resource || '');
}

function extractAuthKey(options) {
  if (!options || !options.headers) return '';
  try {
    if (typeof options.headers.get === 'function') {
      return options.headers.get('Authorization') || options.headers.get('x-user-id') || '';
    }
    if (typeof options.headers === 'object') {
      return options.headers['Authorization'] || options.headers['authorization'] || options.headers['x-user-id'] || '';
    }
  } catch (_) {}
  return '';
}

function isCacheableGetRequest(urlStr, method) {
  if (method !== 'GET') return false;
  if (!urlStr) return false;
  // Exclude health checks & auth endpoints
  if (urlStr.includes('/health') || urlStr.includes('/auth/')) return false;
  // Only cache EMS API endpoints (/api/ or API_BASE or relative /api)
  return urlStr.includes('/api') || urlStr.startsWith('/');
}

function createResponseFromCache(entry) {
  return new Response(entry.bodyText, {
    status: entry.status,
    statusText: entry.statusText,
    headers: new Headers(entry.headers)
  });
}

async function awaitWithSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) throw new DOMException('The user aborted a request.', 'AbortError');
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('The user aborted a request.', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      res => { signal.removeEventListener('abort', onAbort); resolve(res); },
      err => { signal.removeEventListener('abort', onAbort); reject(err); }
    );
  });
}

const nativeFetch = typeof window !== 'undefined' && typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

/**
 * Core wrapped fetch implementation with deduplication & 15s cache.
 */
export async function apiFetch(resource, options = {}) {
  const fetchFn = nativeFetch || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) return;

  const urlStr = getUrlString(resource);
  const method = (options?.method || (typeof resource !== 'string' && resource?.method) || 'GET').toUpperCase();

  // Invalidate cache immediately on any mutation
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    clearApiCache();
    return fetchFn(resource, options);
  }

  // Bypass cache if not a cacheable GET request
  if (!isCacheableGetRequest(urlStr, method)) {
    return fetchFn(resource, options);
  }

  const authKey = extractAuthKey(options);
  const cacheKey = `${urlStr}::${authKey}`;

  // 1. Check valid cache entry (< 15 seconds)
  const cached = apiGetCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return createResponseFromCache(cached);
  }

  // 2. Check identical simultaneous in-flight request
  if (inFlightRequests.has(cacheKey)) {
    try {
      const inFlightPromise = inFlightRequests.get(cacheKey);
      const res = await awaitWithSignal(inFlightPromise, options?.signal);
      if (res && res.isCached && res.entry) {
        return createResponseFromCache(res.entry);
      }
      if (res && res.response) {
        return res.response.clone ? res.response.clone() : res.response;
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      // If previous in-flight failed, proceed with fresh request
    }
  }

  // 3. Initiate fresh network request
  const fetchPromise = (async () => {
    try {
      const res = await fetchFn(resource, options);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const bodyText = await res.text();
        const entry = {
          bodyText,
          status: res.status,
          statusText: res.statusText,
          headers: Array.from(res.headers.entries()),
          timestamp: Date.now()
        };
        apiGetCache.set(cacheKey, entry);
        return { isCached: true, entry };
      }
      return { isCached: false, response: res };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);

  const result = await awaitWithSignal(fetchPromise, options?.signal);
  if (result.isCached && result.entry) {
    return createResponseFromCache(result.entry);
  }
  return result.response;
}

// Transparently hook window.fetch in browser so all services automatically benefit
if (typeof window !== 'undefined' && !window.__ems_fetch_dedup_installed) {
  window.__ems_fetch_dedup_installed = true;
  window.fetch = apiFetch;
}
