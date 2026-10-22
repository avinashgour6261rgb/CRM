/**
 * @file Task.js
 * @description Mongoose Schema for Tasks in EMS.
 */

const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    taskCode: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    },
    projectId: {
      type: String,
      default: ''
    },
    projectName: {
      type: String,
      trim: true,
      default: 'General Work'
    },
    projectCode: {
      type: String,
      trim: true,
      default: 'GEN'
    },
    startDate: {
      type: String,
      required: [true, 'Start date is required']
    },
    dueDate: {
      type: String,
      default: null
    },
    hasNoDueDate: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['incomplete', 'in_progress', 'on_hold', 'under_review', 'completed'],
      default: 'incomplete'
    },
    finalApproved: {
      type: Boolean,
      default: false
    },
    finalApprovedBy: {
      type: String,
      default: null
    },
    finalApprovedAt: {
      type: Date,
      default: null
    },
    reopened: {
      type: Boolean,
      default: false
    },
    reopenReason: {
      type: String,
      default: ''
    },
    reopenedBy: {
      type: String,
      default: null
    },
    reopenedAt: {
      type: Date,
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    assignedToId: {
      type: String,
      default: ''
    },
    assignedToName: {
      type: String,
      trim: true,
      default: 'Unassigned'
    },
    assignedToAvatar: {
      type: String,
      default: ''
    },
    assignedToRole: {
      type: String,
      default: ''
    },
    assignedToCode: {
      type: String,
      default: ''
    },
    // Multi-Assignee & Team Delegation
    assignedToIds: [
      {
        type: String,
        trim: true
      }
    ],
    assignees: [mongoose.Schema.Types.Mixed],
    assignedBy: {
      type: String,
      trim: true,
      default: 'Admin'
    },
    assignedById: {
      type: String,
      trim: true,
      default: ''
    },
    assignedByCode: {
      type: String,
      default: ''
    },
    assignedByAvatar: {
      type: String,
      default: ''
    },
    assignedByRole: {
      type: String,
      default: ''
    },
    estimatedHours: {
      type: Number,
      default: 0
    },
    hoursLogged: {
      type: Number,
      default: 0
    },
    hoursLoggedText: {
      type: String,
      default: '0s'
    },
    completedOn: {
      type: String,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    isPersonal: {
      type: Boolean,
      default: false
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    isBillable: {
      type: Boolean,
      default: true
    },
    labels: [
      {
        type: String,
        trim: true
      }
    ],
    milestone: {
      type: String,
      default: ''
    },
    timerRunning: {
      type: Boolean,
      default: false
    },
    timerSeconds: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Number,
      default: null
    },
    accumulatedSeconds: {
      type: Number,
      default: 0
    },
    sessionDate: {
      type: String,
      default: null
    },
    snoozed: {
      type: Boolean,
      default: false
    },
    remindAt: {
      type: Number,
      default: null
    },
    reminderNote: {
      type: String,
      default: ''
    },
    reminderDismissed: {
      type: Boolean,
      default: false
    },
    reminderAlerted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

TaskSchema.index({ taskCode: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ project: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ assignedToIds: 1 });
TaskSchema.index({ assignedById: 1 });

module.exports = mongoose.model('Task', TaskSchema);
