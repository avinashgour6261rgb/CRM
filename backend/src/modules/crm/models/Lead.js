/**
 * @file Lead.js
 * @description Mongoose Schema for CRM Leads & Prospects.
 */

const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    idNumber: {
      type: Number,
      default: 1
    },
    leadCode: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true
    },
    companyName: {
      type: String,
      trim: true
    },
    client: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    leadType: {
      type: String,
      trim: true,
      default: 'Enterprise'
    },
    leadOwnerId: {
      type: String,
      default: 'ADM-001'
    },
    leadOwnerName: {
      type: String,
      default: 'Admin User'
    },
    leadOwnerRole: {
      type: String,
      default: 'Administrator'
    },
    leadOwnerAvatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    createdById: {
      type: String,
      default: 'ADM-001'
    },
    createdByName: {
      type: String,
      default: 'Admin User'
    },
    createdByRole: {
      type: String,
      default: 'Administrator'
    },
    createdByAvatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    },
    startDate: {
      type: String,
      required: true
    },
    endDate: {
      type: String,
      required: true
    },
    createdDate: {
      type: String
    },
    status: {
      type: String,
      enum: ['new', 'active', 'in_progress', 'negotiation', 'converted', 'lost'],
      default: 'new'
    },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      default: 'medium'
    },
    leadSource: {
      type: String,
      default: 'Website Inquiry'
    },
    dealValue: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

LeadSchema.index({ name: 'text', companyName: 'text', email: 'text', contactPerson: 'text' });
LeadSchema.index({ status: 1 });
LeadSchema.index({ leadOwnerId: 1 });
LeadSchema.index({ leadType: 1 });

module.exports = mongoose.model('Lead', LeadSchema);
