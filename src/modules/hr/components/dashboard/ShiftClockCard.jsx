import React, { useState } from 'react';
import { Play, Square, Coffee, Utensils, Clock, Eye } from 'lucide-react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useWork } from '../../../work/context/WorkContext';
import { useHR } from '../../context/HRContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { getCompanySettings } from '../../../../shared/services/companySettingsService';
import { OvertimeRequestModal } from '../attendance/OvertimeRequestModal';

export const ShiftClockCard = ({
  currentTime,
  displayedIsOnLeave,
  displayedIsClockedIn,
  displayedIsOnBreak,
  displayedHadClockedOut,
  displayedBreakType,
  displayedWorkDuration,
  displayedBreakDuration,
  displayedLoginTime,
  displayedClockOutTime,
  isViewingOtherEmployee,
  effectiveTargetUser,
  activeEmpState,
  workSeconds,
  openDayLogModalForUser,
  todayStr,
  isOnBreak,
  isBreakOverdue,
  breakType,
  currentBreakTimeString,
  extendBreak,
  setIsBreakModalOpen,
  resumeFromBreak,
  isClockedIn,
  handleClockIn,
  handleClockOut,
  startTeaBreak,
  startLunchBreak
}) => {
  const { currentUser } = useAuth();
  const { tasks } = useWork();
  const { employees } = useHR();
  const { addToast } = useToast();
  const [showBreakDropdown, setShowBreakDropdown] = useState(false);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);

  const companySettings = getCompanySettings();
  const standardWorkHours = Number(companySettings.standardWorkHours) || 9;

  const effectiveWorkSecs = isViewingOtherEmployee
    ? (activeEmpState?.workSecs || 0)
    : (workSeconds || 0);

  const isOvertime = effectiveWorkSecs > standardWorkHours * 3600;
  const overtimeHrs = Math.floor((effectiveWorkSecs - standardWorkHours * 3600) / 3600);
  const overtimeMins = Math.floor(((effectiveWorkSecs - standardWorkHours * 3600) % 3600) / 60);

  const onClockOutClick = () => {
    if (isOvertime && !isViewingOtherEmployee) {
      setIsOvertimeModalOpen(true);
    } else {
      handleClockOut();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-[14px_18px] flex flex-col justify-between gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between flex-wrap gap-3.5">
        {/* Left Info Column: Clock Time, Live Status & Key Shift/Task Metrics */}
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
              {currentTime}
            </div>
            <span
              className={`text-[10.5px] font-bold py-[3px] px-2 rounded-[5px] inline-flex items-center gap-1.5 border ${
                displayedIsOnLeave
                  ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                  : displayedIsOnBreak
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : displayedIsClockedIn
                  ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  : displayedHadClockedOut
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block ${
                  displayedIsOnLeave ? 'bg-teal-500' : displayedIsOnBreak ? 'bg-amber-500' : displayedIsClockedIn ? 'bg-green-500' : displayedHadClockedOut ? 'bg-slate-400' : 'bg-slate-300'
                }`}
              />
              {displayedIsOnLeave ? 'On Approved Leave 🌴' : displayedIsOnBreak ? `On ${displayedBreakType}` : displayedIsClockedIn ? 'Shift Active 🟢' : displayedHadClockedOut ? 'Shift Ended' : 'Not Clocked In'}
            </span>
          </div>

          {/* Shift Working Time & Day Log button */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center flex-wrap gap-2">
            <span>Working Time: <strong className="text-sky-600 dark:text-sky-400">{displayedWorkDuration || '0h 0m'}</strong></span>
            {isOvertime && (
              <span className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded px-1.5 py-px text-[10.5px] font-bold">
                +{overtimeHrs}h {overtimeMins}m Overtime
              </span>
            )}
            <button
              id="btn-eye-shift-top"
              onClick={() => openDayLogModalForUser(effectiveTargetUser, todayStr)}
              className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 text-sky-600 dark:text-sky-400 border border-blue-200 dark:border-blue-900/60 rounded-[5px] py-0.5 px-[7px] text-[10.5px] font-bold cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
              title="View full day activity log (clock in, clock out, breaks, tasks)"
            >
              <Eye size={11} color="#0284c7" />
              <span>Day Log 👁️</span>
            </button>
          </div>

          {/* When on break: Show active break reminder tag */}
          {!isViewingOtherEmployee && isOnBreak && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <div
                className={`flex items-center gap-1.5 rounded-md py-1 px-2.5 text-[11px] font-bold border ${isBreakOverdue ? 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-600 dark:text-red-400 border-[1.5px]' : 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 border-[1.5px]'}`}
              >
                <Coffee size={13} color={isBreakOverdue ? '#dc2626' : '#d97706'} />
                <span>{breakType}: <strong>{currentBreakTimeString}</strong></span>
              </div>

              <button
                onClick={() => extendBreak(5)}
                className="py-1 px-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-md text-[11px] font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                title="Extend break by 5 minutes"
              >
                +5m
              </button>

              <button
                onClick={() => setIsBreakModalOpen(true)}
                className="py-1 px-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md text-[11px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Break history & custom options"
              >
                Options...
              </button>
            </div>
          )}
        </div>

        {/* Right Action Column: Prominent Action Buttons */}
        <div className="flex flex-col items-end justify-center gap-1.5 shrink-0">
          {isViewingOtherEmployee ? (
            <div className="flex flex-col items-end gap-1">
              <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 py-[3px] px-2.5 rounded-[5px]">
                Shift View: {effectiveTargetUser?.name} (Read-Only)
              </div>
              <div className={`text-[12.5px] font-bold ${displayedIsClockedIn ? (displayedIsOnBreak ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400') : 'text-slate-500 dark:text-slate-400'}`}>
                {displayedIsClockedIn
                  ? (displayedIsOnBreak ? `☕ On ${displayedBreakType} (${displayedBreakDuration})` : '🟢 On Active Shift')
                  : (displayedHadClockedOut ? `🔴 Shift Ended (${displayedClockOutTime || '--'})` : '⚪ Not Clocked In')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                Shift controls are managed by the employee
              </div>
            </div>
          ) : (
            isOnBreak ? (
              <button
                id="btn-resume-work-dashboard"
                onClick={resumeFromBreak}
                className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-br from-green-500 to-green-600 text-white border-none py-[11px] px-6 rounded-lg text-sm font-bold cursor-pointer shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:brightness-105 transition-all"
                title="Resume working and continue shift"
              >
                <Play size={14} fill="#fff" />
                <span>Resume Shift 🟢</span>
              </button>
            ) : isClockedIn ? (
              <div className="flex items-center gap-2">
                {/* ☕ SINGLE BIG BREAK BUTTON WITH OPTIONS */}
                <div className="relative">
                  <button
                    id="btn-take-break-menu"
                    onClick={() => setShowBreakDropdown(prev => !prev)}
                    className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-[1.5px] border-amber-200 dark:border-amber-800 py-2.5 px-4 rounded-lg text-[13px] font-bold cursor-pointer shadow-[0_2px_8px_rgba(217,119,6,0.15)] hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all"
                    title="Choose a break (Tea, Lunch, or Custom)"
                  >
                    <Coffee size={14} color="#b45309" />
                    <span>Take Break ☕ ▾</span>
                  </button>

                  {showBreakDropdown && (
                    <div className="absolute top-[115%] right-0 z-[100] bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 min-w-[220px] flex flex-col gap-1">
                      <button
                        id="btn-menu-tea-break"
                        onClick={() => { startTeaBreak(); setShowBreakDropdown(false); }}
                        className="flex items-center gap-2 py-2 px-3 rounded-md border-none bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold text-xs cursor-pointer text-left hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        <Coffee size={13} color="#b45309" />
                        <span>☕ Quick Tea Break (15 Min)</span>
                      </button>
                      <button
                        id="btn-menu-lunch-break"
                        onClick={() => { startLunchBreak(); setShowBreakDropdown(false); }}
                        className="flex items-center gap-2 py-2 px-3 rounded-md border-none bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-xs cursor-pointer text-left hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Utensils size={13} color="#1d4ed8" />
                        <span>🍱 Lunch Break (45 Min)</span>
                      </button>
                      <button
                        id="btn-menu-custom-break"
                        onClick={() => { setIsBreakModalOpen(true); setShowBreakDropdown(false); }}
                        className="flex items-center gap-2 py-2 px-3 rounded-md border-none bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-semibold text-xs cursor-pointer text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
                  onClick={onClockOutClick}
                  title="End shift and save attendance logs"
                  className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-br from-orange-500 to-red-600 text-white border-none py-2.5 px-[22px] rounded-lg text-[13.5px] font-bold cursor-pointer shadow-[0_4px_14px_rgba(234,88,12,0.35)] hover:brightness-105 transition-all"
                >
                  <Square size={12} fill="#fff" />
                  <span>Clock Out</span>
                </button>
              </div>
            ) : displayedIsOnLeave ? (
              <div className="flex items-center gap-2">
                <span className="py-2.5 px-4 rounded-lg text-[13px] font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 inline-flex items-center gap-1.5 shadow-xs">
                  <span>🌴 Shift Paused: Approved Leave Active</span>
                </span>
              </div>
            ) : (
              <button
                id="btn-clock-in"
                onClick={handleClockIn}
                title="Start your daily shift timer"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-green-500 to-green-600 text-white border-none py-[11px] px-[26px] rounded-lg text-sm font-bold cursor-pointer shadow-[0_4px_14px_rgba(22,163,74,0.35)] hover:brightness-105 transition-all min-w-[160px]"
              >
                <Play size={13} fill="#fff" />
                <span>{displayedHadClockedOut ? 'Clock In Again (Resume Shift)' : 'Clock In (Start Shift)'}</span>
              </button>
            )
          )}

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
            {displayedIsClockedIn ? (
              <>
                <span>Clock In: <strong className="text-slate-900 dark:text-slate-100">{displayedLoginTime || '10:10 AM'}</strong></span>
                <span>•</span>
                <span className="text-green-600 dark:text-green-400 font-bold">Active ({displayedWorkDuration || '0h 0m'})</span>
              </>
            ) : displayedHadClockedOut ? (
              <>
                <span>Clock In: <strong className="text-slate-900 dark:text-slate-100">{displayedLoginTime || '--'}</strong></span>
                <span>•</span>
                <span>Clock Out: <strong className="text-red-600 dark:text-red-400">{displayedClockOutTime || '--'}</strong></span>
                <span>•</span>
                <span>({displayedWorkDuration})</span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">Shift not active</span>
            )}
          </div>
        </div>
      </div>

      {isOvertimeModalOpen && (
        <OvertimeRequestModal
          isOpen={isOvertimeModalOpen}
          onClose={() => setIsOvertimeModalOpen(false)}
          currentUser={currentUser || effectiveTargetUser}
          workSeconds={effectiveWorkSecs}
          standardWorkHours={standardWorkHours}
          shiftStartTime={companySettings.shiftStartTime || '10:00 AM'}
          shiftEndTime={companySettings.shiftEndTime || '07:00 PM'}
          todayTasks={tasks || []}
          employees={employees || []}
          onConfirmClockOut={handleClockOut}
          addToast={addToast}
        />
      )}
    </div>
  );
};
