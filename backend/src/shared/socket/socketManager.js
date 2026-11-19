/**
 * @file socketManager.js
 * @description Centralized Socket.IO Real-Time Synchronization Engine.
 * Enables zero-latency, cross-device instant updates for Timer, Shift Attendance, and Team Chat.
 */

const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Dynamically allow client origin so credentials: true works seamlessly without wildcard CORS rejection
        callback(null, origin || true);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true
    },
    transports: ['polling', 'websocket'],
    maxHttpBufferSize: 1e7,
    pingTimeout: 30000,
    pingInterval: 15000
  });

  io.on('connection', (socket) => {
    // Automatically join the company-wide broadcast room
    socket.join('company');

    // Register user-specific room (verifies token authenticity if token provided, otherwise falls back gracefully)
    socket.on('join:user', (data) => {
      try {
        const { verifyJwt } = require('../utils/authCrypto');
        const token = (data?.token || '').trim();
        const verified = token ? verifyJwt(token) : null;

        if (verified) {
          // Strictly bind to the authenticated token payload
          if (verified.sub) socket.join(`user:${String(verified.sub)}`);
          if (verified.employeeCode) socket.join(`user:${String(verified.employeeCode).toUpperCase()}`);
          if (verified.email) socket.join(`user:${String(verified.email).toLowerCase().trim()}`);
          return;
        }

        // Backward-compatible fallback for un-tokened clients (scoped to provided ID)
        const uid = data?.userId ? String(data.userId) : null;
        const code = data?.employeeCode ? String(data.employeeCode).toUpperCase() : null;
        const email = data?.email ? String(data.email).toLowerCase().trim() : null;
        if (uid) socket.join(`user:${uid}`);
        if (code) socket.join(`user:${code}`);
        if (email) socket.join(`user:${email}`);
      } catch (err) {
        console.warn('[SocketManager] Error in join:user:', err.message);
      }
    });

    // Client heartbeat / ping
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Cross-device / cross-browser real-time synchronization relay
    socket.on('sync:event', (data) => {
      try {
        socket.to('company').emit('sync:event', data);
      } catch (err) {
        console.warn('[SocketManager] Error relaying sync:event:', err.message);
      }
    });

    // 🎙️ WebRTC Real-Time Voice Signaling Relay (Person-to-Person & Group Huddle)
    socket.on('voice:join', (data) => {
      try {
        const { conversationId, user } = data || {};
        if (!conversationId) return;
        const roomName = `voice:${conversationId}`;
        socket.join(roomName);

        // Tell existing participants in this room that a new peer joined
        socket.to(roomName).emit('voice:peer_joined', {
          socketId: socket.id,
          user,
          conversationId
        });
      } catch (err) {
        console.warn('[SocketManager] voice:join error:', err.message);
      }
    });

    socket.on('voice:signal', (data) => {
      try {
        const { targetSocketId, signal, user, conversationId } = data || {};
        if (targetSocketId && io) {
          io.to(targetSocketId).emit('voice:signal', {
            senderSocketId: socket.id,
            signal,
            user,
            conversationId
          });
        }
      } catch (err) {
        console.warn('[SocketManager] voice:signal error:', err.message);
      }
    });

    socket.on('voice:leave', (data) => {
      try {
        const { conversationId, user } = data || {};
        if (!conversationId) return;
        const roomName = `voice:${conversationId}`;
        socket.leave(roomName);
        socket.to(roomName).emit('voice:peer_left', {
          socketId: socket.id,
          user,
          conversationId
        });
      } catch (err) {
        console.warn('[SocketManager] voice:leave error:', err.message);
      }
    });

    socket.on('disconnecting', () => {
      try {
        for (const room of socket.rooms) {
          if (typeof room === 'string' && room.startsWith('voice:')) {
            socket.to(room).emit('voice:peer_left', {
              socketId: socket.id,
              conversationId: room.replace('voice:', '')
            });
          }
        }
      } catch (_) {}
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitToAll(event, data) {
  if (io) {
    try {
      io.to('company').emit(event, data);
    } catch (err) {
      console.warn(`[SocketManager] Failed to emit ${event}:`, err.message);
    }
  }
}

function emitToUser(userIdOrCode, event, data) {
  if (io && userIdOrCode) {
    try {
      io.to(`user:${userIdOrCode}`).emit(event, data);
    } catch (err) {
      console.warn(`[SocketManager] Failed to emit ${event} to ${userIdOrCode}:`, err.message);
    }
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToAll,
  emitToUser
};
