import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Power,
  ChevronDown,
  Play,
  Pause,
  Square,
  Settings,
  Calendar,
  Clock,
  User,
  Edit3,
  Coffee,
  X,
  ListTodo,
  FolderGit2,
  Users2,
  Ticket,
  Palmtree,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTimer } from '../../context/TimerContext';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useCRM } from '../../context/CRMContext';
import { useWork } from '../../../modules/work/context/WorkContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// Modals
import { EditProfileModal } from '../modals/EditProfileModal';
import { BreakModal } from '../modals/BreakModal';
import { AddTaskModal } from '../../../modules/work/components/tasks/AddTaskModal';
import { AddProjectModal } from '../../../modules/work/components/projects/AddProjectModal';
import { RaiseTicketModal } from '../modals/RaiseTicketModal';
import { NewLeaveModal } from '../../../modules/hr/components/leaves/NewLeaveModal';
import { AddLeadModal } from '../../../modules/crm/components/leads/AddLeadModal';

export const TopNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const {
    timeString,
    isRunning,
    isClockedIn,
    isOnBreak,
    breakType,
    togglePauseResume,
    handleClockIn,
    handleClockOut
  } = useTimer();

  const { currentUser: authUser, logout: authLogout, switchRole } = useAuth();
  const { currentUser: hrUser, leaves, employees, updateEmployee } = useHR();
  const currentUser = authUser || hrUser;

  const currentSystemRole = (currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.role?.toLowerCase().includes('admin'))
    ? 'admin'
    : (currentUser?.systemRole === 'hr' || currentUser?.role?.toLowerCase().includes('hr') ? 'hr' : 'employee');

  const { tickets, computedBirthdays } = useCRM();
  const { tasks, projects } = useWork();

  // Dropdown States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isRaiseTicketOpen, setIsRaiseTicketOpen] = useState(false);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute Page Title & Breadcrumb matching screenshots
  const getBreadcrumbInfo = (pathname) => {
    if (pathname.startsWith('/leaves')) return { title: 'Leaves', breadcrumb: 'Home • Leaves' };
    if (pathname.startsWith('/attendance')) return { title: 'Attendance', breadcrumb: 'Home • Attendance' };
    if (pathname.startsWith('/holiday')) return { title: 'Holidays', breadcrumb: 'Home • Holidays' };
    if (pathname.startsWith('/appreciation')) return { title: 'Appreciation', breadcrumb: 'Home • Appreciation' };
    if (pathname.startsWith('/documents')) return { title: 'Documents', breadcrumb: 'Home • Documents' };
    if (pathname.startsWith('/projects')) return { title: 'Projects', breadcrumb: 'Home • Projects' };
    if (pathname.startsWith('/tasks')) return { title: 'Tasks', breadcrumb: 'Home • Tasks' };
    if (pathname.startsWith('/timesheet')) return { title: 'Timesheet', breadcrumb: 'Home • Timesheet' };
    if (pathname.startsWith('/expenses') || pathname.startsWith('/finance')) return { title: 'Expenses', breadcrumb: 'Home • Expenses' };
    if (pathname.startsWith('/payroll')) return { title: 'Salary & Payslips', breadcrumb: 'Home • Salary & Payslips' };
    if (pathname.startsWith('/leads') || pathname.startsWith('/lead-contact')) return { title: 'Lead Contacts', breadcrumb: 'Home • Lead Contacts' };
    if (pathname.startsWith('/tickets')) return { title: 'Tickets', breadcrumb: 'Home • Tickets' };
    if (pathname.startsWith('/events')) return { title: 'Events', breadcrumb: 'Home • Events' };
    if (pathname.startsWith('/messages')) return { title: 'Messages', breadcrumb: 'Home • Messages' };
    if (pathname.startsWith('/notice-board')) return { title: 'Notice Board', breadcrumb: 'Home • Notice Board' };
    if (pathname.startsWith('/settings')) return { title: 'Settings', breadcrumb: 'Home • Settings' };
    if (pathname.startsWith('/employees')) return { title: 'Employees', breadcrumb: 'Home • Employees' };
    return { title: 'Dashboard', breadcrumb: 'Home • Dashboard' };
  };

  const { title: pageTitle, breadcrumb: pageBreadcrumb } = getBreadcrumbInfo(location.pathname);

  // Notifications calculation
  const myPendingTasks = (tasks || []).filter(t => (t?.assignedToId === currentUser?._id || t?.assignedToName === currentUser?.name) && t?.status !== 'completed');
  const openTicketsList = (tickets || []).filter(t => t?.status === 'open' || t?.status === 'pending');
  const todayBirthdaysList = (computedBirthdays || []).filter(b => b?.diffDays === 0 || b?.isToday);
  const totalNotifications = myPendingTasks.length + openTicketsList.length + (todayBirthdaysList.length > 0 ? 1 : 0);

  // Search Results
  const filteredTasks = (tasks || []).filter(t => (t.title || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3);
  const filteredProjects = (projects || []).filter(p => (p.name || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3);
  const filteredEmployees = (employees || []).filter(e => (e.name || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3);

  const workingMode = currentUser?.workingMode || localStorage.getItem('ems_working_mode') || 'Office';

  const handleWorkingModeChange = (newMode) => {
    localStorage.setItem('ems_working_mode', newMode);
    if (currentUser?._id) {
      updateEmployee(currentUser._id, { ...currentUser, workingMode: newMode });
    }
    addToast(`Working mode set to: ${newMode}`, 'success');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      authLogout();
      addToast('Logged out successfully', 'info');
      navigate('/login');
    }
  };

  return (
    <header style={{
      height: '60px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      {/* ── LEFT: Title & Breadcrumbs matching Novainfinity Screenshots ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h1 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#1e293b',
          margin: 0,
          letterSpacing: '-0.01em'
        }}>
          {pageTitle}
        </h1>
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
          {pageBreadcrumb}
        </span>
      </div>

      {/* ── RIGHT: Authentic Novainfinity Header Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* ── Direct 1-Click Role Switcher (Always available for testing & perspective demo) ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f1f5f9',
          padding: '2px',
          borderRadius: '20px',
          border: '1.5px solid #cbd5e1',
          gap: '2px'
        }}>
          {[
            { id: 'admin', label: 'Admin', icon: '👑', color: '#7c3aed' },
            { id: 'hr', label: 'HR', icon: '💼', color: '#0284c7' },
            { id: 'employee', label: 'Employee', icon: '👤', color: '#16a34a' }
          ].map(r => {
            const isSelected = currentSystemRole === r.id;
            return (
              <button
                key={r.id}
                id={`switch-role-${r.id}`}
                onClick={async () => {
                  try {
                    await switchRole(r.id);
                    addToast(`Switched perspective to ${r.label} mode`, 'success');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? r.color : '#64748b',
                  fontWeight: isSelected ? '800' : '600',
                  fontSize: '11px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title={`Try/Switch perspective to ${r.label}`}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Working Timer Widget (e.g. 02:16:05 with blue/red controls) ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '4px 10px',
          height: '34px'
        }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '13.5px',
            fontWeight: '700',
            color: '#1e293b',
            letterSpacing: '0.02em'
          }}>
            {timeString || '00:00:00'}
          </span>

          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isRunning ? '#3b82f6' : '#94a3b8',
            boxShadow: isRunning ? '0 0 6px #3b82f6' : 'none'
          }} />

          {/* Pause / Resume Button */}
          <button
            onClick={togglePauseResume}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isRunning ? '#3b82f6' : '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0
            }}
            title={isRunning ? 'Pause Timer' : 'Resume Timer'}
          >
            {isRunning ? <Pause size={9} fill="#fff" /> : <Play size={9} fill="#fff" />}
          </button>

          {/* Stop / Clock-out Button */}
          <button
            onClick={handleClockOut}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0
            }}
            title="Stop Timer / Clock Out"
          >
            <Square size={8} fill="#fff" />
          </button>
        </div>

        {/* ── 🔍 Quick Search Icon ── */}
        <button
          onClick={() => setShowSearchModal(true)}
          style={iconButtonStyle}
          title="Quick Search (Ctrl+K)"
        >
          <Search size={18} color="#64748b" />
        </button>

        {/* ── 📅 Calendar / Events Icon ── */}
        <button
          onClick={() => navigate('/events')}
          style={iconButtonStyle}
          title="Events & Calendar"
        >
          <Calendar size={18} color="#64748b" />
        </button>

        {/* ── 🔔 Notification Bell Icon with Badge ── */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            style={{
              ...iconButtonStyle,
              backgroundColor: showNotifications ? '#eff6ff' : 'transparent'
            }}
            title="Notifications"
          >
            <Bell size={18} color={showNotifications ? '#2563eb' : '#64748b'} />
            {totalNotifications > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '700',
                borderRadius: '10px',
                minWidth: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid #ffffff'
              }}>
                {totalNotifications}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '42px',
              right: 0,
              width: '320px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              zIndex: 300
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  Notifications
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {totalNotifications} New
                </span>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '6px' }}>
                {myPendingTasks.length > 0 && (
                  <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', marginBottom: '4px' }}>
                      ASSIGNED TASKS ({myPendingTasks.length})
                    </div>
                    {myPendingTasks.slice(0, 2).map(task => (
                      <div
                        key={task._id}
                        onClick={() => { setShowNotifications(false); navigate('/tasks'); }}
                        style={{ padding: '6px', fontSize: '12px', color: '#334155', cursor: 'pointer', borderRadius: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        📌 {task.title}
                      </div>
                    ))}
                  </div>
                )}

                {todayBirthdaysList.length > 0 && (
                  <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#db2777', marginBottom: '4px' }}>
                      🎂 TODAY'S BIRTHDAYS
                    </div>
                    {todayBirthdaysList.map(b => (
                      <div key={b.name} style={{ fontSize: '12px', color: '#334155', padding: '4px' }}>
                        🎉 Wish {b.name} a Happy Birthday!
                      </div>
                    ))}
                  </div>
                )}

                {openTicketsList.length > 0 && (
                  <div style={{ padding: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#d97706', marginBottom: '4px' }}>
                      OPEN TICKETS ({openTicketsList.length})
                    </div>
                    {openTicketsList.slice(0, 2).map(t => (
                      <div
                        key={t._id}
                        onClick={() => { setShowNotifications(false); navigate('/tickets'); }}
                        style={{ padding: '6px', fontSize: '12px', color: '#334155', cursor: 'pointer', borderRadius: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        🎫 #{t.ticketCode || 'TCK'}: {t.subject}
                      </div>
                    ))}
                  </div>
                )}

                {totalNotifications === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', fontSize: '12.5px', color: '#94a3b8' }}>
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── ⏱️ Clock-in / Clock-out Shift Button ── */}
        <button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          style={{
            height: '32px',
            padding: '0 10px',
            borderRadius: '7px',
            border: 'none',
            backgroundColor: isClockedIn ? '#f0fdf4' : '#eff6ff',
            color: isClockedIn ? '#16a34a' : '#2563eb',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          title={isClockedIn ? 'Click to Clock Out shift' : 'Click to Clock In shift'}
        >
          <Clock size={14} />
          <span>{isClockedIn ? 'Clocked In' : 'Clock In'}</span>
        </button>

        {/* ── ⚙️ Settings Icon ── */}
        <button
          onClick={() => navigate('/settings')}
          style={iconButtonStyle}
          title="Settings"
        >
          <Settings size={18} color="#64748b" />
        </button>

        {/* ── 👤 User Avatar Pill (Matching 'A Work' in Novainfinity Screenshot) ── */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '2px 4px',
              borderRadius: '20px'
            }}
            title="Profile details & Working mode"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid #e2e8f0'
                }}
              />
            ) : (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#d97706',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {currentUser?.name?.charAt(0) || 'A'}
              </div>
            )}
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              Work
            </span>
          </div>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '42px',
              right: 0,
              width: '260px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              zIndex: 300,
              padding: '12px'
            }}>
              {/* Profile Card Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingBottom: '12px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {currentUser?.name?.charAt(0) || 'A'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser?.name || 'Avinash'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {currentUser?.role || 'UI/UX Designer'}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '1px' }}>
                    ID: #{currentUser?.employeeCode || 'EMP-001'}
                  </div>
                </div>
              </div>

              {/* Working Mode Selector */}
              <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                  WORKING MODE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                  {['Office', 'Remote', 'Hybrid'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => handleWorkingModeChange(mode)}
                      style={{
                        padding: '5px',
                        fontSize: '11px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        border: workingMode === mode ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: workingMode === mode ? '#eff6ff' : '#ffffff',
                        color: workingMode === mode ? '#1d4ed8' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Actions */}
              <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setIsEditProfileOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Edit3 size={14} color="#64748b" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/attendance');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Clock size={14} color="#64748b" />
                  <span>My Attendance</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── ⏻ Power / Logout Icon (Matching Red Power button in Screenshot) ── */}
        <button
          onClick={handleLogout}
          style={{
            ...iconButtonStyle,
            color: '#64748b'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          title="Log Out Account"
        >
          <Power size={18} />
        </button>
      </div>

      {/* ── Quick Search Modal (Ctrl+K) ── */}
      {showSearchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '80px',
          zIndex: 1000
        }}
        onClick={() => setShowSearchModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid #e2e8f0',
              gap: '10px'
            }}>
              <Search size={18} color="#94a3b8" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tasks, projects, employees, tickets..."
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '14px',
                  color: '#1e293b'
                }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                ESC
              </span>
            </div>

            <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '8px' }}>
              {filteredTasks.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', padding: '4px 8px' }}>
                    TASKS
                  </div>
                  {filteredTasks.map(t => (
                    <div
                      key={t._id}
                      onClick={() => { setShowSearchModal(false); navigate('/tasks'); }}
                      style={{ padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <ListTodo size={14} color="#2563eb" />
                      <span>{t.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {filteredProjects.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', padding: '4px 8px' }}>
                    PROJECTS
                  </div>
                  {filteredProjects.map(p => (
                    <div
                      key={p._id}
                      onClick={() => { setShowSearchModal(false); navigate('/projects'); }}
                      style={{ padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FolderGit2 size={14} color="#0284c7" />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {filteredEmployees.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', padding: '4px 8px' }}>
                    TEAMMATES
                  </div>
                  {filteredEmployees.map(e => (
                    <div
                      key={e._id}
                      onClick={() => { setShowSearchModal(false); navigate('/employees'); }}
                      style={{ padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Users2 size={14} color="#16a34a" />
                      <span>{e.name} ({e.role})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      <BreakModal
        isOpen={isBreakModalOpen}
        onClose={() => setIsBreakModalOpen(false)}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
      />

      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
      />

      <RaiseTicketModal
        isOpen={isRaiseTicketOpen}
        onClose={() => setIsRaiseTicketOpen(false)}
      />

      <NewLeaveModal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
      />

      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
      />
    </header>
  );
};

const iconButtonStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  position: 'relative'
};
