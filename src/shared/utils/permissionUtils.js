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
  if (isAdmin(user) || isHR(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess === true || perms?.viewAllAttendance === true);
};

export const canEditAttendance = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess === true || perms?.editAttendance === true);
};

export const canForceClockOut = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess === true || perms?.forceClockOut === true);
};

export const canManageEmployees = (user) => {
  if (!user) return false;
  if (isHRorAdmin(user) || user.isDelegatedAdmin) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.manageEmployees || perms?.employees);
};
export const canApproveLeaves = (user) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const r = getUserRole(user);
  if (r === ROLES.ADMIN || r === ROLES.HR || r === ROLES.TEAM_LEADER) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.approveLeaves || perms?.viewAllLeaves || perms?.allLeaves);
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
 * 3. HR or Admin (System Authority)
 * NO ONE ELSE!
 */
export const canCancelLeave = (leave, user) => {
  if (!leave || !user) return false;
  if (isHRorAdmin(user)) return true;
  if (isLeaveApplicant(leave, user)) return true;
  if (isLeaveDesignatedApprover(leave, user)) return true;
  return false;
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
  if (isHRorAdmin(user)) return true;
  if (isLeaveDesignatedApprover(leave, user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.approveLeaves) return true;
  return false;
};
export const canManageCompanyHolidays = (user) => {
  if (!user) return false;
  if (isHRorAdmin(user) || user.isDelegatedAdmin) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.events || perms?.holidays);
};
export const canManagePayroll = (user) => {
  if (!user) return false;
  if (isHRorAdmin(user) || user.isDelegatedAdmin) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.payroll || perms?.finance || perms?.accessFinance);
};
export const canManageProjects = (user) => {
  if (!user) return false;
  if (isLeaderOrAbove(user) || user.isDelegatedAdmin) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.manageProjects || perms?.createProjects);
};
export const canAssignRoles = (user) => isAdmin(user) || user?.isDelegatedAdmin;

export const canCreateTasks = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || isTeamLeader(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess || perms?.createTasks || perms?.manageProjects);
};

export const canViewAllTasks = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess || perms?.viewAllTasks);
};

export const canManageTickets = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess || perms?.manageTickets);
};

export const canAccessCRM = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess || perms?.accessCRM || perms?.leads || perms?.viewAllLeads);
};

export const canManageDocumentation = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess || perms?.documentation || perms?.documents);
};

export const canViewReports = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isHR(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess || perms?.reports || perms?.viewReports);
};

export const canPostNotices = (user) => {
  if (!user) return false;
  if (isLeaderOrAbove(user) || user.isDelegatedAdmin) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.notices || perms?.postNotices || perms?.allAccess);
};
export const canGiveAppreciation = (user) => {
  if (!user) return false;
  if (isAdmin(user) || user.isSuperAdmin || isDelegationActive(user) || isHR(user)) return true;
  if (isLeaderOrAbove(user)) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.allAccess || perms?.giveAppreciation || perms?.manageAppreciations);
};

export const canDeleteAppreciation = (user) => {
  if (!user) return false;
  if (isAdmin(user) || user.isSuperAdmin || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.allAccess || perms?.deleteAppreciations);
};

export const canDeleteTask = (user, task = null) => {
  if (!user) return false;
  // 1. Administrators have full delete authority
  if (isAdmin(user) || user.isSuperAdmin || isDelegationActive(user) || user.role === 'Administrator' || user.systemRole === 'admin') {
    return true;
  }
  // 2. Strict permission check: user must explicitly have deleteTasks or allAccess granted
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess === true || perms?.deleteTasks === true || perms?.canDeleteTasks === true);
};

export const canDeleteProject = (user, project = null) => {
  if (!user) return false;
  // 1. Administrators have full delete authority
  if (isAdmin(user) || user.isSuperAdmin || isDelegationActive(user) || user.role === 'Administrator' || user.systemRole === 'admin') {
    return true;
  }
  // 2. Strict permission check: user must explicitly have deleteProjects or allAccess granted
  const perms = getUserModulePermissions(user);
  return Boolean(perms?.allAccess === true || perms?.deleteProjects === true || perms?.canDeleteProjects === true);
};

