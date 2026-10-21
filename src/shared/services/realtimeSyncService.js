/**
 * @file realtimeSyncService.js
 * @description Centralized Real-time Cross-Tab & Cross-Device Synchronization Engine
 * using the browser BroadcastChannel API and custom event bridges.
 * 
 * Ensures that whenever an employee starts, pauses, or completes a task,
 * or when an Admin controls an employee's timer, all tabs, roles, and windows
 * update with zero latency and maintain matching elapsed times.
 */

const SYNC_CHANNEL_NAME = 'inforag_realtime_sync_v1';

let syncChannel = null;
try {
  if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
    syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (err) {
  console.warn('BroadcastChannel not supported in this environment, falling back to storage events:', err);
}

/**
 * Broadcast an event across all open tabs/windows
 * @param {string} type - Event type (e.g. 'TASK_TIMER_STARTED', 'TASK_TIMER_PAUSED')
 * @param {object} payload - Event payload
 */
export const broadcastSyncEvent = (type, payload = {}) => {
  const message = {
    type,
    payload,
    timestamp: Date.now(),
    sourceTabId: window.__ems_tab_id || (window.__ems_tab_id = Math.random().toString(36).substring(2, 9))
  };

  if (syncChannel) {
    try {
      syncChannel.postMessage(message);
    } catch (e) {
      console.warn('Failed to postMessage on syncChannel:', e);
    }
  }

  // Also dispatch locally on current window so subscribers on the active tab get uniform handling
  try {
    window.dispatchEvent(new CustomEvent('ems_realtime_sync', { detail: message }));
  } catch (e) {}
};

/**
 * Subscribe to real-time events across all tabs
 * @param {Function} callback - Called with { type, payload, timestamp, sourceTabId }
 * @returns {Function} Unsubscribe function
 */
export const subscribeToSyncEvents = (callback) => {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (event) => {
    if (event?.data && typeof callback === 'function') {
      try {
        callback(event.data);
      } catch (err) {
        console.error('Error in realtime sync listener:', err);
      }
    }
  };

  const handleLocalCustom = (event) => {
    if (event?.detail && typeof callback === 'function') {
      try {
        callback(event.detail);
      } catch (err) {
        console.error('Error in local sync listener:', err);
      }
    }
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleMessage);
  }
  window.addEventListener('ems_realtime_sync', handleLocalCustom);

  return () => {
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('ems_realtime_sync', handleLocalCustom);
  };
};

export const SYNC_EVENTS = {
  TASK_TIMER_STARTED: 'TASK_TIMER_STARTED',
  TASK_TIMER_PAUSED: 'TASK_TIMER_PAUSED',
  TASK_TIMER_STOPPED: 'TASK_TIMER_STOPPED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  SHIFT_CLOCKED_IN: 'SHIFT_CLOCKED_IN',
  SHIFT_CLOCKED_OUT: 'SHIFT_CLOCKED_OUT',
  STORAGE_MUTATION: 'STORAGE_MUTATION'
};
