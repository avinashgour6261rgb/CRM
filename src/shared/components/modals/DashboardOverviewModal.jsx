/**
 * @file DashboardOverviewModal.jsx
 * @description Quick Dashboard Overview & Module Switcher HUD Modal
 * Displays instant live KPIs, Attendance stats, Task status, and 1-Click Launchers across all EMS modules.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  LayoutDashboard,
  Users2,
  FolderGit2,
  ListTodo,
  Palmtree,
  CalendarCheck,
  DollarSign,
  Ticket,
  Calendar,
  MessageSquare,
  BellRing,
  Settings,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap,
  Coffee,
  LogOut,
  Plus
} from 'lucide-react';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useWork } from '../../../modules/work/context/WorkContext';
import { useCRM } from '../../context/CRMContext';
import { useTimer } from '../../context/TimerContext';

export const DashboardOverviewModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentUser, employees, leaves } = useHR();
  const { projects, tasks } = useWork();
  const { leads, tickets, events, notices } = useCRM();
  const { timeString, isClockedIn, isOnBreak, breakType, loginTime, grossDurationText, workDurationText } = useTimer();

  if (!isOpen) return null;

  const pendingLeaves = (leaves || []).filter(l => l?.status === 'pending').length;
  const myTasks = (tasks || []).filter(t => {
    if (!t) return false;
    const userIds = [currentUser?._id, currentUser?.id, currentUser?.employeeCode, currentUser?.email].filter(Boolean).map(s => String(s).toLowerCase());
    const taskIds = [t?.assignedToId, t?.assignedTo, t?.employeeId, t?.assignedToEmail].filter(Boolean).map(s => String(s).toLowerCase());
    if (userIds.some(uid => taskIds.includes(uid))) return true;
    const userName = (currentUser?.name || '').trim().toLowerCase();
    const taskName = (t?.assignedToName || '').trim().toLowerCase();
    if (userName && taskName && (userName === taskName || (userName.split(' ')[0] === taskName.split(' ')[0] && userName.split(' ')[0].length > 2))) return true;
    return false;
  });
  const pendingTasks = myTasks.filter(t => t?.status !== 'completed').length;
  const activeProjects = (projects || []).filter(p => p?.status === 'in_progress').length;
  const openTickets = (tickets || []).filter(t => t?.status === 'open' || t?.status === 'pending').length;
  const totalLeads = (leads || []).length;

  const modules = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, color: '#2563eb', bg: '#eff6ff', desc: 'Main employee & attendance hub' },
    { name: 'Leads & CRM', path: '/leads', icon: Users2, color: '#0284c7', bg: '#e0f2fe', desc: `${totalLeads} active deals & prospects` },
    { name: 'Projects', path: '/projects', icon: FolderGit2, color: '#0891b2', bg: '#ecfeff', desc: `${activeProjects} in-progress projects` },
    { name: 'Tasks & Sprints', path: '/tasks', icon: ListTodo, color: '#7c3aed', bg: '#f5f3ff', desc: `${pendingTasks} pending assigned tasks` },
    { name: 'Leave Management', path: '/leaves', icon: Palmtree, color: '#16a34a', bg: '#f0fdf4', desc: `${pendingLeaves} leaves pending review` },
    { name: 'Attendance Clock', path: '/attendance', icon: CalendarCheck, color: '#059669', bg: '#ecfdf5', desc: 'Shift logs & gross hours' },
    { name: 'Finance & Expenses', path: '/finance', icon: DollarSign, color: '#d97706', bg: '#fef3c7', desc: 'Company bills & reimbursements' },
    { name: 'Tickets Helpdesk', path: '/tickets', icon: Ticket, color: '#ea580c', bg: '#ffedd5', desc: `${openTickets} open support tickets` },
    { name: 'Calendar & Events', path: '/calendar', icon: Calendar, color: '#4f46e5', bg: '#eef2ff', desc: `${(events || []).length} scheduled events & festivals` },
    { name: 'Messages & Chat', path: '/messages', icon: MessageSquare, color: '#0284c7', bg: '#f0f9ff', desc: 'Team communication & channels' },
    { name: 'Notice Board', path: '/notice-board', icon: BellRing, color: '#e11d48', bg: '#ffe4e6', desc: `${(notices || []).length} company announcements` },
    { name: 'System Settings', path: '/settings', icon: Settings, color: '#475569', bg: '#f1f5f9', desc: 'Profile, 2FA, & Preferences' }
  ];

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '840px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
        animation: 'scaleUp 0.18s ease-out',
        display: 'flex',
        flexDirection: 'column'
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: '#ffffff',
          borderRadius: '18px 18px 0 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LayoutDashboard size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  Dashboard Overview
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                  Live Sync
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Quick snapshot, active timer status, and system module launcher
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Attendance Banner */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px'
        }}>
          {/* Status */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: !isClockedIn ? '#ef4444' : isOnBreak ? '#f59e0b' : '#22c55e',
              boxShadow: isClockedIn ? '0 0 8px #22c55e' : 'none'
            }} />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Attendance Status</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                {!isClockedIn ? 'Clocked Out' : isOnBreak ? breakType : 'Active & Clocked In'}
              </div>
            </div>
          </div>

          {/* Time Logged */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Clock size={16} color="#2563eb" />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Work Duration</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb', fontFamily: 'monospace' }}>
                {timeString || '00:00:00'}
              </div>
            </div>
          </div>

          {/* Clock In Time */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle2 size={16} color="#16a34a" />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Clock In Today</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                {loginTime || '09:12 AM'}
              </div>
            </div>
          </div>

          {/* Pending Leaves */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Palmtree size={16} color="#d97706" />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Pending Reviews</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#d97706' }}>
                {pendingLeaves} Leave Req.
              </div>
            </div>
          </div>
        </div>

        {/* 12-Module Quick Launch Grid */}
        <div style={{ padding: '24px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '700',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '14px'
          }}>
            Quick Module Launcher
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '14px'
          }}>
            {modules.map((m) => {
              const IconComp = m.icon;
              return (
                <div
                  key={m.name}
                  onClick={() => handleNavigate(m.path)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = m.color;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: m.bg,
                    color: m.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IconComp size={18} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                      {m.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '0 0 18px 18px'
        }}>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>
            Enterprise Management System v1.0.0
          </span>

          <button
            onClick={() => handleNavigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            Go to Full Dashboard Page
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
};
