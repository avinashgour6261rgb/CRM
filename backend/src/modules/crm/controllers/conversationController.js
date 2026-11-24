/**
 * @file conversationController.js
 * @description Controller for Team Chat Conversations, Channels & Real-time Messaging in MongoDB Atlas.
 */

const Conversation = require('../models/Conversation');
const { getIstTimeString } = require('../../../shared/utils/dateUtils');

function emitConversationEvent(conv, event, data) {
  try {
    const { emitToAll, emitToUser } = require('../../../shared/socket/socketManager');
    const isDm = conv && (conv.type === 'dm' || (!conv.type && !String(conv.id || '').startsWith('channel_')));
    if (isDm && Array.isArray(conv.participants) && conv.participants.length > 0) {
      const seen = new Set();
      conv.participants.forEach(p => {
        if (!p) return;
        const ids = [];
        if (typeof p === 'object') {
          if (p._id) ids.push(String(p._id));
          if (p.id) ids.push(String(p.id));
          if (p.employeeCode) ids.push(String(p.employeeCode));
        } else {
          ids.push(String(p));
        }
        ids.forEach(id => {
          if (id && !seen.has(id)) {
            seen.add(id);
            emitToUser(id, event, data);
          }
        });
      });
    } else {
      emitToAll(event, data);
    }
  } catch (_) {}
}

const SEED_CHANNELS = [
  {
    id: 'channel_general',
    type: 'channel',
    name: 'General',
    channelName: '#general',
    description: 'Company-wide open discussion, daily greetings, and team collaboration',
    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120',
    members: ['all'],
    isOnline: true,
    lastMessage: 'Welcome to Inforag Technology official workspace chat!',
    lastMessageTime: '09:00 AM',
    unreadCount: 0,
    messages: [
      {
        id: 'msg_gen_init',
        conversationId: 'channel_general',
        senderId: 'ADM-001',
        senderName: 'Inforag Admin',
        senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
        senderRole: 'Administrator',
        text: '👋 Welcome everyone to the Inforag Technology company chat! Feel free to collaborate, share project updates, photos, videos, documents, and connect with teammates.',
        attachments: [],
        timestamp: '09:00 AM',
        createdAt: 1730000000000,
        readBy: ['ADM-001']
      }
    ]
  },
  {
    id: 'channel_it_dev',
    type: 'channel',
    name: 'IT & Software Development',
    channelName: '#it-software-development',
    description: 'Code architecture, sprint deliverables, bug fixes & tech stack updates',
    avatar: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=120',
    members: ['all_it'],
    isOnline: true,
    lastMessage: 'All sprint environments are live and operational.',
    lastMessageTime: '09:15 AM',
    unreadCount: 0,
    messages: [
      {
        id: 'msg_it_init',
        conversationId: 'channel_it_dev',
        senderId: 'ADM-001',
        senderName: 'Inforag Admin',
        senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
        senderRole: 'Administrator',
        text: '💻 IT & Software Development channel is active. Share code files, pull request reviews, architecture diagrams, and testing logs here.',
        attachments: [],
        timestamp: '09:15 AM',
        createdAt: 1730000100000,
        readBy: ['ADM-001']
      }
    ]
  },
  {
    id: 'channel_marketing',
    type: 'channel',
    name: 'Digital Marketing & Growth',
    channelName: '#digital-marketing',
    description: 'Campaigns, SEO, PPC Ads, SMM, copywriting and creative design discussions',
    avatar: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=120',
    members: ['all_marketing'],
    isOnline: true,
    lastMessage: 'Weekly campaign creatives and review assets.',
    lastMessageTime: '10:30 AM',
    unreadCount: 0,
    messages: [
      {
        id: 'msg_mkt_init',
        conversationId: 'channel_marketing',
        senderId: 'ADM-001',
        senderName: 'Inforag Admin',
        senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
        senderRole: 'Administrator',
        text: '🚀 Digital Marketing hub is ready! Share campaign creatives, Google & Meta Ads performance reports, SEO audit sheets, and copy decks.',
        attachments: [],
        timestamp: '10:30 AM',
        createdAt: 1730000200000,
        readBy: ['ADM-001']
      }
    ]
  },
  {
    id: 'channel_announcements',
    type: 'channel',
    name: 'Company Announcements',
    channelName: '#announcements',
    description: 'Official corporate notices, policy updates, and executive announcements',
    avatar: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=120',
    members: ['all'],
    isOnline: true,
    lastMessage: 'Official guidelines and company updates.',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    messages: [
      {
        id: 'msg_ann_init',
        conversationId: 'channel_announcements',
        senderId: 'ADM-001',
        senderName: 'HR & Executive Team',
        senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
        senderRole: 'Executive',
        text: '📢 This channel is reserved for official Inforag Technology company-wide announcements, policy rollouts, and holiday reminders.',
        attachments: [],
        timestamp: 'Yesterday',
        createdAt: 1729900000000,
        readBy: ['ADM-001']
      }
    ]
  }
];

