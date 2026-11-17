/**
 * @file socketService.js
 * @description Centralized Client-Side Socket.IO Real-Time Synchronization Engine.
 * Provides resilient, zero-latency cross-device synchronization for Shift Clock, Task Timer, and Team Chat.
 */

import { io } from 'socket.io-client';
import { API_BASE } from '../config/apiConfig';

let socket = null;
const eventListeners = new Map();

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
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 3000,
        reconnectionDelayMax: 15000,
        timeout: 20000,
        autoConnect: true
      });

      socket.on('connect', () => {
        // Automatically join user room if session exists
        try {
          const raw = localStorage.getItem('ems_auth_session');
          if (raw) {
            const parsed = JSON.parse(raw);
            const user = parsed?.user || parsed;
            if (user) {
              socket.emit('join:user', {
                userId: user._id || user.id,
                employeeCode: user.employeeCode
              });
            }
          }
        } catch (_) {}
      });

      socket.on('connect_error', (err) => {
        // Silent fallback - app continues seamlessly on LocalStorage
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
 * Register user identity with the socket connection
 */
export function registerSocketUser(user) {
  const s = getSocket();
  if (s && s.connected && user) {
    s.emit('join:user', {
      userId: user._id || user.id,
      employeeCode: user.employeeCode
    });
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

// Automatically start socket connection in browser environments
if (typeof window !== 'undefined') {
  getSocket();
}
