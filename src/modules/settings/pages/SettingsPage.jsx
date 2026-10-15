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
import { RolesManagementTab } from '../components/RolesManagementTab';
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

  // Role-based menu items (Zero admin exposure for employees)
  const menuItems = React.useMemo(() => {
    const baseItems = [
      { id: 'profile', label: 'My Profile & Details', icon: User, desc: 'Personal info & emergency contacts' },
      { id: 'security', label: 'Security & Password', icon: KeyRound, desc: 'Change password & credentials' },
      { id: 'preferences', label: 'My Work Preferences', icon: Sliders, desc: 'Notifications & work alerts' }
    ];

    if (isUserAdmin) {
      baseItems.push(
        { id: 'permissions', label: 'Employee Access & Permissions', icon: ShieldCheck, desc: 'RBAC module toggles' },
        { id: 'company', label: 'Company & Payslip Settings', icon: Building2, desc: 'Company policy & branding' },
        { id: 'roles', label: 'Roles & Hierarchy RBAC', icon: Layers, desc: 'System authority levels' }
      );
    }

    return baseItems;
  }, [isUserAdmin]);

  // Fallback if employee lands on restricted admin tab
  React.useEffect(() => {
    if (!isUserAdmin && ['permissions', 'company', 'roles'].includes(activeSection)) {
      setActiveSection('profile');
    }
  }, [isUserAdmin, activeSection]);

  const filteredMenuItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchMenu.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* ── Standard Compact Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #475569, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(71,85,105,0.25)',
            flexShrink: 0
          }}>
            <SettingsIcon size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                {activeSection === 'profile' ? 'Profile Settings' : activeSection === 'security' ? 'Security Settings' : activeSection === 'permissions' ? 'Employee Access & Permissions' : 'Company & Payslip Settings'}
              </h1>
              <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 7px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                Settings
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
              Home • Settings • {activeSection === 'profile' ? 'Profile Settings' : activeSection === 'security' ? 'Security Settings' : activeSection === 'permissions' ? 'Employee Access & Permissions' : 'Company & Payslip'}
            </p>
          </div>
        </div>

        {/* Live Work Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 12px',
          backgroundColor: '#f8fafc',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          fontSize: '12px',
          fontWeight: '700',
          color: '#0f172a'
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: !isClockedIn ? '#94a3b8' : isOnBreak ? '#f59e0b' : '#22c55e'
          }}></span>
          <span style={{ fontFamily: 'monospace' }}>{timeString || '00:00:00'}</span>
        </div>
      </div>

      {/* ── Two-Column Settings Layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        gap: '18px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '16px',
        minHeight: '600px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        
        {/* ── Left Sidebar Menu ── */}
        <div style={{
          borderRight: '1px solid #f1f5f9',
          paddingRight: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Search Menu */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff'
          }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search"
              value={searchMenu}
              onChange={e => setSearchMenu(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '12.5px',
                width: '100%',
                backgroundColor: 'transparent'
              }}
            />
          </div>

          {/* Navigation Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? '#f1f5f9' : 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    fontSize: '13.5px',
                    fontWeight: isActive ? '700' : '500',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent'
                  }}
                >
                  <Icon size={16} color={isActive ? '#2563eb' : '#64748b'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right Content Area ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Section: Profile Settings */}
          {activeSection === 'profile' && (
            <div>
              {/* Profile Sub-tabs (Profile | Emergency Contacts) Matching Screenshot 8 & 9 */}
              <div style={{
                display: 'flex',
                gap: '28px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '2px'
              }}>
                <button
                  onClick={() => setProfileSubTab('profile')}
                  style={{
                    background: 'none',
                    border: 'none',
                    paddingBottom: '10px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: profileSubTab === 'profile' ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    borderBottom: profileSubTab === 'profile' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Profile
                </button>

                <button
                  onClick={() => setProfileSubTab('emergency_contacts')}
                  style={{
                    background: 'none',
                    border: 'none',
                    paddingBottom: '10px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: profileSubTab === 'emergency_contacts' ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    borderBottom: profileSubTab === 'emergency_contacts' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
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
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>My Work & Notification Preferences</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Configure personal desktop notifications, task reminders, and shift alerts.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  <div key={pref.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{pref.title}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{pref.desc}</div>
                    </div>
                    <button
                      onClick={pref.toggle}
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: pref.value ? '#2563eb' : '#cbd5e1',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        padding: 0
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '2px',
                        left: pref.value ? '22px' : '2px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'left 0.2s'
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Roles & Hierarchy RBAC (Admin Only) */}
          {activeSection === 'roles' && isUserAdmin && (
            <div>
              <RolesManagementTab />
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
