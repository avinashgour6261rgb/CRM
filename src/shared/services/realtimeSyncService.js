/**
 * @file realtimeSyncService.js
 * @description Centralized Real-time Cross-Tab & Cross-Device Synchronization Engine
 * using the browser BroadcastChannel API and custom event bridges.
 * 
 * Ensures that whenever an employee starts, pauses, or completes a task,
 * or when an Admin controls an employee's timer, all tabs, roles, and windows
 * update with zero latency and maintain matching elapsed times.
 */

import { subscribeSocketEvent, emitSocketEvent } from './socketService';
import { KEYS } from './storageService';

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
 * Bridge incoming Socket.IO events across different devices into the local app event bus
 */
if (typeof window !== 'undefined') {
  subscribeSocketEvent('attendance:update', (data) => {
    try {
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      if (data?.isClockedIn) {
        window.dispatchEvent(new CustomEvent('ems_clocked_in', { detail: data }));
      } else if (data?.isClockedOut || data?.clockOutTime) {
        window.dispatchEvent(new CustomEvent('ems_clocked_out', { detail: data }));
      }
      if (data?.isOnBreak) {
        window.dispatchEvent(new CustomEvent('ems_break_started', { detail: data }));
      } else if (data?.isOnBreak === false) {
        window.dispatchEvent(new CustomEvent('ems_break_ended', { detail: data }));
      }
      if (data?.employeeId || data?.employeeCode) {
        window.dispatchEvent(new CustomEvent('ems_telemetry_update', { detail: data }));
      }
    } catch (_) {}
  });

  subscribeSocketEvent('attendance:force_clock_out', (data) => {
    try {
      const empId = data?.employeeId || data?.targetEmpId;
      const empCode = data?.employeeCode || data?.targetEmpCode;
      const logoutStr = data?.clockOutTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const targetKeys = [empId, empCode].filter(Boolean);

      targetKeys.forEach(k => {
        try {
          localStorage.setItem(`ems_timer_${k}_is_clocked_in`, 'false');
          localStorage.setItem(`ems_timer_${k}_is_running`, 'false');
          localStorage.setItem(`ems_timer_${k}_is_on_break`, 'false');
          localStorage.setItem(`ems_timer_${k}_clock_out`, logoutStr);
          localStorage.setItem(`ems_timer_${k}_clockout_time`, logoutStr);
          localStorage.setItem(`ems_timer_${k}_had_clocked_out`, 'true');
          localStorage.removeItem(`ems_active_task_timer_${k}`);
        } catch (_) {}
      });

      try {
        const rawAtt = localStorage.getItem(KEYS.ATTENDANCE);
        if (rawAtt) {
          const today = new Date().toISOString().split('T')[0];
          let attList = JSON.parse(rawAtt) || [];
          let changed = false;
          attList = attList.map(a => {
            const matchesEmp = (empId && (String(a.employeeId) === String(empId) || String(a.employee) === String(empId))) ||
              (empCode && (String(a.employeeCode) === String(empCode) || String(a.employeeId) === String(empCode)));
            if (matchesEmp && a.date === today) {
              changed = true;
              return {
                ...a,
                isClockedIn: false,
                clockOutTime: logoutStr,
                clockOut: logoutStr,
                status: 'present'
              };
            }
            return a;
          });
          if (changed) {
            localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attList));
          }
        }
      } catch (_) {}

      // Instant telemetry update for 0ms Live Operations & Team Live Table sync across browsers
      window.dispatchEvent(new CustomEvent('ems_telemetry_update', {
        detail: {
          employeeId: empId,
          employeeCode: empCode,
          isClockedIn: false,
          isOnBreak: false,
          clockOutTime: logoutStr,
          status: 'present',
          activeTask: null
        }
      }));

      window.dispatchEvent(new CustomEvent('ems_force_clock_out', { detail: data }));
      window.dispatchEvent(new CustomEvent('ems_clocked_out', { detail: data }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
    } catch (_) {}
  });

  subscribeSocketEvent('task:updated', (data) => {
    try {
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      if (data?.timerRunning) {
        window.dispatchEvent(new CustomEvent('ems_task_timer_started', { detail: data }));
      } else if (data?.status === 'completed') {
        window.dispatchEvent(new CustomEvent('ems_task_timer_stopped', { detail: data }));
      } else {
        window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: data }));
      }
    } catch (_) {}
  });

  subscribeSocketEvent('chat:message', (data) => {
    try {
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));
    } catch (_) {}
  });

  // 📡 Real-time permissions and access updates across all devices
  subscribeSocketEvent('employee:permissions:updated', (data) => {
    try {
      if (data?.employeeId || data?.employeeCode || data?.email) {
        // 1. Update local machine EMS_USER_PERMISSIONS map
        const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
        const parsedMap = rawMap ? JSON.parse(rawMap) : {};
        if (data.employeeId) parsedMap[String(data.employeeId)] = data.permissions || {};
        if (data.employeeCode) parsedMap[String(data.employeeCode)] = data.permissions || {};
        if (data.email) parsedMap[String(data.email).toLowerCase()] = data.permissions || {};
        localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(parsedMap));

        // 2. Dispatch browser events for immediate 0ms UI re-render
        window.dispatchEvent(new CustomEvent('ems_permissions_updated', { detail: data }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'EMS_USER_PERMISSIONS' } }));
      }
    } catch (_) {}
  });

  // 📡 Real-time cross-device sync event relay from Socket.IO (0ms cross-browser synchronization)
  subscribeSocketEvent('sync:event', (message) => {
    try {
      if (!message || message.sourceTabId === window.__ems_tab_id) return;
      window.dispatchEvent(new CustomEvent('ems_realtime_sync', { detail: message }));

      const { type, payload } = message;
      if (type === SYNC_EVENTS.TASK_TIMER_STARTED) {
        window.dispatchEvent(new CustomEvent('ems_task_timer_started', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      } else if (type === SYNC_EVENTS.TASK_TIMER_PAUSED) {
        window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      } else if (type === SYNC_EVENTS.TASK_TIMER_STOPPED || type === SYNC_EVENTS.TASK_COMPLETED) {
        window.dispatchEvent(new CustomEvent('ems_task_timer_stopped', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      } else if (type === SYNC_EVENTS.SHIFT_CLOCKED_IN) {
        window.dispatchEvent(new CustomEvent('ems_clocked_in', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      } else if (type === SYNC_EVENTS.SHIFT_CLOCKED_OUT) {
        window.dispatchEvent(new CustomEvent('ems_clocked_out', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      } else if (type === SYNC_EVENTS.STORAGE_MUTATION) {
        if (payload?.key) {
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: payload.key } }));
        }
      } else if (type === 'PERMISSIONS_UPDATED' && payload) {
        try {
          const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
          const parsedMap = rawMap ? JSON.parse(rawMap) : {};
          if (payload.employeeId) parsedMap[String(payload.employeeId)] = payload.permissions || {};
          if (payload.employeeCode) parsedMap[String(payload.employeeCode)] = payload.permissions || {};
          if (payload.email) parsedMap[String(payload.email).toLowerCase()] = payload.permissions || {};
          localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(parsedMap));
        } catch (_) {}

        window.dispatchEvent(new CustomEvent('ems_permissions_updated', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'EMS_USER_PERMISSIONS' } }));
      }
    } catch (_) {}
  });

  // 📡 Live Telemetry broadcast from server to instantly update Live Operations
  subscribeSocketEvent('attendance:telemetry', (data) => {
    try {
      window.dispatchEvent(new CustomEvent('ems_telemetry_update', { detail: data }));
    } catch (_) {}
  });
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

  // Also emit through Socket.IO so other devices/browsers receive it in real-time!
  try {
    emitSocketEvent('sync:event', message);
  } catch (e) {}

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
