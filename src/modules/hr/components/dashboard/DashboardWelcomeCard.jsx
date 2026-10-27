import React from 'react';
import {
  Users,
  User,
  CalendarCheck,
  ChevronDown
} from 'lucide-react';

export const DashboardWelcomeCard = ({
  effectiveTargetUser,
  currentUser,
  isViewingOtherEmployee,
  displayedIsClockedIn,
  displayedIsOnBreak,
  displayedHadClockedOut,
  displayedBreakType,
  roleConfig,
  activeWorkMode,
  showWorkModeMenu,
  setShowWorkModeMenu,
  handleUpdateLiveWorkMode,
  currentDateFormatted,
  currentTime,
  setIsApplyLeaveOpen,
  navigate,
  setIsEditProfileOpen
}) => {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={effectiveTargetUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={effectiveTargetUser?.name}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              objectFit: 'cover',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
            }}
          />
          <span style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: displayedIsClockedIn ? '#10b981' : '#94a3b8',
            border: '2px solid #ffffff'
          }} />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isViewingOtherEmployee ? `Employee: ${effectiveTargetUser?.name || 'User'}` : `Welcome ${currentUser?.name || 'User'}`}
            </h2>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: roleConfig?.badgeBg || '#eff6ff',
              color: roleConfig?.badgeColor || '#2563eb',
              border: `1px solid ${roleConfig?.badgeColor || '#93c5fd'}40`
            }}>
              {effectiveTargetUser?.role || roleConfig?.label || 'Team Member'}
            </span>
            {/* Interactive Working Mode Selector */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <button
                id="btn-toggle-workmode-welcome"
                type="button"
                onClick={() => setShowWorkModeMenu(prev => !prev)}
                title="Click to change your live working mode (Office / Hybrid / Remote)"
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1.5px 6px',
                  borderRadius: '4px',
                  backgroundColor: activeWorkMode === 'Remote' ? '#ecfdf5' : activeWorkMode === 'Hybrid' ? '#faf5ff' : '#f1f5f9',
                  color: activeWorkMode === 'Remote' ? '#059669' : activeWorkMode === 'Hybrid' ? '#7c3aed' : '#334155',
                  border: `1px solid ${activeWorkMode === 'Remote' ? '#a7f3d0' : activeWorkMode === 'Hybrid' ? '#e9d5ff' : '#cbd5e1'}`,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <span>{activeWorkMode === 'Remote' ? '🏡 Remote' : activeWorkMode === 'Hybrid' ? '🔄 Hybrid' : '🏢 Office'}</span>
                <ChevronDown size={10} />
              </button>

              {showWorkModeMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
                  padding: '4px',
                  zIndex: 100,
                  minWidth: '110px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {[
                    { id: 'Office', label: '🏢 Office' },
                    { id: 'Hybrid', label: '🔄 Hybrid' },
                    { id: 'Remote', label: '🏡 Remote' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleUpdateLiveWorkMode(m.id)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '11px',
                        fontWeight: activeWorkMode === m.id ? '700' : '500',
                        backgroundColor: activeWorkMode === m.id ? '#eff6ff' : 'transparent',
                        color: activeWorkMode === m.id ? '#2563eb' : '#334155',
                        border: 'none',
                        borderRadius: '4px',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
            {effectiveTargetUser?.role || roleConfig?.label || 'Team Member'} • <span style={{ color: '#94a3b8' }}>ID: #{effectiveTargetUser?.employeeCode || effectiveTargetUser?._id || 'EMP-01'}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>📅 {currentDateFormatted}</span>
            <span>•</span>
            <span>🕒 {currentTime}</span>
          </div>
        </div>
      </div>

      {/* Quick Informational Snapshot (Shift Status & Available Leaves) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #f1f5f9'
      }}>
        <div style={{ padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Shift Status</div>
          <div style={{ fontSize: '11.5px', fontWeight: '700', marginTop: '1px', color: displayedIsClockedIn ? (displayedIsOnBreak ? '#b45309' : '#16a34a') : '#64748b' }}>
            {displayedIsClockedIn
              ? (displayedIsOnBreak ? `☕ On ${displayedBreakType}` : '🟢 Shift Active')
              : (displayedHadClockedOut ? '🔴 Shift Ended' : '⚪ Not Clocked In')}
          </div>
        </div>

        <div
          onClick={() => setIsApplyLeaveOpen(true)}
          style={{ cursor: 'pointer', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}
          title="Click to apply for leave"
        >
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Leave Balance</div>
          <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', marginTop: '1px' }}>
            Casual: 10d • Sick: 8d
          </div>
        </div>
      </div>

      {/* Quick Direct Buttons for Employees & Profile */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
        <button
          onClick={() => navigate('/employees')}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            padding: '8px 12px',
            borderRadius: '7px',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            fontSize: '11.5px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Users size={13} />
          <span>Directory</span>
        </button>

        <button
          onClick={() => navigate('/attendance')}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            padding: '8px 12px',
            borderRadius: '7px',
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            fontSize: '11.5px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
          title="View full attendance matrix & clock in/out logs"
        >
          <CalendarCheck size={13} color="#16a34a" />
          <span>Attendance</span>
        </button>

        <button
          id="btn-edit-profile-welcome"
          onClick={() => setIsEditProfileOpen(true)}
          style={{
            padding: '8px 16px',
            borderRadius: '7px',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            border: '1.5px solid #cbd5e1',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
          title="Edit My Profile"
        >
          <User size={13} color="#2563eb" /> Edit Profile
        </button>
      </div>
    </div>
  );
};
