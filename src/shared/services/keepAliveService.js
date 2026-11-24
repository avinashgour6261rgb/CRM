/**
 * @file keepAliveService.js
 * @description Lightweight backend connectivity manager.
 * Verifies health only on initial app boot or on demand when a network/503 error occurs.
 * Zero continuous interval polling to preserve bandwidth (<5GB/mo) and allow natural server idle sleep.
 */

import { API_BASE } from '../config/apiConfig';

let isInitialized = false;
let isChecking = false;
let isOnline = false;

export async function checkBackendHealth() {
  if (isChecking) return isOnline;
  isChecking = true;
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      isOnline = true;
      try {
        const { hrService } = await import('../../modules/hr/services/hrService');
        hrService.markBackendOnline(true);
        hrService.syncPendingAttendance().catch(() => {});
      } catch (_) {}
    } else {
      isOnline = false;
    }
  } catch (_) {
    isOnline = false;
  } finally {
    isChecking = false;
  }
  return isOnline;
}

export function initKeepAlive() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  // Check health once on initial boot
  checkBackendHealth().catch(() => {});

  // When user returns to an inactive tab, only check if app was previously marked offline
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isOnline) {
      checkBackendHealth().catch(() => {});
    }
  });
}
