const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  authorName: { type: String, default: 'Employee' },
  authorAvatar: { type: String, default: '' },
  authorRole: { type: String, default: 'Team Member' },
  text: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() }
});

const ReplySchema = new mongoose.Schema({
  id: { type: String, default: () => `rep_${Date.now()}` },
  senderId: { type: String, default: '' },
  senderName: { type: String, default: 'Employee' },
  senderAvatar: { type: String, default: '' },
  message: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  isAdminReply: { type: Boolean, default: false }
});

const InternalNoteSchema = new mongoose.Schema({
  id: { type: String, default: () => `note_${Date.now()}` },
  author: { type: String, default: 'Admin' },
  text: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString() }
});

const TicketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      required: [true, 'Ticket subject is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      default: 'IT Support'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'pending', 'resolved', 'closed'],
      default: 'open'
    },
    department: {
      type: String,
      default: 'IT Support'
    },
    assignedTo: {
      type: String,
      default: ''
    },
    assignedToId: {
      type: String,
      default: ''
    },
    assignedToName: {
      type: String,
      default: 'Unassigned'
    },
    assignedToAvatar: {
      type: String,
      default: ''
    },
    requestedById: {
      type: String,
      default: ''
    },
    requestedByName: {
      type: String,
      default: 'Employee'
    },
    requestedByAvatar: {
      type: String,
      default: ''
    },
    requestedByRole: {
      type: String,
      default: 'Team Member'
    },
    requestedOn: {
      type: String,
      default: () => new Date().toISOString().split('T')[0]
    },
    createdBy: {
      type: String,
      default: ''
    },
    createdByName: {
      type: String,
      default: 'Employee'
    },
    createdByAvatar: {
      type: String,
      default: ''
    },
    createdByRole: {
      type: String,
      default: 'Team Member'
    },
    attachment: {
      type: String,
      default: ''
    },
    comments: [CommentSchema],
    replies: [ReplySchema],
    internalNotes: [InternalNoteSchema]
  },
  {
    timestamps: true,
    strict: false
  }
);

module.exports = mongoose.model('Ticket', TicketSchema);
