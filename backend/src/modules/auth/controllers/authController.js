/**
 * @file authController.js
 * @description Centralized Database Authentication Controller for EMS.
 * Validates credentials strictly against MongoDB Atlas records so any created ID/password works anywhere.
 */

const mongoose = require('mongoose');
const Employee = require('../../hr/models/Employee');
const asyncHandler = require('../../../shared/middleware/asyncHandler');
const {
  hashPassword,
  isPasswordHashed,
  verifyPassword,
  encryptVaultSecret,
  decryptVaultSecret,
  signJwt,
  verifyJwt
} = require('../../../shared/utils/authCrypto');

const INACTIVE_ACCOUNT_STATUSES = new Set(['resigned', 'inactive', 'terminated', 'suspended', 'archived']);

const isAccountDeactivated = (employee) => {
  if (!employee) return false;
  if (String(employee.employeeCode || '').toUpperCase() === 'ADM-001') return false;
  return INACTIVE_ACCOUNT_STATUSES.has(String(employee.status || 'active').toLowerCase().trim());
};

const buildSessionUser = (employee) => {
  let isDelegatedAdmin = !!employee.isDelegatedAdmin;
  if (isDelegatedAdmin && employee.delegationExpiresAt) {
    const exp = new Date(employee.delegationExpiresAt).getTime();
    if (!isNaN(exp) && exp < Date.now()) {
      isDelegatedAdmin = false;
    }
  }

  const dbPerms = (employee.permissions && typeof employee.permissions === 'object') ? employee.permissions : {};
  const isSystemAdmin = !!(
    employee.isAdmin ||
    employee.isSuperAdmin ||
    employee.systemRole === 'admin' ||
    employee.role === 'Administrator' ||
    employee.employeeCode === 'ADM-001' ||
    isDelegatedAdmin ||
    dbPerms.allAccess === true
  );

  const explicitSysRole = String(employee.systemRole || '').toLowerCase().trim();
  const isExplicitValidRole = ['admin', 'hr', 'team_leader', 'team_member'].includes(explicitSysRole);
  const roleStr = String(employee.role || '');

  let resolvedSystemRole = 'team_member';
  if (isSystemAdmin) {
    resolvedSystemRole = 'admin';
  } else if (isExplicitValidRole) {
    // Preserve explicit DB systemRole (e.g. team_leader, hr, team_member); backwards-compat for legacy HR roles
    if (explicitSysRole === 'team_member' && /\bhr\b|human resource/i.test(roleStr)) {
      resolvedSystemRole = 'hr';
    } else {
      resolvedSystemRole = explicitSysRole;
    }
  } else if (employee.department === 'Human Resources' || /\bhr\b|human resource/i.test(roleStr)) {
    resolvedSystemRole = 'hr';
  } else if (/leader|lead|manager/i.test(roleStr)) {
    resolvedSystemRole = 'team_leader';
  }

  return {
    _id: employee._id.toString(),
    id: employee._id.toString(),
    employeeCode: employee.employeeCode,
    name: employee.name,
    email: employee.email,
    avatar: employee.avatar || '',
    role: employee.role,
    department: employee.department,
    systemRole: resolvedSystemRole,
    isAdmin: isSystemAdmin,
    isSuperAdmin: isSystemAdmin,
    isDelegatedAdmin,
    delegationExpiresAt: employee.delegationExpiresAt || null,
    status: employee.status || 'active',
    shiftTiming: employee.shiftTiming || '',
    workMode: employee.workMode || 'Office',
    phone: employee.phone || '',
    dob: employee.dob || '',
    gender: employee.gender || '',
    address: employee.address || '',
    joiningDate: employee.joiningDate,
    leaveBalance: employee.leaveBalance,
    startingSalary: employee.startingSalary,
    salary: employee.salary,
    bankDetails: employee.bankDetails,
    emergencyContact: employee.emergencyContact || {},
    emergencyContacts: Array.isArray(employee.emergencyContacts) ? employee.emergencyContacts : [],
    workPreferences: (employee.workPreferences && typeof employee.workPreferences === 'object') ? employee.workPreferences : {},
    permissions: dbPerms
  };
};

// Lightweight in-memory rate limiting: max 10 failed login attempts per 15 mins per IP/identifier
const loginAttemptsMap = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;

function checkLoginRateLimit(key) {
  const now = Date.now();
  const record = loginAttemptsMap.get(key);
  if (!record) return { allowed: true };
  if (now - record.startTime > LOGIN_WINDOW_MS) {
    loginAttemptsMap.delete(key);
    return { allowed: true };
  }
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterMins = Math.ceil((record.startTime + LOGIN_WINDOW_MS - now) / 60000);
    return { allowed: false, retryAfterMins };
  }
  return { allowed: true };
}

function recordLoginFailure(key) {
  const now = Date.now();
  const record = loginAttemptsMap.get(key);
  if (!record || now - record.startTime > LOGIN_WINDOW_MS) {
    loginAttemptsMap.set(key, { count: 1, startTime: now });
  } else {
    record.count += 1;
  }
}

function clearLoginAttempts(key) {
  loginAttemptsMap.delete(key);
}

