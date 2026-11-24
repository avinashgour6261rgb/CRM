/**
 * @file socketService.js
 * @description Centralized Client-Side Socket.IO Real-Time Synchronization Engine.
 * Provides resilient, zero-latency cross-device synchronization for Shift Clock, Task Timer, and Team Chat.
 */

import { io } from 'socket.io-client';
import { API_BASE } from '../config/apiConfig';

let socket = null;
let hasConnectedOnce = false;
let registeredUserPayload = null;
const eventListeners = new Map();

function buildUserJoinPayload(user) {
  if (!user) return null;
  const userId = user._id || user.id || null;
  const employeeCode = user.employeeCode || null;
  const email = user.email ? String(user.email).toLowerCase().trim() : null;
  const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('ems_auth_token') || null) : null;
  if (!userId && !employeeCode && !email && !token) return null;
  return { userId, employeeCode, email, token };
}

function getStoredUserJoinPayload() {
  try {
    const raw = localStorage.getItem('ems_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      return buildUserJoinPayload(parsed?.user || parsed);
    }
  } catch (_) {}
  return null;
}

/**
 * Derive clean socket server URL from API_BASE
 */
function getSocketServerUrl() {
  if (typeof window === 'undefined') return '';
  if (!API_BASE || API_BASE.startsWith('/')) {
    return window.location.origin;
  }
  return API_BASE.replace(/\/api\/?$/, '');
}

/**
 * Initialize or get active Socket.IO connection
 */
export function getSocket() {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    const serverUrl = getSocketServerUrl();
    try {
      socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 15000,
        timeout: 20000,
        autoConnect: true
      });

      socket.on('connect', () => {
        const isReconnect = hasConnectedOnce;
        hasConnectedOnce = true;

        // Automatically join user room (supports same ID on multiple devices)
        try {
          const payload = registeredUserPayload || getStoredUserJoinPayload();
          if (payload) {
            socket.emit('join:user', payload);
          }
        } catch (_) {}

        // On reconnect after offline/sleep, notify contexts to pull any missed updates
        if (isReconnect) {
          try {
            window.dispatchEvent(new CustomEvent('ems_socket_reconnected', { detail: { timestamp: Date.now() } }));
          } catch (_) {}
        }
      });

      socket.on('connect_error', () => {
        // Silent fallback - auto-reconnection keeps retrying until backend is reachable
      });

      // Hook registered listeners
      eventListeners.forEach((callbacks, eventName) => {
        socket.on(eventName, (data) => {
          callbacks.forEach(cb => {
            try { cb(data); } catch (e) { console.warn(`[SocketService] Error in ${eventName} callback:`, e); }
          });
        });
      });
    } catch (err) {
      console.warn('[SocketService] Failed to initialize socket:', err.message);
      return null;
    }
  }

  return socket;
}

/**
 * Register user identity with the socket connection (joins user-specific multi-device rooms)
 */
export function registerSocketUser(user) {
  const payload = buildUserJoinPayload(user);
  registeredUserPayload = payload;
  const s = getSocket();
  if (s && s.connected && payload) {
    s.emit('join:user', payload);
  }
}

/**
 * Emit an event across the socket connection
 * @param {string} eventName
 * @param {any} data
 */
export function emitSocketEvent(eventName, data) {
  const s = getSocket();
  if (s) {
    if (!s.connected) {
      try { s.connect(); } catch (_) {}
    }
    try {
      s.emit(eventName, data);
    } catch (err) {
      console.warn(`[SocketService] Failed to emit ${eventName}:`, err.message);
    }
  }
}

/**
 * Subscribe to a specific socket event
 * @param {string} eventName
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeSocketEvent(eventName, callback) {
  if (!eventListeners.has(eventName)) {
    eventListeners.set(eventName, new Set());
    const s = getSocket();
    if (s) {
      s.on(eventName, (data) => {
        const cbs = eventListeners.get(eventName);
        if (cbs) {
          cbs.forEach(cb => {
            try { cb(data); } catch (e) { console.warn(`[SocketService] Error in ${eventName} listener:`, e); }
          });
        }
      });
    }
  }

  eventListeners.get(eventName).add(callback);

  return () => {
    const cbs = eventListeners.get(eventName);
    if (cbs) {
      cbs.delete(callback);
      if (cbs.size === 0) {
        eventListeners.delete(eventName);
        if (socket) socket.off(eventName);
      }
    }
  };
}

export const subscribeToSocketEvent = subscribeSocketEvent;

export function isSocketConnected() {
  return Boolean(socket && socket.connected);
}

/**
 * Checks if a live audio/video call or screen-share session is active.
 * Used to avoid disconnecting sockets while user is in a meeting or receiving a call.
 */
function isCallOrScreenShareActive() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    // 1. Pending accepted call or screenshare session in sessionStorage
    if (sessionStorage.getItem('ems_pending_accepted_call') || sessionStorage.getItem('ems_pending_watch_screen')) {
      return true;
    }
    // 2. Incoming call or screenshare modal present in DOM
    const callModal = document.querySelector('[data-call-modal="true"]') ||
                      document.querySelector('.incoming-call-modal') ||
                      document.querySelector('[data-call-active="true"]');
    if (callModal) return true;

    // 3. Any active media stream with live audio/video tracks
    const mediaEls = document.querySelectorAll('audio, video');
    for (const el of mediaEls) {
      if (el.srcObject && typeof el.srcObject.getTracks === 'function') {
        const hasLiveTrack = el.srcObject.getTracks().some(t => t.readyState === 'live');
        if (hasLiveTrack) return true;
      }
    }

    // 4. Global window flags
    if (window.__ems_active_call || window.__ems_active_screenshare) {
      return true;
    }
  } catch (_) {}
  return false;
}

let idleDisconnectTimer = null;
const IDLE_DISCONNECT_DELAY_MS = 15 * 60 * 1000; // 15 minutes

function clearIdleTimer() {
  if (idleDisconnectTimer) {
    clearTimeout(idleDisconnectTimer);
    idleDisconnectTimer = null;
  }
}

/**
 * Resumes socket connection immediately when user returns to tab
 */
export function resumeSocketConnection() {
  clearIdleTimer();
  if (socket && !socket.connected) {
    try {
      socket.connect();
    } catch (err) {
      console.warn('[SocketService] Error reconnecting socket:', err);
    }
  }
}

function handleVisibilityOrFocusChange() {
  if (typeof document === 'undefined') return;

  if (document.visibilityState === 'hidden') {
    clearIdleTimer();
    idleDisconnectTimer = setTimeout(() => {
      if (document.visibilityState === 'hidden' && !isCallOrScreenShareActive()) {
        if (socket && socket.connected) {
          console.log('[SocketService] Tab hidden for 15m without active call. Pausing socket to allow server sleep.');
          socket.disconnect();
        }
      }
    }, IDLE_DISCONNECT_DELAY_MS);
  } else {
    resumeSocketConnection();
  }
}

let isIdleListenersSetup = false;
function setupIdleSocketManagement() {
  if (isIdleListenersSetup || typeof window === 'undefined' || typeof document === 'undefined') return;
  isIdleListenersSetup = true;

  document.addEventListener('visibilitychange', handleVisibilityOrFocusChange);
  window.addEventListener('focus', resumeSocketConnection);
}

// Automatically start socket connection in browser environments & wire idle watcher
if (typeof window !== 'undefined') {
  getSocket();
  setupIdleSocketManagement();
}
