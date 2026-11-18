/**
 * @file permissionUtils.js
 * @description Standard 4-Role Role-Based Access Control (RBAC) System:
 * 1. 'admin' (Admin) - Full System Access across all modules & settings
 * 2. 'hr' (HR) - Workforce operations, employee directory, leave approvals, company holidays, payroll view
 * 3. 'team_leader' (Team Leader) - Project & Sprint management, Task assignment, Team timesheets & Leave approvals
 * 4. 'team_member' (Team Member) - Personal dashboard, Assigned tasks, Clock in/out shift tracking, My leaves & payslips
 */

export const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  TEAM_LEADER: 'team_leader',
  TEAM_MEMBER: 'team_member'
};

export const ROLE_CONFIGS = {
  [ROLES.ADMIN]: {
    id: 'admin',
    name: 'Admin',
    badge: '👑 Admin',
    shortName: 'Admin',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    description: 'Master unrestricted authority over entire system, RBAC role assignments, and company configuration.',
    level: 1,
    permissions: [
      'Full System & Security Settings (RBAC & Company Branding)',
      'Add, Edit, Delete & Promote Employees and Assign Roles',
      'Universal Leave Approval & Policy Management',
      'Declare, Edit & Delete Company Holidays',
      'Full Payroll Management, Salary Increments & Expense Approvals',
      'Create & Manage all Projects, Sprints, and Tasks',
      'Full CRM Leads Pipeline (Create, View, Edit, Delete all)',
      'Manage & Resolve all Client and Employee Support Tickets',
      'Publish, Pin & Delete Company-wide Notices',
      'Full Analytics, KPIs, and Company Shift Attendance'
    ]
  },
  [ROLES.HR]: {
    id: 'hr',
    name: 'HR',
    badge: '💼 HR',
    shortName: 'HR',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    description: 'Workforce onboarding, leave approvals, monthly attendance management, company holidays & payroll reporting.',
    level: 2,
    permissions: [
      'Employee Directory Management, Onboarding & Documents',
      'Approve & Reject Employee Leave Applications',
      'Monthly Attendance Tracking, Shift Clock & Reports',
      'Declare, Edit & Delete Official Company Holidays',
      'Give Employee Appreciations & Recognition Badges',
      'View Payroll Matrix & Generate Employee Salary Slips',
      'Review & Approve Employee Expense Reimbursements',
      'Publish Official Company Notices & Announcements',
      'Manage Internal Employee Support Tickets',
      'View Active Projects & Workforce Resource Allocation'
    ]
  },
  [ROLES.TEAM_LEADER]: {
    id: 'team_leader',
    name: 'Team Leader',
    badge: '🚀 Team Leader',
    shortName: 'Team Leader',
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#e9d5ff',
    description: 'Sprint planning, project creation, task delegation, team timesheet oversight & team leave recommendations.',
    level: 3,
    permissions: [
      'Create & Manage Team Projects, Milestones & Sprints',
      'Create Tasks & Assign to Team Members',
      'Review & Approve Team Members\' Work Timesheets',
      'Review & Approve Assigned Team Members\' Leaves',
      'Manage & Assign Team CRM Leads & Deals',
      'Manage Client & Project Support Tickets',
      'View Team Attendance & Clock Status',
      'Submit & Track Project Expenses',
      'Post Team Notices & View Company Announcements',
      'View Public Employee Directory & Award Appreciations'
    ]
  },
  [ROLES.TEAM_MEMBER]: {
    id: 'team_member',
    name: 'Team Member',
    badge: '👤 Team Member',
    shortName: 'Team Member',
    subTitle: 'Employee under TL',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    description: 'TL (Team Leader) ke under regular employee: Assigned task completion, daily 8h 30m shift tracking, 1-click breaks, personal leave applications & payslips.',
    level: 4,
    permissions: [
      'Personal Dashboard with My Tasks & Sprint Goals',
      'Daily Attendance Clock In / Clock Out & 1-Click Tea/Lunch Breaks',
      'Execute Assigned Tasks & Log Timesheet Hours',
      'Apply for Personal Leaves & Track Leave Balance',
      'Download Personal Salary Payslips',
      'Submit Personal Expense Reimbursement Claims',
      'Raise Internal/Client Support Tickets & Track Status',
      'View Company Holiday Calendar & Official Notices',
      'Access Team Chat & Conversations',
      'View Public Company Employee Directory'
    ]
  }
};

/**
 * Standardize and resolve an employee's role into one of the 4 standard roles.
 */
export const getUserRole = (user) => {
  if (!user) return ROLES.TEAM_MEMBER;
  
  // 0. Primary Administrator Immutable Rule (Cannot be demoted, root system protection)
  if (
    user.employeeCode === 'ADM-001' ||
    user.isSuperAdmin ||
    user.email === 'admin@inforag.com' ||
    user.isAdmin
  ) {
    return ROLES.ADMIN;
  }

  // 1. Check direct system role attribute if explicitly set
  if (user.systemRole && Object.values(ROLES).includes(user.systemRole)) {
    return user.systemRole;
  }

  // 2. Direct flags
  if (user.isDelegatedAdmin) {
    return ROLES.ADMIN;
  }

  // Check stored delegation in EMS_USER_PERMISSIONS
  try {
    const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
    if (rawMap) {
      const parsed = JSON.parse(rawMap);
      const userKey = user._id || user.employeeCode || user.email;
      if (userKey && (parsed[userKey]?.allAccess || parsed[userKey]?.isDelegatedAdmin)) {
        return ROLES.ADMIN;
      }
    }
  } catch (_) {}

  const roleStr = (user.role || '').toLowerCase().trim();
  const titleStr = (user.title || user.designation || '').toLowerCase().trim();
  const emailStr = (user.email || '').toLowerCase().trim();

  // 3. Admin classification
  if (
    roleStr === 'admin' ||
    roleStr === 'super_admin' ||
    roleStr.includes('director') ||
    roleStr.includes('administrator') ||
    roleStr.includes('executive management') ||
    emailStr.startsWith('admin@')
  ) {
    return ROLES.ADMIN;
  }

  // 4. HR classification
  if (
    roleStr === 'hr' ||
    roleStr === 'hr_manager' ||
    roleStr.includes('human resource') ||
    roleStr.includes('hr manager') ||
    roleStr.includes('people ops') ||
    roleStr.includes('hr operations') ||
    emailStr.startsWith('hr@')
  ) {
    return ROLES.HR;
  }

  // 5. Team Leader classification
  if (
    roleStr === 'team_leader' ||
    roleStr === 'team_lead' ||
    roleStr.includes('leader') ||
    roleStr.includes('lead') ||
    roleStr.includes('project manager') ||
    roleStr.includes('scrum master') ||
    roleStr.includes('tech lead') ||
    titleStr.includes('leader') ||
    titleStr.includes('lead')
  ) {
    return ROLES.TEAM_LEADER;
  }

  // 6. Default fallback: Team Member
  return ROLES.TEAM_MEMBER;
};

// ── Role Boolean Checkers ──
export const isAdmin = (user) => getUserRole(user) === ROLES.ADMIN;
export const isHR = (user) => getUserRole(user) === ROLES.HR;
export const isTeamLeader = (user) => getUserRole(user) === ROLES.TEAM_LEADER;
export const isTeamMember = (user) => getUserRole(user) === ROLES.TEAM_MEMBER;
export const isPrimaryAdmin = (user) => Boolean(
  user && (
    user.employeeCode === 'ADM-001' ||
    user.isSuperAdmin ||
    user.email === 'admin@inforag.com' ||
    user.email === 'avinash@inforag.com'
  )
);

// ── Composite Permission Checkers ──
export const isHRorAdmin = (user) => {
  const r = getUserRole(user);
  return r === ROLES.ADMIN || r === ROLES.HR;
};

export const isLeaderOrAbove = (user) => {
  const r = getUserRole(user);
  return r === ROLES.ADMIN || r === ROLES.HR || r === ROLES.TEAM_LEADER;
};

// ── Feature-Specific Permission Gates ──
export const canViewAllAttendance = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  if (user?.permissions?.viewAllAttendance === true || user?.permissions?.allAccess === true) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.viewAllAttendance === false) return false;
  return Boolean(perms?.viewAllAttendance === true || isAdmin(user) || isDelegationActive(user));
};

export const canEditAttendance = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.viewAllAttendance === false || perms?.editAttendance === false) return false;
  return Boolean(perms?.editAttendance === true || isAdmin(user) || isDelegationActive(user));
};

export const canForceClockOut = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  // Explicit deny ALWAYS wins (even if delegated/allAccess) so Admin can grant Live Ops view-only without Force Clock-Out!
  if (perms?.liveOperations === false || perms?.teamoperations === false || perms?.forceClockOut === false) return false;
  if (perms?.forceClockOut === true) return true;
  if (perms?.allAccess === true) return true;
  return Boolean(isAdmin(user) || isDelegationActive(user));
};

