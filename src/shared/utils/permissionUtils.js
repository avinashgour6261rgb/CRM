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
export const canManageEmployees = (user) => isHRorAdmin(user);
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
  return false;
};
export const canManageCompanyHolidays = (user) => isHRorAdmin(user);
export const canManagePayroll = (user) => isHRorAdmin(user);
export const canManageProjects = (user) => {
  if (!user) return false;
  if (isLeaderOrAbove(user)) return true;
  const perms = getUserModulePermissions(user);
  return !!(perms?.manageProjects || perms?.createProjects || perms?.projects);
};
export const canAssignRoles = (user) => isAdmin(user);
export const canPostNotices = (user) => isLeaderOrAbove(user);
export const canDeleteEmployee = (user) => isAdmin(user);
export const canEditSettings = (user) => isAdmin(user);

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
    grantPermissions: true
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
    grantPermissions: false
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
    grantPermissions: false
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
    leads: false,
    projects: true,
    manageProjects: false,
    createProjects: false,
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
    grantPermissions: false
  }
};

/**
 * Granular Permission Definitions for UI toggles
 */
export const GRANULAR_PERMISSIONS_LIST = [
  { key: 'liveOperations', label: 'Live Operations & Shift Monitor', icon: '⚡', desc: 'Can monitor live employee shifts, see live table & perform shift actions' },
  { key: 'viewAllTasks', label: 'View All Tasks', icon: '📋', desc: 'Can view tasks of all team members across the company' },
  { key: 'createTasks', label: 'Create & Assign Tasks', icon: '✍️', desc: 'Can create and delegate tasks to others' },
  { key: 'manageProjects', label: 'Create & Manage Projects', icon: '📁', desc: 'Can create new projects, assign team leads, and manage project deliverables' },
  { key: 'viewAllAttendance', label: 'View Team Attendance', icon: '🕒', desc: 'Can see live shift status and punch logs of others' },
  { key: 'approveLeaves', label: 'Approve Leaves', icon: '🌴', desc: 'Can approve or decline leave applications' },
  { key: 'viewAllTickets', label: 'View All Tickets', icon: '🎫', desc: 'Can view and resolve helpdesk support tickets' },
  { key: 'accessCRM', label: 'Access CRM & Leads', icon: '💼', desc: 'Can access CRM pipeline and customer leads' },
  { key: 'accessFinance', label: 'Finance & Payroll', icon: '💰', desc: 'Can view payroll summaries and company expenses' },
  { key: 'manageEmployees', label: 'Manage Employees', icon: '👥', desc: 'Can add, edit, or remove employee records' },
  { key: 'grantPermissions', label: 'Grant Permissions', icon: '🛡️', desc: 'Admin delegation: Can modify other users access rights' }
];

/**
 * Get active module permissions for an employee with user-specific override support
 */
export const getUserModulePermissions = (user) => {
  if (!user) return DEFAULT_MODULE_PERMISSIONS.team_member;
  const role = getUserRole(user);
  if (role === ROLES.ADMIN) return DEFAULT_MODULE_PERMISSIONS.admin;

  const basePerms = { ...(DEFAULT_MODULE_PERMISSIONS[role] || DEFAULT_MODULE_PERMISSIONS.team_member) };

  // 1. Direct permissions embedded on the user object
  if (user.permissions && typeof user.permissions === 'object') {
    Object.assign(basePerms, user.permissions);
  }

  // 2. Global stored permissions map
  try {
    const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
    if (rawMap) {
      const parsed = JSON.parse(rawMap);
      const userKey = user._id || user.employeeCode || user.email;
      if (userKey && parsed[userKey]) {
        Object.assign(basePerms, parsed[userKey]);
      }
      if (parsed[role]) {
        Object.assign(basePerms, parsed[role]);
      }
    }
  } catch (e) {
    console.warn('Error reading module permissions:', e);
  }

  return basePerms;
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
  if (isAdmin(user)) return true;
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
    project: 'projects'
  };

  const permKey = keyMap[normalizedKey] || moduleId;

  // 1. Explicit boolean in user's permissions overrides defaults
  if (perms && typeof perms[permKey] === 'boolean') {
    return perms[permKey];
  }

  // Project management grant override (Admin delegation)
  if (permKey === 'projects' && perms && (perms.manageProjects || perms.createProjects || perms.projects || perms.viewAllProjects)) {
    return true;
  }

  // 2. Strict guard: Regular employees (Team Members) cannot access privileged modules by default
  if (role === ROLES.TEAM_MEMBER) {
    const privilegedModules = ['employees', 'teamoperations', 'payroll', 'finance', 'settings', 'documentation', 'leads', 'projects', 'reports'];
    if (privilegedModules.includes(permKey)) return false;
    return true; // allowed modules: dashboard, tasks, timesheet, attendance, leaves, tickets, events, expenses
  }

  return perms[permKey] !== false;
};

