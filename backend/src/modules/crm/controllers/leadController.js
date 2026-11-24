/**
 * @file leadController.js
 * @description Controller actions for Lead management.
 */

const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const { emitToAll } = require('../../../shared/socket/socketManager');
const { getIstDateString } = require('../../../shared/utils/dateUtils');

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

    const leads = await Lead.find(filter).sort({ idNumber: -1 }).lean();
    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Lead
// @route   POST /api/leads
exports.createLead = async (req, res, next) => {
  try {
    const lastLead = await Lead.findOne().sort({ idNumber: -1 }).select('idNumber');
    const nextNum = (lastLead && typeof lastLead.idNumber === 'number' ? lastLead.idNumber : 0) + 1;
    const now = new Date();
    const todayStr = getIstDateString(now);
    const nextMonthStr = getIstDateString(new Date(Date.now() + 30 * 86400000));

    const u = req.user;
    const actorName = u ? (u.name || u.email || 'Admin User') : 'Admin User';
    const actorCode = u?.employeeCode || '';

    const leadData = {
      ...req.body,
      idNumber: nextNum,
      leadCode: req.body.leadCode || `LEAD-${1000 + nextNum}`,
      createdByCode: req.body.createdByCode || actorCode,
      createdByName: req.body.createdByName || actorName,
      createdById: req.body.createdById || (u?._id ? String(u._id) : 'ADM-001'),
      startDate: req.body.startDate || todayStr,
      endDate: req.body.endDate || nextMonthStr,
      createdDate: req.body.createdDate || now.toLocaleDateString('en-GB').replace(/\//g, '-')
    };
    if (leadData._id && !mongoose.Types.ObjectId.isValid(leadData._id)) {
      delete leadData._id;
    }

    const lead = await Lead.create(leadData);
    emitToAll('lead:updated', { action: 'create', item: lead });
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

    const u = req.user;
    const actorName = u ? (u.name || u.email || 'Admin') : 'Admin';
    const actorLabel = u?.employeeCode ? `${actorName} (${u.employeeCode})` : actorName;
    const actorId = u?._id ? String(u._id) : (u?.id || '');
    const actorCode = u?.employeeCode || '';

    updateData.lastActionBy = updateData.lastActionBy || actorLabel;
    updateData.lastActionById = updateData.lastActionById || actorId;
    updateData.lastActionByCode = updateData.lastActionByCode || actorCode;
    updateData.lastActionAt = new Date();

    if (updateData.status === 'converted') {
      updateData.convertedBy = updateData.convertedBy || actorLabel;
      updateData.convertedById = updateData.convertedById || actorId;
      updateData.convertedByCode = updateData.convertedByCode || actorCode;
      updateData.convertedAt = updateData.convertedAt || new Date();
    }

    let lead = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      lead = await Lead.findByIdAndUpdate(id, updateData, { new: true, runValidators: false });
    } else {
      lead = await Lead.findOneAndUpdate({ leadCode: id }, updateData, { new: true, runValidators: false });
    }

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    emitToAll('lead:updated', { action: 'update', item: lead });
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
      lead = await Lead.findById(id);
    } else {
      lead = await Lead.findOne({ leadCode: id });
    }

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Permission Check: Admin, HR, Delegated Admin, or Lead Owner/Creator can delete
    const u = req.user;
    if (u) {
      const isAdminOrPrivileged = u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.isDelegatedAdmin || u.permissions?.deleteLeads === true || u.permissions?.allAccess === true;
      const isOwnerOrCreator =
        String(lead.leadOwnerId) === String(u._id) ||
        String(lead.leadOwnerId) === String(u.id) ||
        String(lead.leadOwnerId) === String(u.employeeCode) ||
        String(lead.createdById) === String(u._id) ||
        String(lead.createdById) === String(u.id) ||
        String(lead.createdById) === String(u.employeeCode) ||
        (lead.createdByEmail && u.email && lead.createdByEmail.toLowerCase() === u.email.toLowerCase());

      if (!isAdminOrPrivileged && !isOwnerOrCreator) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to delete this lead.' });
      }
    }

    await Lead.findByIdAndDelete(lead._id);
    emitToAll('lead:updated', { action: 'delete', id: String(lead._id), leadCode: lead.leadCode });
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

    const lastLead = await Lead.findOne().sort({ idNumber: -1 }).select('idNumber');
    let num = (lastLead && typeof lastLead.idNumber === 'number' ? lastLead.idNumber : 0);
    const now = new Date();

    const formatted = leads.map(l => {
      num++;
      const copy = { ...l };
      if (copy._id && !mongoose.Types.ObjectId.isValid(copy._id)) delete copy._id;
      return {
        ...copy,
        idNumber: num,
        leadCode: copy.leadCode || `LEAD-${1000 + num}`,
        createdDate: copy.createdDate || now.toLocaleDateString('en-GB').replace(/\//g, '-')
      };
    });

    const inserted = await Lead.insertMany(formatted);
    emitToAll('lead:updated', { action: 'bulk_import', count: inserted.length });
    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (error) {
    next(error);
  }
};