export const canManageEmployees = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageEmployees === false || perms?.employees === false) return false;
  return Boolean(perms?.manageEmployees === true || perms?.employees === true || isAdmin(user) || isDelegationActive(user));
};

export const canApproveLeaves = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.approveLeaves === false) return false;
  return Boolean(perms?.approveLeaves === true || perms?.viewAllLeaves === true || isAdmin(user) || isHR(user) || isDelegationActive(user));
};

export const canViewAllLeaves = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.viewAllLeaves === false) return false;
  return Boolean(perms?.viewAllLeaves === true || perms?.approveLeaves === true || isAdmin(user) || isHR(user) || isDelegationActive(user));
};

/**
 * Check if the active user is the applicant who requested the leave
 */
export const isLeaveApplicant = (leave, user) => {
  if (!leave || !user) return false;
  const uId = String(user._id || user.id || '').trim();
  const uCode = String(user.employeeCode || '').trim();
  const uName = String(user.name || '').trim().toLowerCase();
  const uEmail = String(user.email || '').trim().toLowerCase();

  const lEmpId = String(leave.employeeId || leave.employee || '').trim();
  const lEmpCode = String(leave.employeeCode || '').trim();
  const lEmpName = String(leave.employeeName || leave.name || '').trim().toLowerCase();
  const lEmpEmail = String(leave.employeeEmail || leave.email || '').trim().toLowerCase();

  return (
    (uId && lEmpId && uId === lEmpId) ||
    (uCode && lEmpCode && uCode === lEmpCode) ||
    (uName && lEmpName && uName === lEmpName) ||
    (uEmail && lEmpEmail && uEmail === lEmpEmail)
  );
};

/**
 * Check if the active user is the designated approver chosen for this specific leave
 */
export const isLeaveDesignatedApprover = (leave, user) => {
  if (!leave || !user) return false;
  const uId = String(user._id || user.id || '').trim();
  const uCode = String(user.employeeCode || '').trim();
  const uName = String(user.name || '').trim().toLowerCase();
  const uEmail = String(user.email || '').trim().toLowerCase();

  const lAppId = String(leave.appliedToId || leave.appliedTo?._id || leave.appliedTo || leave.approverId || '').trim();
  const lAppCode = String(leave.appliedToCode || '').trim();
  const lAppName = String(leave.appliedToName || leave.appliedTo?.name || leave.approverName || '').trim().toLowerCase();
  const lAppEmail = String(leave.appliedToEmail || leave.appliedTo?.email || leave.approverEmail || '').trim().toLowerCase();

  if (uId && lAppId && (uId === lAppId || uId.toLowerCase() === lAppId.toLowerCase())) return true;
  if (uCode && lAppId && (uCode === lAppId || uCode.toLowerCase() === lAppId.toLowerCase())) return true;
  if (uCode && lAppCode && (uCode === lAppCode || uCode.toLowerCase() === lAppCode.toLowerCase())) return true;
  if (uName && lAppName) {
    if (uName === lAppName) return true;
    if (uName.includes(lAppName) || lAppName.includes(uName)) return true;
    const uFirst = uName.split(/\s+/)[0];
    const lFirst = lAppName.split(/\s+/)[0];
    if (uFirst && lFirst && uFirst.length >= 3 && uFirst === lFirst) return true;
  }
  if (uEmail && lAppEmail && uEmail === lAppEmail) return true;

  return false;
};

/**
 * Check if user is authorized to cancel a leave:
 * Strictly:
 * 1. The employee who requested the leave (Applicant)
 * 2. The designated approver to whom the request was sent
 * 3. HR or Admin (System Authority) unless explicitly revoked
 * NO ONE ELSE!
 */
export const canCancelLeave = (leave, user) => {
  if (!leave || !user) return false;
  if (isPrimaryAdmin(user)) return true;
  if (isLeaveApplicant(leave, user)) return true;
  if (isLeaveDesignatedApprover(leave, user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.approveLeaves === false || perms?.cancelLeaves === false) return false;
  return Boolean(perms?.cancelLeaves === true || isAdmin(user) || isHR(user) || isDelegationActive(user));
};

/**
 * Check if user is authorized to review (Approve / Reject) a pending leave:
 * Strictly:
 * 1. Cannot be applicant themselves (an employee can NEVER approve own leave)
 * 2. The designated approver, OR HR, OR Admin
 * NO ONE ELSE!
 */
export const canReviewLeave = (leave, user) => {
  if (!leave || !user) return false;
  if (isLeaveApplicant(leave, user)) return false;
  if (isPrimaryAdmin(user)) return true;
  if (isLeaveDesignatedApprover(leave, user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.approveLeaves === false) return false;
  return Boolean(perms?.approveLeaves === true || isAdmin(user) || isHR(user) || isDelegationActive(user));
};

export const canManageCompanyHolidays = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageCompanyHolidays === false) return false;
  return Boolean(perms?.manageCompanyHolidays === true || perms?.events === true || perms?.holidays === true || isAdmin(user) || isHR(user) || isDelegationActive(user));
};

export const canManagePayroll = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageSalaries === false || perms?.payroll === false) return false;
  return Boolean(perms?.manageSalaries === true || perms?.payroll === true || isAdmin(user) || isDelegationActive(user));
};

export const canManageProjects = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageProjects === false || perms?.projects === false) return false;
  return Boolean(perms?.manageProjects === true || perms?.createProjects === true || perms?.projects === true || isAdmin(user) || isDelegationActive(user));
};

export const canAssignRoles = (user) => isPrimaryAdmin(user) || isAdmin(user) || user?.isDelegatedAdmin;

export const canCreateTasks = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.createTasks === false) return false;
  return Boolean(perms?.createTasks === true || isAdmin(user) || isDelegationActive(user));
};

export const canViewAllTasks = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.viewAllTasks === false) return false;
  return Boolean(perms?.viewAllTasks === true || isAdmin(user) || isDelegationActive(user));
};

export const canManageTickets = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageTickets === false || perms?.tickets === false) return false;
  return Boolean(perms?.manageTickets === true || perms?.tickets === true || isAdmin(user) || isDelegationActive(user));
};

export const canViewAllTickets = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.viewAllTickets === false) return false;
  return Boolean(perms?.viewAllTickets === true || perms?.manageTickets === true || isAdmin(user) || isDelegationActive(user));
};

export const canAccessCRM = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.accessCRM === false || perms?.leads === false) return false;
  return Boolean(perms?.accessCRM === true || perms?.leads === true || perms?.viewAllLeads === true || isAdmin(user) || isDelegationActive(user));
};

export const canManageDocumentation = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.documentation === false || perms?.documents === false) return false;
  return Boolean(perms?.documentation === true || perms?.documents === true || isAdmin(user) || isDelegationActive(user));
};

export const canViewReports = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.reports === false || perms?.viewReports === false) return false;
  return Boolean(perms?.reports === true || perms?.viewReports === true || isAdmin(user) || isDelegationActive(user));
};

export const canPostNotices = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.postNotices === false || perms?.notices === false) return false;
  return Boolean(perms?.postNotices === true || perms?.notices === true || isAdmin(user) || isDelegationActive(user));
};

export const canGiveAppreciation = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.giveAppreciation === false || perms?.appreciation === false) return false;
  return Boolean(perms?.giveAppreciation === true || perms?.appreciation === true || isAdmin(user) || isDelegationActive(user));
};

export const canDeleteAppreciation = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.giveAppreciation === false || perms?.deleteAppreciations === false) return false;
  return Boolean(perms?.deleteAppreciations === true || isAdmin(user) || isDelegationActive(user));
};

export const canDeleteTask = (user, task = null) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.createTasks === false || perms?.deleteTasks === false) return false;
  return Boolean(perms?.deleteTasks === true || perms?.canDeleteTasks === true || isAdmin(user) || isDelegationActive(user));
};

export const canDeleteProject = (user, project = null) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageProjects === false || perms?.deleteProjects === false) return false;
  return Boolean(perms?.deleteProjects === true || perms?.canDeleteProjects === true || isAdmin(user) || isDelegationActive(user));
};

export const canDeleteEmployee = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageEmployees === false || perms?.employees === false || perms?.deleteEmployees === false) return false;
  return Boolean(perms?.deleteEmployees === true || isAdmin(user) || isDelegationActive(user));
};

export const canDeleteLead = (user, lead = null) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.accessCRM === false || perms?.leads === false || perms?.deleteLeads === false) return false;
  if (perms?.deleteLeads === true || isAdmin(user) || isDelegationActive(user)) return true;
  if (lead) {
    const uId = String(user._id || user.id || '').toLowerCase().trim();
    const uCode = String(user.employeeCode || '').toLowerCase().trim();
    const uEmail = String(user.email || '').toLowerCase().trim();
    if (lead.leadOwnerId && (String(lead.leadOwnerId).toLowerCase() === uId || String(lead.leadOwnerId).toLowerCase() === uCode)) return true;
    if (lead.createdById && (String(lead.createdById).toLowerCase() === uId || String(lead.createdById).toLowerCase() === uCode)) return true;
    if (lead.createdByEmail && String(lead.createdByEmail).toLowerCase() === uEmail) return true;
  }
  return false;
};

