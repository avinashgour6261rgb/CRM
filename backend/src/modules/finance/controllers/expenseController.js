const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { emitToAll } = require('../../../shared/socket/socketManager');

// @desc    Get all expenses
// @route   GET /api/expenses
exports.getExpenses = asyncHandler(async (req, res) => {
  const { status, category, employeeId } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (category && category !== 'all') filter.category = category;
  if (employeeId && employeeId !== 'all') filter.employeeId = employeeId;

  const expenses = await Expense.find(filter).sort({ createdAt: -1 });
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

  let expense = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    expense = await Expense.findByIdAndUpdate(id, updateData, { new: true, runValidators: false });
  } else {
    expense = await Expense.findOneAndUpdate({ expenseCode: id }, updateData, { new: true, runValidators: false });
  }
  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }
  emitToAll('expense:updated', { action: 'update', item: expense });
  res.json({ success: true, data: expense });
});

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
exports.deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let expense = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    expense = await Expense.findByIdAndDelete(id);
  } else {
    expense = await Expense.findOneAndDelete({ expenseCode: id });
  }
  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }
  emitToAll('expense:updated', { action: 'delete', id: String(expense._id), expenseCode: expense.expenseCode });
  res.json({ success: true, message: 'Expense removed', data: {} });
});
