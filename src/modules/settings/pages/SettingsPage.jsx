/**
 * @file SettingsPage.jsx
 * @description Master Settings section replicating Screenshots 6, 7, 8, 9.
 */

import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Phone,
  KeyRound,
  Bell,
  Building2,
  Clock,
  Layers,
  Sliders,
  Check
} from 'lucide-react';
import { ProfileTab } from '../components/ProfileTab';
import { EmergencyContactsTab } from '../components/EmergencyContactsTab';
import { SecuritySettingsTab } from '../components/SecuritySettingsTab';
import { CompanyBrandingTab } from '../components/CompanyBrandingTab';
import { ShiftSettingsTab } from '../components/ShiftSettingsTab';
import { EmployeePermissionsTab } from '../components/EmployeePermissionsTab';
import { useTimer } from '../../../shared/context/TimerContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { isAdmin, canUserGrantPermissions } from '../../../shared/utils/permissionUtils';

export const SettingsPage = () => {
  const { timeString, isClockedIn, isOnBreak } = useTimer();
  const { currentUser } = useAuth();
  const isUserAdmin = isAdmin(currentUser);
  const canManagePerms = isUserAdmin || canUserGrantPermissions(currentUser);

  const [activeSection, setActiveSection] = useState('profile');
  const [profileSubTab, setProfileSubTab] = useState('profile');
  const [searchMenu, setSearchMenu] = useState('');

  // Personal preferences state for employees
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem('ems_pref_email_alerts') !== 'false');
  const [taskReminders, setTaskReminders] = useState(() => localStorage.getItem('ems_pref_task_reminders') !== 'false');
  const [breakReminders, setBreakReminders] = useState(() => localStorage.getItem('ems_pref_break_reminders') !== 'false');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('ems_pref_sound') !== 'false');

  // Role-based menu items (Unified, clean single RBAC tab for Employee Access & Permissions)
  const menuItems = React.useMemo(() => {
    const baseItems = [
      { id: 'profile', label: 'My Profile & Details', icon: User, desc: 'Personal info & emergency contacts' },
      { id: 'security', label: 'Security & Password', icon: KeyRound, desc: 'Change password & credentials' },
      { id: 'preferences', label: 'My Work Preferences', icon: Sliders, desc: 'Notifications & work alerts' }
    ];

    if (canManagePerms) {
      baseItems.push(
        { id: 'permissions', label: 'Employee Access & Permissions', icon: ShieldCheck, desc: 'RBAC module toggles & privileges' }
      );
    }

    if (isUserAdmin) {
      baseItems.push(
        { id: 'company', label: 'Company Profile & Branding', icon: Building2, desc: 'Legal identity, address, tax IDs & payslips' },
        { id: 'shifts', label: 'Work Shift & Timing Policy', icon: Clock, desc: 'Office timings, grace period & breaks' }
      );
    }

    return baseItems;
  }, [isUserAdmin, canManagePerms]);

  // Fallback if employee lands on restricted admin tab
  React.useEffect(() => {
    if (!canManagePerms && activeSection === 'permissions') {
      setActiveSection('profile');
    }
    if (!isUserAdmin && (activeSection === 'company' || activeSection === 'shifts')) {
      setActiveSection('profile');
    }
  }, [canManagePerms, isUserAdmin, activeSection]);

  const filteredMenuItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchMenu.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-[18px]">

      {/* ── Standard Compact Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 sm:px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-xs min-h-[64px] box-border shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <SettingsIcon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight tracking-tight truncate">
                {activeSection === 'profile'
                  ? 'Profile Settings'
                  : activeSection === 'security'
                  ? 'Security Settings'
                  : activeSection === 'preferences'
                  ? 'Work & Notification Preferences'
                  : activeSection === 'permissions'
                  ? 'Employee Access & Permissions'
                  : activeSection === 'shifts'
                  ? 'Work Shift & Timing Policy'
                  : 'Company Profile & Legal Branding'}
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                Settings
              </span>
            </div>
            <p className="text-[11px] sm:text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 truncate sm:whitespace-normal">
              {activeSection === 'shifts'
                ? 'Configure universal working hours, shift timings, late grace periods, and break rules.'
                : activeSection === 'company'
                ? 'Manage company legal identity, corporate address, tax IDs, and payslip letterhead.'
                : 'Manage account profile, security credentials, RBAC permissions & work preferences.'}
            </p>
          </div>
        </div>

        {/* Live Work Clock */}
        <div className="flex items-center gap-2 py-1 px-2.5 sm:px-3 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${!isClockedIn ? 'bg-slate-400' : isOnBreak ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <span className="font-mono">{timeString || '00:00:00'}</span>
        </div>
      </div>

      {/* ── Two-Column Settings Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 md:gap-[18px] bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-3 sm:p-4 min-h-[500px] shadow-xs">

        {/* ── Left Sidebar Menu ── */}
        <div className="border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-3 md:pb-0 md:pr-[18px] flex flex-col gap-2.5 md:gap-4 overflow-hidden">
          {/* Search Menu (Visible on Desktop) */}
          <div className="hidden md:flex items-center gap-2 py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchMenu}
              onChange={e => setSearchMenu(e.target.value)}
              className="border-0 outline-none text-[12.5px] w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Navigation Items (Horizontal Pills on Mobile, Vertical Stack on Desktop) */}
          <div className="flex md:flex-col gap-1.5 md:gap-1 overflow-x-auto max-w-full pb-1 md:pb-0">
            {filteredMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-2 md:gap-2.5 py-2 md:py-2.5 px-3 md:px-3.5 rounded-lg border-0 text-[12px] sm:text-[12.5px] md:text-[13.5px] text-left cursor-pointer transition-all duration-150 whitespace-nowrap shrink-0 md:border-l-[3px] ${
                    isActive
                      ? 'bg-blue-600 md:bg-slate-100 dark:md:bg-slate-800 text-white md:text-slate-900 dark:md:text-slate-100 font-bold md:border-l-blue-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 md:bg-transparent text-slate-600 dark:text-slate-400 font-medium md:border-l-transparent hover:bg-slate-200 dark:hover:bg-slate-700 md:hover:bg-slate-50 dark:md:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white md:text-blue-600 dark:md:text-blue-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right Content Area ── */}
        <div className="flex flex-col min-w-0">

          {/* Section: Profile Settings */}
          {activeSection === 'profile' && (
            <div>
              {/* Profile Sub-tabs (Profile | Emergency Contacts) Matching Screenshot 8 & 9 */}
              <div className="flex gap-4 sm:gap-7 border-b border-slate-200 dark:border-slate-800 pb-0.5 overflow-x-auto">
                <button
                  onClick={() => setProfileSubTab('profile')}
                  className={`bg-transparent border-0 pb-2.5 text-xs sm:text-sm font-bold cursor-pointer transition-all border-b-[2.5px] whitespace-nowrap ${
                    profileSubTab === 'profile'
                      ? 'text-slate-900 dark:text-slate-100 border-b-blue-600'
                      : 'text-slate-500 dark:text-slate-400 border-b-transparent hover:text-slate-700'
                  }`}
                >
                  Profile
                </button>

                <button
                  onClick={() => setProfileSubTab('emergency_contacts')}
                  className={`bg-transparent border-0 pb-2.5 text-xs sm:text-sm font-bold cursor-pointer transition-all border-b-[2.5px] whitespace-nowrap ${
                    profileSubTab === 'emergency_contacts'
                      ? 'text-slate-900 dark:text-slate-100 border-b-blue-600'
                      : 'text-slate-500 dark:text-slate-400 border-b-transparent hover:text-slate-700'
                  }`}
                >
                  Emergency Contacts
                </button>
              </div>

              {/* Sub-tab Contents */}
              {profileSubTab === 'profile' ? (
                <ProfileTab />
              ) : (
                <EmergencyContactsTab />
              )}
            </div>
          )}

          {/* Section: Security Settings */}
          {activeSection === 'security' && (
            <div>
              <SecuritySettingsTab />
            </div>
          )}

          {/* Section: Personal Work Preferences (For All Employees) */}
          {activeSection === 'preferences' && (
            <div className="bg-white dark:bg-slate-900 rounded-[10px] p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 sm:gap-5">
              <div>
                <h3 className="text-sm sm:text-[15px] font-extrabold text-slate-900 dark:text-slate-100 m-0 mb-1">My Work & Notification Preferences</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Configure personal desktop notifications, task reminders, and shift alerts.</p>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  {
                    id: 'email',
                    title: 'Email Notifications',
                    desc: 'Receive task assignment, leave decision, and company announcements in email.',
                    value: emailAlerts,
                    toggle: () => {
                      const next = !emailAlerts;
                      setEmailAlerts(next);
                      localStorage.setItem('ems_pref_email_alerts', String(next));
                    }
                  },
                  {
                    id: 'tasks',
                    title: 'Task Due Reminders',
                    desc: 'Show in-app reminders for upcoming and overdue sprint tasks.',
                    value: taskReminders,
                    toggle: () => {
                      const next = !taskReminders;
                      setTaskReminders(next);
                      localStorage.setItem('ems_pref_task_reminders', String(next));
                    }
                  },
                  {
                    id: 'breaks',
                    title: 'Tea & Lunch Break Overdue Alerts',
                    desc: 'Notify when tea break exceeds 15 mins or lunch exceeds 45 mins.',
                    value: breakReminders,
                    toggle: () => {
                      const next = !breakReminders;
                      setBreakReminders(next);
                      localStorage.setItem('ems_pref_break_reminders', String(next));
                    }
                  },
                  {
                    id: 'sound',
                    title: 'Timer Audio Chimes',
                    desc: 'Play subtle audio chimes when starting or pausing shift timers.',
                    value: soundEnabled,
                    toggle: () => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      localStorage.setItem('ems_pref_sound', String(next));
                    }
                  }
                ].map(pref => (
                  <div key={pref.id} className="flex items-center justify-between gap-3 p-3 sm:px-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{pref.title}</div>
                      <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{pref.desc}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pref.value}
                      onClick={pref.toggle}
                      className={`w-11 h-6 rounded-full border-0 cursor-pointer relative transition-colors p-0 shrink-0 ${
                        pref.value ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 rounded-full bg-white shadow-xs transition-[left] duration-200 w-5 h-5 ${
                        pref.value ? 'left-[22px]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Employee Permissions Management (Admin Only) */}
          {activeSection === 'permissions' && isUserAdmin && (
            <div>
              <EmployeePermissionsTab />
            </div>
          )}

          {/* Section: Company & Payslip Branding (Admin Only) */}
          {activeSection === 'company' && isUserAdmin && (
            <div>
              <CompanyBrandingTab onNavigateTab={setActiveSection} />
            </div>
          )}

          {/* Section: Work Shift & Timing Policy (Admin Only) */}
          {activeSection === 'shifts' && isUserAdmin && (
            <div>
              <ShiftSettingsTab onNavigateTab={setActiveSection} />
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