export const canDeleteNotice = (user, notice = null) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.postNotices === false || perms?.deleteNotices === false) return false;
  if (perms?.deleteNotices === true || isAdmin(user) || isDelegationActive(user)) return true;
  if (notice) {
    const uId = String(user._id || user.id || '').toLowerCase().trim();
    const uCode = String(user.employeeCode || '').toLowerCase().trim();
    const uName = String(user.name || '').toLowerCase().trim();
    if (notice.createdById && (String(notice.createdById).toLowerCase() === uId || String(notice.createdById).toLowerCase() === uCode)) return true;
    if (notice.postedBy && String(notice.postedBy).toLowerCase().trim() === uName) return true;
    if (notice.createdBy && String(notice.createdBy).toLowerCase().trim() === uName) return true;
  }
  return false;
};

export const canEditAnyTask = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.viewAllTasks === false || perms?.editAnyTask === false) return false;
  return Boolean(perms?.editAnyTask === true || isAdmin(user) || isDelegationActive(user));
};

export const canViewAllProjects = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.viewAllProjects === false || perms?.projects === false) return false;
  return Boolean(perms?.viewAllProjects === true || perms?.manageProjects === true || isAdmin(user) || isDelegationActive(user));
};

export const canViewEmployeeDetails = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageEmployees === false || perms?.employees === false || perms?.viewEmployeeDetails === false) return false;
  return Boolean(perms?.viewEmployeeDetails === true || perms?.manageEmployees === true || isAdmin(user) || isDelegationActive(user));
};

export const canApproveOvertime = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.viewAllAttendance === false || perms?.approveOvertime === false) return false;
  return Boolean(perms?.approveOvertime === true || isAdmin(user) || isDelegationActive(user));
};

export const canRequestOvertime = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.requestOvertime === false) return false;
  return true;
};

export const canReviewResignations = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageEmployees === false || perms?.employees === false || perms?.reviewResignations === false) return false;
  return Boolean(perms?.reviewResignations === true || perms?.manageEmployees === true || isAdmin(user) || isDelegationActive(user));
};

export const canCreateLeads = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.accessCRM === false || perms?.leads === false || perms?.createLeads === false) return false;
  return Boolean(perms?.createLeads === true || isAdmin(user) || isDelegationActive(user));
};

export const canEditLeads = (user, lead = null) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.accessCRM === false || perms?.leads === false || perms?.editLeads === false) return false;
  if (perms?.editLeads === true || isAdmin(user) || isDelegationActive(user)) return true;
  if (lead) {
    const uId = String(user._id || user.id || '').toLowerCase().trim();
    const uCode = String(user.employeeCode || '').toLowerCase().trim();
    const uEmail = String(user.email || '').toLowerCase().trim();
    if (lead.leadOwnerId && (String(lead.leadOwnerId).toLowerCase() === uId || String(lead.leadOwnerId).toLowerCase() === uCode)) return true;
    if (lead.createdById && (String(lead.createdById).toLowerCase() === uId || String(lead.createdById).toLowerCase() === uCode)) return true;
    if (lead.createdByEmail && String(lead.createdByEmail).toLowerCase() === uEmail) return true;
  }
  return false;
};

export const canManageEvents = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageEvents === false || perms?.events === false) return false;
  return Boolean(perms?.manageEvents === true || perms?.events === true || isAdmin(user) || isDelegationActive(user));
};

export const canApproveExpenses = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.accessFinance === false || perms?.finance === false || perms?.approveExpenses === false) return false;
  return Boolean(perms?.approveExpenses === true || isAdmin(user) || isDelegationActive(user));
};

export const canManageSettings = (user) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageSettings === false || perms?.settings === false) return false;
  return Boolean(perms?.manageSettings === true || perms?.settings === true || isAdmin(user) || isDelegationActive(user));
};

export const canDeleteTicket = (user, ticket = null) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true) return true;
  if (perms?.manageTickets === false || perms?.tickets === false || perms?.deleteTickets === false) return false;
  if (perms?.deleteTickets === true || isAdmin(user) || isDelegationActive(user)) return true;
  if (ticket) {
    const uId = String(user._id || user.id || '').toLowerCase().trim();
    const uCode = String(user.employeeCode || '').toLowerCase().trim();
    const uName = String(user.name || '').toLowerCase().trim();
    if (ticket.requestedById && (String(ticket.requestedById).toLowerCase() === uId || String(ticket.requestedById).toLowerCase() === uCode)) return true;
    if (ticket.createdBy && (String(ticket.createdBy).toLowerCase() === uId || String(ticket.createdBy).toLowerCase() === uCode)) return true;
    if (ticket.requestedByName && String(ticket.requestedByName).toLowerCase().trim() === uName) return true;
    if (ticket.createdByName && String(ticket.createdByName).toLowerCase().trim() === uName) return true;
  }
  return false;
};
export const canEditSettings = (user) => canManageSettings(user);

/**
 * Check if a project is visible to a user.
 * High Authority (Admin, HR, or with viewAllProjects permission): Always true.
 * Regular User (Team Member):
 * - Project Creator: Always true.
 * - Project Member / Assignee (members, membersList, teamIds, visibleToIds, leadId): True.
 * - Truly Company-Wide (isCompanyWide === true && visibility === 'all'): True.
 * - Otherwise: False.
 */
