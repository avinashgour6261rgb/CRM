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

const getLocalDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
 * Safe single-item upsert/delete in localStorage mirror (never overwrites scoped collections)
 */
const applySingleItemMutation = (storageKey, payload, codeField = null) => {
  try {
    if (!storageKey || !payload) return;
    const raw = localStorage.getItem(storageKey);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    const action = payload.action || (payload.item ? 'update' : null);
    const item = payload.item || (payload._id ? payload : null);
    const targetId = payload.id || item?._id || item?.id;
    const targetCode = codeField ? (payload[codeField] || item?.[codeField]) : null;

    const matchesItem = (entry) => {
      if (!entry) return false;
      if (targetId && (String(entry._id) === String(targetId) || String(entry.id) === String(targetId))) return true;
      if (codeField && targetCode && entry[codeField] && String(entry[codeField]) === String(targetCode)) return true;
      return false;
    };

    if (action === 'delete') {
      const next = list.filter(entry => !matchesItem(entry));
      localStorage.setItem(storageKey, JSON.stringify(next));
    } else if (item && (action === 'create' || action === 'update' || action === 'comment')) {
      const idx = list.findIndex(matchesItem);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item };
      } else {
        list.unshift(item);
      }
      localStorage.setItem(storageKey, JSON.stringify(list));
    }

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: storageKey, remote: true, action } }));
    window.dispatchEvent(new CustomEvent('ems_remote_sync', { detail: { key: storageKey, action, item, id: targetId } }));
  } catch (err) {
    console.warn(`[RealtimeSync] Failed applying mutation for ${storageKey}:`, err);
  }
};

/**
 * Sync incoming attendance record into localStorage + per-user live timer keys (0ms multi-device same-ID sync)
 */
const syncIncomingAttendanceToStorage = (data) => {
  if (!data) return;
  try {
    const today = getLocalDateStr();
    const empId = data.employeeId || (typeof data.employee === 'object' ? data.employee?._id : data.employee);
    const empCode = data.employeeCode;
    const targetKeys = Array.from(new Set([empId, empCode].filter(Boolean).map(String)));

    // 1. Upsert into KEYS.ATTENDANCE mirror
    try {
      const rawAtt = localStorage.getItem(KEYS.ATTENDANCE);
      let attList = rawAtt ? JSON.parse(rawAtt) : [];
      if (!Array.isArray(attList)) attList = [];
      const recDate = data.date || today;
      const idx = attList.findIndex(a => {
        const sameEmp = (empId && (String(a.employeeId) === String(empId) || String(a.employee?._id || a.employee) === String(empId))) ||
          (empCode && a.employeeCode && String(a.employeeCode).toUpperCase() === String(empCode).toUpperCase());
        return sameEmp && a.date === recDate;
      });
      if (idx !== -1) {
        const prevAtt = attList[idx];
        const incomingWork = Number(data.workSeconds) || 0;
        const prevWork = Number(prevAtt.workSeconds) || 0;
        attList[idx] = {
          ...prevAtt,
          ...data,
          // Never let a partial telemetry packet overwrite positive workSeconds with 0 while clocked in
          workSeconds: (data.isClockedIn && incomingWork === 0 && prevWork > 0) ? prevWork : (data.workSeconds !== undefined ? incomingWork : prevWork)
        };
      } else {
        attList.unshift(data);
      }
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attList));
    } catch (_) {}

    // 2. Sync per-employee live timer keys ONLY for today's shift
    if (!data.date || data.date === today) {
      targetKeys.forEach(k => {
        try {
          localStorage.setItem(`ems_timer_${k}_work_session_date`, today);
          if (data.isClockedIn) {
            localStorage.setItem(`ems_timer_${k}_is_clocked_in`, 'true');
            localStorage.setItem(`ems_timer_${k}_is_running`, data.isOnBreak ? 'false' : 'true');
            localStorage.setItem(`ems_timer_${k}_is_on_break`, data.isOnBreak ? 'true' : 'false');
            localStorage.setItem(`ems_timer_${k}_had_clocked_out`, 'false');
            if (data.clockInTime) localStorage.setItem(`ems_timer_${k}_login_time`, data.clockInTime);
            if (data.clockInTimestamp) localStorage.setItem(`ems_timer_${k}_clock_in_timestamp`, String(data.clockInTimestamp));
            if (data.currentSessionStartTimestamp) localStorage.setItem(`ems_timer_${k}_current_session_start_timestamp`, String(data.currentSessionStartTimestamp));
            if (data.workSeconds !== undefined) {
              const curW = Number(localStorage.getItem(`ems_timer_${k}_work_seconds`)) || 0;
              const incW = Number(data.workSeconds) || 0;
              if (incW > 0 || curW === 0) {
                localStorage.setItem(`ems_timer_${k}_work_seconds`, String(incW));
              }
            }
            if (data.breakSeconds !== undefined) localStorage.setItem(`ems_timer_${k}_break_seconds`, String(data.breakSeconds));
            if (data.breakType) localStorage.setItem(`ems_timer_${k}_break_type`, data.breakType);
            if (Array.isArray(data.punchSessions)) localStorage.setItem(`ems_timer_${k}_punch_sessions`, JSON.stringify(data.punchSessions));
            if (Array.isArray(data.breakHistory)) localStorage.setItem(`ems_timer_${k}_break_history`, JSON.stringify(data.breakHistory));
            localStorage.removeItem(`ems_timer_${k}_clock_out`);
            localStorage.removeItem(`ems_timer_${k}_clockout_time`);
          } else if (data.isClockedOut || data.clockOutTime) {
            const outStr = data.clockOutTime || data.clockOut || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem(`ems_timer_${k}_is_clocked_in`, 'false');
            localStorage.setItem(`ems_timer_${k}_is_running`, 'false');
            localStorage.setItem(`ems_timer_${k}_is_on_break`, 'false');
            localStorage.setItem(`ems_timer_${k}_had_clocked_out`, 'true');
            localStorage.setItem(`ems_timer_${k}_clock_out`, outStr);
            localStorage.setItem(`ems_timer_${k}_clockout_time`, outStr);
            if (data.workSeconds !== undefined) localStorage.setItem(`ems_timer_${k}_work_seconds`, String(data.workSeconds));
            if (Array.isArray(data.punchSessions)) localStorage.setItem(`ems_timer_${k}_punch_sessions`, JSON.stringify(data.punchSessions));
          }
        } catch (_) {}
      });
    }
  } catch (_) {}
};

