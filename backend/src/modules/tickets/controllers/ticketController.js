const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// @desc    Get all tickets
// @route   GET /api/tickets
exports.getTickets = asyncHandler(async (req, res) => {
  const { status, priority, department } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (priority && priority !== 'all') filter.priority = priority;
  if (department && department !== 'all') filter.department = department;

  const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: tickets.length, data: tickets });
});

// @desc    Create a ticket
// @route   POST /api/tickets
exports.createTicket = asyncHandler(async (req, res) => {
  const count = await Ticket.countDocuments();
  const ticketCode = req.body.ticketCode || `TKT-${100 + count + 1}`;
  const ticketData = { ...req.body };
  if (ticketData._id && !mongoose.Types.ObjectId.isValid(ticketData._id)) {
    delete ticketData._id;
  }
  ticketData.ticketCode = ticketCode;
  const ticket = await Ticket.create(ticketData);
  res.status(201).json({ success: true, data: ticket });
});

// @desc    Update a ticket
// @route   PUT /api/tickets/:id
exports.updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  if (updateData._id) delete updateData._id;

  let ticket = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    ticket = await Ticket.findByIdAndUpdate(id, updateData, { new: true, runValidators: false });
  } else {
    ticket = await Ticket.findOneAndUpdate({ ticketCode: id }, updateData, { new: true, runValidators: false });
  }

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }
  res.json({ success: true, data: ticket });
});

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comments
exports.addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let ticket = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    ticket = await Ticket.findById(id);
  } else {
    ticket = await Ticket.findOne({ ticketCode: id });
  }

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }
  ticket.comments.push(req.body);
  await ticket.save();
  res.json({ success: true, data: ticket });
});

// @desc    Delete a ticket
// @route   DELETE /api/tickets/:id
exports.deleteTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let ticket = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    ticket = await Ticket.findByIdAndDelete(id);
  } else {
    ticket = await Ticket.findOneAndDelete({ ticketCode: id });
  }

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }
  res.json({ success: true, message: 'Ticket removed', data: {} });
});