export const isProjectVisibleToUser = (project, user) => {
  if (!project) return false;
  if (!user) return false;

  // 1. High Authority access
  if (isAdmin(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true || perms?.viewAllProjects === true) return true;
  if (perms?.viewAllProjects === false) {
    // Falls through to creator / lead / team member match below
  } else if (isHR(user)) {
    return true;
  }

  const uId = String(user._id || user.id || '').toLowerCase().trim();
  const uCode = String(user.employeeCode || '').toLowerCase().trim();
  const uName = String(user.name || '').toLowerCase().trim();
  const uEmail = String(user.email || '').toLowerCase().trim();

  // 2. Creator access
  const creatorIds = [
    project.createdBy,
    project.createdById,
    project.creatorCode
  ].filter(Boolean).map(s => String(s).toLowerCase().trim());

  if (uId && creatorIds.includes(uId)) return true;
  if (uCode && creatorIds.includes(uCode)) return true;
  if (project.creatorEmail && project.creatorEmail.toLowerCase().trim() === uEmail) return true;
  if (project.creatorName && project.creatorName.toLowerCase().trim() === uName) return true;

  // 3. Project Lead
  if (project.leadId && (String(project.leadId).toLowerCase() === uId || String(project.leadId).toLowerCase() === uCode)) return true;
  if (project.lead && project.lead.toLowerCase().trim() === uName) return true;

  // 4. Assigned Team / Member list
  if (Array.isArray(project.teamIds) && (project.teamIds.some(id => String(id).toLowerCase() === uId || String(id).toLowerCase() === uCode))) {
    return true;
  }
  if (Array.isArray(project.visibleToIds) && (project.visibleToIds.some(id => String(id).toLowerCase() === uId || String(id).toLowerCase() === uCode))) {
    return true;
  }
  if (Array.isArray(project.members) && project.members.some(m => {
    if (!m) return false;
    const mId = String(m._id || m.id || '').toLowerCase();
    const mCode = String(m.employeeCode || '').toLowerCase();
    const mEmail = String(m.email || '').toLowerCase();
    const mName = String(m.name || '').toLowerCase().trim();
    return (uId && mId === uId) || (uCode && mCode === uCode) || (uEmail && mEmail === uEmail) || (uName && mName === uName);
  })) {
    return true;
  }
  if (Array.isArray(project.membersList) && project.membersList.some(m => {
    if (!m) return false;
    const mId = String(m._id || m.id || '').toLowerCase();
    const mCode = String(m.employeeCode || '').toLowerCase();
    const mEmail = String(m.email || '').toLowerCase();
    const mName = String(m.name || '').toLowerCase().trim();
    return (uId && mId === uId) || (uCode && mCode === uCode) || (uEmail && mEmail === uEmail) || (uName && mName === uName);
  })) {
    return true;
  }
  if (Array.isArray(project.team) && project.team.some(m => {
    if (!m) return false;
    const mId = String(m._id || m.id || '').toLowerCase();
    const mName = String(m.name || '').toLowerCase().trim();
    return (uId && mId === uId) || (uName && mName === uName);
  })) {
    return true;
  }

  // 5. Explicitly marked as company-wide AND visibility === 'all' (only when not restricted)
  if (project.isCompanyWide === true && project.visibility === 'all' && (!Array.isArray(project.visibleToIds) || project.visibleToIds.length === 0)) {
    return true;
  }

  return false;
};

/**
 * Check if a task is visible to a user.
 * High Authority: Sees all non-personal tasks (and their own personal tasks).
 * Regular User: Sees ONLY tasks assigned to them (single or multi-assignee), or delegated/created by them.
 */
export const isTaskVisibleToUser = (task, user) => {
  if (!task || !user) return false;

  const uId = String(user._id || user.id || '').toLowerCase().trim();
  const uCode = String(user.employeeCode || '').toLowerCase().trim();
  const uName = String(user.name || '').toLowerCase().trim();
  const uEmail = String(user.email || '').toLowerCase().trim();
  const uTokens = uName.split(/\s+/).filter(tok => tok.length >= 3);

  // Match assignment (single or multi-assignee)
  const isAssigned = (() => {
    const directAssignedTo = (task.assignedTo && typeof task.assignedTo === 'object')
      ? String(task.assignedTo._id || task.assignedTo.id || '')
      : String(task.assignedTo || '');

    const directIds = [task.assignedToId, directAssignedTo, task.employeeId, task.assignedToCode, task.assignedToEmail]
      .filter(Boolean)
      .map(s => String(s).toLowerCase().trim());

    if (uId && directIds.includes(uId)) return true;
    if (uCode && directIds.includes(uCode)) return true;
    if (uEmail && directIds.includes(uEmail)) return true;

    if (task.assignedToName) {
      const aName = task.assignedToName.toLowerCase().trim();
      if (uName && (uName === aName || uName.includes(aName) || aName.includes(uName))) return true;
      const aTokens = aName.split(/\s+/).filter(tok => tok.length >= 3);
      if (uTokens.some(ut => aTokens.includes(ut))) return true;
    }

    if (Array.isArray(task.assignedToIds) && task.assignedToIds.some(id => {
      const s = String(id).toLowerCase().trim();
      return s === uId || s === uCode;
    })) {
      return true;
    }

    if (Array.isArray(task.assignees) && task.assignees.some(a => {
      if (!a) return false;
      const aId = String(a._id || a.id || '').toLowerCase().trim();
      const aCode = String(a.employeeCode || '').toLowerCase().trim();
      const aEmail = String(a.email || '').toLowerCase().trim();
      const aName = String(a.name || '').toLowerCase().trim();
      if (uId && aId === uId) return true;
      if (uCode && aCode === uCode) return true;
      if (uEmail && aEmail === uEmail) return true;
      if (uName && (uName === aName || uName.includes(aName) || aName.includes(uName))) return true;
      return false;
    })) {
      return true;
    }

    return false;
  })();

  // Match delegation/creation
  const isCreatorOrAssigner = (() => {
    const creatorIds = [task.assignedById, task.assignedByCode, task.createdById, task.createdBy]
      .filter(Boolean)
      .map(s => String(s).toLowerCase().trim());
    if (uId && creatorIds.includes(uId)) return true;
    if (uCode && creatorIds.includes(uCode)) return true;
    if (task.assignedBy && uName && task.assignedBy.trim().toLowerCase() === uName) return true;
    return false;
  })();

  // 1. Personal Task Isolation
  if (task.isPersonal) {
    return isAssigned || isCreatorOrAssigner;
  }

  // 2. High Authority access
  if (isAdmin(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess === true || perms?.viewAllTasks === true) return true;
  if (perms?.viewAllTasks === false) {
    // Falls through to assigned / creator match below
  } else if (isHR(user)) {
    return true;
  }

  // 3. Regular User: strictly assigned or created by them
  return isAssigned || isCreatorOrAssigner;
};

export const getRoleConfig = (roleIdOrUser) => {
  const roleId = typeof roleIdOrUser === 'object' ? getUserRole(roleIdOrUser) : roleIdOrUser;
  return ROLE_CONFIGS[roleId] || ROLE_CONFIGS[ROLES.TEAM_MEMBER];
};

// ── 16. Toggle-Based Permissions Matrix (Admin Control) ──
export const DEFAULT_MODULE_PERMISSIONS = {
  admin: {
    allAccess: true,
    isDelegatedAdmin: true,
    deleteTasks: true,
    deleteProjects: true,
    deleteEmployees: true,
    deleteLeads: true,
    deleteTickets: true,
    deleteNotices: true,
    deleteAppreciations: true,
    giveAppreciation: true,
    appreciation: true,
    manageSalaries: true,
    manageExpenses: true,
    editAttendance: true,
    postNotices: true,
    dashboard: true,
    tasks: true,
    leads: true,
    attendance: true,
    leaves: true,
    tickets: true,
    events: true,
    documentation: true,
    projects: true,
    manageProjects: true,
    viewAllProjects: true,
    viewAllLeads: true,
    viewAllTasks: true,
    editAnyTask: true,
    viewAllTickets: true,
    viewAllAttendance: true,
    viewAllLeaves: true,
    createTasks: true,
    approveLeaves: true,
    cancelLeaves: true,
    reviewResignations: true,
    viewEmployeeDetails: true,
    requestOvertime: true,
    approveOvertime: true,
    createLeads: true,
    editLeads: true,
    manageEvents: true,
    approveExpenses: true,
    manageSettings: true,
    accessCRM: true,
    accessFinance: true,
    manageEmployees: true,
    grantPermissions: true,
    liveOperations: true,
    payroll: true,
    finance: true,
    employees: true
  },
  hr: {
    dashboard: true,
    tasks: true,
    leads: true,
    attendance: true,
    leaves: true,
    tickets: true,
    events: true,
    employees: true,
    reports: true,
    documentation: true,
    appreciation: true,
    giveAppreciation: true,
    deleteAppreciations: true,
    projects: true,
    manageProjects: true,
    viewAllProjects: true,
    viewAllLeads: true,
    viewAllTasks: true,
    editAnyTask: false,
    viewAllTickets: true,
    viewAllAttendance: true,
    viewAllLeaves: true,
    createTasks: true,
    approveLeaves: true,
    cancelLeaves: true,
    reviewResignations: true,
    viewEmployeeDetails: true,
    requestOvertime: true,
    approveOvertime: true,
    createLeads: false,
    editLeads: false,
    manageEvents: true,
    approveExpenses: true,
    manageSettings: false,
    accessCRM: false,
    accessFinance: true,
    manageEmployees: true,
    grantPermissions: false,
    liveOperations: true,
    payroll: true,
    finance: true
  },
  team_leader: {
    dashboard: true,
    tasks: true,
    leads: true,
    attendance: true,
    leaves: true,
    tickets: true,
    events: true,
    employees: false,
    reports: true,
    documentation: false,
    appreciation: true,
    giveAppreciation: true,
    deleteAppreciations: false,
    projects: true,
    manageProjects: true,
    viewAllProjects: true,
    viewAllLeads: true,
    viewAllTasks: true,
    editAnyTask: false,
    viewAllTickets: false,
    viewAllAttendance: false,
    viewAllLeaves: false,
    createTasks: true,
    approveLeaves: true,
    cancelLeaves: false,
    reviewResignations: false,
    viewEmployeeDetails: false,
    requestOvertime: true,
    approveOvertime: true,
    createLeads: true,
    editLeads: true,
    manageEvents: true,
    approveExpenses: false,
    manageSettings: false,
    accessCRM: true,
    accessFinance: false,
    manageEmployees: false,
    grantPermissions: false,
    liveOperations: false,
    payroll: false,
    finance: false
  },
  team_member: {
    dashboard: true,
    tasks: true,
    timesheet: true,
    attendance: true,
    leaves: true,
    tickets: true,
    events: true,
    expenses: true,
    appreciation: true,
    giveAppreciation: false,
    deleteAppreciations: false,
    leads: false,
    projects: true,
    manageProjects: false,
    createProjects: false,
    deleteProjects: false,
    deleteTasks: false,
    editAnyTask: false,
    deleteEmployees: false,
    deleteLeads: false,
    deleteTickets: false,
    deleteNotices: false,
    editAttendance: false,
    forceClockOut: false,
    requestOvertime: true,
    approveOvertime: false,
    manageCompanyHolidays: false,
    viewEmployeeDetails: false,
    cancelLeaves: false,
    reviewResignations: false,
    createLeads: false,
    editLeads: false,
    manageEvents: false,
    approveExpenses: false,
    manageSettings: false,
    employees: false,
    reports: false,
    documentation: false,
    payroll: false,
    finance: false,
    settings: false,
    viewAllProjects: false,
    viewAllLeads: false,
    viewAllTasks: false,
    viewAllTickets: false,
    viewAllAttendance: false,
    viewAllLeaves: false,
    createTasks: false,
    approveLeaves: false,
    accessCRM: false,
    accessFinance: false,
    manageEmployees: false,
    grantPermissions: false,
    liveOperations: false,
    allAccess: false
  }
};

/**
 * 5 Canonical Categories for Granular Permissions
 */
export const PERMISSION_CATEGORIES = [
  { id: 'shift_attendance', label: '⚡ Shift & Attendance', desc: 'Punch monitoring, live ops, and attendance records' },
  { id: 'tasks_projects', label: '📋 Tasks & Projects', desc: 'Work delegation, sprint tasks, and project management' },
  { id: 'workforce_hr', label: '👥 Workforce & Leaves', desc: 'Employee records, leave approvals, holidays & appreciations' },
  { id: 'crm_comms', label: '💼 CRM & Communications', desc: 'Sales pipeline, helpdesk tickets, and company notices' },
  { id: 'finance_admin', label: '💰 Finance & Administration', desc: 'Salaries, expenses, role delegation, and system control' }
];

/**
 * Granular Permission Definitions for UI toggles (24 Total, Categorized)
 */
export const GRANULAR_PERMISSIONS_LIST = [
  // ── 1. Shift & Attendance ──
  { key: 'liveOperations', category: 'shift_attendance', label: 'Shift Monitor & Live Ops (View All)', icon: '⚡', desc: 'View live shifts, working time, and active tasks for all employees (Admin, HR & Team)' },
  { key: 'viewAllAttendance', category: 'shift_attendance', label: 'View Team Attendance', icon: '🕒', desc: 'View monthly attendance matrix, daily punch logs, and shift histories of all employees' },
  { key: 'editAttendance', category: 'shift_attendance', label: 'Mark & Edit Attendance', icon: '✍️', desc: 'Manually mark, adjust, or correct attendance records for team members' },
  { key: 'forceClockOut', category: 'shift_attendance', label: 'Live Ops: Force Clock-Out & Shift Control', icon: '🛑', desc: 'Allow Force Clock-Out, manual Clock-In, and starting/pausing other employees\' timers in Live Operations (full actor audit)' },
  { key: 'requestOvertime', category: 'shift_attendance', label: 'Request Shift Overtime', icon: '⏱️', desc: 'Submit overtime request logs for working post 7:00 PM standard shift' },
  { key: 'approveOvertime', category: 'shift_attendance', label: 'Approve Overtime Claims', icon: '✅', desc: 'Review, approve, or reject team members overtime hour submissions' },

  // ── 2. Tasks & Projects ──
  { key: 'createTasks', category: 'tasks_projects', label: 'Create & Assign Tasks', icon: '➕', desc: 'Create tasks and delegate them to any team member' },
  { key: 'viewAllTasks', category: 'tasks_projects', label: 'View All Tasks', icon: '📋', desc: 'View company-wide tasks beyond assigned items' },
  { key: 'editAnyTask', category: 'tasks_projects', label: 'Edit & Reassign Any Task', icon: '✏️', desc: 'Modify, reassign, or update deadline of tasks across all departments' },
  { key: 'deleteTasks', category: 'tasks_projects', label: 'Delete Tasks', icon: '🗑️', desc: 'Permanently delete tasks and associated task timelogs' },
  { key: 'manageProjects', category: 'tasks_projects', label: 'Create & Manage Projects', icon: '📁', desc: 'Create projects, define sprint milestones, and assign project leads' },
  { key: 'viewAllProjects', category: 'tasks_projects', label: 'View All Projects', icon: '📂', desc: 'View all organization projects and sprint roadmaps' },
  { key: 'deleteProjects', category: 'tasks_projects', label: 'Delete Projects', icon: '🗑️', desc: 'Permanently delete projects and sprint boards' },

  // ── 3. Workforce & Leaves ──
  { key: 'manageEmployees', category: 'workforce_hr', label: 'Manage Employees', icon: '👥', desc: 'Add, update employee profiles, documents, and department assignments' },
  { key: 'viewEmployeeDetails', category: 'workforce_hr', label: 'View Sensitive Employee Data', icon: '🔍', desc: 'Access PAN, Aadhaar, bank details, emergency contacts, and private profile info' },
  { key: 'deleteEmployees', category: 'workforce_hr', label: 'Delete Employees', icon: '🗑️', desc: 'Permanently remove employee records from the organization' },
  { key: 'approveLeaves', category: 'workforce_hr', label: 'Approve & Reject Leaves', icon: '🌴', desc: 'Review, approve, or reject employee leave applications' },
  { key: 'cancelLeaves', category: 'workforce_hr', label: 'Cancel & Revoke Leaves', icon: '❌', desc: 'Cancel approved leaves or revoke pending leave requests' },
  { key: 'reviewResignations', category: 'workforce_hr', label: 'Review Resignations', icon: '🚪', desc: 'Process and manage employee resignation requests and exit workflows' },
  { key: 'manageCompanyHolidays', category: 'workforce_hr', label: 'Manage Company Holidays', icon: '⭐', desc: 'Declare, edit, or delete official company holidays and calendar events' },
  { key: 'giveAppreciation', category: 'workforce_hr', label: 'Award Appreciations', icon: '🏆', desc: 'Award recognition badges, performance awards, and rewards' },
  { key: 'deleteAppreciations', category: 'workforce_hr', label: 'Delete Appreciations', icon: '🗑️', desc: 'Remove recognition awards from the public board' },

  // ── 4. CRM & Communications ──
  { key: 'accessCRM', category: 'crm_comms', label: 'Access CRM & Leads', icon: '💼', desc: 'Access sales CRM pipeline, leads tracking, and deals' },
  { key: 'createLeads', category: 'crm_comms', label: 'Create CRM Leads', icon: '🎯', desc: 'Create new prospect entries, leads, and sales deals' },
  { key: 'editLeads', category: 'crm_comms', label: 'Edit CRM Leads', icon: '✍️', desc: 'Update lead status, values, customer contact information, and pipeline stages' },
  { key: 'deleteLeads', category: 'crm_comms', label: 'Delete CRM Leads', icon: '🗑️', desc: 'Permanently delete sales leads from the CRM' },
  { key: 'manageTickets', category: 'crm_comms', label: 'Manage Support Tickets', icon: '🎫', desc: 'Assign, update priority, and resolve helpdesk support tickets' },
  { key: 'deleteTickets', category: 'crm_comms', label: 'Delete Support Tickets', icon: '🗑️', desc: 'Permanently delete customer or employee support tickets' },
  { key: 'manageEvents', category: 'crm_comms', label: 'Manage Calendar Events', icon: '📅', desc: 'Create, schedule, edit, or remove company-wide calendar events and meetings' },
  { key: 'postNotices', category: 'crm_comms', label: 'Post Company Notices', icon: '📢', desc: 'Publish announcements to the official company notice board' },
  { key: 'deleteNotices', category: 'crm_comms', label: 'Delete Notices', icon: '🗑️', desc: 'Delete official company notice board announcements' },
  { key: 'createChannels', category: 'crm_comms', label: 'Create Group Channels', icon: '💬', desc: 'Create and manage dedicated team chat channels and group discussions' },
  { key: 'screenShare', category: 'crm_comms', label: 'Screen Share & Huddle', icon: '🖥️', desc: 'Host live screen share sessions and join voice walkie-talkie rooms during active shifts' },

  // ── 5. Finance & Administration ──
  { key: 'accessFinance', category: 'finance_admin', label: 'Access Finance & Expenses', icon: '💰', desc: 'Review expense reimbursement claims and company expenditure' },
  { key: 'approveExpenses', category: 'finance_admin', label: 'Approve Expense Claims', icon: '💳', desc: 'Review, approve, or reject employee reimbursement claims and bills' },
  { key: 'manageSalaries', category: 'finance_admin', label: 'Manage Payroll & Salaries', icon: '💵', desc: 'View payroll matrix, manage employee salary slips, and increments' },
  { key: 'documentation', category: 'finance_admin', label: 'Company Documentation', icon: '📄', desc: 'Manage official company policies, handbooks, and documentation' },
  { key: 'reports', category: 'finance_admin', label: 'View Analytics & Reports', icon: '📊', desc: 'Access organizational reports, attendance logs, and workforce charts' },
  { key: 'manageSettings', category: 'finance_admin', label: 'Manage Company Settings', icon: '⚙️', desc: 'Configure company branding, shifts, working hours, and operational policies' },
  { key: 'grantPermissions', category: 'finance_admin', label: 'Grant Permissions (Accesser)', icon: '🛡️', desc: 'Accesser authority: Can assign, customize, and delegate permissions to other users' },
  { key: 'allAccess', category: 'finance_admin', label: 'Full System Authority (Super Admin)', icon: '👑', desc: 'Unrestricted master control across all modules and system settings' }
];

/**
 * Canonical Permission Prerequisite & Dependency Hierarchy
 * Defines required parent permissions for granular actions.
 * A child capability CANNOT be active or executed without its parent prerequisite.
 */
export const PERMISSION_DEPENDENCIES = {
  // CRM & Leads (Parent: accessCRM)
  createLeads: {
    parentKey: 'accessCRM',
    parentLabel: 'Access CRM & Leads',
    reason: 'Cannot create leads without CRM & Leads pipeline access'
  },
  editLeads: {
    parentKey: 'accessCRM',
    parentLabel: 'Access CRM & Leads',
    reason: 'Cannot edit leads without CRM & Leads pipeline access'
  },
  deleteLeads: {
    parentKey: 'accessCRM',
    parentLabel: 'Access CRM & Leads',
    reason: 'Cannot delete leads without CRM & Leads pipeline access'
  },
  export_leads: {
    parentKey: 'accessCRM',
    parentLabel: 'Access CRM & Leads',
    reason: 'Cannot export leads without CRM & Leads pipeline access'
  },
  createChannels: {
    parentKey: 'accessCRM',
    parentLabel: 'Access CRM & Leads',
    reason: 'Cannot create group channels without CRM communication access'
  },

  // Tasks & Projects
  deleteTasks: {
    parentKey: 'createTasks',
    parentLabel: 'Create & Assign Tasks',
    reason: 'Cannot delete tasks without task creation & management authority'
  },
  editAnyTask: {
    parentKey: 'viewAllTasks',
    parentLabel: 'View All Tasks',
    reason: 'Cannot edit and reassign tasks without view all tasks authority'
  },
  deleteProjects: {
    parentKey: 'manageProjects',
    parentLabel: 'Create & Manage Projects',
    reason: 'Cannot delete projects without project management authority'
  },

  // Workforce & Leaves
  viewEmployeeDetails: {
    parentKey: 'manageEmployees',
    parentLabel: 'Manage Employees',
    reason: 'Viewing sensitive employee documents requires employee directory management authority'
  },
  deleteEmployees: {
    parentKey: 'manageEmployees',
    parentLabel: 'Manage Employees',
    reason: 'Cannot delete employee accounts without employee directory management authority'
  },
  reviewResignations: {
    parentKey: 'manageEmployees',
    parentLabel: 'Manage Employees',
    reason: 'Reviewing employee resignations requires employee directory authority'
  },
  cancelLeaves: {
    parentKey: 'approveLeaves',
    parentLabel: 'Approve & Reject Leaves',
    reason: 'Cannot revoke leaves without leave approval authority'
  },
  deleteAppreciations: {
    parentKey: 'giveAppreciation',
    parentLabel: 'Award Appreciations',
    reason: 'Cannot delete appreciation awards without award authority'
  },

  // Shift & Attendance
  editAttendance: {
    parentKey: 'viewAllAttendance',
    parentLabel: 'View Team Attendance',
    reason: 'Cannot edit punch records without team attendance viewing authority'
  },
  approveOvertime: {
    parentKey: 'viewAllAttendance',
    parentLabel: 'View Team Attendance',
    reason: 'Cannot approve overtime claims without team attendance viewing authority'
  },
  export_attendance: {
    parentKey: 'viewAllAttendance',
    parentLabel: 'View Team Attendance',
    reason: 'Cannot export attendance records without team attendance viewing authority'
  },
  forceClockOut: {
    parentKey: 'liveOperations',
    parentLabel: 'Shift Monitor & Live Ops',
    reason: 'Force clock-out requires live operations and shift monitor access'
  },

  // Finance & Payroll
  approveExpenses: {
    parentKey: 'accessFinance',
    parentLabel: 'Access Finance & Expenses',
    reason: 'Cannot approve expense claims without finance module access'
  },
  export_payroll: {
    parentKey: 'manageSalaries',
    parentLabel: 'Manage Payroll & Salaries',
    reason: 'Cannot export payroll registers without payroll management access'
  },

  // Notices & Tickets
  deleteNotices: {
    parentKey: 'postNotices',
    parentLabel: 'Post Company Notices',
    reason: 'Cannot delete notice board posts without notice posting authority'
  },
  deleteTickets: {
    parentKey: 'manageTickets',
    parentLabel: 'Manage Support Tickets',
    reason: 'Cannot delete tickets without ticket management authority'
  }
};

/**
 * Get direct prerequisite for a permission key (if any)
 */
export const getPermissionPrerequisite = (key) => {
  return PERMISSION_DEPENDENCIES[key] || null;
};

/**
 * Get all child permissions that directly or indirectly depend on a given parent key
 */
export const getDependentChildPermissions = (parentKey) => {
  const children = [];
  for (const [childKey, dep] of Object.entries(PERMISSION_DEPENDENCIES)) {
    if (dep.parentKey === parentKey) {
      children.push(childKey);
      // Recursively gather nested children if any
      children.push(...getDependentChildPermissions(childKey));
    }
  }
  return [...new Set(children)];
};

/**
 * Enforce and sanitize permission dependency integrity
 * Ensures no child capability is active if its prerequisite parent is inactive.
 */
export const sanitizePermissionDependencies = (permissions = {}) => {
  if (!permissions) return {};
  if (permissions.allAccess || permissions.isDelegatedAdmin) return { ...permissions };

  const sanitized = { ...permissions };
  let changed = true;

  // Multi-pass resolution in case of nested dependencies
  while (changed) {
    changed = false;
    for (const [childKey, dep] of Object.entries(PERMISSION_DEPENDENCIES)) {
      if (sanitized[childKey] && !sanitized[dep.parentKey]) {
        sanitized[childKey] = false;
        changed = true;
      }
    }
  }

  // Synchronize parent module mirrors strictly from the PRIMARY granular toggle
  // (NEVER let a default-role mirror `false` wipe out a newly enabled granular toggle!)
  if (sanitized.accessCRM) {
    sanitized.leads = true;
  } else if (sanitized.accessCRM === false) {
    sanitized.leads = false;
    sanitized.createLeads = false;
    sanitized.editLeads = false;
    sanitized.deleteLeads = false;
    sanitized.export_leads = false;
  }

  if (sanitized.viewAllAttendance) {
    sanitized.attendance = true;
  } else if (sanitized.viewAllAttendance === false) {
    sanitized.editAttendance = false;
    sanitized.approveOvertime = false;
    sanitized.export_attendance = false;
  }

  if (sanitized.liveOperations) {
    sanitized.teamoperations = true;
  } else if (sanitized.liveOperations === false) {
    sanitized.teamoperations = false;
    sanitized.forceClockOut = false;
  }

  if (sanitized.manageEmployees) {
    sanitized.employees = true;
  } else if (sanitized.manageEmployees === false) {
    sanitized.employees = false;
    sanitized.viewEmployeeDetails = false;
    sanitized.deleteEmployees = false;
    sanitized.reviewResignations = false;
  }

  if (sanitized.approveLeaves) {
    sanitized.leaves = true;
  } else if (sanitized.approveLeaves === false) {
    sanitized.cancelLeaves = false;
  }

  if (sanitized.manageSalaries) {
    sanitized.payroll = true;
  } else if (sanitized.manageSalaries === false) {
    sanitized.payroll = false;
    sanitized.export_payroll = false;
  }

  if (sanitized.accessFinance) {
    sanitized.finance = true;
  } else if (sanitized.accessFinance === false) {
    sanitized.finance = false;
    sanitized.approveExpenses = false;
  }

  // IMPORTANT: Turning off manageProjects MUST NOT block the employee from viewing the Projects module!
  if (sanitized.manageProjects || sanitized.viewAllProjects) {
    sanitized.projects = true;
  }
  if (sanitized.manageProjects === false) {
    sanitized.deleteProjects = false;
  }

  if (sanitized.createTasks) {
    sanitized.tasks = true;
  } else if (sanitized.createTasks === false) {
    sanitized.deleteTasks = false;
  }

  if (sanitized.viewAllTasks) {
    sanitized.tasks = true;
  } else if (sanitized.viewAllTasks === false) {
    sanitized.editAnyTask = false;
  }

  if (sanitized.postNotices) {
    sanitized.notices = true;
  } else if (sanitized.postNotices === false) {
    sanitized.deleteNotices = false;
  }

  if (sanitized.manageTickets) {
    sanitized.tickets = true;
  } else if (sanitized.manageTickets === false) {
    sanitized.deleteTickets = false;
  }

  if (sanitized.giveAppreciation) {
    sanitized.appreciation = true;
  } else if (sanitized.giveAppreciation === false) {
    sanitized.deleteAppreciations = false;
  }

  if (sanitized.documentation) {
    sanitized.documents = true;
  } else if (sanitized.documentation === false) {
    sanitized.documents = false;
  }

  if (sanitized.reports) {
    sanitized.viewReports = true;
  } else if (sanitized.reports === false) {
    sanitized.viewReports = false;
  }

  if (sanitized.manageSettings) {
    sanitized.settings = true;
  }

  if (sanitized.grantPermissions) {
    sanitized.employees = true;
    sanitized.settings = true;
  }

  return sanitized;
};

/**
 * Check if an employee's temporary delegation is currently active (or expired)
 */
export const isDelegationActive = (user) => {
  if (!user) return false;
  if (user.isAdmin || user.isSuperAdmin || user.employeeCode === 'ADM-001' || user.email === 'admin@inforag.com') return true;
  
  let expiresAt = user.delegationExpiresAt || user.permissions?.delegationExpiresAt;
  let isDelegated = user.isDelegatedAdmin || user.allAccess || user.permissions?.allAccess || user.permissions?.isDelegatedAdmin;

  try {
    const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
    if (rawMap) {
      const parsed = JSON.parse(rawMap);
      const userKey = user._id || user.employeeCode || user.email;
      const cached = (user._id && parsed[String(user._id)]) || (user.employeeCode && parsed[String(user.employeeCode)]) || (user.email && parsed[String(user.email).toLowerCase()]) || (userKey && parsed[userKey]);
      if (cached) {
        if (cached.delegationExpiresAt) expiresAt = cached.delegationExpiresAt;
        if (cached.isDelegatedAdmin || cached.allAccess) isDelegated = true;
      }
    }
  } catch (_) {}

  if (!isDelegated) return false;
  if (!expiresAt) return true; // Permanent delegation

  const expTime = new Date(expiresAt).getTime();
  return !isNaN(expTime) && expTime > Date.now();
};

/**
 * Get active module permissions for an employee with user-specific override support and expiry handling
 */
export const getUserModulePermissions = (user) => {
  if (!user) return DEFAULT_MODULE_PERMISSIONS.team_member;
  if (isPrimaryAdmin(user)) return DEFAULT_MODULE_PERMISSIONS.admin;

  const role = getUserRole(user);
  const basePerms = { ...(DEFAULT_MODULE_PERMISSIONS[role] || DEFAULT_MODULE_PERMISSIONS.team_member) };
  const delegationValid = isDelegationActive(user);

  if (delegationValid) {
    Object.assign(basePerms, DEFAULT_MODULE_PERMISSIONS.admin, { allAccess: true, isDelegatedAdmin: true });
  }

  // 1. Local storage cached permissions map
  try {
    const rawMap = typeof localStorage !== 'undefined' ? localStorage.getItem('EMS_USER_PERMISSIONS') : null;
    if (rawMap) {
      const parsed = JSON.parse(rawMap);
      const userKey = user._id || user.employeeCode || user.email;
      if (user._id && parsed[String(user._id)]) {
        Object.assign(basePerms, parsed[String(user._id)]);
      } else if (user.employeeCode && parsed[String(user.employeeCode)]) {
        Object.assign(basePerms, parsed[String(user.employeeCode)]);
      } else if (user.email && parsed[String(user.email).toLowerCase()]) {
        Object.assign(basePerms, parsed[String(user.email).toLowerCase()]);
      } else if (userKey && parsed[userKey]) {
        Object.assign(basePerms, parsed[userKey]);
      }
      if (parsed[role]) {
        Object.assign(basePerms, parsed[role]);
      }
    }
  } catch (e) {
    console.warn('Error reading module permissions:', e);
  }

  // 2. Authoritative Database Permissions directly from the user record in MongoDB Atlas
  // Database truth ALWAYS overrides local machine cache
  if (user.permissions && typeof user.permissions === 'object' && Object.keys(user.permissions).length > 0) {
    Object.assign(basePerms, user.permissions);
  }

  // Upward elevation: granting any granular capability ALWAYS enables its parent module view
  // (NEVER let a default-role `false` on a mirror key cancel an explicitly granted granular toggle!)
  if (basePerms.manageEmployees || basePerms.deleteEmployees || basePerms.viewEmployeeDetails || basePerms.reviewResignations) {
    basePerms.employees = true;
    basePerms.manageEmployees = true;
  } else if (basePerms.manageEmployees === false && basePerms.employees === false) {
    basePerms.deleteEmployees = false;
    basePerms.viewEmployeeDetails = false;
  }

  if (basePerms.manageSalaries || basePerms.export_payroll) {
    basePerms.payroll = true;
    basePerms.manageSalaries = true;
  } else if (basePerms.manageSalaries === false && basePerms.payroll === false) {
    basePerms.export_payroll = false;
  }

  if (basePerms.accessFinance || basePerms.approveExpenses) {
    basePerms.finance = true;
    basePerms.accessFinance = true;
  } else if (basePerms.accessFinance === false && basePerms.finance === false) {
    basePerms.approveExpenses = false;
  }

  if (basePerms.accessCRM || basePerms.viewAllLeads || basePerms.createLeads || basePerms.editLeads || basePerms.deleteLeads || basePerms.export_leads) {
    basePerms.leads = true;
    basePerms.accessCRM = true;
  } else if (basePerms.accessCRM === false && basePerms.leads === false) {
    basePerms.createLeads = false;
    basePerms.editLeads = false;
    basePerms.deleteLeads = false;
    basePerms.export_leads = false;
  }

  if (basePerms.viewAllAttendance || basePerms.editAttendance || basePerms.approveOvertime || basePerms.export_attendance) {
    basePerms.attendance = true;
  }

  if (basePerms.liveOperations || basePerms.teamoperations || basePerms.forceClockOut) {
    basePerms.liveOperations = true;
    basePerms.teamoperations = true;
  } else if (basePerms.liveOperations === false) {
    basePerms.teamoperations = false;
    basePerms.forceClockOut = false;
  }

  if (basePerms.approveLeaves || basePerms.viewAllLeaves || basePerms.cancelLeaves) {
    basePerms.leaves = true;
  }
  if (basePerms.manageProjects || basePerms.createProjects || basePerms.deleteProjects || basePerms.viewAllProjects) {
    basePerms.projects = true;
  }
  if (basePerms.createTasks || basePerms.viewAllTasks || basePerms.editAnyTask || basePerms.deleteTasks) {
    basePerms.tasks = true;
  }
  if (basePerms.manageTickets || basePerms.deleteTickets) {
    basePerms.tickets = true;
  }
  if (basePerms.documentation) {
    basePerms.documents = true;
  } else if (basePerms.documentation === false) {
    basePerms.documents = false;
  }
  if (basePerms.reports) {
    basePerms.viewReports = true;
  }
  if (basePerms.manageSettings) {
    basePerms.settings = true;
  }
  if (basePerms.grantPermissions || basePerms.allAccess) {
    basePerms.employees = true;
    basePerms.settings = true;
    basePerms.grantPermissions = true;
  }

  if (basePerms.allAccess || basePerms.isDelegatedAdmin) {
    if (delegationValid) {
      return { ...DEFAULT_MODULE_PERMISSIONS.admin, allAccess: true, isDelegatedAdmin: true, ...basePerms };
    }
    // Expired delegation: clean out admin flags
    delete basePerms.allAccess;
    delete basePerms.isDelegatedAdmin;
  }

  return sanitizePermissionDependencies(basePerms);
};

/**
 * Granular Action Gates: Delete, Export, and Scope
 */
export const canDeleteRecord = (user, module = 'tasks') => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess) return true;
  const modKey = String(module).toLowerCase();
  
  if (modKey === 'tasks' || modKey === 'task') {
    if (perms?.createTasks === false || perms?.deleteTasks === false) return false;
    return !!(perms.deleteTasks || perms.canDeleteTasks || isAdmin(user) || isDelegationActive(user));
  }
  if (modKey === 'projects' || modKey === 'project') {
    if (perms?.manageProjects === false || perms?.deleteProjects === false) return false;
    return !!(perms.deleteProjects || perms.canDeleteProjects || isAdmin(user) || isDelegationActive(user));
  }
  if (modKey === 'leads' || modKey === 'lead') {
    if (perms?.accessCRM === false || perms?.deleteLeads === false) return false;
    return !!(perms.deleteLeads || perms.canDeleteLeads || isAdmin(user) || isDelegationActive(user));
  }
  if (modKey === 'tickets' || modKey === 'ticket') {
    if (perms?.manageTickets === false || perms?.deleteTickets === false) return false;
    return !!(perms.deleteTickets || perms.canDeleteTickets || isAdmin(user) || isDelegationActive(user));
  }
  if (modKey === 'employees' || modKey === 'employee') {
    if (perms?.manageEmployees === false || perms?.deleteEmployees === false) return false;
    return !!(perms.deleteEmployees || perms.canDeleteEmployees || isAdmin(user) || isDelegationActive(user));
  }
  if (modKey === 'notices' || modKey === 'notice') {
    if (perms?.postNotices === false || perms?.deleteNotices === false) return false;
    return !!(perms.deleteNotices || isAdmin(user) || isDelegationActive(user));
  }
  if (modKey === 'appreciations' || modKey === 'appreciation') {
    if (perms?.giveAppreciation === false || perms?.deleteAppreciations === false) return false;
    return !!(perms.deleteAppreciations || isAdmin(user) || isDelegationActive(user));
  }
  return Boolean(isAdmin(user) || isDelegationActive(user));
};

