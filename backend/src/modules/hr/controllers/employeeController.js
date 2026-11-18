const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { hashPassword, isPasswordHashed, encryptVaultSecret, decryptVaultSecret, sanitizeEmployeeForResponse } = require('../../../shared/utils/authCrypto');

// ─── GET /api/employees ───────────────────────────────────────────────────────
const getEmployees = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required to view employee directory.' });
  }
  const { status, department, search } = req.query;

  const query = {};
  if (status) query.status = status;
  if (department) query.department = department;
  if (search) {
    const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: new RegExp(safeSearch, 'i') },
      { email: new RegExp(safeSearch, 'i') },
      { role: new RegExp(safeSearch, 'i') },
      { employeeCode: new RegExp(safeSearch, 'i') }
    ];
  }

  const employees = await Employee.find(query).select('-password -passwordHistory').sort({ createdAt: 1 });
  const sanitized = employees.map(e => sanitizeEmployeeForResponse(e, req.user));

  res.json({
    success: true,
    count: sanitized.length,
    data: sanitized
  });
});

// ─── GET /api/employees/current ───────────────────────────────────────────────
const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  let user = null;
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    user = await Employee.findById(req.user._id).select('-password -passwordHistory');
  }
  if (!user && req.user?.employeeCode) {
    user = await Employee.findOne({ employeeCode: req.user.employeeCode }).select('-password -passwordHistory');
  }
  if (!user) {
    return res.status(404).json({ success: false, message: 'No current user found in database' });
  }
  res.json({ success: true, data: sanitizeEmployeeForResponse(user, req.user) });
});

// ─── POST /api/employees/switch/:id ──────────────────────────────────────────
const switchCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user || (!req.user.isAdmin && req.user.systemRole !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can switch user sessions.' });
  }
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

  res.json({ success: true, data: sanitizeEmployeeForResponse(target, req.user) });
});

// ─── GET /api/employees/:id ───────────────────────────────────────────────────
const getEmployeeById = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { $or: [{ employeeCode: id.trim().toUpperCase() }, { email: id.trim().toLowerCase() }] };

  const employee = await Employee.findOne(query).select('-password -passwordHistory');
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  res.json({ success: true, data: sanitizeEmployeeForResponse(employee, req.user) });
});

