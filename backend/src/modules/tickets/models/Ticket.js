const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  authorName: { type: String, default: 'Employee' },
  authorAvatar: { type: String, default: '' },
  authorRole: { type: String, default: 'Team Member' },
  text: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() }
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
      required: [true, 'Ticket description is required'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
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
    assignedToName: {
      type: String,
      default: 'Unassigned'
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
    comments: [CommentSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Ticket', TicketSchema);
