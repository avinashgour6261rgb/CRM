/**
 * @file ScreenShareLog.js
 * @description MongoDB Mongoose Schema for Enterprise Live Screen Sharing Session History.
 * Stores lightweight metadata: presenter/host, channel/direct partner, duration, timestamps, and viewers count.
 * Zero video files stored — strictly compliant with enterprise privacy and zero-quota overhead.
 */

const mongoose = require('mongoose');

const screenShareLogSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  isChannel: {
    type: Boolean,
    default: false
  },
  channelName: {
    type: String,
    default: ''
  },
  host: {
    id: { type: String, required: true },
    name: { type: String, default: 'Teammate' },
    employeeCode: { type: String, default: '' },
    avatar: { type: String, default: '' },
    role: { type: String, default: 'Team Member' }
  },
  viewersCount: {
    type: Number,
    default: 0
  },
  viewers: [{
    id: { type: String },
    name: { type: String },
    joinedAt: { type: Date, default: Date.now }
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  durationText: {
    type: String,
    default: '0s'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScreenShareLog', screenShareLogSchema);
