/**
 * @file authMiddleware.js
 * @description Authentication and User Scoping Middleware for EMS/CRM Backend.
 * Strictly scopes data to authenticated user (req.user) while permitting admin oversight.
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
      const isSystemAdmin = !!(user.isAdmin || user.role === 'Administrator' || user.employeeCode === 'ADM-001' || userRoleHeader === 'admin');
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
        isAdmin: isSystemAdmin
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
        isAdmin: isSystemAdmin
      };
    } else {
      req.user = {
        _id: 'adm_001',
        id: 'adm_001',
        employeeCode: 'ADM-001',
        name: 'Administrator',
        systemRole: 'admin',
        isAdmin: true
      };
    }

    next();
  } catch (err) {
    next(err);
  }
};
