const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

// ─── GET /api/employees ───────────────────────────────────────────────────────
const getEmployees = asyncHandler(async (req, res) => {
  const { status, department, search } = req.query;

  const query = {};
  if (status) query.status = status;
  if (department) query.department = department;
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { role: new RegExp(search, 'i') },
      { employeeCode: new RegExp(search, 'i') }
    ];
  }

  const employees = await Employee.find(query).sort({ createdAt: 1 });

  res.json({
    success: true,
    count: employees.length,
    data: employees
  });
});

// ─── GET /api/employees/current ───────────────────────────────────────────────
const getCurrentUser = asyncHandler(async (req, res) => {
  let user = null;
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    user = await Employee.findById(req.user._id);
  }
  if (!user && req.user?.employeeCode) {
    user = await Employee.findOne({ employeeCode: req.user.employeeCode });
  }
  if (!user) {
    user = await Employee.findOne({ isCurrentUser: true });
  }
  if (!user) {
    user = (await Employee.findOne({ employeeCode: 'ADM-001' })) ||
           (await Employee.findOne({ isAdmin: true })) ||
           (await Employee.findOne());
    if (user) {
      user.isCurrentUser = true;
      await user.save();
    }
  }
  if (!user) {
    return res.status(404).json({ success: false, message: 'No current user found in database' });
  }
  res.json({ success: true, data: user });
});

// ─── POST /api/employees/switch/:id ──────────────────────────────────────────
const switchCurrentUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let target = null;
  if (id === 'admin') {
    target = await Employee.findOne({ $or: [{ employeeCode: 'ADM-001' }, { role: 'Administrator' }, { isAdmin: true }] });
  } else if (id === 'hr') {
    target = await Employee.findOne({ $or: [{ employeeCode: 'HR-001' }, { department: 'Human Resources' }] });
  } else if (id === 'employee' || id === 'team_member') {
    target = await Employee.findOne({ $or: [{ employeeCode: 'ENG-001' }, { department: 'Engineering' }] });
  } else if (mongoose.Types.ObjectId.isValid(id)) {
    target = await Employee.findById(id);
  } else {
    target = await Employee.findOne({ employeeCode: id.toUpperCase() });
  }

  if (!target) {
    return res.status(404).json({ success: false, message: `Target employee "${id}" not found in database` });
  }

  await Employee.updateMany({}, { isCurrentUser: false });
  target.isCurrentUser = true;
  await target.save();

  res.json({ success: true, data: target });
});

// ─── GET /api/employees/:id ───────────────────────────────────────────────────
const getEmployeeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { $or: [{ employeeCode: id.trim().toUpperCase() }, { email: id.trim().toLowerCase() }] };

  const employee = await Employee.findOne(query);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  res.json({ success: true, data: employee });
});

// ─── POST /api/employees ──────────────────────────────────────────────────────
const createEmployee = asyncHandler(async (req, res) => {
  const { employeeCode, email } = req.body;
  const cleanCode = employeeCode ? employeeCode.trim().toUpperCase() : undefined;
  const cleanEmail = email ? email.trim().toLowerCase() : undefined;

  if (cleanCode) {
    const existingCode = await Employee.findOne({ employeeCode: cleanCode });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: `Employee ID "${cleanCode}" is already assigned to ${existingCode.name}`
      });
    }
  }

  if (cleanEmail) {
    const existingEmail = await Employee.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: `Email address "${cleanEmail}" is already registered with ${existingEmail.name}`
      });
    }
  }

  // Strip non-ObjectId _id if provided by client to avoid Mongo CastError
  const payload = { ...req.body };
  if (payload._id && !mongoose.Types.ObjectId.isValid(payload._id)) {
    delete payload._id;
  }

  const employee = new Employee({
    ...payload,
    employeeCode: cleanCode,
    email: cleanEmail
  });
  await employee.save();
  res.status(201).json({ success: true, data: employee });
});

// ─── PUT /api/employees/:id ───────────────────────────────────────────────────
const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { $or: [{ employeeCode: id.trim().toUpperCase() }, { email: id.trim().toLowerCase() }] };

  const payload = { ...req.body };
  if (payload._id && !mongoose.Types.ObjectId.isValid(payload._id)) {
    delete payload._id;
  }

  const employee = await Employee.findOneAndUpdate(
    query,
    payload,
    { new: true, runValidators: false }
  );
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  res.json({ success: true, data: employee });
});

// ─── DELETE /api/employees/:id ───────────────────────────────────────────────
const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { $or: [{ employeeCode: id.trim().toUpperCase() }, { email: id.trim().toLowerCase() }] };

  const employee = await Employee.findOne(query);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  // Prevent deleting your own active account if user is attached to request
  if (req.user && String(req.user._id) === String(employee._id)) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own active administrator account.'
    });
  }

  await Employee.deleteOne({ _id: employee._id });
  res.json({ success: true, message: 'Employee removed', data: {} });
});

module.exports = {
  getEmployees,
  getCurrentUser,
  switchCurrentUser,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};

