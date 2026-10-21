const Expense = require('../models/Expense');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

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
  const expense = await Expense.create({
    ...req.body,
    expenseCode
  });
  res.status(201).json({ success: true, data: expense });
});

// @desc    Update an expense
// @route   PUT /api/expenses/:id
exports.updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }
  res.json({ success: true, data: expense });
});

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
exports.deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }
  res.json({ success: true, message: 'Expense removed', data: {} });
});
