import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderGit2,
  ListTodo,
  CalendarCheck,
  Palmtree,
  DollarSign,
  Ticket,
  Calendar,
  MessageSquare,
  BellRing,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Award,
  Zap,
  Clock,
  Layers,
  Users2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHR } from '../../../modules/hr/context/HRContext';
import { canAccessModule, isLeaderOrAbove, canManageProjects } from '../../utils/permissionUtils';
import { getCompanySettings } from '../../services/companySettingsService';
import { EmployeeDirectoryModal } from '../../../modules/hr/components/employees/EmployeeDirectoryModal';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser: authUser } = useAuth();
  const { currentUser: hrUser } = useHR();
  const currentUser = authUser || hrUser;

  const [companyInfo, setCompanyInfo] = useState(getCompanySettings());
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setCompanyInfo(getCompanySettings());
    };
    window.addEventListener('company-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('company-settings-updated', handleSettingsUpdate);
  }, []);

  const [leadsExpanded, setLeadsExpanded] = useState(false);
  const [hrExpanded, setHrExpanded] = useState(false);
  const [workExpanded, setWorkExpanded] = useState(false);
  const [financeExpanded, setFinanceExpanded] = useState(false);

  // Synchronize submenu expanded states based on active URL
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/lead')) setLeadsExpanded(true);
    if (p.startsWith('/leaves') || p.startsWith('/attendance') || p.startsWith('/holiday') || p.startsWith('/documents') || p.startsWith('/appreciation')) {
      setHrExpanded(true);
    }
    if (p.startsWith('/projects') || p.startsWith('/tasks') || p.startsWith('/timesheet')) {
      setWorkExpanded(true);
    }
    if (p.startsWith('/payroll') || p.startsWith('/expenses') || p.startsWith('/finance')) {
      setFinanceExpanded(true);
    }
  }, [location.pathname]);

  const toggleSection = (section) => {
    if (section === 'leads') setLeadsExpanded(!leadsExpanded);
    if (section === 'hr') setHrExpanded(!hrExpanded);
    if (section === 'work') setWorkExpanded(!workExpanded);
    if (section === 'finance') setFinanceExpanded(!financeExpanded);
  };

  const isHRorAdmin = currentUser?.role === 'HR' ||
    currentUser?.role === 'Super Admin' ||
    currentUser?.isAdmin ||
    currentUser?.systemRole === 'admin' ||
    currentUser?.systemRole === 'hr';

  const isLeadsActive = ['/leads', '/lead-contact'].some(path => location.pathname.startsWith(path));

  const isHrActive = ['/leaves', '/attendance', '/attendance-clock', '/clock', '/break', '/breaks', '/holiday', '/holidays', '/documents', '/documentation', '/appreciation', '/appreciations'].some(path =>
    location.pathname.startsWith(path)
  );

  const isWorkActive = ['/projects', '/tasks', '/timesheet', '/timesheets', '/timer', '/timelog', '/timelogs', '/work-timer', '/time-tracker', '/time', '/work'].some(path =>
    location.pathname.startsWith(path)
  );

  const isFinanceActive = ['/payroll', '/payslips', '/finance', '/expenses'].some(path =>
    location.pathname.startsWith(path)
  );

  return (
    <aside className={`bg-[#101b33] text-slate-400 flex flex-col h-screen shrink-0 border-r border-slate-800 sticky top-0 z-[100] overflow-hidden transition-[width] duration-250 ease-out ${collapsed ? 'w-[72px]' : 'w-[250px]'}`}>
      {/* Brand & User Top Header */}
      <div className={`border-b border-white/[0.06] flex items-center justify-between min-h-[70px] ${collapsed ? 'p-4 px-2' : 'py-[18px] px-5'}`}>
        {!collapsed ? (
          <div
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 overflow-hidden cursor-pointer"
            title="Click to open Profile Settings"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name || 'User'}
                className="w-9 h-9 rounded-[10px] object-cover border-2 border-blue-500/60 shadow-md shadow-blue-600/40 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-600/40 shrink-0">
                <Zap size={20} fill="#ffffff" />
              </div>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[15px] font-extrabold text-white tracking-tight max-w-[140px] truncate">
                  {companyInfo.companyName || companyInfo.shortName || 'Workspace'}
                </span>
                <ChevronDown size={13} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                <span className="text-xs text-slate-300 font-semibold max-w-[130px] truncate">
                  {currentUser?.name || 'Avinash'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 mx-auto rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-600/40">
            <Zap size={20} fill="#ffffff" />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className={`flex-1 overflow-y-auto flex flex-col gap-1 ${collapsed ? 'py-3 px-1.5' : 'py-4 px-3'}`}>
        {/* Dashboard */}
        {canAccessModule(currentUser, 'dashboard') && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${
                isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <LayoutDashboard size={18} className={location.pathname === '/dashboard' ? 'text-blue-400' : 'text-slate-400'} />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
        )}

        {/* Employees & Role Management (Master Direct Access) */}
        {(isHRorAdmin || canAccessModule(currentUser, 'employees')) && (
          <NavLink
            to="/employees"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${
                isActive ? 'text-white bg-blue-600/25 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <Users size={18} className={location.pathname === '/employees' ? 'text-blue-400' : 'text-slate-400'} />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span>Employees & Roles</span>
                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                  RBAC
                </span>
              </div>
            )}
          </NavLink>
        )}

        {/* Live Operations & Emergency Controls (Admin/HR/Delegated) */}
        {(isHRorAdmin || canAccessModule(currentUser, 'liveOperations') || canAccessModule(currentUser, 'teamoperations')) && (
          <NavLink
            to="/team-operations"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${
                isActive ? 'text-white bg-orange-600/25 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <Zap size={18} className={location.pathname === '/team-operations' ? 'text-orange-400' : 'text-orange-500'} fill={location.pathname === '/team-operations' ? '#fb923c' : 'none'} />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span>Live Operations</span>
                <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                  LIVE
                </span>
              </div>
            )}
          </NavLink>
        )}

        {/* Leads - Core CRM Prospect & Deal Pipeline Section */}
        {canAccessModule(currentUser, 'leads') && (
          <div>
            <div
              onClick={() => toggleSection('leads')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] cursor-pointer transition-all duration-150 ${
                isLeadsActive ? 'text-white bg-blue-600/15 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users2 size={18} className={isLeadsActive ? 'text-blue-500' : 'text-slate-400'} />
                {!collapsed && <span>Leads</span>}
              </div>
              {!collapsed && (
                leadsExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-500" />
              )}
            </div>

            {/* Submenu for Leads */}
            {leadsExpanded && (
              <div className={`mt-1 flex flex-col gap-0.5 ${collapsed ? 'ml-0 pl-0 border-l-0' : 'ml-4 pl-3 border-l border-white/10'}`}>
                <NavLink
                  to="/lead-contact"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                      isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
                >
                  <UserCheck size={15} />
                  {!collapsed && <span>Lead Contact</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* HR - Dedicated Personnel & Attendance Section */}
        {(canAccessModule(currentUser, 'leaves') || canAccessModule(currentUser, 'attendance')) && (
          <div>
            <div
              onClick={() => toggleSection('hr')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] cursor-pointer transition-all duration-150 ${
                isHrActive ? 'text-white bg-blue-600/15 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase size={18} className={isHrActive ? 'text-blue-500' : 'text-slate-400'} />
                {!collapsed && <span>HR</span>}
              </div>
              {!collapsed && (
                hrExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-500" />
              )}
            </div>

            {/* Submenu for HR */}
            {hrExpanded && (
              <div className={`mt-1 flex flex-col gap-0.5 ${collapsed ? 'ml-0 pl-0 border-l-0' : 'ml-4 pl-3 border-l border-white/10'}`}>
                {canAccessModule(currentUser, 'leaves') && (
                  <NavLink
                    to="/leaves"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                        isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
                  >
                    <Palmtree size={15} />
                    {!collapsed && <span>Leaves</span>}
                  </NavLink>
                )}

                {canAccessModule(currentUser, 'attendance') && (
                  <NavLink
                    to="/attendance"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                        isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
                  >
                    <UserCheck size={15} />
                    {!collapsed && <span>Attendance</span>}
                  </NavLink>
                )}

                <NavLink
                  to="/holiday"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                      isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
                >
                  <CalendarCheck size={15} />
                  {!collapsed && <span>Holiday</span>}
                </NavLink>

                <NavLink
                  to="/appreciation"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                      isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
                >
                  <Award size={15} />
                  {!collapsed && <span>Appreciation</span>}
                </NavLink>

                {(isHRorAdmin || canAccessModule(currentUser, 'documentation') || currentUser?.isDelegatedAdmin) && (
                  <NavLink
                    to="/documents"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                        isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
                  >
                    <FolderGit2 size={15} />
                    {!collapsed && <span>Documents & KYC</span>}
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* Work - Core Daily Work Section */}
        {canAccessModule(currentUser, 'tasks') && (
          <div>
            <div
              onClick={() => toggleSection('work')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] cursor-pointer transition-all duration-150 ${
                isWorkActive ? 'text-white bg-blue-600/15 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers size={18} className={isWorkActive ? 'text-blue-500' : 'text-slate-400'} />
                {!collapsed && <span>Work</span>}
              </div>
              {!collapsed && (
                workExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-500" />
              )}
            </div>

            {/* Submenu for Work */}
            {workExpanded && (
              <div className={`mt-1 flex flex-col gap-0.5 ${collapsed ? 'ml-0 pl-0 border-l-0' : 'ml-4 pl-3 border-l border-white/10'}`}>
                {(isLeaderOrAbove || canAccessModule(currentUser, 'projects') || canManageProjects(currentUser)) && (
                  <NavLink
                    to="/projects"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                        isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
                  >
                    <FolderGit2 size={15} />
                    {!collapsed && <span>Projects</span>}
                  </NavLink>
                )}

                <NavLink
                  to="/tasks"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                      isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
                >
                  <ListTodo size={15} />
                  {!collapsed && <span>Tasks</span>}
                </NavLink>

                <NavLink
                  to="/timesheet"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                      isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
                >
                  <Clock size={15} />
                  {!collapsed && <span>Timesheet</span>}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Finance - Dedicated Financial Section (Admin / HR full access, employees only personal expenses) */}
        {(isHRorAdmin || canAccessModule(currentUser, 'expenses')) && (
          <div>
            <div
              onClick={() => toggleSection('finance')}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] cursor-pointer transition-all duration-150 ${
                isFinanceActive ? 'text-white bg-blue-600/15 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <DollarSign size={18} className={isFinanceActive ? 'text-blue-500' : 'text-slate-400'} />
                {!collapsed && <span>Finance</span>}
              </div>
              {!collapsed && (
                financeExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-500" />
              )}
            </div>

            {/* Submenu for Finance */}
            {financeExpanded && (
              <div className={`mt-1 flex flex-col gap-0.5 ${collapsed ? 'ml-0 pl-0 border-l-0' : 'ml-4 pl-3 border-l border-white/10'}`}>
                <NavLink
                  to="/expenses"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                      isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                    }`
                  }
                >
                  <DollarSign size={15} />
                  {!collapsed && <span>Expenses</span>}
                </NavLink>

                {(isHRorAdmin || canAccessModule(currentUser, 'payroll') || canAccessModule(currentUser, 'finance')) && (
                  <NavLink
                    to="/payroll"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md no-underline text-[13px] transition-all duration-150 ${
                        isActive ? 'text-white bg-blue-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-normal'
                      }`
                    }
                  >
                    <DollarSign size={15} />
                    {!collapsed && <span>Salary & Payslips</span>}
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {canAccessModule(currentUser, 'tickets') && (
          <NavLink
            to="/tickets"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${
                isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <Ticket size={18} className={location.pathname === '/tickets' ? 'text-blue-400' : 'text-slate-400'} />
            {!collapsed && <span>Tickets</span>}
          </NavLink>
        )}

        {canAccessModule(currentUser, 'events') && (
          <NavLink
            to="/events"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${
                isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              }`
            }
          >
            <Calendar size={18} className={location.pathname === '/events' ? 'text-blue-400' : 'text-slate-400'} />
            {!collapsed && <span>Events</span>}
          </NavLink>
        )}

        <NavLink
          to="/messages"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${
              isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`
          }
        >
          <MessageSquare size={18} className={location.pathname === '/messages' ? 'text-blue-400' : 'text-slate-400'} />
          {!collapsed && <span>Messages</span>}
        </NavLink>

        <NavLink
          to="/notice-board"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${
              isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`
          }
        >
          <BellRing size={18} className={location.pathname === '/notice-board' ? 'text-blue-400' : 'text-slate-400'} />
          {!collapsed && <span>Notice Board</span>}
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-[13.5px] transition-all duration-150 ${
              isActive ? 'text-white bg-blue-600/20 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
            }`
          }
        >
          <Settings size={18} className={location.pathname === '/settings' ? 'text-blue-400' : 'text-slate-400'} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>

      {/* Sidebar Footer & Collapse Toggle */}
      <div className={`border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500 ${collapsed ? 'py-3 px-2' : 'py-3.5 px-[18px]'}`}>
        {!collapsed && <span>v1.0.0</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`bg-transparent border-0 text-slate-400 hover:text-slate-200 cursor-pointer flex items-center justify-center p-1 rounded transition-colors ${collapsed ? 'mx-auto' : ''}`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <EmployeeDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
      />
    </aside>
  );
};
