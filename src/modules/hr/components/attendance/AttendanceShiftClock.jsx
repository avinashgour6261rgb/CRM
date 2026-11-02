/**
 * @file AttendanceShiftClock.jsx
 * @description Isolated, reusable React component for the Attendance Shift Clock & Timer.
 * Features:
 * 1. Live Wall-Clock time display (e.g. "05:15 PM") without second flicker.
 * 2. Visual Shift Status Badge (Shift Active, On Break, Shift Ended, Not Clocked In).
 * 3. Daily shift metrics: Clock In time, Clock Out time, Net Working Time, and Day Log viewer trigger.
 * 4. Active Break reminder tag with quick "+5m" extension and options dialog trigger.
 * 5. Interactive action controls:
 *    - Start Shift ("Clock In")
 *    - End Shift ("Clock Out")
 *    - Take Break dropdown (15m Tea Break, 45m Lunch Break, Custom Break)
 *    - Resume Shift from break
 * 6. Supports Admin Read-Only Shift View when inspecting another employee's daily status.
 */

import React, { useState, useEffect } from 'react';
import { Eye, Coffee, Play, Square, Utensils, Clock } from 'lucide-react';
import { useTimer } from '../../../../shared/context/TimerContext';

export const AttendanceShiftClock = ({
  targetUser = null,
  isViewingOtherEmployee = false,
  empState = null,
  todayStr = null,
  currentTime: externalCurrentTime = null,
  onOpenDayLog = null,
  onOpenBreakModal = null
}) => {
  const {
    loginTime,
    clockOutTime,
    hadClockedOutToday,
    workDurationText,
    breakDurationText,
    isOnBreak,
    breakType,
    currentBreakTimeString,
    isBreakOverdue,
    isClockedIn,
    handleClockIn,
    handleClockOut,
    startTeaBreak,
    startLunchBreak,
    resumeFromBreak,
    extendBreak
  } = useTimer();

  // Internal live clock (updates every 10 seconds, e.g. "03:15 PM")
  const formatTimeNoSec = (date = new Date()) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const [internalTime, setInternalTime] = useState(() => formatTimeNoSec());
  const [showBreakDropdown, setShowBreakDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setInternalTime(formatTimeNoSec());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const displayTime = externalCurrentTime || internalTime;
  const effectiveDate = todayStr || new Date().toISOString().split('T')[0];

  // Safe duration formatter for read-only employee state
  const formatDurationSafe = (secs = 0) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Resolve state depending on whether viewing self or viewing another employee (Admin read-only)
  const displayedIsClockedIn = isViewingOtherEmployee ? !!empState?.isClockedIn : isClockedIn;
  const displayedIsOnBreak = isViewingOtherEmployee ? !!empState?.isOnBreak : isOnBreak;
  const displayedBreakType = isViewingOtherEmployee ? (empState?.breakType || 'Break') : breakType;
  const displayedLoginTime = isViewingOtherEmployee ? empState?.loginTime : loginTime;
  const displayedClockOutTime = isViewingOtherEmployee ? empState?.clockOutTime : clockOutTime;
  const displayedWorkDuration = isViewingOtherEmployee
    ? formatDurationSafe(empState?.workSecs || 0)
    : (workDurationText || '0h 0m');
  const displayedHadClockedOut = isViewingOtherEmployee ? !!empState?.isClockedOut : hadClockedOutToday;
  const displayedBreakDuration = isViewingOtherEmployee
    ? formatDurationSafe(empState?.breakSecs || 0)
    : (breakDurationText || '0s');

  const handleOpenBreakOptions = () => {
    setShowBreakDropdown(false);
    if (onOpenBreakModal) {
      onOpenBreakModal();
    }
  };

  const handleOpenDayLog = () => {
    if (onOpenDayLog) {
      onOpenDayLog(targetUser, effectiveDate);
    }
  };

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        {/* Left Info Column: Clock Time, Live Status & Key Shift/Task Metrics */}
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}>
              {displayTime}
            </div>
            <span style={{
              fontSize: '10.5px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '5px',
              background: displayedIsOnBreak ? '#fef3c7' : (displayedIsClockedIn ? '#dcfce7' : (displayedHadClockedOut ? '#f1f5f9' : '#f8fafc')),
              color: displayedIsOnBreak ? '#b45309' : (displayedIsClockedIn ? '#15803d' : (displayedHadClockedOut ? '#64748b' : '#64748b')),
              border: `1px solid ${displayedIsOnBreak ? '#fde68a' : (displayedIsClockedIn ? '#bbf7d0' : '#e2e8f0')}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: displayedIsOnBreak ? '#f59e0b' : (displayedIsClockedIn ? '#22c55e' : (displayedHadClockedOut ? '#94a3b8' : '#cbd5e1')),
                display: 'inline-block'
              }} />
              {displayedIsOnBreak ? `On ${displayedBreakType}` : (displayedIsClockedIn ? 'Shift Active 🟢' : (displayedHadClockedOut ? 'Shift Ended' : 'Not Clocked In'))}
            </span>
          </div>

          {/* Attendance & Shift Time row */}
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>Clock In: <strong style={{ color: '#0f172a' }}>{displayedLoginTime || (displayedIsClockedIn ? 'Active' : '--')}</strong></span>
            <span>•</span>
            <span>Clock Out: <strong style={{ color: displayedClockOutTime ? '#dc2626' : '#64748b' }}>{displayedClockOutTime || (displayedIsClockedIn ? 'Active' : '--')}</strong></span>
            <span>•</span>
            <span>Working Time: <strong style={{ color: '#0284c7' }}>{displayedWorkDuration || '0h 0m'}</strong></span>
            {onOpenDayLog && (
              <button
                id="btn-eye-shift-top"
                onClick={handleOpenDayLog}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#eff6ff',
                  color: '#0284c7',
                  border: '1px solid #bfdbfe',
                  borderRadius: '5px',
                  padding: '2px 7px',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
                title="View full day activity log (clock in, clock out, breaks, tasks)"
              >
                <Eye size={11} color="#0284c7" />
                <span>Day Log 👁️</span>
              </button>
            )}
          </div>

          {/* When on break: Show active break reminder tag */}
          {!isViewingOtherEmployee && isOnBreak && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: isBreakOverdue ? '#fef2f2' : '#fffbeb',
                border: isBreakOverdue ? '1.5px solid #ef4444' : '1.5px solid #f59e0b',
                borderRadius: '6px',
                padding: '4px 9px',
                color: isBreakOverdue ? '#dc2626' : '#b45309',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                <Coffee size={13} color={isBreakOverdue ? '#dc2626' : '#d97706'} />
                <span>{breakType}: <strong>{currentBreakTimeString}</strong></span>
              </div>

              <button
                onClick={() => extendBreak(5)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
                title="Extend break by 5 minutes"
              >
                +5m
              </button>

              <button
                onClick={handleOpenBreakOptions}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                title="Break history & custom options"
              >
                Options...
              </button>
            </div>
          )}
        </div>

        {/* Right Action Column: Prominent Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '6px',
          flexShrink: 0
        }}>
          {isViewingOtherEmployee ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '5px' }}>
                Shift View: {targetUser?.name || 'Employee'} (Read-Only)
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: displayedIsClockedIn ? (displayedIsOnBreak ? '#b45309' : '#16a34a') : '#64748b' }}>
                {displayedIsClockedIn
                  ? (displayedIsOnBreak ? `☕ On ${displayedBreakType} (${displayedBreakDuration})` : '🟢 On Active Shift')
                  : (displayedHadClockedOut ? `🔴 Shift Ended (${displayedClockOutTime || '--'})` : '⚪ Not Clocked In')}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                Shift controls are managed by the employee
              </div>
            </div>
          ) : (
            isOnBreak ? (
              <button
                id="btn-resume-work-dashboard"
                onClick={resumeFromBreak}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: '#16a34a',
                  backgroundImage: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '11px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                  transition: 'all 0.15s ease'
                }}
                title="Resume working and continue shift"
              >
                <Play size={14} fill="#fff" />
                <span>Resume Shift 🟢</span>
              </button>
            ) : isClockedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* ☕ SINGLE BIG BREAK BUTTON WITH OPTIONS */}
                <div style={{ position: 'relative' }}>
                  <button
                    id="btn-take-break-menu"
                    onClick={() => setShowBreakDropdown(prev => !prev)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#fffbeb',
                      color: '#b45309',
                      border: '1.5px solid #fde68a',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Choose a break (Tea, Lunch, or Custom)"
                  >
                    <Coffee size={14} color="#b45309" />
                    <span>Take Break ☕ ▾</span>
                  </button>

                  {showBreakDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '115%',
                      right: 0,
                      zIndex: 100,
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      padding: '6px',
                      minWidth: '220px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <button
                        id="btn-menu-tea-break"
                        onClick={() => { startTeaBreak(); setShowBreakDropdown(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Coffee size={13} color="#b45309" />
                        <span>☕ Quick Tea Break (15 Min)</span>
                      </button>
                      <button
                        id="btn-menu-lunch-break"
                        onClick={() => { startLunchBreak(); setShowBreakDropdown(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Utensils size={13} color="#1d4ed8" />
                        <span>🍱 Lunch Break (45 Min)</span>
                      </button>
                      <button
                        id="btn-menu-custom-break"
                        onClick={handleOpenBreakOptions}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          fontWeight: '600',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Clock size={13} color="#64748b" />
                        <span>⚡ Custom Break / All Options...</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* CLOCK OUT BUTTON */}
                <button
                  id="btn-clock-out"
                  onClick={handleClockOut}
                  title="End shift and save attendance logs"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    backgroundColor: '#ea580c',
                    backgroundImage: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Square size={12} fill="#fff" />
                  <span>Clock Out</span>
                </button>
              </div>
            ) : (
              <button
                id="btn-clock-in"
                onClick={handleClockIn}
                title="Start your daily shift timer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#16a34a',
                  backgroundImage: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '11px 26px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                  transition: 'all 0.15s ease',
                  minWidth: '160px'
                }}
              >
                <Play size={13} fill="#fff" />
                <span>Clock In (Start Shift)</span>
              </button>
            )
          )}

          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
            {displayedIsClockedIn
              ? `Shift Active (${displayedWorkDuration || '0h 0m'})`
              : (displayedHadClockedOut
                ? `Ended at ${displayedClockOutTime || 'Today'} (${displayedWorkDuration})`
                : 'Shift not active')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceShiftClock;
