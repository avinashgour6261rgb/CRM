const mongoose = require('mongoose');
const { getIstDateString } = require('../../../shared/utils/dateUtils');

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
    description: {
      type: String,
      trim: true,
      default: ''
    },
    content: {
      type: String,
      trim: true,
      default: ''
    },
    shortDescription: {
      type: String,
      trim: true,
      default: ''
    },
    fullContent: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      default: 'Company Announcement'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    targetAudience: {
      type: String,
      default: 'All Employees'
    },
    to: {
      type: String,
      default: 'All Employees'
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
    postedBy: {
      type: String,
      default: 'Admin User'
    },
    createdBy: {
      type: String,
      default: 'Admin User'
    },
    date: {
      type: String,
      default: () => getIstDateString()
    },
    expiryDate: {
      type: String,
      default: () => getIstDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    },
    attachment: {
      type: String,
      default: ''
    },
    isImportant: {
      type: Boolean,
      default: false
    },
    pinned: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: [String],
      default: []
    },
    dismissedBy: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    strict: false
  }
);

NoticeSchema.index({ pinned: -1, createdAt: -1 });
NoticeSchema.index({ targetAudience: 1 });
NoticeSchema.index({ date: -1 });

module.exports = mongoose.model('Notice', NoticeSchema);

