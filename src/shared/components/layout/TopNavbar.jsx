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
  AlertCircle,
  Key,
  Sun,
  Moon,
  MessageSquare,
  LayoutDashboard
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
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { LogoutConfirmModal } from '../modals/LogoutConfirmModal';
import { DashboardOverviewModal } from '../modals/DashboardOverviewModal';

export const TopNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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

  const { darkMode, toggleDarkMode, tickets, computedBirthdays, computedAnniversaries, totalUnreadMessagesCount = 0 } = useCRM();
  const theme = darkMode ? 'dark' : 'light';
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
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

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
  const upcomingBirthdaysList = (computedBirthdays || []).filter(b => b?.isUpcoming30Days && !b?.isToday);
  const todayAnnivList = (computedAnniversaries || []).filter(a => a?.diffDays === 0 || a?.isToday);
  const upcomingAnnivList = (computedAnniversaries || []).filter(a => a?.isUpcoming30Days && !a?.isToday);
  const totalNotifications = myPendingTasks.length + openTicketsList.length + todayBirthdaysList.length + upcomingBirthdaysList.length + todayAnnivList.length + upcomingAnnivList.length;

  // Immediate next celebration alert for header pill (prioritizing today / soonest within 14 days)
  const nextCelebration = React.useMemo(() => {
    const list = [
      ...(computedBirthdays || []).map(b => ({
        ...b,
        celeType: 'birthday',
        icon: '🎂',
        celeText: `${b.name}'s Birthday`,
        dateFormatted: b.birthdayDate
      })),
      ...(computedAnniversaries || []).map(a => ({
        ...a,
        celeType: 'anniversary',
        icon: '🌟',
        celeText: `${a.name}'s ${a.serviceYearsText || ''} Anniv`,
        dateFormatted: a.anniversaryDate || a.annivFormattedDate
      }))
    ].filter(item => item.diffDays >= 0 && item.diffDays <= 14).sort((a, b) => a.diffDays - b.diffDays);
    return list[0] || null;
  }, [computedBirthdays, computedAnniversaries]);

  // Search Results
  const filteredTasks = (tasks || []).filter(t => (t.title || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3);
  const filteredProjects = (projects || []).filter(p => (p.name || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3);
  const filteredEmployees = (employees || []).filter(e => (e.name || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3);

  const [workingMode, setWorkingMode] = useState(() => {
    return currentUser?.workMode || currentUser?.workingMode || localStorage.getItem('ems_working_mode') || 'Office';
  });

  useEffect(() => {
    const handleModeUpdate = (e) => {
      const mode = e.detail?.mode || localStorage.getItem('ems_working_mode') || 'Office';
      setWorkingMode(mode);
    };
    window.addEventListener('ems_working_mode_changed', handleModeUpdate);
    window.addEventListener('hrms_storage_change', handleModeUpdate);
    return () => {
      window.removeEventListener('ems_working_mode_changed', handleModeUpdate);
      window.removeEventListener('hrms_storage_change', handleModeUpdate);
    };
  }, []);

  const handleWorkingModeChange = (newMode) => {
    setWorkingMode(newMode);
    localStorage.setItem('ems_working_mode', newMode);
    try {
      const authSession = JSON.parse(localStorage.getItem('ems_auth_session') || '{}');
      if (authSession) {
        localStorage.setItem('ems_auth_session', JSON.stringify({ ...authSession, workingMode: newMode, workMode: newMode }));
      }
    } catch {}
    if (currentUser?._id && updateEmployee) {
      updateEmployee(currentUser._id, { ...currentUser, workingMode: newMode, workMode: newMode });
    }
    window.dispatchEvent(new CustomEvent('ems_working_mode_changed', { detail: { mode: newMode } }));
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_working_mode' } }));
    addToast(`Working mode set to: ${newMode}`, 'success');
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    authLogout();
    addToast('Logged out successfully', 'info');
    navigate('/login');
  };

  return (
    <header className="top-navbar-container h-16 min-h-16 max-h-16 shrink-0 box-border bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-[90] shadow-xs dark:shadow-md transition-colors duration-200">
      {/* ── LEFT: Clean Page Title ── */}
      <div className="flex items-center gap-2 shrink-0">
        <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 m-0 leading-none tracking-tight transition-colors duration-200">
          {pageTitle}
        </h1>
      </div>

      {/* ── RIGHT: Authentic Novainfinity Header Controls ── */}
      <div className="flex items-center gap-3 shrink-0">

        {/* ── Working Timer Widget (e.g. 02:16:05 with blue/red controls) ── */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2.5 h-[34px] transition-colors duration-200">
          <span className="font-mono text-[13.5px] font-bold text-slate-800 dark:text-slate-100 tracking-wide transition-colors duration-200">
            {timeString || '00:00:00'}
          </span>

          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-blue-500 shadow-[0_0_6px_#3b82f6]' : 'bg-slate-400'}`} />

          {/* Pause / Resume Button */}
          <button
            onClick={togglePauseResume}
            className={`w-[18px] h-[18px] rounded-full border-none text-white flex items-center justify-center cursor-pointer p-0 ${isRunning ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            title={isRunning ? 'Pause Timer' : 'Resume Timer'}
          >
            {isRunning ? <Pause size={9} fill="#fff" /> : <Play size={9} fill="#fff" />}
          </button>

          {/* Stop / Clock-out Button */}
          <button
            onClick={handleClockOut}
            className="w-[18px] h-[18px] rounded-full border-none bg-red-500 text-white flex items-center justify-center cursor-pointer p-0 hover:bg-red-600"
            title="Stop Timer / Clock Out"
          >
            <Square size={8} fill="#fff" />
          </button>
        </div>

        {/* ── 🎂 / 🌟 Celebration Countdown in Top Header ── */}
        {nextCelebration && (
          <div
            onClick={() => navigate('/calendar')}
            className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg cursor-pointer text-xs font-semibold shadow-xs transition-all duration-150 border ${nextCelebration.diffDays === 0 ? 'bg-pink-50 border-pink-200 text-pink-700' : (nextCelebration.diffDays === 1 ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-700')}`}
            title={`View on Calendar • Date: ${nextCelebration.dateFormatted}`}
          >
            <span>{nextCelebration.icon} {nextCelebration.celeText}</span>
            <span className={`text-[10px] font-extrabold py-px px-1.5 rounded-full text-white ${nextCelebration.diffDays === 0 ? 'bg-pink-600' : (nextCelebration.diffDays === 1 ? 'bg-orange-600' : 'bg-blue-600')}`}>
              {nextCelebration.diffDays === 0 ? '🎉 TODAY!' : (nextCelebration.diffDays === 1 ? `⏰ Tomorrow (${nextCelebration.dateFormatted})` : `⏳ In ${nextCelebration.diffDays}d (${nextCelebration.dateFormatted})`)}
            </span>
          </div>
        )}

        {/* ── 🔍 Quick Search Icon ── */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="w-8 h-8 rounded-md border-none bg-transparent flex items-center justify-center cursor-pointer transition-colors relative hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          title="Quick Search (Ctrl+K)"
        >
          <Search size={18} />
        </button>

        {/* ── 📅 Calendar / Events Icon ── */}
        <button
          onClick={() => navigate('/events')}
          className="w-8 h-8 rounded-md border-none bg-transparent flex items-center justify-center cursor-pointer transition-colors relative hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          title="Events & Calendar"
        >
          <Calendar size={18} />
        </button>

        {/* ── 📊 Workspace Quick Overview HUD ── */}
        <button
          onClick={() => setIsOverviewOpen(true)}
          className="w-8 h-8 rounded-md border-none bg-transparent flex items-center justify-center cursor-pointer transition-colors relative hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          title="Quick Overview & Module Switcher"
        >
          <LayoutDashboard size={18} />
        </button>

        {/* ── 💬 Team Chat / Messages Quick Launch Icon with Badge ── */}
        <button
          onClick={() => navigate('/messages')}
          className={`w-8 h-8 rounded-md border-none flex items-center justify-center cursor-pointer transition-colors relative ${
            location.pathname === '/messages'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400'
              : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Team Chat & Messages"
        >
          <MessageSquare size={18} />
          {totalUnreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full min-w-4 h-4 flex items-center justify-center px-1 border-2 border-white dark:border-slate-900 animate-pulse shadow-xs">
              {totalUnreadMessagesCount > 99 ? '99+' : totalUnreadMessagesCount}
            </span>
          )}
        </button>

        {/* ── 🔔 Notification Bell Icon with Badge ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className={`w-8 h-8 rounded-md border-none flex items-center justify-center cursor-pointer transition-colors relative ${showNotifications ? 'bg-blue-50 text-blue-600' : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title="Notifications"
          >
            <Bell size={18} />
            {totalNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-4 h-4 flex items-center justify-center px-1 border-2 border-white">
                {totalNotifications}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-[42px] right-0 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[300]">
              <div className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Notifications
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {totalNotifications} New
                </span>
              </div>

              <div className="max-h-[280px] overflow-y-auto p-1.5">
                {myPendingTasks.length > 0 && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-sky-500 mb-1">
                      ASSIGNED TASKS ({myPendingTasks.length})
                    </div>
                    {myPendingTasks.slice(0, 2).map(task => (
                      <div
                        key={task._id}
                        onClick={() => { setShowNotifications(false); navigate('/tasks'); }}
                        className="p-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        📌 {task.title}
                      </div>
                    ))}
                  </div>
                )}

                {todayBirthdaysList.length > 0 && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-pink-500 mb-1">
                      🎂 TODAY'S BIRTHDAYS
                    </div>
                    {todayBirthdaysList.map(b => (
                      <div key={b.name} className="text-xs text-slate-700 dark:text-slate-300 p-1">
                        🎉 Wish {b.name} a Happy Birthday!
                      </div>
                    ))}
                  </div>
                )}

                {upcomingBirthdaysList.length > 0 && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-orange-500 mb-1">
                      🎂 UPCOMING BIRTHDAYS (30-DAY ADVANCE)
                    </div>
                    {upcomingBirthdaysList.slice(0, 3).map(b => (
                      <div key={b.name} className="text-xs text-slate-700 dark:text-slate-300 p-1 flex justify-between">
                        <span>🎂 {b.name}</span>
                        <span className="text-[10.5px] text-orange-500 font-semibold">📅 {b.birthdayDate} (⏳ {b.diffDays}d)</span>
                      </div>
                    ))}
                  </div>
                )}

                {todayAnnivList.length > 0 && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-purple-400 mb-1">
                      🌟 TODAY'S WORK ANNIVERSARIES
                    </div>
                    {todayAnnivList.map(a => (
                      <div key={a._id || a.name} className="text-xs text-slate-700 dark:text-slate-300 p-1 flex justify-between">
                        <span>🌟 {a.name} ({a.serviceYearsText})</span>
                        <span className="text-[10.5px] text-purple-400 font-bold">🎉 TODAY!</span>
                      </div>
                    ))}
                  </div>
                )}

                {upcomingAnnivList.length > 0 && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-purple-400 mb-1">
                      🌟 UPCOMING ANNIVERSARIES (30-DAY ADVANCE)
                    </div>
                    {upcomingAnnivList.slice(0, 3).map(a => (
                      <div key={a._id || a.name} className="text-xs text-slate-700 dark:text-slate-300 p-1 flex justify-between">
                        <span>🌟 {a.name} ({a.serviceYearsText})</span>
                        <span className="text-[10.5px] text-purple-400 font-semibold">📅 {a.anniversaryDate || a.annivFormattedDate} (⏳ {a.diffDays}d)</span>
                      </div>
                    ))}
                  </div>
                )}

                {openTicketsList.length > 0 && (
                  <div className="p-2">
                    <div className="text-[11px] font-bold text-amber-600 mb-1">
                      OPEN TICKETS ({openTicketsList.length})
                    </div>
                    {openTicketsList.slice(0, 2).map(t => (
                      <div
                        key={t._id}
                        onClick={() => { setShowNotifications(false); navigate('/tickets'); }}
                        className="p-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        🎫 #{t.ticketCode || 'TCK'}: {t.subject}
                      </div>
                    ))}
                  </div>
                )}

                {totalNotifications === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── ☕ Break Status or Take Break Controls in Header ── */}
        {isOnBreak ? (
          <button
            onClick={() => setIsBreakModalOpen(true)}
            className="h-8 px-2.5 rounded-md text-xs font-bold cursor-pointer flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 transition-all duration-150 animate-pulse shadow-xs"
            title={`Currently on ${breakType || 'Break'}. Click to manage or resume work.`}
          >
            <Coffee size={14} className="text-amber-600 dark:text-amber-400" />
            <span>☕ On {breakType || 'Break'}</span>
          </button>
        ) : (
          isClockedIn && (
            <button
              onClick={() => setIsBreakModalOpen(true)}
              className="h-8 px-2.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all duration-150 shadow-xs"
              title="Take a break (Tea/Coffee, Lunch, etc.)"
            >
              <Coffee size={14} className="text-amber-600 dark:text-amber-400" />
              <span>Break</span>
            </button>
          )
        )}

        {/* ── ⏱️ Clock-in / Clock-out Shift Button ── */}
        {!isOnBreak && (
          <button
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            className={`h-8 px-2.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all duration-150 ${isClockedIn ? 'bg-emerald-50 text-green-600 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900'}`}
            title={isClockedIn ? 'Click to Clock Out shift' : 'Click to Clock In shift'}
          >
            <Clock size={14} className={isClockedIn ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'} />
            <span>{isClockedIn ? 'Clocked In' : 'Clock In'}</span>
          </button>
        )}

        {/* ── ☀️ / 🌙 Dark/Light Theme Toggle ── */}
        <button
          onClick={toggleDarkMode}
          className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors relative bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-amber-400 shadow-xs"
          title={darkMode ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
        >
          {darkMode ? (
            <Sun size={17} className="transition-transform duration-200" />
          ) : (
            <Moon size={17} className="transition-transform duration-200" />
          )}
        </button>

        {/* ── ⚙️ Settings Icon ── */}
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-md border-none bg-transparent flex items-center justify-center cursor-pointer transition-colors relative hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          title="Settings"
        >
          <Settings size={18} />
        </button>

        {/* ── 👤 User Avatar Pill (Matching 'A Work' in Novainfinity Screenshot) ── */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 cursor-pointer select-none py-0.5 px-1 rounded-full"
            title="Profile details & Working mode"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white text-sm font-bold flex items-center justify-center">
                {currentUser?.name?.charAt(0) || 'A'}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {currentUser?.name?.split(' ')[0] || 'User'}
            </span>
          </div>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute top-[42px] right-0 w-[260px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[300] p-3">
              {/* Profile Card Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-amber-600 text-white text-base font-bold flex items-center justify-center shrink-0">
                  {currentUser?.name?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 truncate">
                    {currentUser?.name || 'Avinash'}
                  </div>
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    {currentUser?.role || 'UI/UX Designer'}
                  </div>
                  <div className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                    ID: #{currentUser?.employeeCode || 'EMP-001'}
                  </div>
                </div>
              </div>

              {/* Working Mode Selector */}
              <div className="py-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  WORKING MODE
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {['Office', 'Remote', 'Hybrid'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => handleWorkingModeChange(mode)}
                      className={`p-1.5 text-xs font-semibold rounded-md border cursor-pointer transition-colors ${workingMode === mode ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Actions */}
              <div className="pt-2 flex flex-col gap-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setIsEditProfileOpen(true);
                  }}
                  className="flex items-center gap-2 py-2 px-2.5 rounded-md border-none bg-transparent text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit3 size={14} className="text-slate-500" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setIsChangePassOpen(true);
                  }}
                  className="flex items-center gap-2 py-2 px-2.5 rounded-md border-none bg-transparent text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Key size={14} className="text-sky-400" />
                  <span>Change Password</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/attendance');
                  }}
                  className="flex items-center gap-2 py-2 px-2.5 rounded-md border-none bg-transparent text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Clock size={14} className="text-slate-500" />
                  <span>My Attendance</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── ⏻ Power / Logout Icon (Matching Red Power button in Screenshot) ── */}
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-md border-none bg-transparent flex items-center justify-center cursor-pointer transition-colors relative text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          title="Log Out Account"
        >
          <Power size={18} />
        </button>
      </div>

      {/* ── Quick Search Modal (Ctrl+K) ── */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-start justify-center pt-20 z-[1000] p-4 animate-fade-in"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-[540px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-2.5">
              <Search size={18} className="text-slate-400 dark:text-sky-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tasks, projects, employees, tickets..."
                className="border-none outline-none w-full text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 px-1.5 py-0.5 rounded font-mono">
                ESC
              </span>
            </div>

            <div className="max-h-[340px] overflow-y-auto p-2">
              {filteredTasks.length > 0 && (
                <div className="mb-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1">
                    TASKS
                  </div>
                  {filteredTasks.map(t => (
                    <div
                      key={t._id}
                      onClick={() => { setShowSearchModal(false); navigate('/tasks'); }}
                      className="px-2.5 py-2 rounded-md cursor-pointer text-[13px] flex items-center gap-2 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ListTodo size={14} className="text-sky-500 shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {filteredProjects.length > 0 && (
                <div className="mb-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1">
                    PROJECTS
                  </div>
                  {filteredProjects.map(p => (
                    <div
                      key={p._id}
                      onClick={() => { setShowSearchModal(false); navigate('/projects'); }}
                      className="px-2.5 py-2 rounded-md cursor-pointer text-[13px] flex items-center gap-2 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <FolderGit2 size={14} className="text-sky-500 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {filteredEmployees.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1">
                    TEAMMATES
                  </div>
                  {filteredEmployees.map(e => (
                    <div
                      key={e._id}
                      onClick={() => { setShowSearchModal(false); navigate('/employees'); }}
                      className="px-2.5 py-2 rounded-md cursor-pointer text-[13px] flex items-center gap-2 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Users2 size={14} className="text-green-500 shrink-0" />
                      <span className="truncate">{e.name} ({e.role})</span>
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

      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
      />

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        user={currentUser}
        isShiftActive={isClockedIn}
      />

      <DashboardOverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
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
