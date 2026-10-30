/**
 * @file Conversation.js
 * @description Mongoose Schema for Team Chat Conversations, Group Channels & Direct Messages.
 */

const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String },
  category: { type: String, enum: ['image', 'video', 'document', 'audio'], default: 'document' },
  mimeType: { type: String },
  sizeFormatted: { type: String },
  sizeBytes: { type: Number },
  dataUrl: { type: String }
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  conversationId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderCode: { type: String },
  senderName: { type: String, default: 'Team Member' },
  senderAvatar: { type: String },
  senderRole: { type: String },
  senderEmail: { type: String },
  text: { type: String, default: '' },
  attachments: [AttachmentSchema],
  timestamp: { type: String },
  createdAt: { type: Number, default: () => Date.now() },
  readBy: [{ type: String }]
}, { _id: false });

const ConversationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['channel', 'dm'],
    default: 'channel'
  },
  name: {
    type: String,
    trim: true
  },
  channelName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  avatar: {
    type: String
  },
  category: {
    type: String,
    default: 'general'
  },
  members: [{
    type: String
  }],
  participants: [{
    type: String
  }],
  participantId: { type: String },
  participantCode: { type: String },
  participantName: { type: String },
  participantRole: { type: String },
  participantDepartment: { type: String },
  participantAvatar: { type: String },
  participantEmail: { type: String },
  isOnline: { type: Boolean, default: true },
  lastMessage: { type: String, default: '' },
  lastMessageTime: { type: String, default: '' },
  unreadCount: { type: Number, default: 0 },
  messages: [MessageSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Conversation', ConversationSchema);
