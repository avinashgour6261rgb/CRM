const mongoose = require('mongoose');
const Event = require('../models/Event');
const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { emitToAll } = require('../../../shared/socket/socketManager');

// @desc    Get all events
// @route   GET /api/events
exports.getEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({}).sort({ date: 1, startTime: 1 });
  res.json({ success: true, count: events.length, data: events });
});

// @desc    Create an event
// @route   POST /api/events
exports.createEvent = asyncHandler(async (req, res) => {
  const eventData = { ...req.body };
  if (eventData._id && !mongoose.Types.ObjectId.isValid(eventData._id)) {
    delete eventData._id;
  }
  const u = req.user;
  const actorName = u ? (u.name || u.email || 'Admin') : 'Admin';
  const actorLabel = u?.employeeCode ? `${actorName} (${u.employeeCode})` : actorName;
  eventData.createdBy = eventData.createdBy || u?._id || u?.employeeCode || actorLabel;
  eventData.createdByName = eventData.createdByName || actorLabel;
  eventData.createdById = eventData.createdById || String(u?._id || u?.id || '');
  eventData.createdByCode = eventData.createdByCode || u?.employeeCode || '';
  eventData.createdByRole = eventData.createdByRole || u?.role || '';

  const event = await Event.create(eventData);
  emitToAll('event:updated', { action: 'create', item: event });
  res.status(201).json({ success: true, data: event });
});

// @desc    Update an event
// @route   PUT /api/events/:id
exports.updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  if (updateData._id) delete updateData._id;

  const existing = mongoose.Types.ObjectId.isValid(id)
    ? await Event.findById(id)
    : await Event.findOne({ title: id });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  const u = req.user;
  if (u) {
    const isPrivileged = Boolean(u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.isDelegatedAdmin || u.permissions?.allAccess || u.permissions?.events);
    const isOwner = Boolean(
      (existing.createdById && String(existing.createdById) === String(u._id || u.id)) ||
      (existing.createdBy && (String(existing.createdBy) === String(u._id || u.id) || String(existing.createdBy) === String(u.employeeCode))) ||
      (existing.createdByCode && u.employeeCode && String(existing.createdByCode).toUpperCase() === String(u.employeeCode).toUpperCase())
    );
    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit your own events.' });
    }
    const actorName = u.name || u.email || 'Admin';
    const actorLabel = u.employeeCode ? `${actorName} (${u.employeeCode})` : actorName;
    updateData.lastUpdatedBy = actorLabel;
    updateData.lastUpdatedById = String(u._id || u.id || '');
    updateData.lastUpdatedByCode = u.employeeCode || '';
    updateData.lastUpdatedAt = new Date();
  }

  Object.assign(existing, updateData);
  await existing.save();
  emitToAll('event:updated', { action: 'update', item: existing });
  res.json({ success: true, data: existing });
});

// @desc    Delete an event
// @route   DELETE /api/events/:id
exports.deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = mongoose.Types.ObjectId.isValid(id)
    ? await Event.findById(id)
    : await Event.findOne({ title: id });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  const u = req.user;
  if (u) {
    const isPrivileged = Boolean(u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.isDelegatedAdmin || u.permissions?.allAccess || u.permissions?.events);
    const isOwner = Boolean(
      (existing.createdById && String(existing.createdById) === String(u._id || u.id)) ||
      (existing.createdBy && (String(existing.createdBy) === String(u._id || u.id) || String(existing.createdBy) === String(u.employeeCode))) ||
      (existing.createdByCode && u.employeeCode && String(existing.createdByCode).toUpperCase() === String(u.employeeCode).toUpperCase())
    );
    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only delete your own events.' });
    }
  }

  await existing.deleteOne();
  emitToAll('event:updated', { action: 'delete', id: String(existing._id) });
  res.json({ success: true, message: 'Event removed', data: {} });
});

