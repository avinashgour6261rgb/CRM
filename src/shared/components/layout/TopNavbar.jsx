import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Plus,
  Power,
  Maximize2,
  Minimize2,
  ChevronDown,
  Play,
  Pause,
  Square,
  Sparkles,
  CheckCircle2,
  Settings,
  LayoutGrid,
  Video,
  X,
  LogOut,
  User,
  HelpCircle,
  Keyboard,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Users2, Edit3, Moon, Sun, Coffee, ListTodo, FolderGit2, Ticket, Palmtree, Check, StickyNote, Calendar as CalendarIcon, FileText, Trash2, ShieldAlert } from 'lucide-react';
import { useTimer } from '../../context/TimerContext';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useCRM } from '../../context/CRMContext';
import { useWork } from '../../../modules/work/context/WorkContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { isHRorAdmin, canApproveLeaves } from '../../utils/permissionUtils';
import { clearAllDummyData } from '../../services/storageService';
import { AddEmployeeModal } from '../../../modules/hr/components/employees/AddEmployeeModal';
import { EmployeeDirectoryModal } from '../../../modules/hr/components/employees/EmployeeDirectoryModal';
import { EditProfileModal } from '../modals/EditProfileModal';
import { BreakModal } from '../modals/BreakModal';
import { AddTaskModal } from '../../../modules/work/components/tasks/AddTaskModal';
import { AddProjectModal } from '../../../modules/work/components/projects/AddProjectModal';
import { RaiseTicketModal } from '../modals/RaiseTicketModal';
import { NewLeaveModal } from '../../../modules/hr/components/leaves/NewLeaveModal';
import { AddLeadModal } from '../../../modules/crm/components/leads/AddLeadModal';
import { AddEventModal } from '../modals/AddEventModal';
import { StickyNotesModal } from '../modals/StickyNotesModal';
import { ScreenRecorderModal } from '../modals/ScreenRecorderModal';

