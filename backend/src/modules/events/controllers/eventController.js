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

  let event = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    event = await Event.findByIdAndUpdate(id, updateData, { new: true, runValidators: false });
  } else {
    event = await Event.findOneAndUpdate({ title: id }, updateData, { new: true, runValidators: false });
  }

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  emitToAll('event:updated', { action: 'update', item: event });
  res.json({ success: true, data: event });
});

// @desc    Delete an event
// @route   DELETE /api/events/:id
exports.deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let event = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    event = await Event.findByIdAndDelete(id);
  } else {
    event = await Event.findOneAndDelete({ title: id });
  }

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  emitToAll('event:updated', { action: 'delete', id: String(event._id) });
  res.json({ success: true, message: 'Event removed', data: {} });
});

