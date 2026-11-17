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
