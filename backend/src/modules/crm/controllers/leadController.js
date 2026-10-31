/**
 * @file leadController.js
 * @description Controller actions for Lead management.
 */

const mongoose = require('mongoose');
const Lead = require('../models/Lead');

// @desc    Get all leads with filtering & search
// @route   GET /api/leads
exports.getLeads = async (req, res, next) => {
  try {
    const { search, status, leadType, leadOwnerId, priority, client, startDate, endDate } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { client: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { leadCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') filter.status = status;
    if (leadType && leadType !== 'all') filter.leadType = leadType;
    if (leadOwnerId && leadOwnerId !== 'all') filter.leadOwnerId = leadOwnerId;
    if (priority && priority !== 'all') filter.priority = priority;
    if (client && client !== 'all') filter.client = client;
    if (startDate && endDate) {
      filter.startDate = { $gte: startDate };
      filter.endDate = { $lte: endDate };
    }

    const leads = await Lead.find(filter).sort({ idNumber: -1 });
    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Lead
// @route   POST /api/leads
exports.createLead = async (req, res, next) => {
  try {
    const count = await Lead.countDocuments();
    const nextNum = count + 1;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const leadData = {
      ...req.body,
      idNumber: nextNum,
      leadCode: req.body.leadCode || `LEAD-${1000 + nextNum}`,
      startDate: req.body.startDate || todayStr,
      endDate: req.body.endDate || nextMonthStr,
      createdDate: req.body.createdDate || now.toLocaleDateString('en-GB').replace(/\//g, '-')
    };
    if (leadData._id && !mongoose.Types.ObjectId.isValid(leadData._id)) {
      delete leadData._id;
    }

    const lead = await Lead.create(leadData);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a Lead
// @route   PUT /api/leads/:id
exports.updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData._id) delete updateData._id;

    let lead = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      lead = await Lead.findByIdAndUpdate(id, updateData, { new: true, runValidators: false });
    } else {
      lead = await Lead.findOneAndUpdate({ leadCode: id }, updateData, { new: true, runValidators: false });
    }

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a Lead
// @route   DELETE /api/leads/:id
exports.deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    let lead = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      lead = await Lead.findByIdAndDelete(id);
    } else {
      lead = await Lead.findOneAndDelete({ leadCode: id });
    }

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Import multiple leads
// @route   POST /api/leads/import
exports.importLeads = async (req, res, next) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'No leads array provided' });
    }

    const currentCount = await Lead.countDocuments();
    let num = currentCount;
    const now = new Date();

    const formatted = leads.map(l => {
      num++;
      return {
        ...l,
        idNumber: num,
        leadCode: l.leadCode || `LEAD-${1000 + num}`,
        createdDate: l.createdDate || now.toLocaleDateString('en-GB').replace(/\//g, '-')
      };
    });

    const inserted = await Lead.insertMany(formatted);
    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (error) {
    next(error);
  }
};
