/**
 * @file Project.js
 * @description Mongoose Schema for Projects in EMS.
 */

const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    projectCode: {
      type: String,
      required: [true, 'Project short code is required'],
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true
    },
    startDate: {
      type: String,
      required: [true, 'Start date is required']
    },
    deadline: {
      type: String,
      default: null
    },
    hasNoDeadline: {
      type: Boolean,
      default: false
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    department: {
      type: String,
      trim: true,
      default: 'General'
    },
    client: {
      type: String,
      trim: true,
      default: 'Internal'
    },
    summary: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['in_progress', 'not_started', 'on_hold', 'completed', 'canceled', 'under_review'],
      default: 'in_progress'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    publicGanttChart: {
      type: Boolean,
      default: true
    },
    publicTaskBoard: {
      type: Boolean,
      default: true
    },
    taskApprovalRequired: {
      type: Boolean,
      default: false
    },
    budget: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    members: [
      {
        type: mongoose.Schema.Types.Mixed
      }
    ],
    membersList: [
      {
        _id: String,
        name: String,
        avatar: String,
        role: String
      }
    ],
    createdBy: {
      type: String,
      default: null
    },
    createdById: {
      type: String,
      default: null
    },
    creatorName: {
      type: String,
      default: null
    },
    creatorRole: {
      type: String,
      default: null
    },
    creatorEmail: {
      type: String,
      default: null
    },
    creatorAvatar: {
      type: String,
      default: null
    },
    visibility: {
      type: String,
      enum: ['all', 'members'],
      default: 'all'
    },
    isCompanyWide: {
      type: Boolean,
      default: true
    },
    visibleToIds: [
      {
        type: String
      }
    ],
    hasDeadlineExtended: {
      type: Boolean,
      default: false
    },
    extensionCount: {
      type: Number,
      default: 0
    },
    deadlineExtensions: [
      {
        previousDeadline: String,
        newDeadline: String,
        reasonCategory: String,
        reason: String,
        extendedBy: String,
        extendedByName: String,
        extendedByRole: String,
        extendedAt: {
          type: String,
          default: () => new Date().toISOString()
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

ProjectSchema.index({ projectCode: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ department: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
