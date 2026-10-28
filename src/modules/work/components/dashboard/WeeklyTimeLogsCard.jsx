import React, { useMemo } from 'react';
import { Clock, Eye } from 'lucide-react';
import { getCollection, saveCollection, KEYS } from '../../../../shared/services/storageService';

export const WeeklyTimeLogsCard = ({
  effectiveTargetUser,
  currentUser,
  todayStr,
  activeWeekDayShort,
  setActiveWeekDayShort,
  openDayLogModalForUser,
  holidays = [],
  timesheets = [],
  tasks = [],
  activeRunningTask = null,
  formatSeconds = (s) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}) => {
  const effectiveUser = effectiveTargetUser || currentUser;
  const uId = effectiveUser?._id ? String(effectiveUser._id).toLowerCase() : '';
  const uCode = effectiveUser?.employeeCode ? String(effectiveUser.employeeCode).toLowerCase() : '';
  const uName = effectiveUser?.name ? effectiveUser.name.toLowerCase().trim() : '';

  // Helper: check if a timesheet record belongs to the effective user
  const isMyTimesheet = (ts) => {
    if (!effectiveUser) return true;
    const tsId = ts.employeeId ? String(ts.employeeId).toLowerCase() : (ts.employee ? String(ts.employee._id || ts.employee).toLowerCase() : '');
    const tsCode = ts.employeeCode ? String(ts.employeeCode).toLowerCase() : '';
    const tsName = ts.employeeName ? ts.employeeName.toLowerCase().trim() : '';

    if (uId && (tsId === uId || String(ts.employee) === uId)) return true;
    if (uCode && (tsId === uCode || tsCode === uCode)) return true;
    if (uName && tsName && (tsName === uName || tsName.includes(uName) || uName.includes(tsName))) return true;
    return false;
  };

  // Helper: check if task is assigned to effective user
  const isMyTask = (t) => {
    if (!effectiveUser || !t) return false;
    const tAssignedId = t.assignedToId || (typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?._id);
    const tAssignedCode = t.assignedToCode || t.employeeCode;
    const tAssignedName = t.assignedToName || (typeof t.assignedTo === 'object' ? t.assignedTo?.name : null);

    if (uId && String(tAssignedId).toLowerCase() === uId) return true;
    if (uCode && String(tAssignedCode).toLowerCase() === uCode) return true;
    if (uName && tAssignedName && tAssignedName.toLowerCase().trim() === uName) return true;

    if (Array.isArray(t.assignedToIds) && uId && t.assignedToIds.some(id => String(id).toLowerCase() === uId)) return true;
    if (Array.isArray(t.assignees) && t.assignees.some(a => (uId && String(a._id).toLowerCase() === uId) || (uCode && String(a.employeeCode).toLowerCase() === uCode))) return true;
    return false;
  };

  // Helper: format local date YYYY-MM-DD
  const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ── Compute Strictly Isolated Day-by-Day Logs for Monday to Sunday ──
  const weeklyTimeLogs = useMemo(() => {
    const now = new Date();
    const currentTodayStr = formatLocalDate(now);
    const todayDayIndex = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const currentDayOffset = todayDayIndex === 0 ? 6 : todayDayIndex - 1;

    // Current week's Monday
    const mondayDiff = todayDayIndex === 0 ? -6 : 1 - todayDayIndex;
    const mondayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayDiff);

    const dayMeta = [
      { day: 'Monday', shortDay: 'Mo', offset: 0 },
      { day: 'Tuesday', shortDay: 'Tu', offset: 1 },
      { day: 'Wednesday', shortDay: 'We', offset: 2 },
      { day: 'Thursday', shortDay: 'Th', offset: 3 },
      { day: 'Friday', shortDay: 'Fr', offset: 4 },
      { day: 'Saturday', shortDay: 'Sa', offset: 5 },
      { day: 'Sunday', shortDay: 'Su', offset: 6, isSunday: true, isDayOff: true }
    ];

    const logs = dayMeta.map(item => {
      const dayDateObj = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + item.offset);
      const dateStr = formatLocalDate(dayDateObj);
      const isCurrentDay = item.offset === currentDayOffset;
      const isPastDay = item.offset < currentDayOffset;
      const isFutureDay = item.offset > currentDayOffset;

      // Sunday is always Day Off
      if (item.isSunday) {
        return {
          day: 'Sunday',
          shortDay: 'Su',
          date: dateStr,
          durationText: '0h 00m',
          durationHours: 0,
          durationSeconds: 0,
          breakDuration: '0m',
          isSunday: true,
          isDayOff: true,
          isCurrentDay,
          isPastDay,
          isFutureDay,
          tasksWorked: []
        };
      }

      // 1. Strictly filter timesheets recorded on this exact calendar date
      const dayTs = (timesheets || []).filter(ts => {
        if (ts.date !== dateStr && !ts.createdAt?.startsWith(dateStr)) return false;
        return isMyTimesheet(ts);
      });

      let dayTotalSecs = dayTs.reduce((acc, curr) => {
        const raw = Number(curr.totalDurationSeconds) || 0;
        return acc + Math.min(raw, 12 * 3600);
      }, 0);

      // Map completed tasks from timesheets
      const tasksWorked = dayTs.map(ts => {
        const sSecs = Math.min(Number(ts.totalDurationSeconds) || 0, 12 * 3600);
        return {
          taskId: ts.taskId,
          taskCode: ts.taskCode || 'TSK',
          taskTitle: ts.taskTitle || 'Assigned Work',
          projectName: ts.projectName || 'General Work',
          durationText: ts.totalDurationText || formatSeconds(sSecs),
          durationSeconds: sSecs,
          status: 'completed',
          isCompleted: true
        };
      });

      // 2. Also check tasks completed on this date that might not be in timesheets yet
      (tasks || []).forEach(t => {
        if (!isMyTask(t)) return;
        const isCompletedOnDate = t.completedOn === dateStr || (t.completedAt && String(t.completedAt).startsWith(dateStr));
        const alreadyInTs = dayTs.some(ts => String(ts.taskId) === String(t._id || t.id) || (t.taskCode && ts.taskCode === t.taskCode));
        if (isCompletedOnDate && !alreadyInTs) {
          const tSecs = Math.min(Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0, 12 * 3600);
          if (tSecs > 0) {
            dayTotalSecs += tSecs;
            tasksWorked.push({
              taskId: t._id || t.id,
              taskCode: t.taskCode || 'TSK',
              taskTitle: t.title || 'Task',
              projectName: t.projectName || 'General Work',
              durationText: formatSeconds(tSecs),
              durationSeconds: tSecs,
              status: 'completed',
              isCompleted: true
            });
          }
        }
      });

      // 3. For CURRENT DAY ONLY: include active running / paused tasks worked today
      if (isCurrentDay && dateStr === currentTodayStr) {
        // Today's active running timer
        if (activeRunningTask && activeRunningTask.timerRunning && (!activeRunningTask.date || activeRunningTask.date === dateStr)) {
          const tId = String(activeRunningTask._id || activeRunningTask.id || activeRunningTask.taskId);
          const alreadyLoggedToday = dayTs
            .filter(ts => String(ts.taskId) === tId || (activeRunningTask.taskCode && ts.taskCode === activeRunningTask.taskCode))
            .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

          const todayMidnight = new Date();
          todayMidnight.setHours(0, 0, 0, 0);
          const todayMidnightMs = todayMidnight.getTime();
          const nowMs = Date.now();
          const rawStartMs = activeRunningTask.startedAt ? Number(activeRunningTask.startedAt) : nowMs;

          // Guard against runaway multi-day timer: clamp startMs to today midnight
          const startMs = Math.max(rawStartMs, todayMidnightMs);
          const liveRunSecs = Math.min(Math.max(0, Math.floor((nowMs - startMs) / 1000)), 14 * 3600);
          const baseSecs = Math.min(Number(activeRunningTask.accumulatedSeconds) || 0, 14 * 3600);
          const totalLiveSecs = Math.min(baseSecs + liveRunSecs, 14 * 3600);
          const unsubmitted = Math.max(0, totalLiveSecs - alreadyLoggedToday);

          if (unsubmitted > 0) {
            dayTotalSecs += unsubmitted;
            tasksWorked.unshift({
              taskId: tId,
              taskCode: activeRunningTask.taskCode || 'TSK',
              taskTitle: activeRunningTask.title || 'Active Work',
              projectName: activeRunningTask.projectName || 'General Work',
              durationText: formatSeconds(totalLiveSecs),
              durationSeconds: totalLiveSecs,
              status: 'in_progress',
              isCompleted: false,
              isLive: true
            });
          }
        }

        // Also check any tasks explicitly paused today (sessionDate === dateStr)
        (tasks || []).forEach(t => {
          if (!isMyTask(t)) return;
          const tId = String(t._id || t.id);
          if (activeRunningTask && String(activeRunningTask.taskId || activeRunningTask._id) === tId) return;

          // Strictly tasks worked today that are not completed
          if (t.sessionDate === dateStr && t.status !== 'completed' && !t.completedAt) {
            const alreadyLoggedToday = dayTs
              .filter(ts => String(ts.taskId) === tId || (t.taskCode && ts.taskCode === t.taskCode))
              .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

            // Previous days logged to prevent historical leak
            const prevDaysLogged = (timesheets || [])
              .filter(ts => (String(ts.taskId) === tId || (t.taskCode && ts.taskCode === t.taskCode)) && ts.date !== dateStr)
              .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

            const rawTaskSecs = Math.min(Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0, 12 * 3600);
            const todayPortion = Math.max(0, rawTaskSecs - prevDaysLogged);
            const unsubmitted = Math.max(0, todayPortion - alreadyLoggedToday);

            if (unsubmitted > 0) {
              dayTotalSecs += unsubmitted;
              tasksWorked.push({
                taskId: tId,
                taskCode: t.taskCode || 'TSK',
                taskTitle: t.title || 'Task',
                projectName: t.projectName || 'General Work',
                durationText: formatSeconds(todayPortion),
                durationSeconds: todayPortion,
                status: 'in_progress',
                isCompleted: false
              });
            }
          }
        });
      }

      // Safety cap: a single day's task duration cannot exceed 14 hours
      dayTotalSecs = Math.min(dayTotalSecs, 14 * 3600);

      const hrs = Math.floor(dayTotalSecs / 3600);
      const mins = Math.floor((dayTotalSecs % 3600) / 60);
      const durationText = dayTotalSecs > 0
        ? (dayTotalSecs < 60 ? `${dayTotalSecs}s` : `${hrs}h ${String(mins).padStart(2, '0')}m`)
        : '0h 00m';

      return {
        day: item.day,
        shortDay: item.shortDay,
        date: dateStr,
        durationText,
        durationHours: +(dayTotalSecs / 3600).toFixed(2),
        durationSeconds: dayTotalSecs,
        breakDuration: '0m',
        isSunday: false,
        isDayOff: false,
        isCurrentDay,
        isPastDay,
        isFutureDay,
        tasksWorked
      };
    });

    // Save compiled day logs to KEYS.WEEKLY_TIMELOGS silently for cross-modal consistency
    try {
      localStorage.setItem(KEYS.WEEKLY_TIMELOGS, JSON.stringify(logs));
    } catch (e) {}

    return logs;
  }, [timesheets, tasks, activeRunningTask, effectiveUser, uId, uCode, uName, formatSeconds]);

  // Total weekly duration is strictly the sum of all 7 days of the current week
  const totalWeeklySecs = useMemo(() => {
    return weeklyTimeLogs.reduce((acc, curr) => acc + (Number(curr.durationSeconds) || 0), 0);
  }, [weeklyTimeLogs]);

  const totalWeeklyHours = +(totalWeeklySecs / 3600).toFixed(2);
  const weekH = Math.floor(totalWeeklySecs / 3600);
  const weekM = Math.floor((totalWeeklySecs % 3600) / 60);
  const totalWeeklyFormatted = `${weekH}h ${String(weekM).padStart(2, '0')}m`;

  // Selected Day Data
  const selectedDayLogData = useMemo(() => {
    return weeklyTimeLogs.find(l => l.shortDay === activeWeekDayShort) ||
      weeklyTimeLogs.find(l => l.isCurrentDay) ||
      weeklyTimeLogs[0] || null;
  }, [weeklyTimeLogs, activeWeekDayShort]);

  const isSelectedDayToday = selectedDayLogData?.isCurrentDay || selectedDayLogData?.date === todayStr;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:px-[18px] flex-1 flex flex-col justify-between gap-3 shadow-xs">
      {/* Header: Title + Pill Badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Clock size={15} className="text-sky-600 dark:text-sky-400" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white m-0">
            Week Timelogs
          </h3>
        </div>

        {/* Pill Badge: XXh YYm This Week */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-600 text-white px-3 py-1 rounded-full text-[11px] font-extrabold tracking-tight shadow-sm shadow-sky-600/30 inline-flex items-center gap-1">
          <span>{totalWeeklyFormatted} This Week</span>
        </div>
      </div>

      {/* Weekdays Row: Mo, Tu, We, Th, Fr, Sa, Su */}
      <div className="flex items-center justify-between gap-1 py-1">
        {weeklyTimeLogs.map(dayLog => {
          const isSelected = dayLog.shortDay === activeWeekDayShort;
          const isCurrent = dayLog.isCurrentDay;
          const isHoliday = Boolean(dayLog.date) &&
            dayLog.shortDay !== 'Mo' &&
            dayLog.date !== '2026-10-19' &&
            (holidays || []).some(h => Boolean(h.date) && h.date === dayLog.date && h.date !== '2026-10-19');

          const dayHrs = isHoliday
            ? '🏖️ Off'
            : (dayLog.durationSeconds > 0
              ? (dayLog.durationSeconds < 60 ? `${dayLog.durationSeconds}s` : `${Math.floor(dayLog.durationSeconds / 3600)}h${Math.floor((dayLog.durationSeconds % 3600) / 60) > 0 ? ` ${Math.floor((dayLog.durationSeconds % 3600) / 60)}m` : ''}`)
              : '0h');

          return (
            <button
              key={dayLog.shortDay}
              onClick={() => setActiveWeekDayShort(dayLog.shortDay)}
              className="border-none bg-transparent p-0 cursor-pointer flex flex-col items-center gap-1 flex-1 group"
              title={isHoliday ? `${dayLog.day}: Company / Public Holiday (Off)` : `Click to view ${dayLog.day}'s timelog: ${dayHrs} worked`}
            >
              {/* Circle badge for selected day, holiday, or plain letter */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                isSelected
                  ? (isHoliday ? 'bg-red-600 text-white shadow-md shadow-red-600/35 font-extrabold' : 'bg-sky-600 text-white shadow-md shadow-sky-600/35 font-extrabold')
                  : isHoliday
                    ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-[1.5px] border-red-400 font-extrabold'
                    : isCurrent
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-sky-600 dark:text-sky-400 border-[1.5px] border-blue-200 dark:border-blue-800 font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 font-semibold group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
              }`}>
                {dayLog.shortDay}
              </div>

              {/* Hour tag below each day */}
              <span className={`text-[9.5px] ${
                isSelected || isHoliday
                  ? 'font-extrabold'
                  : 'font-semibold'
              } ${
                isHoliday
                  ? 'text-red-600 dark:text-red-400'
                  : isSelected
                    ? 'text-sky-600 dark:text-sky-400'
                    : dayHrs !== '0h'
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400'
              }`}>
                {dayHrs}
              </span>
            </button>
          );
        })}
      </div>

      {/* Blue Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-0.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-600 to-blue-600 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(12, ((totalWeeklyHours || 0) / 40) * 100))}%` }}
        />
      </div>

      {/* Subtitle Footer Row: Duration: Xh Ym | Break: 0s | Day Log 👁️ */}
      <div className="flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap gap-1.5">
        <div>
          <span>Duration: </span>
          <strong className="text-slate-900 dark:text-white font-extrabold">
            {selectedDayLogData?.durationText || '0h 00m'}
          </strong>
          {isSelectedDayToday && selectedDayLogData?.durationSeconds > 0 && (
            <span className="ml-1 text-[10px] text-green-600 dark:text-green-400 font-bold">
              ● Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div>
            <span>Break: </span>
            <strong className="text-slate-600 dark:text-slate-300 font-semibold">
              {selectedDayLogData?.breakDuration || '0s'}
            </strong>
          </div>

          <button
            onClick={() => openDayLogModalForUser(effectiveTargetUser, selectedDayLogData?.date || todayStr)}
            className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 border border-blue-200 dark:border-blue-800 rounded px-2 py-0.5 text-[10.5px] font-bold cursor-pointer transition-colors"
            title={`View all tasks worked on ${selectedDayLogData?.day || 'selected day'}`}
          >
            <Eye size={11} className="text-sky-600 dark:text-sky-400" />
            <span>Day Log 👁️</span>
          </button>
        </div>
      </div>
    </div>
  );
};
