/**
 * @file callHistoryController.js
 * @description Enterprise Call & Screen Share History Controller.
 * Provides REST API endpoints and direct Socket-integrated database persistence for call/screen sessions.
 * ZERO audio / video stored — strictly lightweight audit records on MongoDB Atlas.
 */

const CallLog = require('../models/CallLog');
const ScreenShareLog = require('../models/ScreenShareLog');

// ── Direct Database Helpers for Socket.IO Integration ──

async function saveCallStart({ callId, conversationId, caller, targetUser, isChannel, channelName, startedAt }) {
  try {
    if (!callId) return null;
    const doc = await CallLog.findOneAndUpdate(
      { callId },
      {
        callId,
        conversationId: conversationId || 'conv_general',
        isChannel: Boolean(isChannel),
        channelName: channelName || '',
        caller: {
          id: String(caller?.id || caller?._id || 'caller'),
          name: caller?.name || 'Teammate',
          employeeCode: caller?.employeeCode || '',
          avatar: caller?.avatar || '',
          role: caller?.role || 'Team Member'
        },
        receiver: targetUser ? {
          id: String(targetUser.id || targetUser._id || ''),
          name: targetUser.name || '',
          employeeCode: targetUser.employeeCode || '',
          avatar: targetUser.avatar || '',
          role: targetUser.role || 'Team Member'
        } : {},
        status: 'in_progress',
        startedAt: startedAt ? new Date(startedAt) : new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc;
  } catch (err) {
    console.warn('[CallHistory] saveCallStart DB error:', err.message);
    return null;
  }
}

async function saveCallAccept({ callId, acceptor, acceptedAt }) {
  try {
    if (!callId) return null;
    const update = {
      acceptedAt: acceptedAt ? new Date(acceptedAt) : new Date()
    };
    if (acceptor) {
      update.receiver = {
        id: String(acceptor.id || acceptor._id || ''),
        name: acceptor.name || '',
        employeeCode: acceptor.employeeCode || '',
        avatar: acceptor.avatar || '',
        role: acceptor.role || 'Team Member'
      };
    }
    return await CallLog.findOneAndUpdate({ callId }, update, { new: true });
  } catch (err) {
    console.warn('[CallHistory] saveCallAccept DB error:', err.message);
    return null;
  }
}

async function saveCallEnd({ callId, conversationId, durationSeconds, durationText, status = 'completed', endedBy }) {
  try {
    if (!callId) return null;
    const finalStatus = status || (durationSeconds > 0 ? 'completed' : 'missed');
    return await CallLog.findOneAndUpdate(
      { callId },
      {
        status: finalStatus,
        endedAt: new Date(),
        durationSeconds: Number(durationSeconds) || 0,
        durationText: durationText || `${Math.floor((Number(durationSeconds) || 0) / 60)}m ${(Number(durationSeconds) || 0) % 60}s`
      },
      { new: true }
    );
  } catch (err) {
    console.warn('[CallHistory] saveCallEnd DB error:', err.message);
    return null;
  }
}

async function saveScreenStart({ sessionId, conversationId, host, isChannel, channelName, startedAt }) {
  try {
    if (!sessionId && !conversationId) return null;
    const sid = sessionId || `screen_${Date.now()}_${host?.id || 'host'}`;
    const doc = await ScreenShareLog.findOneAndUpdate(
      { sessionId: sid },
      {
        sessionId: sid,
        conversationId: conversationId || 'conv_general',
        isChannel: Boolean(isChannel),
        channelName: channelName || '',
        host: {
          id: String(host?.id || host?._id || 'host'),
          name: host?.name || 'Teammate',
          employeeCode: host?.employeeCode || '',
          avatar: host?.avatar || '',
          role: host?.role || 'Team Member'
        },
        viewersCount: 0,
        viewers: [],
        startedAt: startedAt ? new Date(startedAt) : new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc;
  } catch (err) {
    console.warn('[CallHistory] saveScreenStart DB error:', err.message);
    return null;
  }
}

async function saveScreenStop({ sessionId, conversationId, durationSeconds, durationText }) {
  try {
    const filter = sessionId ? { sessionId } : { conversationId, endedAt: null };
    return await ScreenShareLog.findOneAndUpdate(
      filter,
      {
        endedAt: new Date(),
        durationSeconds: Number(durationSeconds) || 0,
        durationText: durationText || '0s'
      },
      { new: true, sort: { createdAt: -1 } }
    );
  } catch (err) {
    console.warn('[CallHistory] saveScreenStop DB error:', err.message);
    return null;
  }
}

// ── REST API Controllers ──

exports.getCallHistory = async (req, res) => {
  try {
    const { conversationId, limit = 50 } = req.query;
    const filter = {};
    if (conversationId) {
      filter.conversationId = conversationId;
    } else if (req.user && !req.user.isAdmin) {
      const myId = String(req.user._id || req.user.id || req.user.employeeCode);
      filter.$or = [
        { 'caller.id': myId },
        { 'receiver.id': myId },
        { isChannel: true }
      ];
    }

    const calls = await CallLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(100, Number(limit)));

    res.json({ success: true, count: calls.length, data: calls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logCall = async (req, res) => {
  try {
    const { callId, conversationId, caller, receiver, status, durationSeconds, durationText, isChannel, channelName } = req.body;
    if (!callId || !conversationId) {
      return res.status(400).json({ success: false, message: 'callId and conversationId are required' });
    }

    const doc = await CallLog.findOneAndUpdate(
      { callId },
      {
        callId,
        conversationId,
        isChannel: Boolean(isChannel),
        channelName: channelName || '',
        caller,
        receiver,
        status: status || 'completed',
        durationSeconds: Number(durationSeconds) || 0,
        durationText: durationText || '0s',
        endedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getScreenShareHistory = async (req, res) => {
  try {
    const { conversationId, limit = 50 } = req.query;
    const filter = {};
    if (conversationId) {
      filter.conversationId = conversationId;
    } else if (req.user && !req.user.isAdmin && req.user.role !== 'Administrator') {
      const myId = String(req.user._id || req.user.id || req.user.employeeCode);
      filter.$or = [
        { 'host.id': myId },
        { 'host._id': myId },
        { isChannel: true }
      ];
    }

    const screens = await ScreenShareLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(100, Number(limit)));

    res.json({ success: true, count: screens.length, data: screens });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logScreenShare = async (req, res) => {
  try {
    const { sessionId, conversationId, host, durationSeconds, durationText, isChannel, channelName, viewersCount } = req.body;
    const sid = sessionId || `screen_${Date.now()}_${host?.id || 'host'}`;

    const doc = await ScreenShareLog.findOneAndUpdate(
      { sessionId: sid },
      {
        sessionId: sid,
        conversationId,
        isChannel: Boolean(isChannel),
        channelName: channelName || '',
        host,
        durationSeconds: Number(durationSeconds) || 0,
        durationText: durationText || '0s',
        viewersCount: Number(viewersCount) || 0,
        endedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Export internal DB helper functions for Socket.IO
exports.dbHelpers = {
  saveCallStart,
  saveCallAccept,
  saveCallEnd,
  saveScreenStart,
  saveScreenStop
};