export const canExportData = (user, module = 'general') => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess) return true;
  const modKey = String(module).toLowerCase();

  // Enforce parent prerequisite gates for export
  if ((modKey === 'leads' || modKey === 'lead') && (!perms?.accessCRM || perms?.accessCRM === false)) return false;
  if ((modKey === 'payroll' || modKey === 'salary') && (!perms?.manageSalaries || perms?.manageSalaries === false)) return false;
  if ((modKey === 'attendance' || modKey === 'punch') && (!perms?.viewAllAttendance || perms?.viewAllAttendance === false)) return false;

  if (perms?.[`export_${modKey}`] === false) return false;
  if (perms?.[`export_${modKey}`] === true) return true;

  const r = getUserRole(user);
  if (r === ROLES.HR && perms?.[`export_${modKey}`] !== false) return true;

  if (isAdmin(user) || isDelegationActive(user)) return true;

  return !!(perms.exportData || perms.canExport);
};

export const getDataScope = (user, module = 'tasks') => {
  if (!user) return 'own';
  if (isAdmin(user) || isDelegationActive(user)) return 'all';
  const perms = getUserModulePermissions(user);
  const modKey = String(module).toLowerCase();
  if (perms[`${modKey}Scope`]) return perms[`${modKey}Scope`];
  if (perms.dataScope) return perms.dataScope;
  
  const r = getUserRole(user);
  if (r === ROLES.HR) return 'all';
  if (r === ROLES.TEAM_LEADER) return 'team';
  return 'own';
};

