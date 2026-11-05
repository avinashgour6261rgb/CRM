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
  const u = req.user;
  if (u) {
    const canCreate = u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.isDelegatedAdmin || u.permissions?.manageEmployees || u.permissions?.allAccess;
    if (!canCreate) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to add employees.' });
    }
  }

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
  const payload = { ...req.body };
  delete payload._id; // Prevent modifying immutable _id

  // Multi-key query: id as ObjectId, id as employeeCode (with hyphen/underscore conversion), id as email, or payload identifiers
  const orConditions = [];
  if (mongoose.Types.ObjectId.isValid(id)) {
    orConditions.push({ _id: id });
  }
  const cleanId = String(id).trim();
  orConditions.push({ employeeCode: cleanId.toUpperCase() });
  orConditions.push({ employeeCode: cleanId.toUpperCase().replace(/_/g, '-') });
  orConditions.push({ employeeCode: cleanId.toUpperCase().replace(/-/g, '_') });
  orConditions.push({ email: cleanId.toLowerCase() });

  if (payload.employeeCode) {
    const cleanCode = String(payload.employeeCode).trim().toUpperCase();
    orConditions.push({ employeeCode: cleanCode });
    orConditions.push({ employeeCode: cleanCode.replace(/_/g, '-') });
    orConditions.push({ employeeCode: cleanCode.replace(/-/g, '_') });
  }
  if (payload.email) {
    orConditions.push({ email: String(payload.email).trim().toLowerCase() });
  }

  // Explicitly ensure permissions object and delegation flags are preserved
  if (payload.permissions !== undefined) {
    payload.permissions = typeof payload.permissions === 'object' ? payload.permissions : {};
  }
  if (payload.isDelegatedAdmin !== undefined) {
    payload.isDelegatedAdmin = Boolean(payload.isDelegatedAdmin);
  }
  if (payload.delegationExpiresAt !== undefined) {
    payload.delegationExpiresAt = payload.delegationExpiresAt || null;
  }

  const existingEmployee = await Employee.findOne({ $or: orConditions });
  if (!existingEmployee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  // Password History Audit for Super Admin (Save previous passwords whenever updated)
  if (payload.password && payload.password !== existingEmployee.password) {
    const historyEntry = {
      password: existingEmployee.password,
      changedAt: new Date().toISOString(),
      changedBy: req.user?.name || req.user?.email || 'User'
    };
    const prevHistory = Array.isArray(existingEmployee.passwordHistory)
      ? existingEmployee.passwordHistory
      : [];
    payload.passwordHistory = [historyEntry, ...prevHistory];
    payload.passwordUpdatedAt = new Date().toISOString();
  } else if (payload.passwordHistory === undefined && Array.isArray(existingEmployee.passwordHistory)) {
    payload.passwordHistory = existingEmployee.passwordHistory;
  }

  const employee = await Employee.findByIdAndUpdate(
    existingEmployee._id,
    { $set: payload },
    { new: true, runValidators: false }
  );
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  res.json({ success: true, data: employee });
});

// ─── PUT /api/employees/:id/permissions ─────────────────────────────────────
const updateEmployeePermissions = asyncHandler(async (req, res) => {
  const u = req.user;
  if (u) {
    const canGrant = u.isAdmin || u.systemRole === 'admin' || u.isDelegatedAdmin || u.permissions?.grantPermissions || u.permissions?.allAccess;
    if (!canGrant) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can modify employee permissions.' });
    }
  }

  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { $or: [{ employeeCode: id.trim().toUpperCase() }, { email: id.trim().toLowerCase() }] };

  const { permissions, isDelegatedAdmin, delegationExpiresAt, systemRole } = req.body;

  const updateFields = {};
  if (permissions !== undefined) updateFields.permissions = permissions;
  if (isDelegatedAdmin !== undefined) updateFields.isDelegatedAdmin = Boolean(isDelegatedAdmin);
  if (delegationExpiresAt !== undefined) updateFields.delegationExpiresAt = delegationExpiresAt || null;
  if (systemRole) updateFields.systemRole = systemRole;

  const employee = await Employee.findOneAndUpdate(
    query,
    { $set: updateFields },
    { new: true, runValidators: false }
  );

  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  res.json({
    success: true,
    message: 'Permissions updated successfully in database',
    data: employee
  });
});

// ─── DELETE /api/employees/:id ───────────────────────────────────────────────
const deleteEmployee = asyncHandler(async (req, res) => {
  const u = req.user;
  if (u) {
    const canDelete = u.isAdmin || u.systemRole === 'admin' || u.isDelegatedAdmin || u.permissions?.deleteEmployees || u.permissions?.allAccess;
    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can delete employees.' });
    }
  }

  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { $or: [{ employeeCode: id.trim().toUpperCase() }, { email: id.trim().toLowerCase() }] };

  const employee = await Employee.findOne(query);
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  // Security Policy: Never allow deletion of any Administrator account
  const isTargetAdmin = employee.isAdmin === true ||
                        employee.isSuperAdmin === true ||
                        String(employee.systemRole || '').toLowerCase() === 'admin' ||
                        String(employee.role || '').toLowerCase() === 'admin' ||
                        String(employee.role || '').toLowerCase().includes('administrator') ||
                        String(employee.employeeCode || '').toUpperCase() === 'ADM-001' ||
                        String(employee.email || '').toLowerCase() === 'avinash@inforag.com';

  if (isTargetAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Security Protection: Administrator accounts are permanently protected and cannot be deleted.'
    });
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
  updateEmployeePermissions,
  deleteEmployee
};

