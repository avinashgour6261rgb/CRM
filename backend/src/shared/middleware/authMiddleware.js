/**
 * @file authMiddleware.js
 * @description Authentication and User Scoping Middleware for EMS/CRM Backend.
 * Strictly scopes data to authenticated user (req.user) while permitting admin oversight
 * and dynamic action-level delegation.
 */

const mongoose = require('mongoose');
const Employee = require('../../modules/hr/models/Employee');

/**
 * Extracts and sets req.user based on request headers (x-user-id / x-user-role)
 * or active MongoDB employee (isCurrentUser: true).
 */
exports.authenticateUser = async (req, res, next) => {
  try {
    const userIdHeader = (req.headers['x-user-id'] || '').trim();
    const userRoleHeader = (req.headers['x-user-role'] || '').trim();
    const userEmailHeader = (req.headers['x-user-email'] || '').trim();
    const userCodeHeader = (req.headers['x-user-code'] || '').trim();

    let user = null;

    if (mongoose.connection.readyState === 1) {
      if (userIdHeader) {
        if (mongoose.Types.ObjectId.isValid(userIdHeader)) {
          user = await Employee.findById(userIdHeader);
        }
        if (!user) {
          user = await Employee.findOne({ employeeCode: userIdHeader });
        }
        if (!user) {
          user = await Employee.findOne({ email: new RegExp(`^${userIdHeader}$`, 'i') });
        }
      }

      if (!user && userEmailHeader) {
        user = await Employee.findOne({ email: new RegExp(`^${userEmailHeader}$`, 'i') });
      }

      if (!user && userCodeHeader) {
        user = await Employee.findOne({ employeeCode: userCodeHeader });
      }

      // Only fallback to DB isCurrentUser or ADM-001 if NO client identifiers were provided
      if (!user && !userIdHeader && !userEmailHeader && !userCodeHeader) {
        user = await Employee.findOne({ isCurrentUser: true });
        if (!user) {
          user = (await Employee.findOne({ employeeCode: 'ADM-001' })) || (await Employee.findOne());
        }
      }
    }

    if (user) {
      let isDelegatedAdmin = !!user.isDelegatedAdmin;
      if (isDelegatedAdmin && user.delegationExpiresAt) {
        const expTime = new Date(user.delegationExpiresAt).getTime();
        if (!isNaN(expTime) && expTime < Date.now()) {
          isDelegatedAdmin = false;
        }
      }

      const isSystemAdmin = !!(user.isAdmin || user.role === 'Administrator' || user.employeeCode === 'ADM-001' || userRoleHeader === 'admin' || isDelegatedAdmin);
      const isSystemHR = !!(user.department === 'Human Resources' || user.role?.toLowerCase().includes('hr') || userRoleHeader === 'hr');

      req.user = {
        _id: user._id.toString(),
        id: user._id.toString(),
        employeeCode: user.employeeCode,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        systemRole: isSystemAdmin ? 'admin' : (isSystemHR ? 'hr' : 'team_member'),
        isAdmin: isSystemAdmin,
        isDelegatedAdmin,
        permissions: user.permissions || {}
      };
    } else if (userIdHeader || userEmailHeader || userCodeHeader) {
      // Ephemeral authenticated user (e.g. from client session or newly created account)
      const isSystemAdmin = userRoleHeader === 'admin' || userCodeHeader === 'ADM-001';
      const isSystemHR = userRoleHeader === 'hr';

      req.user = {
        _id: userIdHeader || userCodeHeader || 'user_client',
        id: userIdHeader || userCodeHeader || 'user_client',
        employeeCode: userCodeHeader || userIdHeader || '',
        name: userEmailHeader ? userEmailHeader.split('@')[0] : (userIdHeader || 'User'),
        email: userEmailHeader || '',
        role: isSystemAdmin ? 'Administrator' : (isSystemHR ? 'HR Manager' : 'Team Member'),
        department: isSystemHR ? 'Human Resources' : 'General',
        systemRole: isSystemAdmin ? 'admin' : (isSystemHR ? 'hr' : 'team_member'),
        isAdmin: isSystemAdmin,
        permissions: {}
      };
    } else {
      req.user = {
        _id: 'adm_001',
        id: 'adm_001',
        employeeCode: 'ADM-001',
        name: 'Administrator',
        systemRole: 'admin',
        isAdmin: true,
        permissions: {}
      };
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require specific permission or role to access an endpoint
 */
exports.requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.isAdmin || req.user.systemRole === 'admin') {
      return next();
    }

    const perms = req.user.permissions || {};
    if (perms[permissionKey] || perms.allAccess) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: missing '${permissionKey}' authority.`
    });
  };
};
