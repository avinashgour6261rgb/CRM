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
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      padding: '14px 18px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      {/* Header: Title + Pill Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={15} color="#0284c7" />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Week Timelogs
          </h3>
        </div>

        {/* Pill Badge: XXh YYm This Week */}
        <div style={{
          backgroundColor: '#0284c7',
          backgroundImage: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
          color: '#ffffff',
          padding: '4px 12px',
          borderRadius: '14px',
          fontSize: '11px',
          fontWeight: '800',
          letterSpacing: '0.01em',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{totalWeeklyFormatted} This Week</span>
        </div>
      </div>

      {/* Weekdays Row: Mo, Tu, We, Th, Fr, Sa, Su */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4px',
        padding: '4px 0'
      }}>
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
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                flex: 1
              }}
              title={isHoliday ? `${dayLog.day}: Company / Public Holiday (Off)` : `Click to view ${dayLog.day}'s timelog: ${dayHrs} worked`}
            >
              {/* Circle badge for selected day, holiday, or plain letter */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: isSelected
                  ? (isHoliday ? '#dc2626' : '#0284c7')
                  : (isHoliday ? '#fee2e2' : (isCurrent ? '#eff6ff' : 'transparent')),
                color: isSelected
                  ? '#ffffff'
                  : (isHoliday ? '#dc2626' : (isCurrent ? '#0284c7' : '#475569')),
                border: isSelected
                  ? 'none'
                  : (isHoliday ? '1.5px solid #f87171' : (isCurrent ? '1.5px solid #bfdbfe' : 'none')),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: isSelected || isCurrent || isHoliday ? '800' : '600',
                boxShadow: isSelected ? (isHoliday ? '0 2px 8px rgba(220, 38, 38, 0.35)' : '0 2px 8px rgba(2, 132, 199, 0.35)') : 'none',
                transition: 'all 0.15s ease'
              }}>
                {dayLog.shortDay}
              </div>

              {/* Hour tag below each day */}
              <span style={{
                fontSize: '9.5px',
                fontWeight: isSelected || isHoliday ? '800' : '600',
                color: isHoliday ? '#dc2626' : (isSelected ? '#0284c7' : (dayHrs !== '0h' ? '#0f172a' : '#94a3b8'))
              }}>
                {dayHrs}
              </span>
            </button>
          );
        })}
      </div>

      {/* Blue Progress Bar */}
      <div style={{
        width: '100%',
        height: '7px',
        backgroundColor: '#e2e8f0',
        borderRadius: '4px',
        overflow: 'hidden',
        marginTop: '2px'
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, Math.max(12, ((totalWeeklyHours || 0) / 40) * 100))}%`,
          backgroundColor: '#0284c7',
          backgroundImage: 'linear-gradient(90deg, #0284c7 0%, #2563eb 100%)',
          borderRadius: '4px',
          transition: 'width 0.4s ease'
        }} />
      </div>

      {/* Subtitle Footer Row: Duration: Xh Ym | Break: 0s | Day Log 👁️ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11.5px',
        color: '#64748b',
        marginTop: '2px',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <div>
          <span>Duration: </span>
          <strong style={{ color: '#0f172a', fontWeight: '800' }}>
            {selectedDayLogData?.durationText || '0h 00m'}
          </strong>
          {isSelectedDayToday && selectedDayLogData?.durationSeconds > 0 && (
            <span style={{ marginLeft: '4px', fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>
              ● Live
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <span>Break: </span>
            <strong style={{ color: '#475569' }}>
              {selectedDayLogData?.breakDuration || '0s'}
            </strong>
          </div>

          <button
            onClick={() => openDayLogModalForUser(effectiveTargetUser, selectedDayLogData?.date || todayStr)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#eff6ff',
              color: '#0284c7',
              border: '1px solid #bfdbfe',
              borderRadius: '5px',
              padding: '2px 8px',
              fontSize: '10.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title={`View all tasks worked on ${selectedDayLogData?.day || 'selected day'}`}
          >
            <Eye size={11} color="#0284c7" />
            <span>Day Log 👁️</span>
          </button>
        </div>
      </div>
    </div>
  );
};
