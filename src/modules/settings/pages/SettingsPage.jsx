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
  Bell
} from 'lucide-react';
import { ProfileTab } from '../components/ProfileTab';
import { EmergencyContactsTab } from '../components/EmergencyContactsTab';
import { SecuritySettingsTab } from '../components/SecuritySettingsTab';
import { CompanyBrandingTab } from '../components/CompanyBrandingTab';
import { RolesManagementTab } from '../components/RolesManagementTab';
import { useTimer } from '../../../shared/context/TimerContext';
import { Building2, Layers } from 'lucide-react';

export const SettingsPage = () => {
  const { timeString, isClockedIn, isOnBreak } = useTimer();
  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'security' | 'company' | 'roles'
  const [profileSubTab, setProfileSubTab] = useState('profile'); // 'profile' | 'emergency_contacts'
  const [searchMenu, setSearchMenu] = useState('');

  const menuItems = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'security', label: 'Security Settings', icon: ShieldCheck },
    { id: 'roles', label: 'Roles & Hierarchy (RBAC)', icon: Layers },
    { id: 'company', label: 'Company, Shift & Payslip Settings', icon: Building2 }
  ];

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
                {activeSection === 'profile' ? 'Profile Settings' : activeSection === 'security' ? 'Security Settings' : activeSection === 'roles' ? 'Roles & Permissions' : 'Company Branding'}
              </h1>
              <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 7px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                Settings
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
              Home • Settings • {activeSection === 'profile' ? 'Profile Settings' : activeSection === 'security' ? 'Security Settings' : activeSection === 'roles' ? 'Roles & RBAC' : 'Company & Payslip'}
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

          {/* Section: Roles & Hierarchy RBAC */}
          {activeSection === 'roles' && (
            <div>
              <RolesManagementTab />
            </div>
          )}

          {/* Section: Company & Payslip Branding (Admin Only) */}
          {activeSection === 'company' && (
            <div>
              <CompanyBrandingTab />
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