const stripHeavyAttachmentData = (convObj, isLite) => {
  if (!convObj || !Array.isArray(convObj.messages)) return convObj;
  // Cap messages per conversation to latest 40 messages to save RAM and bandwidth
  if (convObj.messages.length > 40) {
    convObj.messages = convObj.messages.slice(-40);
  }
  convObj.messages = convObj.messages.map(m => {
    if (!m || !Array.isArray(m.attachments) || m.attachments.length === 0) return m;
    return {
      ...m,
      attachments: m.attachments.map(att => {
        if (!att) return att;
        const rawLen = typeof att.dataUrl === 'string' ? att.dataUrl.length : 0;
        if (rawLen > 500) {
          return {
            ...att,
            dataUrl: '',
            hasFullMedia: true,
            conversationId: convObj.id
          };
        }
        return att;
      })
    };
  });
  return convObj;
};

exports.getConversations = async (req, res) => {
  try {
    const isLite = req.query.lite === '1' || req.query.lite === 'true';
    let convs = await Conversation.find().sort({ updatedAt: -1 }).lean();

    if (!convs || convs.length === 0) {
      await Conversation.insertMany(SEED_CHANNELS);
      convs = await Conversation.find().sort({ updatedAt: -1 }).lean();
    }

    const userId = req.headers['x-user-id'] || req.user?.id || req.user?._id;
    const userCode = req.headers['x-user-code'] || req.user?.employeeCode;
    const userEmail = req.headers['x-user-email'] || req.user?.email;

    const userIdentifiers = [userId, userCode, userEmail]
      .filter(Boolean)
      .map(id => String(id).toLowerCase().trim());

    if (userIdentifiers.length > 0) {
      convs = convs.filter(c => {
        if (c.type === 'channel') return true;
        if (Array.isArray(c.participants) && c.participants.length > 0) {
          return c.participants.some(p => {
            const pStr = String(p).toLowerCase().trim();
            return userIdentifiers.includes(pStr);
          });
        }
        const pId = String(c.participantId || '').toLowerCase().trim();
        const pCode = String(c.participantCode || '').toLowerCase().trim();
        const pEmail = String(c.participantEmail || '').toLowerCase().trim();
        const cId = String(c.createdBy || '').toLowerCase().trim();
        const cCode = String(c.creatorCode || '').toLowerCase().trim();

        return userIdentifiers.some(u => [pId, pCode, pEmail, cId, cCode].includes(u));
      });
    }

    // Clean and deduplicate messages across conversations to eliminate database-level duplicate keys
    convs = convs.map(c => {
      const convObj = c.toObject ? c.toObject() : c;
      if (Array.isArray(convObj.messages)) {
        const seen = new Set();
        const dedupedMsgs = [];
        for (const m of convObj.messages) {
          if (!m) continue;
          const k = m.id || `${m.senderId || ''}_${m.createdAt || ''}_${m.text || ''}`;
          if (!seen.has(k)) {
            seen.add(k);
            dedupedMsgs.push(m);
          }
        }
        if (dedupedMsgs.length !== convObj.messages.length) {
          convObj.messages = dedupedMsgs;
          // Async background cleanup in MongoDB Atlas
          Conversation.updateOne({ id: convObj.id }, { $set: { messages: dedupedMsgs } }).catch(() => {});
        }
      }
      return stripHeavyAttachmentData(convObj);
    });

    res.json({
      success: true,
      data: convs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMessageAttachments = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const conv = await Conversation.findOne({ id }).lean();
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    const msg = (conv.messages || []).find(m => String(m.id || '') === String(messageId));
    if (!msg || !Array.isArray(msg.attachments)) {
      return res.status(404).json({ success: false, message: 'Message or attachments not found' });
    }
    res.set('Cache-Control', 'private, max-age=86400');
    res.json({
      success: true,
      data: msg.attachments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAttachmentMedia = async (req, res) => {
  try {
    const { id, attId } = req.params;
    const conv = await Conversation.findOne({ id }).lean();
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    let foundAtt = null;
    for (const msg of (conv.messages || [])) {
      if (!Array.isArray(msg?.attachments)) continue;
      const match = msg.attachments.find(a => String(a?.id || '') === String(attId));
      if (match) {
        foundAtt = match;
        break;
      }
    }
    if (!foundAtt) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }
    res.set('Cache-Control', 'private, max-age=86400');
    res.json({
      success: true,
      data: {
        id: foundAtt.id,
        name: foundAtt.name,
        category: foundAtt.category,
        mimeType: foundAtt.mimeType,
        sizeFormatted: foundAtt.sizeFormatted,
        sizeBytes: foundAtt.sizeBytes,
        thumbDataUrl: foundAtt.thumbDataUrl || '',
        dataUrl: foundAtt.dataUrl || ''
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createConversation = async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) {
      return res.status(400).json({ success: false, message: 'Conversation id is required' });
    }

    let conv = await Conversation.findOne({ id: data.id });
    if (conv) {
      // Update metadata if exists
      Object.assign(conv, data);
      await conv.save();
      emitConversationEvent(conv, 'chat:conversation:updated', { conversation: conv });
      return res.json({ success: true, data: conv, message: 'Conversation updated' });
    }

    conv = new Conversation(data);
    await conv.save();
    emitConversationEvent(conv, 'chat:conversation:updated', { conversation: conv });
    res.status(201).json({ success: true, data: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = req.body;

    let conv = await Conversation.findOne({ id });
    if (!conv) {
      // Auto-upsert conversation container if missing
      conv = new Conversation({
        id,
        type: id.startsWith('channel_') ? 'channel' : 'dm',
        channelName: id.startsWith('channel_') ? `#${id.replace('channel_', '')}` : undefined,
        name: id.startsWith('channel_') ? id.replace('channel_', '') : undefined,
        participants: message.participants || [message.senderId],
        messages: [message],
        lastMessage: message.text || (message.attachments?.length ? `📎 Shared ${message.attachments.length} file(s)` : 'Attachment'),
        lastMessageTime: message.timestamp || getIstTimeString()
      });
      await conv.save();
      emitConversationEvent(conv, 'chat:message', { conversationId: id, message, conversation: conv });
      return res.status(201).json({ success: true, data: conv });
    }

    // Deduplicate existing messages in MongoDB document
    const seenMsgKeys = new Set();
    const cleanExisting = [];
    (conv.messages || []).forEach(m => {
      if (!m) return;
      const k = m.id || `${m.senderId || ''}_${m.createdAt || ''}_${m.text || ''}`;
      if (!seenMsgKeys.has(k)) {
        seenMsgKeys.add(k);
        cleanExisting.push(m);
      }
    });
    conv.messages = cleanExisting;

    // Check if message is already recorded to avoid duplicates
    const alreadyExists = conv.messages.some(m => m.id === message.id);
    if (!alreadyExists) {
      conv.messages.push(message);
    }

    // Cap message history to latest 300 messages per conversation to preserve MongoDB 16MB document boundary
    if (conv.messages.length > 300) {
      conv.messages = conv.messages.slice(-300);
    }

    conv.lastMessage = message.text || (message.attachments?.length ? `📎 Shared ${message.attachments.length} file(s)` : 'Attachment');
    conv.lastMessageTime = message.timestamp || getIstTimeString();

    await conv.save();
    try {
      const socketMessage = Array.isArray(message?.attachments) && message.attachments.length > 0
        ? {
            ...message,
            attachments: message.attachments.map(att => {
              if (att && typeof att.dataUrl === 'string' && att.dataUrl.length > 40000) {
                return { ...att, dataUrl: '', hasFullMedia: true, conversationId: id };
              }
              return att;
            })
          }
        : message;
      emitConversationEvent(conv, 'chat:message', { conversationId: id, message: socketMessage });
    } catch (_) {}
    res.json({ success: true, data: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.body?.userId || req.user?.id || req.user?._id;
    const userCode = req.headers['x-user-code'] || req.user?.employeeCode;
    const userEmail = req.headers['x-user-email'] || req.user?.email;
    if (!userId && !userCode) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const conv = await Conversation.findOne({ id });
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const identifiers = [userId, userCode, userEmail].filter(Boolean).map(x => String(x).toLowerCase().trim());
    let updated = false;

    if (Array.isArray(conv.messages)) {
      conv.messages.forEach(msg => {
        if (!Array.isArray(msg.readBy)) msg.readBy = [];
        const hasRead = msg.readBy.some(r => identifiers.includes(String(r).toLowerCase().trim()));
        if (!hasRead) {
          if (userId) msg.readBy.push(String(userId));
          if (userCode && String(userCode) !== String(userId)) msg.readBy.push(String(userCode));
          updated = true;
        }
      });
    }

    if (updated) {
      await conv.save();
      emitConversationEvent(conv, 'chat:conversation:updated', { conversation: conv });
    }

    res.json({ success: true, data: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.syncBatch = async (req, res) => {
  try {
    const { conversations: batchConvs } = req.body;
    if (!Array.isArray(batchConvs) || batchConvs.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    let syncedCount = 0;
    for (const item of batchConvs) {
      if (!item.id) continue;
      let existing = await Conversation.findOne({ id: item.id });
      if (!existing) {
        existing = new Conversation(item);
        await existing.save();
        syncedCount++;
      } else {
        // Merge messages if remote has fewer
        const remoteMsgIds = new Set(existing.messages.map(m => m.id));
        let addedMsg = false;
        (item.messages || []).forEach(m => {
          if (!remoteMsgIds.has(m.id)) {
            existing.messages.push(m);
            addedMsg = true;
          }
        });
        if (addedMsg) {
          existing.lastMessage = item.lastMessage || existing.lastMessage;
          existing.lastMessageTime = item.lastMessageTime || existing.lastMessageTime;
          await existing.save();
          syncedCount++;
        }
      }
    }

    res.json({ success: true, count: syncedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const conv = await Conversation.findOne({ id });
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (Array.isArray(conv.messages)) {
      conv.messages = conv.messages.filter(m => m && String(m.id) !== String(messageId));

      if (conv.messages.length > 0) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        conv.lastMessage = lastMsg.text || (lastMsg.attachments?.length ? `📎 Shared ${lastMsg.attachments.length} file(s)` : 'Attachment');
        conv.lastMessageTime = lastMsg.timestamp || '';
      } else {
        conv.lastMessage = '';
        conv.lastMessageTime = '';
      }

      await conv.save();
      emitConversationEvent(conv, 'chat:message:deleted', { conversationId: id, messageId });
    }

    res.json({ success: true, messageId, conversationId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reactToMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { emoji, user } = req.body || {};
    if (!emoji || !user) {
      return res.status(400).json({ success: false, message: 'Emoji and user details are required' });
    }

    const conv = await Conversation.findOne({ id });
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const userId = String(user.id || user._id || user.employeeCode || 'anon');
    const userName = user.name || 'Teammate';

    let updatedReactions = [];
    if (Array.isArray(conv.messages)) {
      const msg = conv.messages.find(m => m && String(m.id) === String(messageId));
      if (msg) {
        if (!Array.isArray(msg.reactions)) msg.reactions = [];

        const existingReactionIndex = msg.reactions.findIndex(r => r.emoji === emoji);
        if (existingReactionIndex !== -1) {
          const r = msg.reactions[existingReactionIndex];
          const userIdx = (r.users || []).findIndex(u => String(u?.id || u) === userId);
          if (userIdx !== -1) {
            r.users.splice(userIdx, 1);
            if (r.users.length === 0) {
              msg.reactions.splice(existingReactionIndex, 1);
            }
          } else {
            r.users.push({ id: userId, name: userName });
          }
        } else {
          msg.reactions.push({
            emoji,
            users: [{ id: userId, name: userName }]
          });
        }
        updatedReactions = msg.reactions;
        await conv.save();
        emitConversationEvent(conv, 'chat:message:reacted', {
          conversationId: id,
          messageId,
          reactions: updatedReactions,
          user
        });
      }
    }

    res.json({ success: true, conversationId: id, messageId, reactions: updatedReactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
