/**
 * @file socketManager.js
 * @description Centralized Socket.IO Real-Time Synchronization Engine.
 * Enables zero-latency, cross-device instant updates for Timer, Shift Attendance, and Team Chat.
 */

const { Server } = require('socket.io');

let dbHelpers = null;
try {
  const callCtrl = require('../../modules/crm/controllers/callHistoryController');
  dbHelpers = callCtrl.dbHelpers;
} catch (e) {
  console.warn('[SocketManager] callHistoryController dbHelpers init:', e.message);
}

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
          if (verified.id) socket.join(`user:${String(verified.id)}`);
          if (verified.employeeCode) socket.join(`user:${String(verified.employeeCode).toUpperCase()}`);
          if (verified.email) socket.join(`user:${String(verified.email).toLowerCase().trim()}`);
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
        const { conversationId, user, callId } = data || {};
        if (!conversationId && !callId) return;
        // Strict Privacy Isolation: 1-on-1 calls lock strictly to call:${callId}
        const roomName = callId ? `call:${callId}` : `voice:${conversationId}`;
        socket.join(roomName);

        // Tell existing participants in this room that a new peer joined
        socket.to(roomName).emit('voice:peer_joined', {
          socketId: socket.id,
          user,
          conversationId,
          callId
        });
      } catch (err) {
        console.warn('[SocketManager] voice:join error:', err.message);
      }
    });

    socket.on('voice:signal', (data) => {
      try {
        const { targetSocketId, signal, user, conversationId, callId } = data || {};
        if (targetSocketId && io) {
          io.to(targetSocketId).emit('voice:signal', {
            senderSocketId: socket.id,
            signal,
            user,
            conversationId,
            callId
          });
        }
      } catch (err) {
        console.warn('[SocketManager] voice:signal error:', err.message);
      }
    });

    socket.on('voice:leave', (data) => {
      try {
        const { conversationId, user, callId } = data || {};
        const roomName = callId ? `call:${callId}` : (conversationId ? `voice:${conversationId}` : null);
        if (roomName) {
          socket.leave(roomName);
          socket.to(roomName).emit('voice:peer_left', {
            socketId: socket.id,
            user,
            conversationId,
            callId
          });
        }
      } catch (err) {
        console.warn('[SocketManager] voice:leave error:', err.message);
      }
    });

    // 📞 WhatsApp-Style Live Voice Calling Engine (Targeted Ringing & Cross-Device Ringtone)
    socket.on('call:initiate', (data) => {
      try {
        const {
          callId,
          caller,
          targetUserId,
          targetEmployeeCode,
          targetEmail,
          conversationId,
          isChannel,
          channelName
        } = data || {};

        const callPayload = {
          callId: callId || `call_${Date.now()}_${caller?.id || 'anon'}`,
          caller,
          conversationId,
          isChannel: Boolean(isChannel),
          channelName: channelName || '',
          callerSocketId: socket.id,
          startedAt: Date.now()
        };

        // Caller joins their own isolated session room
        socket.join(`call:${callPayload.callId}`);

        // Persist call start to MongoDB
        if (dbHelpers?.saveCallStart) {
          dbHelpers.saveCallStart({
            callId: callPayload.callId,
            conversationId,
            caller,
            targetUser: { id: targetUserId, employeeCode: targetEmployeeCode },
            isChannel,
            channelName,
            startedAt: callPayload.startedAt
          });
        }

        if (isChannel) {
          // Channel Broadcast: Ring clocked-in members of this channel
          socket.to(`voice:${conversationId}`).emit('call:incoming', callPayload);
          socket.to(`chat:${conversationId}`).emit('call:incoming', callPayload);
        } else {
          // 1-on-1 Direct Call: Strictly TARGETED delivery to recipient only
          let targeted = false;
          if (targetUserId) {
            io.to(`user:${String(targetUserId)}`).emit('call:incoming', callPayload);
            targeted = true;
          }
          if (targetEmployeeCode) {
            io.to(`user:${String(targetEmployeeCode).toUpperCase()}`).emit('call:incoming', callPayload);
            targeted = true;
          }
          if (targetEmail) {
            io.to(`user:${String(targetEmail).toLowerCase().trim()}`).emit('call:incoming', callPayload);
            targeted = true;
          }
          if (!targeted && conversationId) {
            socket.to(`voice:${conversationId}`).emit('call:incoming', callPayload);
          }
        }
      } catch (err) {
        console.warn('[SocketManager] call:initiate error:', err.message);
      }
    });

    socket.on('call:accept', (data) => {
      try {
        const { callId, conversationId, callerSocketId, callerId, acceptor } = data || {};
        const acceptedPayload = {
          callId,
          conversationId,
          acceptor,
          acceptorSocketId: socket.id,
          acceptedAt: Date.now()
        };

        // Acceptor joins the isolated call session room
        if (callId) {
          socket.join(`call:${callId}`);
        }

        // Persist call acceptance to MongoDB
        if (dbHelpers?.saveCallAccept) {
          dbHelpers.saveCallAccept({
            callId,
            acceptor,
            acceptedAt: acceptedPayload.acceptedAt
          });
        }

        if (callerSocketId) {
          io.to(callerSocketId).emit('call:accepted', acceptedPayload);
        }
        if (callerId) {
          io.to(`user:${String(callerId)}`).emit('call:accepted', acceptedPayload);
        }
      } catch (err) {
        console.warn('[SocketManager] call:accept error:', err.message);
      }
    });

    socket.on('call:decline', (data) => {
      try {
        const { callId, conversationId, callerSocketId, callerId, decliner, reason } = data || {};
        const declinedPayload = {
          callId,
          conversationId,
          decliner,
          reason: reason || 'declined'
        };

        // Persist declined call to MongoDB
        if (dbHelpers?.saveCallEnd) {
          dbHelpers.saveCallEnd({
            callId,
            conversationId,
            status: 'declined',
            endedBy: decliner
          });
        }

        if (callerSocketId) {
          io.to(callerSocketId).emit('call:declined', declinedPayload);
        }
        if (callerId) {
          io.to(`user:${String(callerId)}`).emit('call:declined', declinedPayload);
        }
      } catch (err) {
        console.warn('[SocketManager] call:decline error:', err.message);
      }
    });

    socket.on('call:cancel', (data) => {
      try {
        const { callId, conversationId, targetUserId, targetEmployeeCode, isChannel } = data || {};
        const cancelPayload = { callId, conversationId };

        if (callId) {
          socket.leave(`call:${callId}`);
        }

        // Persist cancelled call to MongoDB
        if (dbHelpers?.saveCallEnd) {
          dbHelpers.saveCallEnd({
            callId,
            conversationId,
            status: 'cancelled'
          });
        }

        if (isChannel) {
          socket.to(`voice:${conversationId}`).emit('call:cancelled', cancelPayload);
          socket.to(`chat:${conversationId}`).emit('call:cancelled', cancelPayload);
        } else {
          if (targetUserId) io.to(`user:${String(targetUserId)}`).emit('call:cancelled', cancelPayload);
          if (targetEmployeeCode) io.to(`user:${String(targetEmployeeCode).toUpperCase()}`).emit('call:cancelled', cancelPayload);
        }
      } catch (err) {
        console.warn('[SocketManager] call:cancel error:', err.message);
      }
    });

    socket.on('call:end', (data) => {
      try {
        const { callId, conversationId, durationSeconds, durationText, endedBy, targetUserId, targetEmployeeCode } = data || {};
        const endPayload = {
          callId,
          conversationId,
          durationSeconds: Number(durationSeconds) || 0,
          durationText: durationText || '0s',
          endedBy
        };

        if (callId) {
          socket.to(`call:${callId}`).emit('call:ended', endPayload);
          socket.leave(`call:${callId}`);
        }
        if (conversationId) {
          socket.to(`voice:${conversationId}`).emit('call:ended', endPayload);
        }
        if (targetUserId) {
          io.to(`user:${String(targetUserId)}`).emit('call:ended', endPayload);
        }
        if (targetEmployeeCode) {
          io.to(`user:${String(targetEmployeeCode).toUpperCase()}`).emit('call:ended', endPayload);
        }

        // Persist call end & duration to MongoDB
        if (dbHelpers?.saveCallEnd) {
          dbHelpers.saveCallEnd({
            callId,
            conversationId,
            durationSeconds: endPayload.durationSeconds,
            durationText: endPayload.durationText,
            status: (endPayload.durationSeconds > 0 ? 'completed' : 'missed'),
            endedBy
          });
        }
      } catch (err) {
        console.warn('[SocketManager] call:end error:', err.message);
      }
    });

    // ✏️ Live In-Chat Typing Indicator Relay
    socket.on('chat:typing', (data) => {
      try {
        const { conversationId, user, isTyping } = data || {};
        if (!conversationId) return;
        const payload = { conversationId, user, isTyping: Boolean(isTyping) };
        socket.to(`chat:${conversationId}`).emit('chat:typing', payload);
        socket.to('company').emit('chat:typing', payload);
      } catch (err) {
        console.warn('[SocketManager] chat:typing error:', err.message);
      }
    });

    // ❤️ Live In-Chat Emoji Reaction Relay
    socket.on('chat:reaction', (data) => {
      try {
        const { conversationId, messageId, reactions, user } = data || {};
        if (!conversationId || !messageId) return;
        const payload = { conversationId, messageId, reactions, user };
        socket.to(`chat:${conversationId}`).emit('chat:message:reacted', payload);
        socket.to('company').emit('chat:message:reacted', payload);
      } catch (err) {
        console.warn('[SocketManager] chat:reaction error:', err.message);
      }
    });

    // 🖥️ WebRTC Live Screen Sharing Relay
    socket.on('screen:start', (data) => {
      try {
        const { conversationId, host, startedAt, targetUserId, isChannel, channelName } = data || {};
        if (!conversationId) return;
        const roomName = `screen:${conversationId}`;
        socket.join(roomName);

        const payload = {
          conversationId,
          host: host || {},
          hostSocketId: socket.id,
          isChannel: Boolean(isChannel),
          channelName: channelName || '',
          startedAt: startedAt || Date.now()
        };

        // Persist screen share session start to MongoDB Atlas
        if (dbHelpers?.saveScreenStart) {
          dbHelpers.saveScreenStart({
            sessionId: `screen_${payload.startedAt}_${host?.id || 'host'}`,
            conversationId,
            host,
            isChannel,
            channelName,
            startedAt: payload.startedAt
          });
        }

        // Targeted emission: In 1-on-1 DM, emit strictly to target user & chat room (no company broadcast leak)
        if (targetUserId) {
          io.to(`user:${String(targetUserId)}`).emit('screen:started', payload);
          socket.to(`chat:${conversationId}`).emit('screen:started', payload);
        } else if (isChannel) {
          socket.to(`chat:${conversationId}`).emit('screen:started', payload);
          socket.to(`voice:${conversationId}`).emit('screen:started', payload);
        } else {
          socket.to(`chat:${conversationId}`).emit('screen:started', payload);
          socket.to(`voice:${conversationId}`).emit('screen:started', payload);
        }
      } catch (err) {
        console.warn('[SocketManager] screen:start error:', err.message);
      }
    });

    socket.on('screen:join', (data) => {
      try {
        const { conversationId, viewer } = data || {};
        if (!conversationId) return;
        const roomName = `screen:${conversationId}`;
        socket.join(roomName);

        // Tell presenter/host in the screen room that a viewer joined and is waiting for stream
        socket.to(roomName).emit('screen:viewer_joined', {
          viewerSocketId: socket.id,
          viewer,
          conversationId
        });
      } catch (err) {
        console.warn('[SocketManager] screen:join error:', err.message);
      }
    });

    socket.on('screen:signal', (data) => {
      try {
        const { targetSocketId, signal, conversationId } = data || {};
        if (targetSocketId && io) {
          io.to(targetSocketId).emit('screen:signal', {
            senderSocketId: socket.id,
            signal,
            conversationId
          });
        }
      } catch (err) {
        console.warn('[SocketManager] screen:signal error:', err.message);
      }
    });

    socket.on('screen:leave', (data) => {
      try {
        const { conversationId } = data || {};
        if (!conversationId) return;
        const roomName = `screen:${conversationId}`;
        socket.leave(roomName);
        socket.to(roomName).emit('screen:viewer_left', {
          viewerSocketId: socket.id,
          conversationId
        });
      } catch (err) {
        console.warn('[SocketManager] screen:leave error:', err.message);
      }
    });

    socket.on('screen:stop', (data) => {
      try {
        const { conversationId, durationSeconds, durationText, targetUserId } = data || {};
        if (!conversationId) return;
        const roomName = `screen:${conversationId}`;
        const stopPayload = { conversationId, durationSeconds, durationText };

        socket.to(roomName).emit('screen:stopped', stopPayload);
        socket.to(`chat:${conversationId}`).emit('screen:stopped', stopPayload);
        if (targetUserId) {
          io.to(`user:${String(targetUserId)}`).emit('screen:stopped', stopPayload);
        }
        socket.leave(roomName);

        // Persist session end to DB
        if (dbHelpers?.saveScreenStop) {
          dbHelpers.saveScreenStop({ conversationId, durationSeconds, durationText });
        }
      } catch (err) {
        console.warn('[SocketManager] screen:stop error:', err.message);
      }
    });

    socket.on('disconnecting', () => {
      try {
        for (const room of socket.rooms) {
          if (typeof room === 'string' && room.startsWith('call:')) {
            const callId = room.replace('call:', '');
            socket.to(room).emit('call:ended', { callId, reason: 'peer_disconnected' });
            socket.to(room).emit('voice:peer_left', { socketId: socket.id, callId });
          }
          if (typeof room === 'string' && room.startsWith('voice:')) {
            socket.to(room).emit('voice:peer_left', {
              socketId: socket.id,
              conversationId: room.replace('voice:', '')
            });
          }
          if (typeof room === 'string' && room.startsWith('screen:')) {
            const convId = room.replace('screen:', '');
            socket.to(room).emit('screen:viewer_left', {
              viewerSocketId: socket.id,
              conversationId: convId
            });
            // If the host disconnected, broadcast stopped so viewers modal closes
            socket.to(room).emit('screen:stopped', { conversationId: convId });
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
