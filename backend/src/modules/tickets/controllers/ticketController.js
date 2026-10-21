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
  const ticket = await Ticket.create({
    ...req.body,
    ticketCode
  });
  res.status(201).json({ success: true, data: ticket });
});

// @desc    Update a ticket
// @route   PUT /api/tickets/:id
exports.updateTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }
  res.json({ success: true, data: ticket });
});

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comments
exports.addComment = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
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
  const ticket = await Ticket.findByIdAndDelete(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }
  res.json({ success: true, message: 'Ticket removed', data: {} });
});
