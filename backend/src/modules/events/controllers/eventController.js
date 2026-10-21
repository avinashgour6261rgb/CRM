const Event = require('../models/Event');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// @desc    Get all events
// @route   GET /api/events
exports.getEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({}).sort({ date: 1, startTime: 1 });
  res.json({ success: true, count: events.length, data: events });
});

// @desc    Create an event
// @route   POST /api/events
exports.createEvent = asyncHandler(async (req, res) => {
  const event = await Event.create(req.body);
  res.status(201).json({ success: true, data: event });
});

// @desc    Update an event
// @route   PUT /api/events/:id
exports.updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  res.json({ success: true, data: event });
});

// @desc    Delete an event
// @route   DELETE /api/events/:id
exports.deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  res.json({ success: true, message: 'Event removed', data: {} });
});
