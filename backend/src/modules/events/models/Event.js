const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    date: {
      type: String,
      required: [true, 'Event date is required']
    },
    startTime: {
      type: String,
      default: '09:00 AM'
    },
    endTime: {
      type: String,
      default: '10:00 AM'
    },
    category: {
      type: String,
      default: 'General'
    },
    location: {
      type: String,
      default: 'Office'
    },
    color: {
      type: String,
      default: '#2563eb'
    },
    createdBy: {
      type: String,
      default: ''
    },
    createdByName: {
      type: String,
      default: 'Admin User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Event', EventSchema);
