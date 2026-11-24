const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { emitToAll } = require('../../../shared/socket/socketManager');
const { getIstDateString } = require('../../../shared/utils/dateUtils');

// @desc    Get all tickets
// @route   GET /api/tickets
exports.getTickets = asyncHandler(async (req, res) => {
  const { status, priority, department, category } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (priority && priority !== 'all') filter.priority = priority;
  if (department && department !== 'all') filter.department = department;
  if (category && category !== 'all') filter.category = category;

  const rawTickets = await Ticket.find(filter).sort({ createdAt: -1 }).lean();

  const tickets = rawTickets.map(t => {
    const doc = t.toObject ? t.toObject() : t;
    return {
      ...doc,
      _id: doc._id ? String(doc._id) : `tkt_${Date.now()}`,
      requestedById: doc.requestedById || doc.createdBy || '',
      requestedByName: doc.requestedByName || doc.createdByName || 'Employee',
      requestedByAvatar: doc.requestedByAvatar || doc.createdByAvatar || '',
      requestedByRole: doc.requestedByRole || doc.createdByRole || 'Team Member',
      category: doc.category || doc.department || 'General Support',
      assignedToId: doc.assignedToId || doc.assignedTo || '',
      assignedToName: doc.assignedToName || 'Unassigned',
      replies: doc.replies || [],
      internalNotes: doc.internalNotes || []
    };
  });

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

  // Harmonize requester & creator fields
  const u = req.user;
  ticketData.requestedById = ticketData.requestedById || ticketData.createdBy || u?._id || u?.employeeCode || '';
  ticketData.requestedByName = ticketData.requestedByName || ticketData.createdByName || u?.name || 'Employee';
  ticketData.requestedByRole = ticketData.requestedByRole || ticketData.createdByRole || u?.role || 'Team Member';
  ticketData.requestedByAvatar = ticketData.requestedByAvatar || ticketData.createdByAvatar || u?.avatar || '';
  ticketData.createdBy = ticketData.requestedById;
  ticketData.createdByName = ticketData.requestedByName;
  ticketData.createdByRole = ticketData.requestedByRole;
  ticketData.createdByAvatar = ticketData.requestedByAvatar;
  ticketData.category = ticketData.category || ticketData.department || 'General Support';
  ticketData.requestedOn = ticketData.requestedOn || getIstDateString();
  if (!ticketData.description) {
    ticketData.description = 'Support ticket raised.';
  }

  const ticket = await Ticket.create(ticketData);
  emitToAll('ticket:updated', { action: 'create', item: ticket });
  res.status(201).json({ success: true, data: ticket });
});

// @desc    Update a ticket
// @route   PUT /api/tickets/:id
exports.updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  if (updateData._id) delete updateData._id;

  const u = req.user;
  const actorName = u ? (u.name || u.email || 'Admin') : 'Admin';
  const actorLabel = u?.employeeCode ? `${actorName} (${u.employeeCode})` : actorName;
  const actorId = u?._id ? String(u._id) : (u?.id || '');
  const actorCode = u?.employeeCode || '';

  if (!updateData.lastActionBy) {
    updateData.lastActionBy = actorLabel;
    updateData.lastActionById = actorId;
    updateData.lastActionByCode = actorCode;
  }

  const existing = mongoose.Types.ObjectId.isValid(id)
    ? await Ticket.findById(id)
    : await Ticket.findOne({ ticketCode: id });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  if (updateData.status === 'resolved' && !updateData.resolvedBy) {
    updateData.resolvedBy = actorLabel;
    updateData.resolvedById = actorId;
    updateData.resolvedByCode = actorCode;
    updateData.resolvedAt = new Date();
  } else if (updateData.status === 'closed' && !updateData.closedBy) {
    updateData.closedBy = actorLabel;
    updateData.closedById = actorId;
    updateData.closedByCode = actorCode;
    updateData.closedAt = new Date();
  } else if ((updateData.status === 'open' || updateData.status === 'in_progress') && (existing.status === 'resolved' || existing.status === 'closed') && !updateData.reopenedBy) {
    updateData.reopenedBy = actorLabel;
    updateData.reopenedById = actorId;
    updateData.reopenedByCode = actorCode;
    updateData.reopenedAt = new Date();
  }

  let ticket = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    ticket = await Ticket.findByIdAndUpdate(id, updateData, { new: true, runValidators: false });
  } else {
    ticket = await Ticket.findOneAndUpdate({ ticketCode: id }, updateData, { new: true, runValidators: false });
  }

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }
  emitToAll('ticket:updated', { action: 'update', item: ticket });
  res.json({ success: true, data: ticket });
});

