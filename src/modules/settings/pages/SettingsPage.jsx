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
  Layers,
  Sliders,
  Check
} from 'lucide-react';
import { ProfileTab } from '../components/ProfileTab';
import { EmergencyContactsTab } from '../components/EmergencyContactsTab';
import { SecuritySettingsTab } from '../components/SecuritySettingsTab';
import { CompanyBrandingTab } from '../components/CompanyBrandingTab';
import { EmployeePermissionsTab } from '../components/EmployeePermissionsTab';
import { useTimer } from '../../../shared/context/TimerContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { isAdmin } from '../../../shared/utils/permissionUtils';

export const SettingsPage = () => {
  const { timeString, isClockedIn, isOnBreak } = useTimer();
  const { currentUser } = useAuth();
  const isUserAdmin = isAdmin(currentUser);

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

    if (isUserAdmin) {
      baseItems.push(
        { id: 'permissions', label: 'Employee Access & Permissions', icon: ShieldCheck, desc: 'RBAC module toggles & privileges' },
        { id: 'company', label: 'Company & Payslip Settings', icon: Building2, desc: 'Company policy & branding' }
      );
    }

    return baseItems;
  }, [isUserAdmin]);

  // Fallback if employee lands on restricted admin tab
  React.useEffect(() => {
    if (!isUserAdmin && ['permissions', 'company'].includes(activeSection)) {
      setActiveSection('profile');
    }
  }, [isUserAdmin, activeSection]);

  const filteredMenuItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchMenu.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-[18px]">

      {/* ── Standard Compact Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 p-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-xs min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <SettingsIcon size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight tracking-tight">
                {activeSection === 'profile' ? 'Profile Settings' : activeSection === 'security' ? 'Security Settings' : activeSection === 'permissions' ? 'Employee Access & Permissions' : 'Company & Payslip Settings'}
              </h1>
              <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Settings
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              Manage account profile, security credentials, RBAC permissions & company details.
            </p>
          </div>
        </div>

        {/* Live Work Clock */}
        <div className="flex items-center gap-2 py-1 px-3 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100">
          <span className={`w-1.5 h-1.5 rounded-full ${!isClockedIn ? 'bg-slate-400' : isOnBreak ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <span className="font-mono">{timeString || '00:00:00'}</span>
        </div>
      </div>

      {/* ── Two-Column Settings Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-[18px] bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-4 min-h-[600px] shadow-xs">

        {/* ── Left Sidebar Menu ── */}
        <div className="border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-4 md:pb-0 md:pr-[18px] flex flex-col gap-4">
          {/* Search Menu */}
          <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchMenu}
              onChange={e => setSearchMenu(e.target.value)}
              className="border-0 outline-none text-[12.5px] w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Navigation Items */}
          <div className="flex flex-col gap-1">
            {filteredMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg border-0 text-[13.5px] text-left cursor-pointer transition-all duration-150 border-l-[3px] ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border-l-blue-600'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 font-medium border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right Content Area ── */}
        <div className="flex flex-col">

          {/* Section: Profile Settings */}
          {activeSection === 'profile' && (
            <div>
              {/* Profile Sub-tabs (Profile | Emergency Contacts) Matching Screenshot 8 & 9 */}
              <div className="flex gap-7 border-b border-slate-200 dark:border-slate-800 pb-0.5">
                <button
                  onClick={() => setProfileSubTab('profile')}
                  className={`bg-transparent border-0 pb-2.5 text-sm font-bold cursor-pointer transition-all border-b-[2.5px] ${
                    profileSubTab === 'profile'
                      ? 'text-slate-900 dark:text-slate-100 border-b-blue-600'
                      : 'text-slate-500 dark:text-slate-400 border-b-transparent hover:text-slate-700'
                  }`}
                >
                  Profile
                </button>

                <button
                  onClick={() => setProfileSubTab('emergency_contacts')}
                  className={`bg-transparent border-0 pb-2.5 text-sm font-bold cursor-pointer transition-all border-b-[2.5px] ${
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
            <div className="bg-white dark:bg-slate-900 rounded-[10px] p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-5">
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 m-0 mb-1">My Work & Notification Preferences</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Configure personal desktop notifications, task reminders, and shift alerts.</p>
              </div>

              <div className="flex flex-col gap-3.5">
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
                  <div key={pref.id} className="flex items-center justify-between p-3 px-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{pref.title}</div>
                      <div className="text-[11.5px] text-slate-500 dark:text-slate-400">{pref.desc}</div>
                    </div>
                    <button
                      onClick={pref.toggle}
                      className={`w-11 h-6 rounded-full border-0 cursor-pointer relative transition-colors p-0 ${
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
              <CompanyBrandingTab />
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
