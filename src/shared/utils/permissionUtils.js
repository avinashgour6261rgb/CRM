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
  
  // 1. Check direct system role attribute if explicitly set
  if (user.systemRole && Object.values(ROLES).includes(user.systemRole)) {
    return user.systemRole;
  }

  // 2. Direct flags
  if (user.isSuperAdmin || user.isAdmin) {
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
export const canApproveLeaves = (user) => isLeaderOrAbove(user);
export const canManageCompanyHolidays = (user) => isHRorAdmin(user);
export const canManagePayroll = (user) => isHRorAdmin(user);
export const canManageProjects = (user) => isLeaderOrAbove(user);
export const canAssignRoles = (user) => isAdmin(user);
export const canPostNotices = (user) => isLeaderOrAbove(user);
export const canDeleteEmployee = (user) => isAdmin(user);
export const canEditSettings = (user) => isAdmin(user);

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
    employees: true,
    reports: true,
    viewAllLeads: true,
    viewAllTasks: true,
    viewAllTickets: true,
    viewAllAttendance: true,
    viewAllLeaves: true
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
    viewAllLeads: true,
    viewAllTasks: true,
    viewAllTickets: true,
    viewAllAttendance: true,
    viewAllLeaves: true
  },
  team_leader: {
    dashboard: true,
    tasks: true,
    leads: true,
    attendance: true,
    leaves: true,
    tickets: true,
    events: true,
    employees: false, // Restricted to HR & Admin
    reports: true,
    viewAllLeads: true,
    viewAllTasks: true,
    viewAllTickets: false,
    viewAllAttendance: false,
    viewAllLeaves: false
  },
  team_member: {
    dashboard: true,
    tasks: true,
    leads: true,
    attendance: true,
    leaves: true,
    tickets: true,
    events: true,
    employees: false, // Restricted to HR & Admin
    reports: false,
    viewAllLeads: false, // by default only own / assigned leads
    viewAllTasks: false, // by default only own assigned tasks
    viewAllTickets: false, // by default only own tickets
    viewAllAttendance: false, // by default only own attendance
    viewAllLeaves: false // by default only own leaves
  }
};

/**
 * Get active module permissions for an employee with user-specific override support
 */
export const getUserModulePermissions = (user) => {
  if (!user) return DEFAULT_MODULE_PERMISSIONS.team_member;
  const role = getUserRole(user);
  if (role === ROLES.ADMIN) return DEFAULT_MODULE_PERMISSIONS.admin;

  try {
    const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
    if (rawMap) {
      const parsed = JSON.parse(rawMap);
      const userKey = user._id || user.employeeCode || user.email;
      if (userKey && parsed[userKey]) {
        return { ...(DEFAULT_MODULE_PERMISSIONS[role] || DEFAULT_MODULE_PERMISSIONS.team_member), ...parsed[userKey] };
      }
      if (parsed[role]) {
        return { ...(DEFAULT_MODULE_PERMISSIONS[role] || DEFAULT_MODULE_PERMISSIONS.team_member), ...parsed[role] };
      }
    }
  } catch (e) {
    console.warn('Error reading module permissions:', e);
  }

  return DEFAULT_MODULE_PERMISSIONS[role] || DEFAULT_MODULE_PERMISSIONS.team_member;
};

/**
 * Check if a user can access a specific module
 */
export const canAccessModule = (user, moduleId) => {
  if (!user) return true;
  if (isAdmin(user)) return true;
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
    timesheets: 'tasks'
  };

  const permKey = keyMap[normalizedKey] || moduleId;
  return perms[permKey] !== false;
};

