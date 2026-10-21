const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema(
  {
    noticeCode: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Notice title is required'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Notice content is required'],
      trim: true
    },
    category: {
      type: String,
      default: 'General'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    author: {
      type: String,
      default: 'Management'
    },
    authorName: {
      type: String,
      default: 'Admin User'
    },
    authorAvatar: {
      type: String,
      default: ''
    },
    authorRole: {
      type: String,
      default: 'Administrator'
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0]
    },
    pinned: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notice', NoticeSchema);