// @desc    Universal Login endpoint (supports Email or Employee Code with Password)
// @route   POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const input = (req.body.identifier || req.body.email || req.body.employeeCode || req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (!input) {
    return res.status(400).json({ success: false, message: 'Employee ID or Email is required.' });
  }
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  const clientKey = `${req.ip || 'ip'}_${input.toLowerCase()}`;
  const rateLimitStatus = checkLoginRateLimit(clientKey);
  if (!rateLimitStatus.allowed) {
    return res.status(429).json({
      success: false,
      message: `Too many failed login attempts. Please try again after ${rateLimitStatus.retryAfterMins} minutes.`
    });
  }

  // Find employee in MongoDB Atlas
  const employee = await Employee.findOne({
    $or: [
      { email: input.toLowerCase() },
      { employeeCode: input.toUpperCase() }
    ]
  });

  if (!employee) {
    recordLoginFailure(clientKey);
    return res.status(401).json({
      success: false,
      message: `User with ID / Email "${input}" was not found in the database. Please verify or register with Admin.`
    });
  }

  // Block relieved / inactive / terminated ex-employees from signing in
  if (isAccountDeactivated(employee)) {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_INACTIVE',
      message: `This account (${employee.status}) has been deactivated or relieved. Please contact HR or Administrator.`
    });
  }

  // Strict password verification (supports scrypt hashes + seamless auto-upgrade from legacy plaintext)
  if (!employee.password) {
    recordLoginFailure(clientKey);
    return res.status(401).json({
      success: false,
      message: 'Account password has not been initialized. Please contact Administrator.'
    });
  }

  const isPasswordValid = verifyPassword(password, employee.password);

  if (!isPasswordValid) {
    recordLoginFailure(clientKey);
    return res.status(401).json({
      success: false,
      message: 'Incorrect password. Please verify credentials or contact Admin.'
    });
  }

  clearLoginAttempts(clientKey);

  // Seamlessly migrate legacy plaintext/bcrypt password to salted scrypt hash & sync encrypted Admin Vault copy
  const currentVaultDecrypted = decryptVaultSecret(employee.adminVaultPassword);
  if (!isPasswordHashed(employee.password) || currentVaultDecrypted !== password) {
    try {
      if (!isPasswordHashed(employee.password)) {
        employee.password = hashPassword(password);
        employee.passwordMigratedAt = new Date().toISOString();
      }
      employee.adminVaultPassword = encryptVaultSecret(password);
      await employee.save();
    } catch (_) {}
  }

  const userObj = buildSessionUser(employee);

  const signedToken = signJwt({
    sub: employee._id.toString(),
    employeeCode: employee.employeeCode,
    email: employee.email,
    tokenVersion: employee.tokenVersion || 1
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token: signedToken,
    user: userObj
  });
});

// @desc    Get authenticated user session profile
// @route   GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  let userId = null;
  let jwtPayload = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    jwtPayload = verifyJwt(authHeader.slice(7).trim());
    if (jwtPayload?.sub) userId = jwtPayload.sub;
  }
  if (!userId && (req.user?.id || req.user?._id)) {
    userId = req.user?.id || req.user?._id;
  }
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  let employee = null;
  if (mongoose.Types.ObjectId.isValid(userId)) {
    employee = await Employee.findById(userId);
  }
  if (!employee) {
    employee = await Employee.findOne({ employeeCode: String(userId).toUpperCase() });
  }

  if (!employee) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (isAccountDeactivated(employee)) {
    return res.status(401).json({
      success: false,
      code: 'ACCOUNT_INACTIVE',
      message: 'Your account has been deactivated or relieved. Please contact HR or Administrator.'
    });
  }

  if (jwtPayload?.tokenVersion && employee.tokenVersion && Number(jwtPayload.tokenVersion) < Number(employee.tokenVersion)) {
    return res.status(401).json({
      success: false,
      code: 'SESSION_REVOKED',
      message: 'Your session has been revoked. Please sign in again.'
    });
  }

  res.json({
    success: true,
    data: buildSessionUser(employee)
  });
});

// @desc    Revoke all other active sessions by bumping tokenVersion & issuing a fresh JWT for current device
// @route   POST /api/auth/logout-other-devices
exports.logoutOtherDevices = asyncHandler(async (req, res) => {
  let userId = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const decoded = verifyJwt(authHeader.slice(7).trim());
    if (decoded?.sub) userId = decoded.sub;
  }
  if (!userId && (req.user?.id || req.user?._id)) {
    userId = req.user?.id || req.user?._id;
  }
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  let employee = null;
  if (mongoose.Types.ObjectId.isValid(userId)) {
    employee = await Employee.findById(userId);
  }
  if (!employee) {
    employee = await Employee.findOne({ employeeCode: String(userId).toUpperCase() });
  }
  if (!employee) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const nextVersion = (Number(employee.tokenVersion) || 1) + 1;
  employee.tokenVersion = nextVersion;
  await employee.save();

  const freshToken = signJwt({
    sub: employee._id.toString(),
    employeeCode: employee.employeeCode,
    email: employee.email,
    tokenVersion: nextVersion
  });

  try {
    const { emitToAll, emitToUser } = require('../../../shared/socket/socketManager');
    const revokePayload = {
      employeeId: employee._id.toString(),
      employeeCode: employee.employeeCode,
      email: employee.email,
      minTokenVersion: nextVersion,
      reason: 'Logged out from another device'
    };
    emitToUser(employee._id.toString(), 'session:revoked', revokePayload);
    if (employee.employeeCode) emitToUser(employee.employeeCode, 'session:revoked', revokePayload);
    if (employee.email) emitToUser(employee.email.toLowerCase(), 'session:revoked', revokePayload);
    emitToAll('session:revoked', revokePayload);
  } catch (_) {}

  res.json({
    success: true,
    token: freshToken,
    tokenVersion: nextVersion,
    message: 'All other active sessions have been signed out.'
  });
});
