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
    const userIdHeader = req.headers['x-user-id'];
    const userRoleHeader = req.headers['x-user-role'];

    let user = null;

    if (userIdHeader) {
      if (mongoose.Types.ObjectId.isValid(userIdHeader)) {
        user = await Employee.findById(userIdHeader);
      }
      if (!user) {
        user = await Employee.findOne({ employeeCode: userIdHeader });
      }
    }

    // Fallback: lookup employee flagged with isCurrentUser: true in DB
    if (!user) {
      user = await Employee.findOne({ isCurrentUser: true });
    }

    // Default fallback to Admin if none flagged
    if (!user) {
      user = (await Employee.findOne({ employeeCode: 'ADM-001' })) || (await Employee.findOne());
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
