import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users2,
  Briefcase,
  Layers,
  DollarSign,
  Ticket,
  Calendar,
  MessageSquare,
  BellRing,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Zap,
  Award,
  CalendarCheck,
  Palmtree,
  UserCheck,
  Users,
  FolderGit2,
  ListTodo,
  Clock
} from 'lucide-react';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useAuth } from '../../context/AuthContext';
import { EmployeeDirectoryModal } from '../../../modules/hr/components/employees/EmployeeDirectoryModal';
import { getRoleConfig, canAccessModule } from '../../utils/permissionUtils';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser: authUser, isAdmin, isHR, isTeamMember, isHRorAdmin, roleConfig: authRoleConfig } = useAuth();
  const { currentUser: hrUser } = useHR();
  const currentUser = authUser || hrUser;
  const roleConfig = authRoleConfig || getRoleConfig(currentUser);
  const [collapsed, setCollapsed] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

  // Helper to determine active section from route
  const getSectionForPath = (pathname) => {
    if (['/leads', '/lead-contact'].some(path => pathname.startsWith(path))) return 'leads';
    if (['/projects', '/tasks', '/timesheet', '/timesheets', '/timer', '/timelog', '/timelogs', '/work-timer', '/time-tracker', '/time', '/work'].some(path => pathname.startsWith(path))) return 'work';
    if (['/leaves', '/attendance', '/attendance-clock', '/clock', '/break', '/breaks', '/holiday', '/holidays', '/documents', '/documentation', '/appreciation', '/appreciations'].some(path => pathname.startsWith(path))) return 'hr';
    if (['/payroll', '/payslips', '/finance', '/expenses'].some(path => pathname.startsWith(path))) return 'finance';
    return null;
  };

  // Only one section dropdown can be open at a time (mutually exclusive accordion)
  const [openSection, setOpenSection] = useState(() => getSectionForPath(location.pathname) || null);

  // Sync section with current route
  React.useEffect(() => {
    const routeSection = getSectionForPath(location.pathname);
    setOpenSection(routeSection || null);
  }, [location.pathname]);

  const toggleSection = (sectionKey) => {
    setOpenSection(prev => (prev === sectionKey ? null : sectionKey));
  };

  const leadsExpanded = openSection === 'leads';
  const workExpanded = openSection === 'work';
  const hrExpanded = openSection === 'hr';
  const financeExpanded = openSection === 'finance';

  const isLeadsActive = ['/leads', '/lead-contact'].some(path =>
    location.pathname.startsWith(path)
  );

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
    <aside style={{
      width: collapsed ? '72px' : '250px',
      backgroundColor: '#101b33',
      color: '#94a3b8',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0,
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRight: '1px solid #1e293b',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      overflow: 'hidden'
    }}>
      {/* Brand & User Top Header */}
      <div style={{
        padding: collapsed ? '16px 8px' : '18px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '70px'
      }}>
        {!collapsed ? (
          <div
            onClick={() => navigate('/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', cursor: 'pointer' }}
            title="Click to open Profile Settings"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name || 'User'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  border: '2px solid rgba(59, 130, 246, 0.6)',
                  boxShadow: '0 4px 10px rgba(37,99,235,0.4)',
                  flexShrink: 0
                }}
              />
            ) : (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 10px rgba(37,99,235,0.4)',
                flexShrink: 0
              }}>
                <Zap size={20} fill="#ffffff" />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                  Novainfinity
                </span>
                <ChevronDown size={13} color="#94a3b8" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981'
                }}></span>
                <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.name || 'Avinash'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            width: '36px',
            height: '36px',
            margin: '0 auto',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Zap size={20} fill="#ffffff" />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: collapsed ? '12px 6px' : '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {/* Dashboard */}
        {canAccessModule(currentUser, 'dashboard') && (
          <NavLink
            to="/dashboard"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              color: isActive ? '#ffffff' : '#94a3b8',
              backgroundColor: isActive ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? '600' : '500',
              transition: 'all 0.15s ease'
            })}
          >
            <LayoutDashboard size={18} color={location.pathname === '/dashboard' ? '#60a5fa' : '#94a3b8'} />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
        )}

        {/* Employees & Role Management (Master Direct Access) */}
        {isHRorAdmin && (
          <NavLink
            to="/employees"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              color: isActive ? '#ffffff' : '#94a3b8',
              backgroundColor: isActive ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? '700' : '500',
              transition: 'all 0.15s ease'
            })}
          >
            <Users size={18} color={location.pathname === '/employees' ? '#60a5fa' : '#94a3b8'} />
            {!collapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Employees & Roles</span>
                <span style={{ fontSize: '10px', backgroundColor: '#2563eb', color: '#ffffff', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                  RBAC
                </span>
              </div>
            )}
          </NavLink>
        )}

        {/* Live Operations & Emergency Controls (Admin/HR) */}
        {isHRorAdmin && (
          <NavLink
            to="/team-operations"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              color: isActive ? '#ffffff' : '#94a3b8',
              backgroundColor: isActive ? 'rgba(234, 88, 12, 0.22)' : 'transparent',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? '700' : '500',
              transition: 'all 0.15s ease'
            })}
          >
            <Zap size={18} color={location.pathname === '/team-operations' ? '#fb923c' : '#f97316'} fill={location.pathname === '/team-operations' ? '#fb923c' : 'none'} />
            {!collapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Live Operations</span>
                <span style={{ fontSize: '10px', backgroundColor: '#ea580c', color: '#ffffff', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>
                  ADMIN
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
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '8px',
              color: isLeadsActive ? '#ffffff' : '#94a3b8',
              backgroundColor: isLeadsActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
              fontSize: '13.5px',
              fontWeight: isLeadsActive ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users2 size={18} color={isLeadsActive ? '#3b82f6' : '#94a3b8'} />
              {!collapsed && <span>Leads</span>}
            </div>
            {!collapsed && (
              leadsExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#64748b" />
            )}
          </div>

          {/* Submenu for Leads */}
          {leadsExpanded && (
            <div style={{
              marginTop: '4px',
              marginLeft: collapsed ? '0' : '16px',
              paddingLeft: collapsed ? '0' : '12px',
              borderLeft: collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <NavLink
                to="/lead-contact"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.15s ease'
                })}
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
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '8px',
              color: isHrActive ? '#ffffff' : '#94a3b8',
              backgroundColor: isHrActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
              fontSize: '13.5px',
              fontWeight: isHrActive ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Briefcase size={18} color={isHrActive ? '#3b82f6' : '#94a3b8'} />
              {!collapsed && <span>HR</span>}
            </div>
            {!collapsed && (
              hrExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#64748b" />
            )}
          </div>

          {/* Submenu for HR */}
          {hrExpanded && (
            <div style={{
              marginTop: '4px',
              marginLeft: collapsed ? '0' : '16px',
              paddingLeft: collapsed ? '0' : '12px',
              borderLeft: collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              {canAccessModule(currentUser, 'leaves') && (
                <NavLink
                  to="/leaves"
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '400',
                    transition: 'all 0.15s ease'
                  })}
                >
                  <Palmtree size={15} />
                  {!collapsed && <span>Leaves</span>}
                </NavLink>
              )}

              {canAccessModule(currentUser, 'attendance') && (
                <NavLink
                  to="/attendance"
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '400',
                    transition: 'all 0.15s ease'
                  })}
                >
                  <UserCheck size={15} />
                  {!collapsed && <span>Attendance</span>}
                </NavLink>
              )}

              <NavLink
                to="/holiday"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.15s ease'
                })}
              >
                <CalendarCheck size={15} />
                {!collapsed && <span>Holiday</span>}
              </NavLink>

              <NavLink
                to="/appreciation"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.15s ease'
                })}
              >
                <Award size={15} />
                {!collapsed && <span>Appreciation</span>}
              </NavLink>

              <NavLink
                to="/documents"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.15s ease'
                })}
              >
                <FolderGit2 size={15} />
                {!collapsed && <span>Documents & KYC</span>}
              </NavLink>
            </div>
          )}
        </div>
        )}

        {/* Work - Core Daily Work Section */}
        {canAccessModule(currentUser, 'tasks') && (
        <div>
          <div
            onClick={() => toggleSection('work')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '8px',
              color: isWorkActive ? '#ffffff' : '#94a3b8',
              backgroundColor: isWorkActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
              fontSize: '13.5px',
              fontWeight: isWorkActive ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Layers size={18} color={isWorkActive ? '#3b82f6' : '#94a3b8'} />
              {!collapsed && <span>Work</span>}
            </div>
            {!collapsed && (
              workExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#64748b" />
            )}
          </div>

          {/* Submenu for Work */}
          {workExpanded && (
            <div style={{
              marginTop: '4px',
              marginLeft: collapsed ? '0' : '16px',
              paddingLeft: collapsed ? '0' : '12px',
              borderLeft: collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <NavLink
                to="/projects"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.15s ease'
                })}
              >
                <FolderGit2 size={15} />
                {!collapsed && <span>Projects</span>}
              </NavLink>

              <NavLink
                to="/tasks"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.15s ease'
                })}
              >
                <ListTodo size={15} />
                {!collapsed && <span>Tasks</span>}
              </NavLink>

              <NavLink
                to="/timesheet"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.15s ease'
                })}
              >
                <Clock size={15} />
                {!collapsed && <span>Timesheet</span>}
              </NavLink>
            </div>
          )}
        </div>
        )}

        {/* Finance - Dedicated Financial Section */}
        <div>
          <div
            onClick={() => toggleSection('finance')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '8px',
              color: isFinanceActive ? '#ffffff' : '#94a3b8',
              backgroundColor: isFinanceActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
              fontSize: '13.5px',
              fontWeight: isFinanceActive ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DollarSign size={18} color={isFinanceActive ? '#3b82f6' : '#94a3b8'} />
              {!collapsed && <span>Finance</span>}
            </div>
            {!collapsed && (
              financeExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#64748b" />
            )}
          </div>

          {/* Submenu for Finance */}
          {financeExpanded && (
            <div style={{
              marginTop: '4px',
              marginLeft: collapsed ? '0' : '16px',
              paddingLeft: collapsed ? '0' : '12px',
              borderLeft: collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <NavLink
                to="/expenses"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.15s ease'
                })}
              >
                <DollarSign size={15} />
                {!collapsed && <span>Expenses</span>}
              </NavLink>

              {isHRorAdmin && (
                <NavLink
                  to="/payroll"
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '400',
                    transition: 'all 0.15s ease'
                  })}
                >
                  <DollarSign size={15} />
                  {!collapsed && <span>Salary & Payslips</span>}
                </NavLink>
              )}
            </div>
          )}
        </div>

        {canAccessModule(currentUser, 'tickets') && (
        <NavLink
          to="/tickets"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            color: isActive ? '#ffffff' : '#94a3b8',
            backgroundColor: isActive ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
            textDecoration: 'none',
            fontSize: '13.5px',
            fontWeight: isActive ? '600' : '500',
            transition: 'all 0.15s ease'
          })}
        >
          <Ticket size={18} color={location.pathname === '/tickets' ? '#60a5fa' : '#94a3b8'} />
          {!collapsed && <span>Tickets</span>}
        </NavLink>
        )}

        {canAccessModule(currentUser, 'events') && (
        <NavLink
          to="/events"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            color: isActive ? '#ffffff' : '#94a3b8',
            backgroundColor: isActive ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
            textDecoration: 'none',
            fontSize: '13.5px',
            fontWeight: isActive ? '600' : '500',
            transition: 'all 0.15s ease'
          })}
        >
          <Calendar size={18} color={location.pathname === '/events' ? '#60a5fa' : '#94a3b8'} />
          {!collapsed && <span>Events</span>}
        </NavLink>
        )}

        <NavLink
          to="/messages"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            color: isActive ? '#ffffff' : '#94a3b8',
            backgroundColor: isActive ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
            textDecoration: 'none',
            fontSize: '13.5px',
            fontWeight: isActive ? '600' : '500',
            transition: 'all 0.15s ease'
          })}
        >
          <MessageSquare size={18} color={location.pathname === '/messages' ? '#60a5fa' : '#94a3b8'} />
          {!collapsed && <span>Messages</span>}
        </NavLink>

        <NavLink
          to="/notice-board"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            color: isActive ? '#ffffff' : '#94a3b8',
            backgroundColor: isActive ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
            textDecoration: 'none',
            fontSize: '13.5px',
            fontWeight: isActive ? '600' : '500',
            transition: 'all 0.15s ease'
          })}
        >
          <BellRing size={18} color={location.pathname === '/notice-board' ? '#60a5fa' : '#94a3b8'} />
          {!collapsed && <span>Notice Board</span>}
        </NavLink>

        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            color: isActive ? '#ffffff' : '#94a3b8',
            backgroundColor: isActive ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
            textDecoration: 'none',
            fontSize: '13.5px',
            fontWeight: isActive ? '600' : '500',
            transition: 'all 0.15s ease'
          })}
        >
          <Settings size={18} color={location.pathname === '/settings' ? '#60a5fa' : '#94a3b8'} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>

      {/* Sidebar Footer & Collapse Toggle */}
      <div style={{
        padding: collapsed ? '12px 8px' : '14px 18px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#64748b'
      }}>
        {!collapsed && <span>v5.4.0</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            margin: collapsed ? '0 auto' : '0'
          }}
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