/**
 * Bridge incoming Socket.IO events across different devices into the local app event bus
 */
if (typeof window !== 'undefined') {
  subscribeSocketEvent('attendance:update', (data) => {
    try {
      syncIncomingAttendanceToStorage(data);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE, remote: true } }));
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
          const today = getLocalDateStr();
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
      if (data && (data._id || data.id)) {
        applySingleItemMutation(KEYS.TASKS, { action: 'update', item: data }, 'taskCode');
      } else {
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS, remote: true } }));
        window.dispatchEvent(new CustomEvent('ems_remote_sync', { detail: { key: KEYS.TASKS, action: 'update' } }));
      }
      if (data?.timerRunning) {
        window.dispatchEvent(new CustomEvent('ems_task_timer_started', { detail: { ...data, remote: true } }));
      } else if (data?.status === 'completed') {
        window.dispatchEvent(new CustomEvent('ems_task_timer_stopped', { detail: { ...data, remote: true } }));
      } else {
        window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: { ...data, remote: true } }));
      }
    } catch (_) {}
  });

  subscribeSocketEvent('task:deleted', (data) => {
    try {
      applySingleItemMutation(KEYS.TASKS, { action: 'delete', id: data?._id || data?.id, taskCode: data?.taskCode }, 'taskCode');
    } catch (_) {}
  });

  subscribeSocketEvent('chat:message', (data) => {
    try {
      const { conversationId, message, conversation } = data || {};
      let foundConv = false;
      if (conversationId && message) {
        try {
          const rawConvs = localStorage.getItem(KEYS.CONVERSATIONS);
          let convList = rawConvs ? JSON.parse(rawConvs) : [];
          if (!Array.isArray(convList)) convList = [];
          const idx = convList.findIndex(c => c.id === conversationId);
          if (idx !== -1) {
            foundConv = true;
            if (!Array.isArray(convList[idx].messages)) convList[idx].messages = [];
            const alreadyExists = convList[idx].messages.some(m => m && m.id && m.id === message.id);
            if (!alreadyExists) {
              convList[idx].messages.push(message);
            }
            convList[idx].lastMessage = message.text || (message.attachments?.length ? `📎 Shared ${message.attachments.length} file(s)` : 'Attachment');
            convList[idx].lastMessageTime = message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            convList[idx].updatedAt = Date.now();
            localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convList));
          } else if (conversation && conversation.id) {
            foundConv = true;
            convList.unshift(conversation);
            localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convList));
          }
        } catch (_) {}

        window.dispatchEvent(new CustomEvent('ems_chat_message_sent', { detail: { message, conversationId } }));
      }

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS, remote: true } }));
      if (!foundConv) {
        window.dispatchEvent(new CustomEvent('ems_remote_sync', { detail: { key: KEYS.CONVERSATIONS, action: 'message' } }));
      }
    } catch (_) {}
  });

  subscribeSocketEvent('chat:conversation:updated', (data) => {
    try {
      const conv = data?.conversation || data;
      if (conv && conv.id) {
        try {
          const rawConvs = localStorage.getItem(KEYS.CONVERSATIONS);
          let convList = rawConvs ? JSON.parse(rawConvs) : [];
          if (!Array.isArray(convList)) convList = [];
          const idx = convList.findIndex(c => c.id === conv.id);
          if (idx !== -1) {
            convList[idx] = { ...convList[idx], ...conv };
          } else {
            convList.unshift(conv);
          }
          localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convList));
        } catch (_) {}
      }
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS, remote: true } }));
      window.dispatchEvent(new CustomEvent('ems_remote_sync', { detail: { key: KEYS.CONVERSATIONS, action: 'update' } }));
    } catch (_) {}
  });

  // 📡 Real-time CRM, Work & HR Entity Synchronization across ALL devices (0ms latency)
  subscribeSocketEvent('lead:updated', (data) => applySingleItemMutation(KEYS.LEADS, data, 'leadCode'));
  subscribeSocketEvent('ticket:updated', (data) => applySingleItemMutation(KEYS.TICKETS, data, 'ticketCode'));
  subscribeSocketEvent('notice:updated', (data) => applySingleItemMutation(KEYS.NOTICES, data, 'noticeCode'));
  subscribeSocketEvent('event:updated', (data) => applySingleItemMutation(KEYS.EVENTS, data));
  subscribeSocketEvent('expense:updated', (data) => applySingleItemMutation(KEYS.EXPENSES, data, 'expenseCode'));
  subscribeSocketEvent('project:updated', (data) => applySingleItemMutation(KEYS.PROJECTS, data, 'projectCode'));
  subscribeSocketEvent('timesheet:updated', (data) => applySingleItemMutation(KEYS.TIMESHEETS, data));
  subscribeSocketEvent('leave:updated', (data) => {
    applySingleItemMutation(KEYS.LEAVES, data);
    window.dispatchEvent(new CustomEvent('ems_leaves_updated', { detail: data || {} }));
  });
  subscribeSocketEvent('holiday:updated', (data) => applySingleItemMutation(KEYS.HOLIDAYS, data));
  subscribeSocketEvent('appreciation:updated', (data) => applySingleItemMutation(KEYS.APPRECIATIONS, data));
  subscribeSocketEvent('employee:updated', (data) => applySingleItemMutation(KEYS.EMPLOYEES, data, 'employeeCode'));
  subscribeSocketEvent('settings:updated', (data) => {
    try {
      if (data?.settings) {
        localStorage.setItem('ems_company_settings', JSON.stringify(data.settings));
      }
      window.dispatchEvent(new CustomEvent('company-settings-updated', { detail: data?.settings || {} }));
    } catch (_) {}
  });

  // 📡 Real-time Company Branding & Work Shift Policy sync across all devices (0ms)
  subscribeSocketEvent('settings:updated', (data) => {
    try {
      const settings = data?.settings || data;
      if (settings && typeof settings === 'object') {
        const existing = (() => {
          try { return JSON.parse(localStorage.getItem('EMS_COMPANY_SETTINGS') || '{}'); } catch { return {}; }
        })();
        const merged = { ...existing, ...settings };
        localStorage.setItem('EMS_COMPANY_SETTINGS', JSON.stringify(merged));
        if (typeof document !== 'undefined' && merged.companyName) {
          document.title = `${merged.companyName} — Enterprise Management System`;
        }
        window.dispatchEvent(new Event('company-settings-updated'));
      }
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
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS, remote: true } }));
      } else if (type === SYNC_EVENTS.TASK_TIMER_PAUSED) {
        window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS, remote: true } }));
      } else if (type === SYNC_EVENTS.TASK_TIMER_STOPPED || type === SYNC_EVENTS.TASK_COMPLETED) {
        window.dispatchEvent(new CustomEvent('ems_task_timer_stopped', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS, remote: true } }));
      } else if (type === SYNC_EVENTS.SHIFT_CLOCKED_IN) {
        syncIncomingAttendanceToStorage({ ...payload, isClockedIn: true });
        window.dispatchEvent(new CustomEvent('ems_clocked_in', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE, remote: true } }));
      } else if (type === SYNC_EVENTS.SHIFT_CLOCKED_OUT) {
        syncIncomingAttendanceToStorage({ ...payload, isClockedIn: false, isClockedOut: true });
        window.dispatchEvent(new CustomEvent('ems_clocked_out', { detail: payload }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE, remote: true } }));
      } else if (type === SYNC_EVENTS.STORAGE_MUTATION) {
        if (payload?.key) {
          // Trigger remote MongoDB refresh on other devices (role-scoped, safe from overwrites)
          window.dispatchEvent(new CustomEvent('ems_remote_sync', { detail: { key: payload.key, action: 'mutation' } }));
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: payload.key, remote: true } }));
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

  // 📡 Live Telemetry broadcast from server to instantly update Live Operations & same-ID devices
  subscribeSocketEvent('attendance:telemetry', (data) => {
    try {
      if (data && (data.employeeId || data.employeeCode)) {
        syncIncomingAttendanceToStorage(data);
      }
      window.dispatchEvent(new CustomEvent('ems_telemetry_update', { detail: data }));
    } catch (_) {}
  });

  // 📡 Real-time Actor Audit Trail broadcast (tracks WHO clocked in/out or ran/paused tasks for WHOM)
  subscribeSocketEvent('attendance:audit:created', (record) => {
    try {
      if (record) {
        applySingleItemMutation(KEYS.ATTENDANCE_AUDIT, { action: 'create', item: record });
      }
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
