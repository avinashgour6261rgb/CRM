/**
 * @file apiConfig.js
 * @description Centralized Universal API Base URL Resolver for Enterprise Management System (EMS).
 * Automatically normalizes Render / Vercel / Localhost environment variables to ensure 100% reliable connectivity.
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
