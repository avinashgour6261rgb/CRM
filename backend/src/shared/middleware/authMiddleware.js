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
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (authHeader || '');
    const jwtPayload = bearerToken ? verifyJwt(bearerToken) : null;

    if (bearerToken && !jwtPayload && req.method !== 'OPTIONS') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please sign in again.'
      });
    }

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

      // 2. Fallback lookup by real DB employee identifier (only when Bearer token is missing, e.g. transitional sessions)
      if (!user && (userIdHeader || userEmailHeader || userCodeHeader)) {
        if (userIdHeader && mongoose.Types.ObjectId.isValid(userIdHeader)) {
          user = await Employee.findById(userIdHeader);
        }
        if (!user && userIdHeader) {
          user = await Employee.findOne({ employeeCode: userIdHeader.toUpperCase() });
        }
        if (!user && userIdHeader) {
          user = await Employee.findOne({ email: new RegExp(`^${userIdHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }
        if (!user && userEmailHeader) {
          user = await Employee.findOne({ email: new RegExp(`^${userEmailHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }
        if (!user && userCodeHeader) {
          user = await Employee.findOne({ employeeCode: userCodeHeader.toUpperCase() });
        }
      }
    }

const INACTIVE_ACCOUNT_STATUSES = new Set(['resigned', 'relieved', 'inactive', 'terminated', 'suspended', 'archived']);

    if (user) {
      // Block relieved / inactive / terminated ex-employees on all protected API routes (never block ADM-001)
      const isDeactivated = String(user.employeeCode || '').toUpperCase() !== 'ADM-001' &&
        INACTIVE_ACCOUNT_STATUSES.has(String(user.status || 'active').toLowerCase().trim());
      if (isDeactivated && req.method !== 'OPTIONS') {
        return res.status(401).json({
          success: false,
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account has been deactivated or relieved. Please contact HR or Administrator.'
        });
      }

      // Enforce JWT tokenVersion revocation (if Admin/HR revoked active sessions)
      if (jwtPayload?.tokenVersion && user.tokenVersion && Number(jwtPayload.tokenVersion) < Number(user.tokenVersion) && req.method !== 'OPTIONS') {
        return res.status(401).json({
          success: false,
          code: 'SESSION_REVOKED',
          message: 'Your session has been revoked. Please sign in again.'
        });
      }

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
      const explicitSysRole = String(user.systemRole || '').toLowerCase().trim();
      const isExplicitValidRole = ['admin', 'hr', 'team_leader', 'team_member'].includes(explicitSysRole);
      const roleStr = String(user.role || '');

      let resolvedSystemRole = 'team_member';
      if (isSystemAdmin) {
        resolvedSystemRole = 'admin';
      } else if (isExplicitValidRole) {
        if (explicitSysRole === 'team_member' && /\bhr\b|human resource/i.test(roleStr)) {
          resolvedSystemRole = 'hr';
        } else {
          resolvedSystemRole = explicitSysRole;
        }
      } else if (user.department === 'Human Resources' || /\bhr\b|human resource/i.test(roleStr)) {
        resolvedSystemRole = 'hr';
      } else if (/leader|lead|manager/i.test(roleStr)) {
        resolvedSystemRole = 'team_leader';
      }

      req.user = {
        _id: user._id.toString(),
        id: user._id.toString(),
        employeeCode: user.employeeCode,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status || 'active',
        systemRole: resolvedSystemRole,
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