// ─── POST /api/employees ──────────────────────────────────────────────────────
const createEmployee = asyncHandler(async (req, res) => {
  const u = req.user;
  const canCreate = Boolean(u && (u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.isDelegatedAdmin || u.permissions?.manageEmployees || u.permissions?.allAccess));
  if (!canCreate) {
    return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to add employees.' });
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

  // Hash initial password securely using salted scrypt and store encrypted Admin Vault copy
  const rawInitialPass = (payload.password && String(payload.password).trim()) || 'emp12345';
  const alreadyHashed = isPasswordHashed(rawInitialPass) || /^\$2[aby]\$\d{2}\$/.test(rawInitialPass);
  payload.password = alreadyHashed ? rawInitialPass : hashPassword(rawInitialPass);
  if (!alreadyHashed) {
    payload.adminVaultPassword = encryptVaultSecret(rawInitialPass);
  }

  const employee = new Employee({
    ...payload,
    employeeCode: cleanCode,
    email: cleanEmail
  });
  await employee.save();
  const safeEmp = sanitizeEmployeeForResponse(employee, req.user);
  try {
    const { emitToAll } = require('../../../shared/socket/socketManager');
    emitToAll('employee:updated', { action: 'create', item: sanitizeEmployeeForResponse(employee, null) });
  } catch (_) {}
  res.status(201).json({ success: true, data: safeEmp });
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

  // Strict authorization: non-privileged users can ONLY edit their own non-privileged profile fields
  const actor = req.user;
  if (!actor) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const isSelfUpdate = String(actor._id) === String(existingEmployee._id) ||
    (actor.employeeCode && existingEmployee.employeeCode && String(actor.employeeCode).toUpperCase() === String(existingEmployee.employeeCode).toUpperCase());
  const canManageEmps = Boolean(actor.isAdmin || actor.systemRole === 'admin' || actor.systemRole === 'hr' || actor.isDelegatedAdmin || actor.permissions?.manageEmployees || actor.permissions?.allAccess);
  const canGrantPerms = Boolean(actor.isAdmin || actor.systemRole === 'admin' || actor.isDelegatedAdmin || actor.permissions?.grantPermissions || actor.permissions?.allAccess);

  if (!isSelfUpdate && !canManageEmps && !canGrantPerms) {
    return res.status(403).json({ success: false, message: 'Access denied: You can only update your own profile.' });
  }

  // Prevent privilege escalation by non-admin users (even on their own profile!)
  if (!canGrantPerms) {
    delete payload.permissions;
    delete payload.isAdmin;
    delete payload.isSuperAdmin;
    delete payload.isDelegatedAdmin;
    delete payload.delegationExpiresAt;
    delete payload.systemRole;
  }
  if (!canManageEmps) {
    delete payload.salary;
    delete payload.annualCTC;
    delete payload.startingSalary;
    delete payload.salaryBasis;
    delete payload.employeeCode;
    delete payload.status;
  }

  // Hash new password securely and maintain AES-256-GCM encrypted Super Admin Vault + history
  if (payload.password && String(payload.password).trim() && payload.password !== existingEmployee.password) {
    const newPassRaw = String(payload.password).trim();
    const alreadyHashed = isPasswordHashed(newPassRaw) || /^\$2[aby]\$\d{2}\$/.test(newPassRaw);
    const hashedNew = alreadyHashed ? newPassRaw : hashPassword(newPassRaw);

    const prevVaultSecret = existingEmployee.adminVaultPassword ||
      (!isPasswordHashed(existingEmployee.password) && !/^\$2[aby]\$\d{2}\$/.test(String(existingEmployee.password || '')) && existingEmployee.password
        ? encryptVaultSecret(existingEmployee.password)
        : '');

    const historyEntry = {
      vaultSecret: prevVaultSecret,
      changedAt: new Date().toISOString(),
      changedBy: req.user?.name || req.user?.email || 'User'
    };
    const prevHistory = Array.isArray(existingEmployee.passwordHistory)
      ? existingEmployee.passwordHistory.map(h => ({
          vaultSecret: h.vaultSecret || (h.password && !isPasswordHashed(h.password) && !/^\$2[aby]\$\d{2}\$/.test(String(h.password)) ? encryptVaultSecret(h.password) : ''),
          changedAt: h.changedAt,
          changedBy: h.changedBy
        }))
      : [];
    payload.password = hashedNew;
    if (!alreadyHashed) {
      payload.adminVaultPassword = encryptVaultSecret(newPassRaw);
    }
    payload.passwordHistory = [historyEntry, ...prevHistory.slice(0, 9)];
    payload.passwordUpdatedAt = new Date().toISOString();
  } else {
    delete payload.password;
    delete payload.adminVaultPassword;
    delete payload.passwordHistory;
  }

  const employee = await Employee.findByIdAndUpdate(
    existingEmployee._id,
    { $set: payload },
    { new: true, runValidators: false }
  );
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  // 📡 Real-Time Socket Broadcast on permission or role changes
  if (payload.permissions !== undefined || payload.isDelegatedAdmin !== undefined || payload.systemRole !== undefined) {
    try {
      const { emitToAll, emitToUser } = require('../../../shared/socket/socketManager');
      const empIdStr = employee._id.toString();
      const socketPayload = {
        employeeId: empIdStr,
        employeeCode: employee.employeeCode,
        email: employee.email,
        permissions: employee.permissions || {},
        isDelegatedAdmin: Boolean(employee.isDelegatedAdmin),
        delegationExpiresAt: employee.delegationExpiresAt || null,
        systemRole: employee.systemRole,
        role: employee.role
      };
      emitToAll('employee:permissions:updated', socketPayload);
      emitToUser(empIdStr, 'employee:permissions:updated', socketPayload);
      if (employee.employeeCode) emitToUser(employee.employeeCode, 'employee:permissions:updated', socketPayload);
      if (employee.email) emitToUser(employee.email.toLowerCase(), 'employee:permissions:updated', socketPayload);
    } catch (_) {}
  }

  try {
    const { emitToAll } = require('../../../shared/socket/socketManager');
    emitToAll('employee:updated', { action: 'update', item: sanitizeEmployeeForResponse(employee, null) });
  } catch (_) {}

  res.json({ success: true, data: sanitizeEmployeeForResponse(employee, req.user) });
});

// ─── PUT /api/employees/:id/permissions ─────────────────────────────────────
const updateEmployeePermissions = asyncHandler(async (req, res) => {
  const u = req.user;
  const canGrant = Boolean(u && (u.isAdmin || u.systemRole === 'admin' || u.isDelegatedAdmin || u.permissions?.grantPermissions || u.permissions?.allAccess));
  if (!canGrant) {
    return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can modify employee permissions.' });
  }

  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { $or: [{ employeeCode: id.trim().toUpperCase() }, { email: id.trim().toLowerCase() }] };

  const existingTarget = await Employee.findOne(query);
  if (!existingTarget) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  const isPrimaryAdminTarget =
    existingTarget.employeeCode === 'ADM-001' ||
    existingTarget.isSuperAdmin === true ||
    String(existingTarget.email || '').toLowerCase() === 'admin@inforag.com';

  if (isPrimaryAdminTarget) {
    return res.status(403).json({
      success: false,
      message: 'Primary Administrator permissions are permanently protected and cannot be modified.'
    });
  }

  const { permissions, isDelegatedAdmin, delegationExpiresAt, systemRole } = req.body;

  const updateFields = {};
  if (permissions !== undefined) updateFields.permissions = permissions;
  if (isDelegatedAdmin !== undefined) updateFields.isDelegatedAdmin = Boolean(isDelegatedAdmin);
  if (delegationExpiresAt !== undefined) updateFields.delegationExpiresAt = delegationExpiresAt || null;
  if (systemRole) {
    updateFields.systemRole = systemRole;
    updateFields.isAdmin = systemRole === 'admin';
  } else if (isDelegatedAdmin !== undefined && !isDelegatedAdmin && existingTarget.isAdmin) {
    updateFields.isAdmin = false;
  }

  const employee = await Employee.findOneAndUpdate(
    { _id: existingTarget._id },
    { $set: updateFields },
    { new: true, runValidators: false }
  );

  // 📡 Real-Time Multi-Device Socket Broadcast to immediately apply new/revoked permissions
  try {
    const { emitToAll, emitToUser } = require('../../../shared/socket/socketManager');
    const empIdStr = employee._id.toString();
    const socketPayload = {
      employeeId: empIdStr,
      employeeCode: employee.employeeCode,
      email: employee.email,
      permissions: employee.permissions || {},
      isDelegatedAdmin: Boolean(employee.isDelegatedAdmin),
      delegationExpiresAt: employee.delegationExpiresAt || null,
      systemRole: employee.systemRole,
      role: employee.role
    };
    emitToAll('employee:permissions:updated', socketPayload);
    emitToUser(empIdStr, 'employee:permissions:updated', socketPayload);
    if (employee.employeeCode) emitToUser(employee.employeeCode, 'employee:permissions:updated', socketPayload);
    if (employee.email) emitToUser(employee.email.toLowerCase(), 'employee:permissions:updated', socketPayload);
  } catch (socketErr) {
    console.warn('[employeeController] Socket broadcast error:', socketErr.message);
  }

  res.json({
    success: true,
    message: 'Permissions updated successfully in database',
    data: sanitizeEmployeeForResponse(employee, req.user)
  });
});

// ─── DELETE /api/employees/:id ───────────────────────────────────────────────
const deleteEmployee = asyncHandler(async (req, res) => {
  const u = req.user;
  const canDelete = Boolean(u && (u.isAdmin || u.systemRole === 'admin' || u.isDelegatedAdmin || u.permissions?.deleteEmployees || u.permissions?.allAccess));
  if (!canDelete) {
    return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can delete employees.' });
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
  try {
    const { emitToAll } = require('../../../shared/socket/socketManager');
    emitToAll('employee:updated', { action: 'delete', id: String(employee._id), employeeCode: employee.employeeCode });
  } catch (_) {}
  res.json({ success: true, message: 'Employee removed', data: {} });
});

// ─── GET /api/employees/:id/credentials (Admin-Only Credential Vault) ─────────
const getEmployeeCredentials = asyncHandler(async (req, res) => {
  const actor = req.user;
  const canViewCreds = Boolean(actor && (actor.isAdmin || actor.systemRole === 'admin' || actor.isDelegatedAdmin || actor.permissions?.allAccess));
  if (!canViewCreds) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only Administrators can view employee login credentials.'
    });
  }

  const { id } = req.params;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { $or: [{ employeeCode: id.trim().toUpperCase() }, { email: id.trim().toLowerCase() }] };

  const employee = await Employee.findOne(query).lean();
  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  let activePassword = decryptVaultSecret(employee.adminVaultPassword);
  if (!activePassword && employee.password) {
    const raw = String(employee.password);
    if (!isPasswordHashed(raw) && !/^\$2[aby]\$\d{2}\$/.test(raw)) {
      activePassword = raw;
    }
  }

  const history = Array.isArray(employee.passwordHistory)
    ? employee.passwordHistory
        .map(h => ({
          password: h.vaultSecret
            ? decryptVaultSecret(h.vaultSecret)
            : (h.password && !isPasswordHashed(h.password) && !/^\$2[aby]\$\d{2}\$/.test(String(h.password)) ? String(h.password) : null),
          changedAt: h.changedAt || null,
          changedBy: h.changedBy || 'User'
        }))
        .filter(h => h.password)
    : [];

  res.json({
    success: true,
    data: {
      employeeId: String(employee._id),
      employeeCode: employee.employeeCode,
      email: employee.email,
      password: activePassword || null,
      isEncryptedOnly: !activePassword,
      passwordHistory: history,
      passwordUpdatedAt: employee.passwordUpdatedAt || null
    }
  });
});

module.exports = {
  getEmployees,
  getCurrentUser,
  switchCurrentUser,
  getEmployeeById,
  getEmployeeCredentials,
  createEmployee,
  updateEmployee,
  updateEmployeePermissions,
  deleteEmployee
};

