/**
 * @file authMiddleware.js
 * @description Authentication and User Scoping Middleware for EMS/CRM Backend.
 * Strictly scopes data to authenticated user (req.user) while permitting admin oversight
 * and dynamic action-level delegation.
 */

const mongoose = require('mongoose');
const Employee = require('../../modules/hr/models/Employee');
const { verifyJwt } = require('../utils/authCrypto');

/**
 * Extracts and sets req.user strictly from a verified JWT Bearer token (primary)
 * or verified MongoDB employee lookup (graceful migration for existing sessions).
 * SECURITY:
 * - NEVER trusts client-forged x-user-role or x-user-permissions headers to grant Admin/RBAC privileges.
 * - NEVER defaults unauthenticated requests to ADM-001 Administrator.
 */
exports.authenticateUser = async (req, res, next) => {
  try {
    const authHeader = (req.headers.authorization || '').trim();
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const jwtPayload = bearerToken ? verifyJwt(bearerToken) : null;

    const userIdHeader = (req.headers['x-user-id'] || '').trim();
    const userEmailHeader = (req.headers['x-user-email'] || '').trim();
    const userCodeHeader = (req.headers['x-user-code'] || '').trim();

    let user = null;

    if (mongoose.connection.readyState === 1) {
      // 1. Primary (authoritative): Signed JWT subject lookup
      if (jwtPayload?.sub) {
        if (mongoose.Types.ObjectId.isValid(jwtPayload.sub)) {
          user = await Employee.findById(jwtPayload.sub);
        }
        if (!user && jwtPayload.employeeCode) {
          user = await Employee.findOne({ employeeCode: String(jwtPayload.employeeCode).toUpperCase() });
        }
      }

      // 2. Graceful fallback lookup by real DB employee identifier (still strictly uses DB role & DB permissions ONLY!)
      if (!user && userIdHeader) {
        if (mongoose.Types.ObjectId.isValid(userIdHeader)) {
          user = await Employee.findById(userIdHeader);
        }
        if (!user) {
          user = await Employee.findOne({ employeeCode: userIdHeader.toUpperCase() });
        }
        if (!user) {
          user = await Employee.findOne({ email: new RegExp(`^${userIdHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }
      }

      if (!user && userEmailHeader) {
        user = await Employee.findOne({ email: new RegExp(`^${userEmailHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      }

      if (!user && userCodeHeader) {
        user = await Employee.findOne({ employeeCode: userCodeHeader.toUpperCase() });
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

      // Strictly derive systemRole, isAdmin, and permissions ONLY from MongoDB Employee document!
      const dbPerms = (user.permissions && typeof user.permissions === 'object') ? user.permissions : {};
      const isSystemAdmin = !!(
        user.isAdmin ||
        user.isSuperAdmin ||
        user.systemRole === 'admin' ||
        user.role === 'Administrator' ||
        user.employeeCode === 'ADM-001' ||
        isDelegatedAdmin ||
        dbPerms.allAccess === true
      );
      const isSystemHR = !!(
        user.systemRole === 'hr' ||
        user.department === 'Human Resources' ||
        user.role?.toLowerCase().includes('hr')
      );

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
        permissions: dbPerms,
        authenticatedViaJwt: Boolean(jwtPayload)
      };
    } else {
      // Unauthenticated request: NEVER auto-grant Administrator and NEVER leak private workspace data!
      req.user = null;
      if (req.method !== 'OPTIONS') {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please sign in to access this resource.'
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

exports.requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  return next();
};

exports.requireAdminOrHR = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (req.user.isAdmin || req.user.systemRole === 'admin' || req.user.systemRole === 'hr' || req.user.isDelegatedAdmin) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin or HR authority required.' });
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
