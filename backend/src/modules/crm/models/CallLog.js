/**
 * @file CallLog.js
 * @description MongoDB Mongoose Schema for Enterprise Voice Call History.
 * Stores lightweight metadata: caller, receiver, duration, timestamps, and call status.
 * Zero audio recordings stored — strictly compliant with enterprise privacy and zero-quota overhead.
 */

const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  callId: {
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
  caller: {
    id: { type: String, required: true },
    name: { type: String, default: 'Teammate' },
    employeeCode: { type: String, default: '' },
    avatar: { type: String, default: '' },
    role: { type: String, default: 'Team Member' }
  },
  receiver: {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    employeeCode: { type: String, default: '' },
    avatar: { type: String, default: '' },
    role: { type: String, default: 'Team Member' }
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'declined', 'cancelled', 'in_progress'],
    default: 'in_progress',
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: null
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

module.exports = mongoose.model('CallLog', callLogSchema);