export const canDeleteEmployee = (user) => {
  if (!user) return false;
  if (isAdmin(user) || user.isSuperAdmin || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.allAccess || perms?.deleteEmployees);
};

export const canDeleteLead = (user, lead = null) => {
  if (!user) return false;
  if (isAdmin(user) || user.isSuperAdmin || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess || perms?.deleteLeads || perms?.manageLeads) return true;
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
  if (isAdmin(user) || user.isSuperAdmin || isDelegationActive(user) || isHR(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess || perms?.deleteNotices) return true;
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

export const canDeleteTicket = (user, ticket = null) => {
  if (!user) return false;
  if (isAdmin(user) || user.isSuperAdmin || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.allAccess || perms?.deleteTickets || perms?.manageTickets) return true;
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
export const canEditSettings = (user) => isAdmin(user) || user?.isDelegatedAdmin;

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
  if (isHRorAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.viewAllProjects) return true;

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
  if (isHRorAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  if (perms?.viewAllTasks) return true;

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
    viewAllTickets: true,
    viewAllAttendance: true,
    viewAllLeaves: true,
    createTasks: true,
    approveLeaves: true,
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
    viewAllLeads: true,
    viewAllTasks: true,
    viewAllTickets: true,
    viewAllAttendance: true,
    viewAllLeaves: true,
    createTasks: true,
    approveLeaves: true,
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
    viewAllLeads: true,
    viewAllTasks: true,
    viewAllTickets: false,
    viewAllAttendance: false,
    viewAllLeaves: false,
    createTasks: true,
    approveLeaves: true,
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
    deleteEmployees: false,
    deleteLeads: false,
    deleteTickets: false,
    deleteNotices: false,
    editAttendance: false,
    forceClockOut: false,
    manageCompanyHolidays: false,
    employees: false,
    reports: false,
    documentation: false,
    payroll: false,
    finance: false,
    settings: false,
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
  { key: 'liveOperations', category: 'shift_attendance', label: 'Shift Monitor & Live Ops', icon: '⚡', desc: 'Monitor live shifts, team clock-in states and perform real-time shift actions' },
  { key: 'viewAllAttendance', category: 'shift_attendance', label: 'View Team Attendance', icon: '🕒', desc: 'View monthly attendance matrix, daily punch logs, and shift histories of all employees' },
  { key: 'editAttendance', category: 'shift_attendance', label: 'Mark & Edit Attendance', icon: '✍️', desc: 'Manually mark, adjust, or correct attendance records for team members' },
  { key: 'forceClockOut', category: 'shift_attendance', label: 'Admin Force Clock-Out', icon: '🛑', desc: 'Forcefully clock out active employee shifts with required audit logs' },

  // ── 2. Tasks & Projects ──
  { key: 'createTasks', category: 'tasks_projects', label: 'Create & Assign Tasks', icon: '➕', desc: 'Create tasks and delegate them to any team member' },
  { key: 'viewAllTasks', category: 'tasks_projects', label: 'View All Tasks', icon: '📋', desc: 'View company-wide tasks beyond assigned items' },
  { key: 'deleteTasks', category: 'tasks_projects', label: 'Delete Tasks', icon: '🗑️', desc: 'Permanently delete tasks and associated task timelogs' },
  { key: 'manageProjects', category: 'tasks_projects', label: 'Create & Manage Projects', icon: '📁', desc: 'Create projects, define sprint milestones, and assign project leads' },
  { key: 'deleteProjects', category: 'tasks_projects', label: 'Delete Projects', icon: '🗑️', desc: 'Permanently delete projects and sprint boards' },

  // ── 3. Workforce & Leaves ──
  { key: 'manageEmployees', category: 'workforce_hr', label: 'Manage Employees', icon: '👥', desc: 'Add, update employee profiles, documents, and department assignments' },
  { key: 'deleteEmployees', category: 'workforce_hr', label: 'Delete Employees', icon: '🗑️', desc: 'Permanently remove employee records from the organization' },
  { key: 'approveLeaves', category: 'workforce_hr', label: 'Approve & Reject Leaves', icon: '🌴', desc: 'Review, approve, or reject employee leave applications' },
  { key: 'manageCompanyHolidays', category: 'workforce_hr', label: 'Manage Company Holidays', icon: '⭐', desc: 'Declare, edit, or delete official company holidays and calendar events' },
  { key: 'giveAppreciation', category: 'workforce_hr', label: 'Award Appreciations', icon: '🏆', desc: 'Award recognition badges, performance awards, and rewards' },
  { key: 'deleteAppreciations', category: 'workforce_hr', label: 'Delete Appreciations', icon: '🗑️', desc: 'Remove recognition awards from the public board' },

  // ── 4. CRM & Communications ──
  { key: 'accessCRM', category: 'crm_comms', label: 'Access CRM & Leads', icon: '💼', desc: 'Access sales CRM pipeline, leads tracking, and deals' },
  { key: 'deleteLeads', category: 'crm_comms', label: 'Delete CRM Leads', icon: '🗑️', desc: 'Permanently delete sales leads from the CRM' },
  { key: 'manageTickets', category: 'crm_comms', label: 'Manage Support Tickets', icon: '🎫', desc: 'Assign, update priority, and resolve helpdesk support tickets' },
  { key: 'deleteTickets', category: 'crm_comms', label: 'Delete Support Tickets', icon: '🗑️', desc: 'Permanently delete customer or employee support tickets' },
  { key: 'postNotices', category: 'crm_comms', label: 'Post Company Notices', icon: '📢', desc: 'Publish announcements to the official company notice board' },
  { key: 'deleteNotices', category: 'crm_comms', label: 'Delete Notices', icon: '🗑️', desc: 'Delete official company notice board announcements' },

  // ── 5. Finance & Administration ──
  { key: 'accessFinance', category: 'finance_admin', label: 'Access Finance & Expenses', icon: '💰', desc: 'Review expense reimbursement claims and company expenditure' },
  { key: 'manageSalaries', category: 'finance_admin', label: 'Manage Payroll & Salaries', icon: '💵', desc: 'View payroll matrix, manage employee salary slips, and increments' },
  { key: 'documentation', category: 'finance_admin', label: 'Company Documentation', icon: '📄', desc: 'Manage official company policies, handbooks, and documentation' },
  { key: 'reports', category: 'finance_admin', label: 'View Analytics & Reports', icon: '📊', desc: 'Access organizational reports, attendance logs, and workforce charts' },
  { key: 'grantPermissions', category: 'finance_admin', label: 'Grant Permissions (Accesser)', icon: '🛡️', desc: 'Accesser authority: Can assign, customize, and delegate permissions to other users' },
  { key: 'allAccess', category: 'finance_admin', label: 'Full System Authority (Super Admin)', icon: '👑', desc: 'Unrestricted master control across all modules and system settings' }
];

/**
 * Check if an employee's temporary delegation is currently active (or expired)
 */
export const isDelegationActive = (user) => {
  if (!user) return false;
  if (user.isAdmin || user.isSuperAdmin || user.employeeCode === 'ADM-001' || user.email === 'admin@inforag.com') return true;
  
  let expiresAt = user.delegationExpiresAt;
  let isDelegated = user.isDelegatedAdmin || user.allAccess;

  try {
    const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
    if (rawMap) {
      const parsed = JSON.parse(rawMap);
      const userKey = user._id || user.employeeCode || user.email;
      if (userKey && parsed[userKey]) {
        if (parsed[userKey].delegationExpiresAt) expiresAt = parsed[userKey].delegationExpiresAt;
        if (parsed[userKey].isDelegatedAdmin || parsed[userKey].allAccess) isDelegated = true;
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
  const role = getUserRole(user);
  if (role === ROLES.ADMIN) return DEFAULT_MODULE_PERMISSIONS.admin;

  const basePerms = { ...(DEFAULT_MODULE_PERMISSIONS[role] || DEFAULT_MODULE_PERMISSIONS.team_member) };
  const delegationValid = isDelegationActive(user);

  if (delegationValid) {
    return { ...DEFAULT_MODULE_PERMISSIONS.admin, allAccess: true, isDelegatedAdmin: true };
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

  // Upward elevation: granting any granular capability enables the parent module view automatically
  if (basePerms.manageEmployees || basePerms.deleteEmployees) {
    basePerms.employees = true;
  }
  if (basePerms.manageSalaries || basePerms.export_payroll || basePerms.accessFinance) {
    basePerms.payroll = true;
    basePerms.finance = true;
  }
  if (basePerms.accessCRM || basePerms.viewAllLeads || basePerms.deleteLeads) {
    basePerms.leads = true;
  }
  if (basePerms.viewAllAttendance || basePerms.editAttendance || basePerms.forceClockOut) {
    basePerms.attendance = true;
  }
  if (basePerms.liveOperations) {
    basePerms.teamoperations = true;
  }
  if (basePerms.approveLeaves || basePerms.viewAllLeaves) {
    basePerms.leaves = true;
  }
  if (basePerms.manageProjects || basePerms.createProjects || basePerms.deleteProjects || basePerms.viewAllProjects) {
    basePerms.projects = true;
  }
  if (basePerms.createTasks || basePerms.viewAllTasks || basePerms.deleteTasks) {
    basePerms.tasks = true;
  }
  if (basePerms.manageTickets || basePerms.deleteTickets) {
    basePerms.tickets = true;
  }
  if (basePerms.documentation) {
    basePerms.documents = true;
  }
  if (basePerms.reports) {
    basePerms.viewReports = true;
  }

  if (basePerms.allAccess || basePerms.isDelegatedAdmin) {
    if (delegationValid) {
      return { ...DEFAULT_MODULE_PERMISSIONS.admin, allAccess: true, isDelegatedAdmin: true, ...basePerms };
    }
    // Expired delegation: clean out admin flags
    delete basePerms.allAccess;
    delete basePerms.isDelegatedAdmin;
  }

  return basePerms;
};

/**
 * Granular Action Gates: Delete, Export, and Scope
 */
export const canDeleteRecord = (user, module = 'tasks') => {
  if (!user) return false;
  if (isAdmin(user) || isDelegationActive(user)) return true;
  const perms = getUserModulePermissions(user);
  const modKey = String(module).toLowerCase();
  
  if (modKey === 'tasks' || modKey === 'task') return !!(perms.deleteTasks || perms.canDeleteTasks || perms.allAccess);
  if (modKey === 'projects' || modKey === 'project') return !!(perms.deleteProjects || perms.canDeleteProjects || perms.allAccess);
  if (modKey === 'leads' || modKey === 'lead') return !!(perms.deleteLeads || perms.canDeleteLeads || perms.allAccess);
  if (modKey === 'tickets' || modKey === 'ticket') return !!(perms.deleteTickets || perms.canDeleteTickets || perms.allAccess);
  if (modKey === 'employees' || modKey === 'employee') return !!(perms.deleteEmployees || perms.canDeleteEmployees || perms.allAccess);
  if (modKey === 'notices' || modKey === 'notice') return !!(perms.deleteNotices || perms.postNotices || perms.allAccess);
  return !!perms.allAccess;
};

export const canExportData = (user, module = 'general') => {
  if (!user) return false;
  if (isAdmin(user) || isDelegationActive(user)) return true;
  const r = getUserRole(user);
  if (r === ROLES.HR) return true;
  const perms = getUserModulePermissions(user);
  const modKey = String(module).toLowerCase();
  return !!(perms[`export_${modKey}`] || perms.exportData || perms.canExport || perms.allAccess);
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
  if (isAdmin(user)) return true;
  const perms = getUserModulePermissions(user);
  return !!perms.grantPermissions;
};

/**
 * Check if a user can access a specific module
 */
export const canAccessModule = (user, moduleId) => {
  if (!user) return false;
  if (isAdmin(user) || user.isDelegatedAdmin) return true;
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
    if (perms?.liveOperations === false || user?.permissions?.liveOperations === false) {
      return false;
    }
    return Boolean(isAdmin(user) || isHR(user) || isDelegationActive(user) || perms?.liveOperations === true || perms?.teamoperations === true);
  }

  // 2. Strict explicit false checks (Explicit Revocation MUST override all fallbacks)
  if (perms?.[permKey] === false || (user?.permissions && user.permissions[permKey] === false)) {
    return false;
  }
  if (permKey === 'appreciation' && (perms?.appreciation === false || user?.permissions?.appreciation === false)) {
    return false;
  }
  if (permKey === 'payroll' && (perms?.payroll === false || user?.permissions?.payroll === false)) {
    return false;
  }
  if (permKey === 'employees' && (perms?.employees === false || user?.permissions?.employees === false)) {
    return false;
  }
  if (permKey === 'leads' && (perms?.leads === false || user?.permissions?.leads === false)) {
    return false;
  }
  if (permKey === 'documentation' && (perms?.documentation === false || user?.permissions?.documentation === false)) {
    return false;
  }

  // 3. Direct explicit true on module key or normalized key
  if (perms && (perms[permKey] === true || perms[moduleId] === true)) {
    return true;
  }
  if ((permKey === 'payroll' || permKey === 'finance') && (perms?.payroll || perms?.accessFinance || perms?.finance || perms?.manageSalaries || perms?.export_payroll)) {
    return true;
  }
  if (permKey === 'employees' && (perms?.employees || perms?.manageEmployees || perms?.deleteEmployees)) {
    return true;
  }
  if (permKey === 'leads' && (perms?.leads || perms?.accessCRM || perms?.viewAllLeads || perms?.deleteLeads || perms?.export_leads)) {
    return true;
  }
  if (permKey === 'projects' && (perms?.projects || perms?.manageProjects || perms?.createProjects || perms?.viewAllProjects || perms?.deleteProjects)) {
    return true;
  }
  if (permKey === 'leaves' && (perms?.leaves || perms?.approveLeaves || perms?.viewAllLeaves)) {
    return true;
  }
  if (permKey === 'attendance' && (perms?.attendance || perms?.viewAllAttendance || perms?.editAttendance || perms?.export_attendance)) {
    return true;
  }
  if (permKey === 'tickets' && (perms?.tickets || perms?.viewAllTickets || perms?.deleteTickets)) {
    return true;
  }
  if (permKey === 'documentation' && (perms?.documentation || perms?.documents)) {
    return true;
  }
  if (permKey === 'reports' && (perms?.reports || perms?.viewReports)) {
    return true;
  }

  // 4. Strict guard: Regular employees (Team Members) cannot access privileged modules unless explicitly granted above
  if (role === ROLES.TEAM_MEMBER) {
    if (permKey === 'liveOperations' && (perms?.liveOperations || perms?.teamoperations)) return true;
    if (permKey === 'employees' && (perms?.employees || perms?.manageEmployees || perms?.deleteEmployees)) return true;
    if (permKey === 'payroll' && (perms?.payroll || perms?.manageSalaries || perms?.export_payroll)) return true;
    if (permKey === 'finance' && (perms?.finance || perms?.accessFinance || perms?.manageExpenses)) return true;
    if (permKey === 'leads' && (perms?.leads || perms?.accessCRM || perms?.viewAllLeads || perms?.deleteLeads)) return true;
    if (permKey === 'documentation' && (perms?.documentation || perms?.documents)) return true;
    if (permKey === 'reports' && (perms?.reports || perms?.viewReports)) return true;
    if (permKey === 'settings' && (perms?.settings || perms?.grantPermissions)) return true;
    const privilegedModules = ['employees', 'teamoperations', 'liveOperations', 'payroll', 'finance', 'settings', 'documentation', 'leads', 'reports'];
    if (privilegedModules.includes(permKey)) return false;
    return true; // allowed default modules: dashboard, tasks, timesheet, attendance, leaves, tickets, events, expenses, projects
  }

  return perms[permKey] !== false;
};