/**
 * Save user permission overrides
 */
export const setUserPermissions = (userKey, newPerms) => {
  if (!userKey) return;
  try {
    const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
    const parsed = rawMap ? JSON.parse(rawMap) : {};
    parsed[userKey] = { ...(parsed[userKey] || {}), ...newPerms };
    localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(parsed));
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'EMS_USER_PERMISSIONS' } }));
  } catch (e) {
    console.error('Error saving user permissions:', e);
  }
};

/**
 * Check if the active user is allowed to grant/edit permissions of other employees
 */
export const canUserGrantPermissions = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isPrimaryAdmin(user)) return true;
  if (user.isDelegatedAdmin || user.allAccess) return true;
  if (user.permissions?.grantPermissions === true || user.permissions?.allAccess === true || user.permissions?.isDelegatedAdmin === true) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.grantPermissions === true || perms?.allAccess === true || perms?.isDelegatedAdmin === true);
};

/**
 * Check if the user is authorized to create new group channels in CRM chat
 */
export const canCreateChannels = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || user.isDelegatedAdmin) return true;
  const role = getUserRole(user);
  if (role === ROLES.TEAM_LEADER) return true;
  const perms = getUserModulePermissions(user);
  if (!perms?.accessCRM && !perms?.leads && !perms?.allAccess) return false;
  return Boolean(perms?.allAccess || perms?.createChannels || perms?.manageGroups || perms?.manageChannels);
};

