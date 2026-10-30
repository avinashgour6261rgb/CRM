/**
 * @file conversationController.js
 * @description Controller for Team Chat Conversations, Channels & Real-time Messaging in MongoDB Atlas.
 */

const Conversation = require('../models/Conversation');

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
    lastMessageTime: '09:30 AM',
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
        timestamp: '09:30 AM',
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

exports.getConversations = async (req, res) => {
  try {
    let convs = await Conversation.find().sort({ updatedAt: -1 });

    if (!convs || convs.length === 0) {
      await Conversation.insertMany(SEED_CHANNELS);
      convs = await Conversation.find().sort({ updatedAt: -1 });
    }

    const userId = req.headers['x-user-id'] || req.user?.id;
    if (userId) {
      const uStr = String(userId).toLowerCase();
      convs = convs.filter(c => {
        if (c.type === 'channel') return true;
        if (Array.isArray(c.participants) && c.participants.length > 0) {
          return c.participants.some(p => String(p).toLowerCase() === uStr);
        }
        return (
          String(c.participantId || '').toLowerCase() === uStr ||
          String(c.participantCode || '').toLowerCase() === uStr ||
          String(c.createdBy || '').toLowerCase() === uStr
        );
      });
    }

    res.json({
      success: true,
      data: convs
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
      return res.json({ success: true, data: conv, message: 'Conversation updated' });
    }

    conv = new Conversation(data);
    await conv.save();
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
        lastMessageTime: message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      await conv.save();
      return res.status(201).json({ success: true, data: conv });
    }

    // Check if message is already recorded to avoid duplicates
    const alreadyExists = conv.messages.some(m => m.id === message.id);
    if (!alreadyExists) {
      conv.messages.push(message);
    }

    conv.lastMessage = message.text || (message.attachments?.length ? `📎 Shared ${message.attachments.length} file(s)` : 'Attachment');
    conv.lastMessageTime = message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await conv.save();
    res.json({ success: true, data: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.body?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const conv = await Conversation.findOne({ id });
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const uStr = String(userId).toLowerCase();
    let updated = false;

    if (Array.isArray(conv.messages)) {
      conv.messages.forEach(msg => {
        const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
        if (!readBy.some(r => String(r).toLowerCase() === uStr)) {
          msg.readBy.push(userId);
          updated = true;
        }
      });
    }

    if (updated) {
      await conv.save();
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