// @desc    Add comment / reply to ticket
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

  const u = req.user;
  const actorName = u ? (u.name || u.email || 'Employee') : 'Employee';
  const actorLabel = u?.employeeCode ? `${actorName} (${u.employeeCode})` : actorName;
  const actorRole = u?.role || 'Team Member';
  const actorCode = u?.employeeCode || '';
  const actorAvatar = u?.avatar || '';

  // Add to replies if it represents a conversation message/reply, otherwise store as comment
  const replyContent = req.body.message || req.body.reply;
  if (replyContent || req.body.isAdminReply !== undefined) {
    ticket.replies = ticket.replies || [];
    ticket.replies.push({
      id: req.body.id || `rep_${Date.now()}`,
      senderId: req.body.senderId || u?._id || '',
      senderName: req.body.senderName || req.body.authorName || actorLabel,
      senderAvatar: req.body.senderAvatar || req.body.authorAvatar || actorAvatar,
      senderRole: req.body.senderRole || req.body.authorRole || actorRole,
      senderCode: req.body.senderCode || actorCode,
      message: replyContent || req.body.text || '',
      timestamp: req.body.timestamp || new Date().toISOString(),
      isAdminReply: req.body.isAdminReply !== undefined ? !!req.body.isAdminReply : Boolean(u && (u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr'))
    });
  } else if (req.body.text) {
    ticket.comments = ticket.comments || [];
    ticket.comments.push({
      authorName: req.body.authorName || actorLabel,
      authorAvatar: req.body.authorAvatar || actorAvatar,
      authorRole: req.body.authorRole || actorRole,
      authorCode: req.body.authorCode || actorCode,
      text: req.body.text,
      timestamp: req.body.timestamp || new Date().toISOString()
    });
  }

  await ticket.save();
  emitToAll('ticket:updated', { action: 'comment', item: ticket });
  res.json({ success: true, data: ticket });
});

// @desc    Delete a ticket (Accessible by Creator OR Admin/HR)
// @route   DELETE /api/tickets/:id
exports.deleteTicket = asyncHandler(async (req, res) => {
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

  // Permission Check:
  // Admin, HR, or the user who created/generated this ticket can delete it!
  const u = req.user;
  if (u) {
    const isAdminOrHR = u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.permissions?.deleteTickets === true || u.permissions?.manageTickets === true || u.permissions?.allAccess === true;
    const isCreator =
      String(ticket.requestedById) === String(u._id) ||
      String(ticket.requestedById) === String(u.id) ||
      String(ticket.requestedById) === String(u.employeeCode) ||
      String(ticket.createdBy) === String(u._id) ||
      String(ticket.createdBy) === String(u.id) ||
      String(ticket.createdBy) === String(u.employeeCode) ||
      (ticket.requestedByName && u.name && ticket.requestedByName.toLowerCase().trim() === u.name.toLowerCase().trim()) ||
      (ticket.createdByName && u.name && ticket.createdByName.toLowerCase().trim() === u.name.toLowerCase().trim());

    if (!isAdminOrHR && !isCreator) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only delete tickets created by you.' });
    }
  }

  await Ticket.findByIdAndDelete(ticket._id);
  emitToAll('ticket:updated', { action: 'delete', id: String(ticket._id), ticketCode: ticket.ticketCode });
  res.json({ success: true, message: 'Ticket removed successfully', data: { id: ticket._id, ticketCode: ticket.ticketCode } });
});