/**
 * Check if the user is allowed to initiate live screen sharing
 */
export const canScreenShare = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || user.isDelegatedAdmin) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.screenShare === false) return false;
  return true;
};

/**
 * Check if a user can access a specific module
 */
export const canAccessModule = (user, moduleId) => {
  if (!user) return false;
  if (isPrimaryAdmin(user)) return true;
  const role = getUserRole(user);
  const perms = getUserModulePermissions(user);
  const normalizedKey = String(moduleId).toLowerCase().replace(/[-_]/g, '');

  const keyMap = {
    dashboard: 'dashboard',
    tasks: 'tasks',
    task: 'tasks',
    leads: 'leads',
    lead: 'leads',
    attendance: 'attendance',
    leaves: 'leaves',
    leave: 'leaves',
    tickets: 'tickets',
    ticket: 'tickets',
    supporttickets: 'tickets',
    events: 'events',
    calendar: 'events',
    employees: 'employees',
    employee: 'employees',
    employeeinformation: 'employees',
    reports: 'reports',
    timesheet: 'tasks',
    timesheets: 'tasks',
    documentation: 'documentation',
    documents: 'documentation',
    payroll: 'payroll',
    payslip: 'payroll',
    payslips: 'payroll',
    finance: 'finance',
    expenses: 'expenses',
    expense: 'expenses',
    settings: 'settings',
    projects: 'projects',
    project: 'projects',
    appreciation: 'appreciation',
    appreciations: 'appreciation',
    award: 'appreciation',
    awards: 'appreciation',
    teamoperations: 'liveOperations',
    liveoperations: 'liveOperations',
    operations: 'liveOperations'
  };

  const permKey = keyMap[normalizedKey] || moduleId;

  // 1. Strict explicit rule for liveOperations
  if (permKey === 'liveOperations') {
    if (perms?.liveOperations === true || user?.permissions?.liveOperations === true || perms?.teamoperations === true || user?.permissions?.teamoperations === true) {
      return true;
    }
    if ((perms?.liveOperations === false || user?.permissions?.liveOperations === false) && (perms?.teamoperations === false || user?.permissions?.teamoperations === false)) {
      return false;
    }
    return Boolean(isAdmin(user) || isHR(user) || isDelegationActive(user));
  }

  // 2. Direct explicit true on primary granular toggles or module key ALWAYS grants access!
  if (permKey === 'payroll' && (perms?.payroll === true || perms?.manageSalaries === true || perms?.export_payroll === true)) return true;
  if (permKey === 'finance' && (perms?.finance === true || perms?.accessFinance === true || perms?.approveExpenses === true)) return true;
  if (permKey === 'employees' && (perms?.employees === true || perms?.manageEmployees === true || perms?.deleteEmployees === true || perms?.grantPermissions === true || perms?.allAccess === true || canUserGrantPermissions(user))) return true;
  if (permKey === 'leads' && (perms?.leads === true || perms?.accessCRM === true || perms?.viewAllLeads === true || perms?.createLeads === true || perms?.editLeads === true || perms?.deleteLeads === true || perms?.export_leads === true)) return true;
  if (permKey === 'projects' && (perms?.projects === true || perms?.manageProjects === true || perms?.createProjects === true || perms?.viewAllProjects === true || perms?.deleteProjects === true)) return true;
  if (permKey === 'leaves' && (perms?.leaves === true || perms?.approveLeaves === true || perms?.viewAllLeaves === true)) return true;
  if (permKey === 'attendance' && (perms?.attendance === true || perms?.viewAllAttendance === true || perms?.editAttendance === true || perms?.export_attendance === true)) return true;
  if (permKey === 'tickets' && (perms?.tickets === true || perms?.manageTickets === true || perms?.viewAllTickets === true || perms?.deleteTickets === true)) return true;
  if (permKey === 'documentation' && (perms?.documentation === true || perms?.documents === true)) return true;
  if (permKey === 'reports' && (perms?.reports === true || perms?.viewReports === true)) return true;
  if (permKey === 'settings' && (perms?.settings === true || perms?.manageSettings === true || perms?.grantPermissions === true || perms?.allAccess === true || canUserGrantPermissions(user))) return true;
  if (perms && (perms[permKey] === true || perms[moduleId] === true)) return true;

  // 3. Strict explicit false checks (ONLY when none of the explicit grants above were true!)
  if (perms?.[permKey] === false && user?.permissions?.[permKey] === false) {
    return false;
  }
  if (permKey === 'appreciation' && perms?.appreciation === false && user?.permissions?.appreciation === false) {
    return false;
  }
  if (permKey === 'payroll' && perms?.payroll === false && perms?.manageSalaries === false) return false;
  if (permKey === 'finance' && perms?.finance === false && perms?.accessFinance === false) return false;
  if (permKey === 'employees' && perms?.employees === false && perms?.manageEmployees === false) return false;
  if (permKey === 'leads' && perms?.leads === false && perms?.accessCRM === false) return false;
  if (permKey === 'documentation' && perms?.documentation === false) return false;

  // Admin / Delegated Admin default access (unless explicitly revoked above)
  if (isAdmin(user) || isDelegationActive(user) || perms?.allAccess === true) {
    return true;
  }

  // 4. Strict guard: Regular employees (Team Members) cannot access privileged modules unless explicitly granted above
  if (role === ROLES.TEAM_MEMBER) {
    const privilegedModules = ['employees', 'teamoperations', 'liveOperations', 'payroll', 'finance', 'settings', 'documentation', 'leads', 'reports'];
    if (privilegedModules.includes(permKey)) return false;
    return true; // allowed default modules: dashboard, tasks, timesheet, attendance, leaves, tickets, events, expenses, projects, appreciation
  }

  return perms[permKey] !== false;
};

