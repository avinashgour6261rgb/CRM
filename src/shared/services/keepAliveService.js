/**
 * @file keepAliveService.js
 * @description Prevents Render free tier cold-sleep while an employee or admin has the tab open,
 * and seamlessly re-verifies backend connection on tab focus / visibility change.
 */

import { API_BASE } from '../config/apiConfig';

let keepAliveInterval = null;
let lastPingTime = 0;
let isInitialized = false;

export function initKeepAlive() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  const pingBackend = async () => {
    try {
      const now = Date.now();
      lastPingTime = now;
      await fetch(`${API_BASE}/health`, {
        method: 'GET',
        cache: 'no-store',
        keepalive: true
      });
      try {
        const { hrService } = await import('../../modules/hr/services/hrService');
        hrService.syncPendingAttendance().catch(() => {});
      } catch (_) {}
    } catch (_) {
      // Silently ignore ping failures — backend will wake up automatically
    }
  };

  // Ping immediately on start
  pingBackend();

  // Ping every 8 minutes (Render sleeps after 15 minutes of zero HTTP activity)
  if (!keepAliveInterval) {
    keepAliveInterval = setInterval(pingBackend, 8 * 60 * 1000);
  }

  // When user returns to tab after a while, ping if more than 3 minutes have passed
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      if (now - lastPingTime > 3 * 60 * 1000) {
        pingBackend();
      }
    }
  });

  // Also ping on window focus
  window.addEventListener('focus', () => {
    const now = Date.now();
    if (now - lastPingTime > 3 * 60 * 1000) {
      pingBackend();
    }
  });
}