export const TopNavbar = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const {
    timeString,
    isRunning,
    isClockedIn,
    isOnBreak,
    breakType,
    currentBreakTimeString,
    loginTime,
    hadClockedOutToday,
    reclockStatus,
    togglePauseResume,
    handleClockOut,
    handleClockIn,
    startTeaBreak,
    resumeFromBreak,
    requestReclockIn
  } = useTimer();
  const { currentUser: authUser, role: activeRole, roleConfig: activeRoleConfig, switchRole, switchUser, logout: authLogout } = useAuth();
  const { currentUser: hrUser, leaves, employees, updateLeaveStatus } = useHR();
  const currentUser = authUser || hrUser;
  const { darkMode, toggleDarkMode, tickets, events, leads, notices, computedBirthdays, computedAnniversaries } = useCRM();
  const { tasks, projects, activeRunningTask, startTaskTimer, pauseTaskTimer, stopTaskTimer, formatSeconds } = useWork();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Real Screen Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState('');
  const [isRecorderModalOpen, setIsRecorderModalOpen] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEmpOpen, setIsAddEmpOpen] = useState(false);
  const [isEmpDirectoryOpen, setIsEmpDirectoryOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [isStickyNotesOpen, setIsStickyNotesOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [crmMode, setCrmMode] = useState(() => localStorage.getItem('ems_app_mode') || 'crm');

  // Quick Action Modals
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isRaiseTicketOpen, setIsRaiseTicketOpen] = useState(false);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  const quickCreateRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const isUserAdminOrHR = isHRorAdmin(currentUser);

  // Pending leaves that THIS user is authorized to review (must NOT be the applicant)
  const pendingLeavesForReview = (leaves || []).filter(l => {
    if (l?.status !== 'pending') return false;
    const isApplicant = (l.employeeId && currentUser?._id && l.employeeId === currentUser._id) ||
      (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    if (isApplicant) return false;

    if (isUserAdminOrHR) return true;
    if (canApproveLeaves(currentUser)) {
      return (l.appliedToId && l.appliedToId === currentUser?._id) ||
        (l.appliedToName && currentUser?.name && l.appliedToName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    }
    return false;
  });

  // Pending leaves submitted by THIS user awaiting manager/HR approval
  const myPendingLeavesList = (leaves || []).filter(l => {
    if (l?.status !== 'pending') return false;
    const isApplicant = (l.employeeId && currentUser?._id && l.employeeId === currentUser._id) ||
      (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    return isApplicant;
  });

  const myPendingTasks = (tasks || []).filter(t => (t?.assignedToId === currentUser?._id || t?.assignedToName === currentUser?.name) && t?.status !== 'completed');
  const openTicketsList = (tickets || []).filter(t => t?.status === 'open' || t?.status === 'pending');
  const todayBirthdaysList = (computedBirthdays || []).filter(b => b?.diffDays === 0 || b?.isToday || b?.daysRemaining === 0);
  const upcomingAnniversariesList = (computedAnniversaries || []).filter(a => a?.diffDays >= 0 && a?.diffDays <= 30);
  const totalNotifications = pendingLeavesForReview.length + myPendingLeavesList.length + myPendingTasks.length + openTicketsList.length + (todayBirthdaysList.length > 0 ? 1 : 0) + (upcomingAnniversariesList.length > 0 ? 1 : 0);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(e.target)) {
        setShowQuickCreate(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Global shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
      if (e.key === 'Escape') {
        setSearchFocused(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
        setShowQuickCreate(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Direct CRM Window / Screen Recording Handlers ──
  const startScreenRecording = async () => {
    try {
      recordedChunksRef.current = [];
      setRecordingSeconds(0);

      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        // Direct browser display options configured to prioritize this CRM window/tab
        const displayOptions = {
          video: {
            cursor: 'always',
            displaySurface: 'browser'
          },
          audio: true,
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'include',
          systemAudio: 'include'
        };

        const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions);

        mediaStreamRef.current = stream;

        let mimeType = 'video/webm;codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedVideoBlob(blob);
          setRecordedVideoUrl(url);
          setIsRecorderModalOpen(true);
          setIsRecording(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          stream.getTracks().forEach(track => track.stop());
        };

        stream.getVideoTracks()[0].onended = () => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        };

        recorder.start(1000);
        setIsRecording(true);

        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);

        addToast('🎥 CRM Window recording started! Recording active...', 'info');
      } else {
        // Fallback simulation for unsupported environments
        setIsRecording(true);
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
        addToast('🎥 CRM Window recording started (Simulated).', 'info');
      }
    } catch (err) {
      console.warn('Screen recording cancelled or failed:', err);
      if (err.name !== 'NotAllowedError') {
        addToast('Screen recording was cancelled or not supported.', 'info');
      }
    }
  };

  const stopScreenRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Create fallback sample blob
      const dummyBlob = new Blob(['EMS_DEMO_SCREEN_RECORDING'], { type: 'video/webm' });
      setRecordedVideoBlob(dummyBlob);
      setRecordedVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      setIsRecorderModalOpen(true);
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header style={{
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 90,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      gap: '16px'
    }}>

      {/* ───────── LEFT: Search Bar with Live Global Search Dropdown ───────── */}
      <div style={{ position: 'relative' }} ref={searchRef}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: searchFocused ? '#ffffff' : '#f1f5f9',
          borderRadius: '10px',
          padding: '0 14px',
          width: '300px',
          height: '38px',
          border: searchFocused ? '1.5px solid #2563eb' : '1.5px solid transparent',
          boxShadow: searchFocused ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}>
          <Search size={15} color={searchFocused ? '#2563eb' : '#94a3b8'} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search employees, tasks, leads..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#1e293b',
              width: '100%',
              fontFamily: 'inherit'
            }}
          />
          {searchQuery ? (
            <X
              size={14}
              color="#64748b"
              style={{ cursor: 'pointer' }}
              onClick={() => setSearchQuery('')}
            />
          ) : (
            <kbd
              onClick={() => {
                searchInputRef.current?.focus();
                setSearchFocused(true);
              }}
              style={{
                display: searchFocused ? 'none' : 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '10px',
                color: '#94a3b8',
                background: '#e2e8f0',
                borderRadius: '4px',
                padding: '2px 5px',
                fontFamily: 'JetBrains Mono, monospace',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              Ctrl K
            </kbd>
          )}
        </div>

        {/* Live Search Results Floating Panel */}
        {searchFocused && searchQuery.trim().length > 0 && (
          <div style={{
            position: 'absolute',
            top: '44px',
            left: 0,
            width: '360px',
            maxHeight: '380px',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
            zIndex: 300,
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', padding: '4px 8px', textTransform: 'uppercase' }}>
              Search Results ({searchQuery})
            </div>

            {/* Matching Employees */}
            {(employees || []).filter(e => (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (e.role || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 2).map(e => (
              <div
                key={e._id}
                onClick={() => {
                  setSearchQuery('');
                  setSearchFocused(false);
                  navigate('/leaves');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc'
                }}
              >
                <img src={e.avatar} alt={e.name} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{e.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{e.role} • Employee</div>
                </div>
              </div>
            ))}

            {/* Matching Tasks */}
            {(tasks || []).filter(t => (t.title || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 2).map(t => (
              <div
                key={t._id}
                onClick={() => {
                  setSearchQuery('');
                  setSearchFocused(false);
                  navigate('/tasks');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#eff6ff'
                }}
              >
                <ListTodo size={16} color="#2563eb" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{t.title}</div>
                  <div style={{ fontSize: '11px', color: '#2563eb' }}>Task #{t.taskCode || '001'} • {t.status}</div>
                </div>
              </div>
            ))}

            {/* Matching Leads */}
            {(leads || []).filter(l => (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (l.companyName || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 2).map(l => (
              <div
                key={l._id}
                onClick={() => {
                  setSearchQuery('');
                  setSearchFocused(false);
                  navigate('/leads');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#f0fdf4'
                }}
              >
                <Users2 size={16} color="#16a34a" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{l.name}</div>
                  <div style={{ fontSize: '11px', color: '#16a34a' }}>Lead • {l.companyName}</div>
                </div>
              </div>
            ))}

            {/* Matching Tickets */}
            {(tickets || []).filter(t => (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 2).map(t => (
              <div
                key={t._id}
                onClick={() => {
                  setSearchQuery('');
                  setSearchFocused(false);
                  navigate('/tickets');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#fef3c7'
                }}
              >
                <Ticket size={16} color="#d97706" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{t.subject}</div>
                  <div style={{ fontSize: '11px', color: '#d97706' }}>Ticket #{t.ticketCode} • {t.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ───────── RIGHT: All Controls ───────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

        {/* ── Active Running Task Timer Pill (Live Tracking for Employee Tasks) ── */}
        {activeRunningTask ? (
          <div
            onClick={() => navigate('/tasks')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#eff6ff',
              border: '1.5px solid #93c5fd',
              borderRadius: '10px',
              padding: '4px 10px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.15)',
              transition: 'all 0.15s ease'
            }}
            title={`Active Task: #${activeRunningTask.taskCode} ${activeRunningTask.title}. Click to view Tasks.`}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              boxShadow: '0 0 6px #2563eb',
              flexShrink: 0
            }} />
            <span style={{
              fontSize: '11.5px',
              fontWeight: '800',
              color: '#1e40af',
              maxWidth: '110px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              #{activeRunningTask.taskCode || 'TSK'}: {activeRunningTask.title}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              fontWeight: '800',
              color: '#1d4ed8',
              backgroundColor: '#dbeafe',
              padding: '1px 5px',
              borderRadius: '4px'
            }}>
              {formatSeconds(activeRunningTask.timerSeconds || 0)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                pauseTaskTimer(activeRunningTask._id);
              }}
              title="Pause Task Timer"
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '5px',
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Pause size={10} fill="#fff" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopTaskTimer(activeRunningTask._id);
              }}
              title="Stop Task Timer & Log to Timesheet"
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '5px',
                border: 'none',
                background: '#dc2626',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Square size={9} fill="#fff" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (!isClockedIn) {
                addToast('⚠️ Shift is not clocked in! Please Clock In above before starting task timers.', 'warning');
                return;
              }
              if (isOnBreak) {
                addToast('☕ You are currently on break. Please resume work before starting task timers!', 'warning');
                return;
              }
              const firstIncomplete = (tasks || []).find(t => t.status !== 'completed');
              if (firstIncomplete) {
                startTaskTimer(firstIncomplete._id);
              } else {
                navigate('/tasks');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '9px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Start tracking time on assigned task"
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            <Play size={11} color="#2563eb" fill="#2563eb" />
            <span>Task Timer</span>
          </button>
        )}

        {/* ── Real-Life Enterprise Quick Create Dropdown ── */}
        <div style={{ position: 'relative' }} ref={quickCreateRef}>
          <button
            onClick={() => setShowQuickCreate(!showQuickCreate)}
            style={{
              height: '36px',
              fontSize: '13px',
              fontWeight: '600',
              padding: '0 14px',
              gap: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={15} />
            <span>Create</span>
            <ChevronDown size={13} style={{ opacity: 0.8 }} />
          </button>

          {showQuickCreate && (
            <div style={{
              position: 'absolute',
              top: '44px',
              right: '0',
              width: '210px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              zIndex: 250,
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <div
                onClick={() => { setShowQuickCreate(false); setIsAddLeadOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#1e293b'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Users2 size={16} color="#0284c7" />
                <span>New Lead Contact</span>
              </div>

              <div
                onClick={() => { setShowQuickCreate(false); setIsAddTaskOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#1e293b'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ListTodo size={16} color="#2563eb" />
                <span>New Task</span>
              </div>

              <div
                onClick={() => { setShowQuickCreate(false); setIsAddProjectOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#1e293b'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FolderGit2 size={16} color="#0284c7" />
                <span>New Project</span>
              </div>

              <div
                onClick={() => { setShowQuickCreate(false); setIsRaiseTicketOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#1e293b'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Ticket size={16} color="#d97706" />
                <span>Raise Ticket</span>
              </div>

              <div
                onClick={() => { setShowQuickCreate(false); setIsAddEventOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#1e293b'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <CalendarIcon size={16} color="#2563eb" />
                <span>Create Event</span>
              </div>

              <div
                onClick={() => { setShowQuickCreate(false); setIsStickyNotesOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#1e293b'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <StickyNote size={16} color="#eab308" />
                <span>New Sticky Note</span>
              </div>

              <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />

              <div
                onClick={() => { setShowQuickCreate(false); setIsApplyLeaveOpen(true); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#1e293b'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Palmtree size={16} color="#16a34a" />
                <span>Apply for Leave</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Separator ── */}
        <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 4px' }} />

        {/* ── Sticky Notes Drawer Button ── */}
        <button
          className="navbar-icon-btn"
          title="Sticky Notes"
          onClick={() => setIsStickyNotesOpen(true)}
          style={{
            ...navBtnStyle,
            backgroundColor: isStickyNotesOpen ? '#fef9c3' : 'transparent',
            border: isStickyNotesOpen ? '1px solid #fde047' : '1px solid transparent'
          }}
        >
          <StickyNote size={18} color="#eab308" />
        </button>

        {/* ── Screen Recording Toggle & Live Status ── */}
        {isRecording ? (
          <div
            onClick={stopScreenRecording}
            title="Click to Stop & Preview Recording"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 12px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'inline-block'
            }} />
            <span style={{
              fontSize: '12.5px',
              fontWeight: '700',
              color: '#dc2626',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              REC {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '4px',
              marginLeft: '2px'
            }}>
              Stop
            </span>
          </div>
        ) : (
          <button
            className="navbar-icon-btn"
            title="Start Screen Recording"
            onClick={startScreenRecording}
            style={navBtnStyle}
          >
            <Video size={18} color="#64748b" />
          </button>
        )}

        {/* ── Direct 1-Click Dark/Light Mode Toggle ── */}
        <button
          className="navbar-icon-btn"
          title={darkMode ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
          onClick={toggleDarkMode}
          style={{
            ...navBtnStyle,
            backgroundColor: darkMode ? '#1e293b' : 'transparent',
            borderColor: darkMode ? '#334155' : 'transparent'
          }}
        >
          {darkMode
            ? <Sun size={18} color="#f59e0b" />
            : <Moon size={18} color="#64748b" />
          }
        </button>

        {/* ── Fullscreen Toggle ── */}
        <button
          className="navbar-icon-btn"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          onClick={toggleFullscreen}
          style={navBtnStyle}
        >
          {isFullscreen
            ? <Minimize2 size={18} color="#64748b" />
            : <Maximize2 size={18} color="#64748b" />
          }
        </button>

        {/* ── Notifications Bell ── */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            title="Notifications"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            style={{
              ...navBtnStyle,
              background: showNotifications ? '#eff6ff' : 'transparent',
              border: showNotifications ? '1px solid #bfdbfe' : '1px solid transparent',
              position: 'relative'
            }}
          >
            <Bell size={18} color={showNotifications ? '#2563eb' : '#64748b'} />
            {totalNotifications > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '16px',
                height: '16px',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: '800',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff',
                lineHeight: 1
              }}>
                {totalNotifications > 9 ? '9+' : totalNotifications}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: '0',
              width: '340px',
              background: '#ffffff',
              borderRadius: '14px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              zIndex: 200,
              animation: 'fadeIn 0.18s ease'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: '1px solid #f1f5f9',
                background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={15} color="#0f172a" />
                  <span style={{ fontWeight: '700', fontSize: '13.5px', color: '#0f172a' }}>
                    Notifications
                  </span>
                  <span style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}>
                    {totalNotifications}
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    padding: '2px'
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Notification Items */}
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {/* 1. Real-time Dynamic Pending Leaves For Review (Admin / Designated Manager Review) */}
                {pendingLeavesForReview.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#d97706', padding: '8px 16px 4px 16px', background: '#fffbeb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      ⏳ Pending Leaves To Review ({pendingLeavesForReview.length})
                    </div>
                    {pendingLeavesForReview.map((leave) => (
                      <div
                        key={leave._id}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          borderBottom: '1px solid #f1f5f9',
                          background: '#fffdf5',
                          transition: 'background 0.15s'
                        }}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          {leave.employeeAvatar ? (
                            <img
                              src={leave.employeeAvatar}
                              alt={leave.employeeName}
                              style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #fed7aa' }}
                            />
                          ) : (
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: '#fef3c7',
                              color: '#d97706',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px'
                            }}>
                              {leave.employeeName?.charAt(0) || 'L'}
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '12.5px', color: '#0f172a' }}>
                              {leave.employeeName}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#fef3c7',
                              color: '#d97706'
                            }}>
                              Pending Review
                            </span>
                          </div>

                          <div style={{ color: '#475569', fontSize: '11.5px', marginTop: '2px' }}>
                            <strong>{leave.leaveType}</strong> ({leave.durationText})
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                            📅 {leave.startDate} {leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}
                          </div>
                          {leave.appliedToName && (
                            <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px', fontWeight: '600' }}>
                              👤 Reviewer: {leave.appliedToName}
                            </div>
                          )}
                          {leave.reason && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>
                              "{leave.reason}"
                            </div>
                          )}

                          {/* Quick 1-Click Accept / Deny Action Bar */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await updateLeaveStatus(leave._id, 'approved');
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(22,163,74,0.25)'
                              }}
                              title="Accept & Approve leave"
                            >
                              <Check size={12} />
                              Accept
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const reason = prompt('Optional reason for denying leave:', 'Schedule requirement');
                                if (reason !== null) {
                                  await updateLeaveStatus(leave._id, 'rejected', reason);
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Deny / Reject leave request"
                            >
                              <X size={12} />
                              Deny
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 1b. My Own Submitted Leaves Awaiting Review */}
                {myPendingLeavesList.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', padding: '8px 16px 4px 16px', background: '#f0f9ff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📋 My Leave Applications ({myPendingLeavesList.length})
                    </div>
                    {myPendingLeavesList.map((leave) => (
                      <div
                        key={leave._id}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          borderBottom: '1px solid #f1f5f9',
                          background: '#f8fafc'
                        }}
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: '#e0f2fe',
                          color: '#0284c7',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          <Palmtree size={18} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '12.5px', color: '#0f172a' }}>
                              {leave.leaveType}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#fef3c7',
                              color: '#d97706',
                              border: '1px solid #fde68a'
                            }}>
                              ⏳ Awaiting Approval
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            📅 {leave.startDate} {leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''} • ({leave.durationText})
                          </div>
                          <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '1px', fontWeight: '600' }}>
                            👤 Assigned Reviewer: {leave.appliedToName || 'HR Admin'}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Cancel your pending leave request?')) {
                                  await updateLeaveStatus(leave._id, 'rejected', 'Cancelled by applicant');
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={11} /> Cancel Request
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. My Assigned Active Tasks */}
                {myPendingTasks.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', padding: '8px 16px 4px 16px', background: '#eff6ff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📋 Assigned Tasks ({myPendingTasks.length})
                    </div>
                    {myPendingTasks.slice(0, 3).map((task) => (
                      <div
                        key={task._id}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate('/tasks');
                        }}
                        style={{
                          padding: '10px 16px',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#dbeafe',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <ListTodo size={15} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '12.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            #{task.taskCode || 'TSK-1'} • Due: {task.dueDate || 'Today'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Open Support Tickets */}
                {openTicketsList.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#ea580c', padding: '8px 16px 4px 16px', background: '#fff7ed', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🎫 Support Tickets ({openTicketsList.length})
                    </div>
                    {openTicketsList.slice(0, 2).map((ticket) => (
                      <div
                        key={ticket._id}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate('/tickets');
                        }}
                        style={{
                          padding: '10px 16px',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#ffedd5',
                          color: '#ea580c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Ticket size={15} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '12.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ticket.subject}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            #{ticket.ticketCode} • {ticket.priority} priority
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Today's Birthdays */}
                {todayBirthdaysList.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#db2777', padding: '8px 16px 4px 16px', background: '#fdf2f8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🎂 Birthday Celebrations
                    </div>
                    {todayBirthdaysList.map((bday) => (
                      <div
                        key={bday._id || bday.name}
                        style={{
                          padding: '10px 16px',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          background: '#fff5f7'
                        }}
                      >
                        <img src={bday.avatar} alt={bday.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '12.5px', color: '#9d174d' }}>
                            {bday.name}'s Birthday! 🎉
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {bday.role}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToast(`🎉 Birthday wishes sent to ${bday.name}!`, 'success');
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: '#db2777',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Wish 🎂
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. Work Anniversary Celebrations */}
                {upcomingAnniversariesList.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed', padding: '8px 16px 4px 16px', background: '#faf5ff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🌟 Work Anniversaries ({upcomingAnniversariesList.length})
                    </div>
                    {upcomingAnniversariesList.slice(0, 3).map((anniv) => (
                      <div
                        key={anniv._id || anniv.name}
                        style={{
                          padding: '10px 16px',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          borderBottom: '1px solid #f1f5f9',
                          background: '#fbf8ff'
                        }}
                      >
                        <img src={anniv.avatar} alt={anniv.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #7c3aed' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', fontSize: '12.5px', color: '#6b21a8' }}>
                            {anniv.name} • {anniv.serviceYearsText} Year
                          </div>
                          <div style={{ fontSize: '11px', color: '#7c3aed' }}>
                            💼 {anniv.anniversaryDate} ({anniv.daysRemainingText})
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToast(`🌟 Work Anniversary congratulations sent to ${anniv.name}! 🎉`, 'success');
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: '#7c3aed',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Congratulate 🌟
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Default Attendance Clock-in reminder */}
                <div style={{
                  padding: '12px 16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/attendance');
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '12.5px', color: '#1e293b' }}>
                      Attendance Shift Active
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11.5px', marginTop: '2px', lineHeight: '1.4' }}>
                      Logged in at {loginTime || '09:00 AM'}. Productive hours syncing live.
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      Today, Live
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc'
              }}>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/leaves');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#2563eb',
                    cursor: 'pointer'
                  }}
                >
                  Leaves →
                </button>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/tasks');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#2563eb',
                    cursor: 'pointer'
                  }}
                >
                  Tasks →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Settings Gear ── */}
        <button
          className="navbar-icon-btn"
          title="System Settings"
          onClick={() => navigate('/settings')}
          style={navBtnStyle}
        >
          <Settings size={18} color="#64748b" />
        </button>

        {/* ── Separator ── */}
        <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 4px' }} />

        {/* ── User Profile Pill ── */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 12px 5px 6px',
              background: showProfileMenu ? '#eff6ff' : '#f8fafc',
              border: showProfileMenu ? '1.5px solid #bfdbfe' : '1.5px solid #e2e8f0',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              userSelect: 'none'
            }}
            onMouseEnter={e => {
              if (!showProfileMenu) {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }
            }}
            onMouseLeave={e => {
              if (!showProfileMenu) {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }
            }}
          >
            {/* Avatar */}
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name || 'User'}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1.5px solid #2563eb',
                  flexShrink: 0
                }}
              />
            ) : (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
              }}>
                {currentUser?.name?.charAt(0) || 'A'}
              </div>
            )}

            {/* Label */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', lineHeight: 1 }}>
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                {currentUser?.name || 'User'}
              </span>
              <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                Work
              </span>
            </div>

            <ChevronDown
              size={14}
              color="#64748b"
              style={{
                transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: '0',
              width: '280px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              zIndex: 200,
              animation: 'fadeIn 0.18s ease'
            }}>
              {/* Profile Header */}
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #101b33, #1e293b)',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={currentUser?.name}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#ffffff' }}>
                        {currentUser?.name || 'User'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '1px', fontWeight: '600' }}>
                        {activeRoleConfig?.badge || '👤 Team Member'}
                      </div>
                    </div>
                  </div>

                  {/* Edit icon */}
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setIsEditProfileOpen(true);
                    }}
                    title="Edit Profile Information"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: 'none',
                      borderRadius: '6px',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              </div>

              {/* ── Fast Role Switcher (Admin, HR, Employee) ── */}
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  ⚡ Switch Active Role
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button
                    onClick={() => {
                      switchRole('admin');
                      addToast('Switched to 👑 Admin Portal (Full Access)', 'success');
                    }}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '8px',
                      border: activeRole === 'admin' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      background: activeRole === 'admin' ? '#eff6ff' : '#ffffff',
                      color: activeRole === 'admin' ? '#1d4ed8' : '#334155',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span>👑</span>
                    <span>Admin</span>
                  </button>

                  <button
                    onClick={() => {
                      switchRole('hr');
                      addToast('Switched to 💼 HR Portal', 'info');
                    }}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '8px',
                      border: activeRole === 'hr' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: activeRole === 'hr' ? '#f0f9ff' : '#ffffff',
                      color: activeRole === 'hr' ? '#0284c7' : '#334155',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span>💼</span>
                    <span>HR</span>
                  </button>

                  <button
                    onClick={() => {
                      switchRole('employee');
                      addToast('Switched to 👤 Employee Portal', 'info');
                    }}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '8px',
                      border: activeRole === 'team_member' ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                      background: activeRole === 'team_member' ? '#f0fdf4' : '#ffffff',
                      color: activeRole === 'team_member' ? '#15803d' : '#334155',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span>👤</span>
                    <span>Emp</span>
                  </button>
                </div>

                {/* Specific Employee Profile Quick Picker */}
                {(employees || []).length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', marginBottom: '3px' }}>
                      Or switch to specific teammate:
                    </div>
                    <select
                      value={currentUser?._id || ''}
                      onChange={(e) => {
                        const targetEmp = employees.find(emp => emp._id === e.target.value);
                        if (targetEmp) {
                          switchUser(targetEmp);
                          addToast(`Switched profile to 👤 ${targetEmp.name} (${targetEmp.role})`, 'success');
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '11.5px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        cursor: 'pointer'
                      }}
                    >
                      {(employees || []).map(emp => (
                        <option key={emp._id} value={emp._id}>
                          👤 {emp.name} ({emp.role || 'Member'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div style={{ padding: '6px' }}>
                {/* Dark Mode toggle item */}
                <div
                  onClick={toggleDarkMode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {darkMode ? <Moon size={15} color="#2563eb" /> : <Sun size={15} color="#d97706" />}
                    <span>Dark Mode</span>
                  </div>

                  {/* Toggle Switch */}
                  <div style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    backgroundColor: darkMode ? '#2563eb' : '#cbd5e1',
                    position: 'relative',
                    transition: 'background-color 0.2s ease'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      position: 'absolute',
                      top: '2px',
                      left: darkMode ? '18px' : '2px',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/employees');
                  }}
                >
                  <ProfileMenuItem icon={<Users size={14} color="#2563eb" />} label="Employees & Role Control" />
                </div>

                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    setIsEditProfileOpen(true);
                  }}
                >
                  <ProfileMenuItem icon={<User size={14} />} label="Edit My Profile" />
                </div>

                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                >
                  <ProfileMenuItem icon={<ShieldCheck size={14} color="#16a34a" />} label="Roles & Hierarchy (RBAC)" />
                </div>

                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                >
                  <ProfileMenuItem icon={<Settings size={14} />} label="Settings & Security" />
                </div>

                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    setIsStickyNotesOpen(true);
                  }}
                >
                  <ProfileMenuItem icon={<StickyNote size={14} color="#eab308" />} label="Sticky Notes" />
                </div>

                {/* Clear Dummy Data Option */}
                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (window.confirm('Clear all dummy tasks, projects, leads, tickets, and leaves to start fresh with your own real data?')) {
                      clearAllDummyData();
                      addToast('✨ All dummy data cleared! Ready for your own data entry.', 'success');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#ea580c',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Clear dummy data and start with a clean slate"
                >
                  <Trash2 size={14} color="#ea580c" />
                  <span>Clear Dummy Data (Fresh CRM)</span>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

                {/* 1. Daily Shift Attendance Action */}
                {isClockedIn ? (
                  <div
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleClockOut();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title="End today's shift and save hours to attendance."
                  >
                    <Square size={14} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#b45309' }}>
                        Clock Out (End Shift)
                      </span>
                      <span style={{ fontSize: '11px', color: '#78716c', marginTop: '1px' }}>
                        Records attendance
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleClockIn();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title="Start today's shift timer."
                  >
                    <Play size={14} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#15803d' }}>
                        Clock In (Start Shift)
                      </span>
                      <span style={{ fontSize: '11px', color: '#78716c', marginTop: '1px' }}>
                        Start 8h 30m shift timer
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

                {/* 2. Account Session Logout */}
                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    authLogout();
                    addToast('Signed out of CRM account. See you soon!', 'info');
                    navigate('/login');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Sign out to Login page"
                >
                  <LogOut size={14} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626' }}>
                      Logout Account (Sign Out)
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                      Redirect to Login Portal
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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

      <AddEmployeeModal
        isOpen={isAddEmpOpen}
        onClose={() => setIsAddEmpOpen(false)}
      />

      <EmployeeDirectoryModal
        isOpen={isEmpDirectoryOpen}
        onClose={() => setIsEmpDirectoryOpen(false)}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      <BreakModal
        isOpen={isBreakModalOpen}
        onClose={() => setIsBreakModalOpen(false)}
      />

      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
      />

      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
      />

      <StickyNotesModal
        isOpen={isStickyNotesOpen}
        onClose={() => setIsStickyNotesOpen(false)}
      />

      <ScreenRecorderModal
        isOpen={isRecorderModalOpen}
        videoBlob={recordedVideoBlob}
        videoUrl={recordedVideoUrl}
        durationSeconds={recordingSeconds}
        onClose={() => setIsRecorderModalOpen(false)}
        onDiscard={() => {
          if (recordedVideoUrl && recordedVideoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(recordedVideoUrl);
          }
          setRecordedVideoBlob(null);
          setRecordedVideoUrl('');
          setIsRecorderModalOpen(false);
        }}
        onStartNewRecording={() => {
          setIsRecorderModalOpen(false);
          startScreenRecording();
        }}
      />
    </header>
  );
};

// Reusable profile menu item
const ProfileMenuItem = ({ icon, label }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 10px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '500',
      color: '#374151',
      cursor: 'pointer',
      transition: 'background 0.15s'
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <span style={{ color: '#64748b' }}>{icon}</span>
    <span>{label}</span>
  </div>
);

// Shared nav icon button style
const navBtnStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: '1px solid transparent',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  position: 'relative',
  flexShrink: 0,
  onMouseEnter: undefined // handled inline
};
