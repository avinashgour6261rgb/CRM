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
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, colorCls: 'text-blue-600 dark:text-blue-400', bgCls: 'bg-blue-50 dark:bg-blue-900/30', borderHover: 'hover:border-blue-500', desc: 'Main employee & attendance hub' },
    { name: 'Leads & CRM', path: '/leads', icon: Users2, colorCls: 'text-sky-600 dark:text-sky-400', bgCls: 'bg-sky-50 dark:bg-sky-900/30', borderHover: 'hover:border-sky-500', desc: `${totalLeads} active deals & prospects` },
    { name: 'Projects', path: '/projects', icon: FolderGit2, colorCls: 'text-cyan-600 dark:text-cyan-400', bgCls: 'bg-cyan-50 dark:bg-cyan-900/30', borderHover: 'hover:border-cyan-500', desc: `${activeProjects} in-progress projects` },
    { name: 'Tasks & Sprints', path: '/tasks', icon: ListTodo, colorCls: 'text-purple-600 dark:text-purple-400', bgCls: 'bg-purple-50 dark:bg-purple-900/30', borderHover: 'hover:border-purple-500', desc: `${pendingTasks} pending assigned tasks` },
    { name: 'Leave Management', path: '/leaves', icon: Palmtree, colorCls: 'text-green-600 dark:text-green-400', bgCls: 'bg-green-50 dark:bg-green-900/30', borderHover: 'hover:border-green-500', desc: `${pendingLeaves} leaves pending review` },
    { name: 'Attendance Clock', path: '/attendance', icon: CalendarCheck, colorCls: 'text-emerald-600 dark:text-emerald-400', bgCls: 'bg-emerald-50 dark:bg-emerald-900/30', borderHover: 'hover:border-emerald-500', desc: 'Shift logs & gross hours' },
    { name: 'Finance & Expenses', path: '/finance', icon: DollarSign, colorCls: 'text-amber-600 dark:text-amber-400', bgCls: 'bg-amber-50 dark:bg-amber-900/30', borderHover: 'hover:border-amber-500', desc: 'Company bills & reimbursements' },
    { name: 'Tickets Helpdesk', path: '/tickets', icon: Ticket, colorCls: 'text-orange-600 dark:text-orange-400', bgCls: 'bg-orange-50 dark:bg-orange-900/30', borderHover: 'hover:border-orange-500', desc: `${openTickets} open support tickets` },
    { name: 'Calendar & Events', path: '/calendar', icon: Calendar, colorCls: 'text-indigo-600 dark:text-indigo-400', bgCls: 'bg-indigo-50 dark:bg-indigo-900/30', borderHover: 'hover:border-indigo-500', desc: `${(events || []).length} scheduled events & festivals` },
    { name: 'Messages & Chat', path: '/messages', icon: MessageSquare, colorCls: 'text-sky-600 dark:text-sky-400', bgCls: 'bg-sky-50 dark:bg-sky-900/30', borderHover: 'hover:border-sky-500', desc: 'Team communication & channels' },
    { name: 'Notice Board', path: '/notice-board', icon: BellRing, colorCls: 'text-rose-600 dark:text-rose-400', bgCls: 'bg-rose-50 dark:bg-rose-900/30', borderHover: 'hover:border-rose-500', desc: `${(notices || []).length} company announcements` },
    { name: 'System Settings', path: '/settings', icon: Settings, colorCls: 'text-slate-600 dark:text-slate-400', bgCls: 'bg-slate-100 dark:bg-slate-800', borderHover: 'hover:border-slate-500', desc: 'Profile, 2FA, & Preferences' }
  ];

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-[18px] w-full max-w-[840px] max-h-[90vh] shadow-2xl overflow-y-auto border border-slate-200 dark:border-slate-800 flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-t-[18px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold m-0 text-white">
                  Dashboard Overview
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-[10px] bg-green-500/20 text-green-400 border border-green-500/30">
                  Live Sync
                </span>
              </div>
              <p className="text-[12.5px] text-slate-400 m-0 mt-0.5">
                Quick snapshot, active timer status, and system module launcher
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 border-none text-white cursor-pointer p-1.5 rounded-lg flex transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Attendance Banner */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          {/* Status */}
          <div className="p-2.5 px-3.5 bg-white dark:bg-slate-800 rounded-[10px] border border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${!isClockedIn ? 'bg-red-500' : isOnBreak ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_8px_#22c55e]'}`} />
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Attendance Status</div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                {!isClockedIn ? 'Clocked Out' : isOnBreak ? breakType : 'Active & Clocked In'}
              </div>
            </div>
          </div>

          {/* Time Logged */}
          <div className="p-2.5 px-3.5 bg-white dark:bg-slate-800 rounded-[10px] border border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
            <Clock size={16} className="text-blue-600 dark:text-blue-400" />
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Work Duration</div>
              <div className="text-[13px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                {timeString || '00:00:00'}
              </div>
            </div>
          </div>

          {/* Clock In Time */}
          <div className="p-2.5 px-3.5 bg-white dark:bg-slate-800 rounded-[10px] border border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Clock In Today</div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                {loginTime || '09:12 AM'}
              </div>
            </div>
          </div>

          {/* Pending Leaves */}
          <div className="p-2.5 px-3.5 bg-white dark:bg-slate-800 rounded-[10px] border border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
            <Palmtree size={16} className="text-amber-600 dark:text-amber-400" />
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Pending Reviews</div>
              <div className="text-[13px] font-bold text-amber-600 dark:text-amber-400">
                {pendingLeaves} Leave Req.
              </div>
            </div>
          </div>
        </div>

        {/* 12-Module Quick Launch Grid */}
        <div className="p-6">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3.5">
            Quick Module Launcher
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
            {modules.map((m) => {
              const IconComp = m.icon;
              return (
                <div
                  key={m.name}
                  onClick={() => handleNavigate(m.path)}
                  className={`p-3.5 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer flex items-start gap-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${m.borderHover}`}
                >
                  <div className={`w-[38px] h-[38px] rounded-[10px] ${m.bgCls} ${m.colorCls} flex items-center justify-center shrink-0`}>
                    <IconComp size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100">
                      {m.name}
                    </div>
                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {m.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between rounded-b-[18px]">
          <span className="text-[12.5px] text-slate-500 dark:text-slate-400">
            Enterprise Management System v1.0.0
          </span>

          <button
            onClick={() => handleNavigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-[18px] py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border-0 text-[13px] font-bold cursor-pointer shadow-sm hover:shadow transition-all"
          >
            Go to Full Dashboard Page
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
};
