const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { emitToAll } = require('../../../shared/socket/socketManager');

// @desc    Get all expenses (strictly scoped for non-finance users)
// @route   GET /api/expenses
exports.getExpenses = asyncHandler(async (req, res) => {
  const { status, category, employeeId } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (category && category !== 'all') filter.category = category;
  if (employeeId && employeeId !== 'all') filter.employeeId = employeeId;

  const u = req.user;
  const isFinancePrivileged = Boolean(
    u && (
      u.isAdmin ||
      u.isDelegatedAdmin ||
      u.systemRole === 'admin' ||
      u.systemRole === 'hr' ||
      u.role === 'admin' ||
      u.role === 'hr' ||
      u.permissions?.allAccess ||
      u.permissions?.accessFinance ||
      u.permissions?.approveExpenses ||
      u.permissions?.finance
    )
  );

  if (!isFinancePrivileged && u) {
    const myId = String(u._id || u.id || '');
    const myCode = String(u.employeeCode || '');
    const myName = String(u.name || '').trim();
    const selfOr = [];
    if (myId) selfOr.push({ employeeId: myId }, { submittedById: myId });
    if (myCode) selfOr.push({ employeeCode: myCode }, { employeeId: myCode });
    if (myName) selfOr.push({ employeeName: new RegExp(`^${myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, { submittedBy: new RegExp(`^${myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (selfOr.length > 0) filter.$or = selfOr;
  }

  const expenses = await Expense.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ success: true, count: expenses.length, data: expenses });
});

// @desc    Create an expense
// @route   POST /api/expenses
exports.createExpense = asyncHandler(async (req, res) => {
  const count = await Expense.countDocuments();
  const expenseCode = req.body.expenseCode || `EXP-${100 + count + 1}`;
  const expenseData = { ...req.body, expenseCode };
  if (expenseData._id && !mongoose.Types.ObjectId.isValid(expenseData._id)) {
    delete expenseData._id;
  }
  const expense = await Expense.create(expenseData);
  emitToAll('expense:updated', { action: 'create', item: expense });
  res.status(201).json({ success: true, data: expense });
});

// @desc    Update an expense
// @route   PUT /api/expenses/:id
exports.updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };
  if (updateData._id) delete updateData._id;

  const existing = mongoose.Types.ObjectId.isValid(id)
    ? await Expense.findById(id)
    : await Expense.findOne({ expenseCode: id });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  const u = req.user;
  const canApprove = Boolean(u && (u.isAdmin || u.isDelegatedAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.permissions?.allAccess || u.permissions?.approveExpenses));
  const isOwner = Boolean(u && (
    (existing.employeeId && (String(existing.employeeId) === String(u._id || u.id) || String(existing.employeeId) === String(u.employeeCode))) ||
    (existing.employeeCode && u.employeeCode && String(existing.employeeCode).toUpperCase() === String(u.employeeCode).toUpperCase())
  ));

  if (!canApprove && !isOwner) {
    return res.status(403).json({ success: false, message: 'Access denied: You can only edit your own expense claims.' });
  }
  if (!canApprove && updateData.status && ['approved', 'rejected', 'reimbursed'].includes(String(updateData.status).toLowerCase())) {
    return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to approve or reject expenses.' });
  }

  if (canApprove && updateData.status && ['approved', 'rejected', 'reimbursed'].includes(String(updateData.status).toLowerCase())) {
    const actorName = u ? (u.name || u.email || 'Admin') : 'Admin';
    const actorLabel = u?.employeeCode ? `${actorName} (${u.employeeCode})` : actorName;
    if (updateData.status === 'approved') {
      existing.approvedBy = updateData.approvedBy || actorLabel;
      existing.approvedById = updateData.approvedById || (u?._id ? String(u._id) : '');
      existing.approvedByCode = updateData.approvedByCode || u?.employeeCode || '';
      existing.approvedAt = new Date();
    } else if (updateData.status === 'rejected') {
      existing.rejectedBy = updateData.rejectedBy || actorLabel;
      existing.rejectedById = updateData.rejectedById || (u?._id ? String(u._id) : '');
      existing.rejectedByCode = updateData.rejectedByCode || u?.employeeCode || '';
      existing.rejectedAt = new Date();
    }
    existing.lastActionBy = updateData.lastActionBy || actorLabel;
    existing.lastActionById = updateData.lastActionById || (u?._id ? String(u._id) : '');
    existing.lastActionByCode = updateData.lastActionByCode || u?.employeeCode || '';
  }

  Object.assign(existing, updateData);
  await existing.save();
  emitToAll('expense:updated', { action: 'update', item: existing });
  res.json({ success: true, data: existing });
});

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
exports.deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = mongoose.Types.ObjectId.isValid(id)
    ? await Expense.findById(id)
    : await Expense.findOne({ expenseCode: id });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  const u = req.user;
  const canManage = Boolean(u && (u.isAdmin || u.isDelegatedAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.permissions?.allAccess || u.permissions?.approveExpenses));
  const isOwner = Boolean(u && (
    (existing.employeeId && (String(existing.employeeId) === String(u._id || u.id) || String(existing.employeeId) === String(u.employeeCode))) ||
    (existing.employeeCode && u.employeeCode && String(existing.employeeCode).toUpperCase() === String(u.employeeCode).toUpperCase())
  ));
  if (!canManage && !isOwner) {
    return res.status(403).json({ success: false, message: 'Access denied: You cannot delete another employee\'s expense.' });
  }

  await existing.deleteOne();
  emitToAll('expense:updated', { action: 'delete', id: String(existing._id), expenseCode: existing.expenseCode });
  res.json({ success: true, message: 'Expense removed', data: {} });
});
