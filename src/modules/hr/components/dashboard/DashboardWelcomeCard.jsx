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
    <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-[14px_18px] flex flex-col justify-between gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <img
            src={effectiveTargetUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={effectiveTargetUser?.name}
            className="w-[42px] h-[42px] rounded-[10px] object-cover border-[1.5px] border-slate-200 dark:border-slate-700 shadow-sm"
          />
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${displayedIsClockedIn ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-[15.5px] font-extrabold text-slate-900 dark:text-white m-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {isViewingOtherEmployee ? `Employee: ${effectiveTargetUser?.name || 'User'}` : `Welcome ${currentUser?.name || 'User'}`}
            </h2>
            <span
              className="text-[10px] font-bold px-1.5 py-px rounded border"
              style={{
                backgroundColor: roleConfig?.badgeBg || '#eff6ff',
                color: roleConfig?.badgeColor || '#2563eb',
                borderColor: `${roleConfig?.badgeColor || '#93c5fd'}40`
              }}
            >
              {effectiveTargetUser?.role || roleConfig?.label || 'Team Member'}
            </span>
            {/* Interactive Working Mode Selector */}
            <div className="relative inline-flex items-center">
              <button
                id="btn-toggle-workmode-welcome"
                type="button"
                onClick={() => setShowWorkModeMenu(prev => !prev)}
                title="Click to change your live working mode (Office / Hybrid / Remote)"
                className={`text-[10px] font-bold py-[1.5px] px-1.5 rounded cursor-pointer inline-flex items-center gap-[3px] border ${activeWorkMode === 'Remote' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : activeWorkMode === 'Hybrid' ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'}`}
              >
                <span>{activeWorkMode === 'Remote' ? '🏡 Remote' : activeWorkMode === 'Hybrid' ? '🔄 Hybrid' : '🏢 Office'}</span>
                <ChevronDown size={10} />
              </button>

              {showWorkModeMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-[100] min-w-[110px] flex flex-col gap-0.5">
                  {[
                    { id: 'Office', label: '🏢 Office' },
                    { id: 'Hybrid', label: '🔄 Hybrid' },
                    { id: 'Remote', label: '🏡 Remote' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleUpdateLiveWorkMode(m.id)}
                      className={`p-[5px_8px] text-[11px] border-none rounded text-left cursor-pointer ${activeWorkMode === m.id ? 'font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' : 'font-medium bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {effectiveTargetUser?.role || roleConfig?.label || 'Team Member'} • <span className="text-slate-400 dark:text-slate-500">ID: #{effectiveTargetUser?.employeeCode || effectiveTargetUser?._id || 'EMP-01'}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
            <span>📅 {currentDateFormatted}</span>
            <span>•</span>
            <span>🕒 {currentTime}</span>
          </div>
        </div>
      </div>

      {/* Quick Informational Snapshot (Shift Status & Available Leaves) */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="p-[6px_8px] bg-slate-50 dark:bg-slate-800/60 rounded-md">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Shift Status</div>
          <div className={`text-[11.5px] font-bold mt-px ${displayedIsClockedIn ? (displayedIsOnBreak ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400') : 'text-slate-500 dark:text-slate-400'}`}>
            {displayedIsClockedIn
              ? (displayedIsOnBreak ? `☕ On ${displayedBreakType}` : '🟢 Shift Active')
              : (displayedHadClockedOut ? '🔴 Shift Ended' : '⚪ Not Clocked In')}
          </div>
        </div>

        <div
          onClick={() => setIsApplyLeaveOpen(true)}
          className="cursor-pointer p-[6px_8px] bg-slate-50 dark:bg-slate-800/60 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Click to apply for leave"
        >
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Leave Balance</div>
          <div className="text-[11.5px] font-bold text-slate-900 dark:text-slate-100 mt-px">
            Casual: 10d • Sick: 8d
          </div>
        </div>
      </div>

      {/* Quick Direct Buttons for Employees & Profile */}
      <div className="flex gap-2 mt-0.5">
        <button
          onClick={() => navigate('/employees')}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-[7px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-[11.5px] font-bold cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
        >
          <Users size={13} />
          <span>Directory</span>
        </button>

        <button
          onClick={() => navigate('/attendance')}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-[7px] bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900/60 text-[11.5px] font-bold cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/60 transition-colors"
          title="View full attendance matrix & clock in/out logs"
        >
          <CalendarCheck size={13} color="#16a34a" />
          <span>Attendance</span>
        </button>

        <button
          id="btn-edit-profile-welcome"
          onClick={() => setIsEditProfileOpen(true)}
          className="py-2 px-4 rounded-[7px] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-[1.5px] border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          title="Edit My Profile"
        >
          <User size={13} color="#2563eb" /> Edit Profile
        </button>
      </div>
    </div>
  );
};
