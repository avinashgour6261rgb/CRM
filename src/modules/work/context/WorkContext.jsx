/**
 * @file WorkContext.jsx
 * @description Central state management for Work Module (Projects, Tasks, Timesheets)
 * with robust, wall-clock persistent live ticking timers (immune to page refresh / tab close)
 * and seamless HR module cross-connection.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { workService } from '../services/workService';
import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { useHR } from '../../hr/context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { hrService } from '../../hr/services/hrService';
import { API_BASE } from '../../../shared/config/apiConfig';
import { OverdueTaskModal } from '../components/tasks/OverdueTaskModal';
import { broadcastSyncEvent, subscribeToSyncEvents, SYNC_EVENTS } from '../../../shared/services/realtimeSyncService';

const WorkContext = createContext();

export const WorkProvider = ({ children }) => {
  const { addToast } = useToast();
  const { currentUser: authUser } = useAuth();
  const { employees, leaves, currentUser: hrUser } = useHR();
  const currentUser = authUser || hrUser;

  const [projects, setProjects] = useState(() => getCollection(KEYS.PROJECTS) || []);
  const [tasks, setTasks] = useState(() => getCollection(KEYS.TASKS) || []);
  const [timesheets, setTimesheets] = useState(() => {
    const raw = getCollection(KEYS.TIMESHEETS) || [];
    const auth = authUser || hrUser;
    const isPriv = auth && (auth.isAdmin || auth.systemRole === 'admin' || auth.systemRole === 'hr' || auth.role === 'Administrator' || auth.role === 'HR Manager');
    if (!isPriv && auth) {
      return raw.filter(ts =>
        ts.employeeId === auth._id ||
        ts.employee === auth._id ||
        ts.employeeId === auth.employeeCode ||
        ts.employee === auth.employeeCode ||
        (ts.employeeName && auth.name && ts.employeeName.toLowerCase() === auth.name.toLowerCase())
      );
    }
    return raw;
  });
  const [loading, setLoading] = useState(false);
  const [overdueTaskPrompt, setOverdueTaskPrompt] = useState(null);

  // Network storm & debounce guards to prevent ERR_INSUFFICIENT_RESOURCES
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const alertedTaskIdsRef = useRef(new Set());

  // Derive stable userKey matching TimerContext for seamless cross-module sync
  const userKey = useMemo(() => {
    return currentUser?.employeeCode || (currentUser?._id ? String(currentUser._id) : (currentUser ? 'ADM-001' : ''));
  }, [currentUser]);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [workSessionDate, setWorkSessionDate] = useState(() => {
    return localStorage.getItem(`ems_work_session_date_${userKey}`) || getTodayStr();
  });

  const activeTimerKey = useMemo(() => `ems_active_task_timer_${userKey}`, [userKey]);

  const isTaskAssignedToMe = useCallback((t) => {
    if (!t || !currentUser) return false;
    const myIds = [userKey, currentUser?._id, currentUser?.employeeCode, currentUser?.email]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());

    const directAssignedTo = (t.assignedTo && typeof t.assignedTo === 'object')
      ? String(t.assignedTo._id || t.assignedTo.id || '')
      : String(t.assignedTo || '');

    const directIds = [t.assignedToId, directAssignedTo, t.employeeId, t.assignedToEmail]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());
    if (myIds.some(uid => directIds.includes(uid))) return true;

    if (Array.isArray(t.assignedToIds) && t.assignedToIds.some(id => myIds.includes(String(id).toLowerCase()))) {
      return true;
    }
    if (Array.isArray(t.assignees) && t.assignees.some(a => {
      const aIds = [a._id, a.id, a.employeeCode, a.email].filter(Boolean).map(s => String(s).toLowerCase());
      if (myIds.some(uid => aIds.includes(uid))) return true;
      if (currentUser?.name && a.name && a.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
      return false;
    })) {
      return true;
    }
    if (Array.isArray(t.assignedMembers) && t.assignedMembers.some(m => {
      const mIds = [m._id, m.id, m.employeeCode, m.email].filter(Boolean).map(s => String(s).toLowerCase());
      if (myIds.some(uid => mIds.includes(uid))) return true;
      if (currentUser?.name && m.name && m.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
      return false;
    })) {
      return true;
    }

    if (t.assignedToName && currentUser?.name && t.assignedToName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) {
      return true;
    }
    return false;
  }, [userKey, currentUser]);

  const isEventForMe = useCallback((e) => {
    if (!e || !e.detail) return true;
    const { userKey: evKey, employeeId: evId, employeeCode: evCode } = e.detail;
    if (!evKey && !evId && !evCode) return true;
    return evKey === userKey ||
      (currentUser?._id && evId && String(evId) === String(currentUser._id)) ||
      (currentUser?.employeeCode && (evKey === currentUser.employeeCode || evCode === currentUser.employeeCode));
  }, [userKey, currentUser]);

  // Read active timer snapshot from storage strictly scoped to current user
  const getActiveTimerSnapshot = useCallback(() => {
    try {
      const keysToCheck = [
        activeTimerKey,
        currentUser?.employeeCode ? `ems_active_task_timer_${currentUser.employeeCode}` : null,
        currentUser?._id ? `ems_active_task_timer_${currentUser._id}` : null
      ].filter(Boolean);

      const today = getTodayStr();
      for (const k of keysToCheck) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (!parsed.date || parsed.date === today)) {
            return parsed;
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [activeTimerKey, currentUser]);

  // Save active timer snapshot to storage strictly scoped to current user
  const saveActiveTimerSnapshot = useCallback((state) => {
    try {
      if (state) {
        const payload = JSON.stringify(state);
        localStorage.setItem(activeTimerKey, payload);
        if (currentUser?.employeeCode) {
          localStorage.setItem(`ems_active_task_timer_${currentUser.employeeCode}`, payload);
        }
        if (currentUser?._id) {
          localStorage.setItem(`ems_active_task_timer_${currentUser._id}`, payload);
        }
      } else {
        localStorage.removeItem(activeTimerKey);
        if (currentUser?.employeeCode) localStorage.removeItem(`ems_active_task_timer_${currentUser.employeeCode}`);
        if (currentUser?._id) localStorage.removeItem(`ems_active_task_timer_${currentUser._id}`);
        localStorage.removeItem('ems_active_task_timer');
      }
    } catch (e) {
      console.error('Error saving active timer snapshot:', e);
    }
  }, [activeTimerKey, currentUser]);

  // Calculate live elapsed seconds using real-world wall-clock timestamps
  const getElapsedSeconds = useCallback((timerState) => {
    if (!timerState) return 0;
    const today = getTodayStr();
    // Guard against previous-day runaway calculations
    if (timerState.date && timerState.date !== today) {
      return Number(timerState.accumulatedSeconds) || Number(timerState.timerSeconds) || 0;
    }
    const base = (timerState.accumulatedSeconds !== undefined && timerState.accumulatedSeconds !== null)
      ? Number(timerState.accumulatedSeconds)
      : (Number(timerState.timerSeconds) || 0);
    if (!timerState.timerRunning || !timerState.startedAt) {
      return base;
    }
    const startTs = typeof timerState.startedAt === 'number' ? timerState.startedAt : new Date(timerState.startedAt).getTime();
    if (!startTs || isNaN(startTs)) return base;
    const elapsedSinceStart = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
    return base + elapsedSinceStart;
  }, []);

  // Format seconds to HH:MM:SS
  const formatSeconds = useCallback((totalSecs) => {
    const safe = Math.max(0, Number(totalSecs) || 0);
    const hrs = String(Math.floor(safe / 3600)).padStart(2, '0');
    const mins = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
    const secs = String(safe % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }, []);

  // Active filter states
  const [projectFilter, setProjectFilter] = useState({ status: 'all', category: 'all', department: 'all', search: '' });
  const [taskFilter, setTaskFilter] = useState({ projectId: 'all', status: 'all', priority: 'all', assignedTo: 'all', hideCompleted: false, search: '' });
  const [timesheetFilter, setTimesheetFilter] = useState({ employeeId: 'all', projectId: 'all', taskId: 'all', date: '', status: 'all', search: '' });

  // Load all Work module data and merge active persistent timer
  const loadWorkData = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const [prjs, rawTsks, times] = await Promise.all([
        workService.getProjects(projectFilter),
        workService.getTasks(taskFilter),
        workService.getTimesheets(timesheetFilter)
      ]);

      const activeTimer = getActiveTimerSnapshot();
      const localTasks = getCollection(KEYS.TASKS) || [];
      const today = getTodayStr();

      // Unified map to ensure no tasks created or updated locally are ever dropped on reload
      const taskMap = new Map();

      const isLegacyTask = (t) => {
        if (!t) return true;
        const code = (t.taskCode || '').toUpperCase().trim();
        if (code === 'CPC-0' || t._id === 'tsk_003' || code.startsWith('MOCK')) return true;
        return false;
      };

      // 1. Seed with local tasks first (excluding legacy test tasks)
      localTasks.forEach(lt => {
        const id = String(lt._id || lt.id);
        if (id && !isLegacyTask(lt)) taskMap.set(id, { ...lt });
      });

      // 2. Merge backend tasks (excluding legacy test tasks)
      (rawTsks || []).forEach(bt => {
        const id = String(bt._id || bt.id);
        if (id && !isLegacyTask(bt)) {
          const existing = taskMap.get(id);
          if (existing) {
            const localSecs = Number(existing.timerSeconds) || 0;
            const backendSecs = Number(bt.timerSeconds) || 0;
            taskMap.set(id, {
              ...bt,
              ...existing,
              timerSeconds: Math.max(localSecs, backendSecs),
              status: existing.status || bt.status
            });
          } else {
            taskMap.set(id, { ...bt });
          }
        }
      });

      // 3. Apply active timer state if running (unified across user perspectives & assignments)
      const mergedList = Array.from(taskMap.values()).map(t => {
        const tId = String(t._id || t.id);
        const isCompleted = t.status === 'completed' || !!t.completedAt;

        // Completed tasks MUST NEVER have a running timer
        if (isCompleted) {
          const staticSecs = Number(t.timerSeconds) || Number(t.durationSeconds) || 0;
          return {
            ...t,
            timerRunning: false,
            startedAt: null,
            timerSeconds: staticSecs,
            accumulatedSeconds: staticSecs,
            liveDurationText: formatSeconds(staticSecs),
            hoursLoggedText: t.hoursLogged ? `${t.hoursLogged}h` : (t.hoursLoggedText || formatSeconds(staticSecs))
          };
        }

        const isActive = activeTimer && (String(activeTimer.taskId) === tId || String(activeTimer._id) === tId);
        const isRunning = (isActive && activeTimer.timerRunning) || (t.timerRunning && t.startedAt);

        if (isRunning) {
          const startedAtTs = (isActive && activeTimer.startedAt) ? activeTimer.startedAt : t.startedAt;
          const baseSecs = (isActive && activeTimer.accumulatedSeconds !== undefined && activeTimer.accumulatedSeconds !== null)
            ? Number(activeTimer.accumulatedSeconds)
            : ((t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null) ? Number(t.accumulatedSeconds) : (Number(t.timerSeconds) || 0));
          const elapsed = Math.max(0, Math.floor((Date.now() - Number(startedAtTs)) / 1000));
          const currentSecs = baseSecs + elapsed;

          return {
            ...t,
            timerRunning: true,
            timerSeconds: currentSecs,
            accumulatedSeconds: baseSecs,
            startedAt: startedAtTs,
            liveDurationText: formatSeconds(currentSecs),
            hoursLoggedText: t.hoursLogged ? `${t.hoursLogged}h` : formatSeconds(currentSecs)
          };
        }

        const staticSecs = Number(t.timerSeconds) || 0;
        return {
          ...t,
          timerRunning: false,
          timerSeconds: staticSecs,
          accumulatedSeconds: staticSecs,
          liveDurationText: formatSeconds(staticSecs),
          hoursLoggedText: t.hoursLogged ? `${t.hoursLogged}h` : (t.hoursLoggedText || formatSeconds(staticSecs))
        };
      });

      // Keep localStorage synchronized so tasks survive refreshes silently without recursive loop
      localStorage.setItem(KEYS.TASKS, JSON.stringify(mergedList));

      setProjects(prjs || []);
      setTasks(mergedList);
      setTimesheets(times || []);
    } catch (err) {
      console.error('Error loading Work module data:', err);
      addToast('Failed to sync Work module data', 'error');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [projectFilter, taskFilter, timesheetFilter, getActiveTimerSnapshot, getElapsedSeconds, formatSeconds, addToast]);

  // Derived reactive active running task strictly scoped to current logged-in user
  const activeRunningTask = useMemo(() => {
    if (!currentUser) return null;
    return tasks.find(t => t.timerRunning && t.status !== 'completed' && !t.completedAt && isTaskAssignedToMe(t)) || null;
  }, [tasks, currentUser, isTaskAssignedToMe]);

  useEffect(() => {
    loadWorkData();

    const scheduleDebouncedLoad = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        loadWorkData();
      }, 300);
    };

    const handleStorageUpdate = (e) => {
      const changedKey = e?.key || e?.detail?.key;
      if (
        !changedKey ||
        ['ems_projects', 'ems_tasks', 'ems_timesheets', activeTimerKey, 'ems_active_task_timer'].includes(changedKey) ||
        changedKey.startsWith('ems_active_task_timer') ||
        changedKey.startsWith('ems_timer_')
      ) {
        scheduleDebouncedLoad();
      }
    };
    window.addEventListener('hrms_storage_change', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // Cross-tab real-time event subscription for 0ms latency sync (debounced to avoid connection flooding)
    const unsubscribeSync = subscribeToSyncEvents((ev) => {
      if ([
        SYNC_EVENTS.TASK_TIMER_STARTED,
        SYNC_EVENTS.TASK_TIMER_PAUSED,
        SYNC_EVENTS.TASK_TIMER_STOPPED,
        SYNC_EVENTS.TASK_COMPLETED,
        SYNC_EVENTS.STORAGE_MUTATION
      ].includes(ev.type)) {
        scheduleDebouncedLoad();
      }
    });

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener('hrms_storage_change', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
      unsubscribeSync();
    };
  }, [loadWorkData, activeTimerKey]);

  // =========================================================================
  // ⏱️ WALL-CLOCK LIVE TICKING TASK TIMER ENGINE (Refresh & Tab-switch Immune)
  // =========================================================================
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const activeTimer = getActiveTimerSnapshot();

      const isShiftOnBreak = localStorage.getItem(`ems_timer_${userKey}_is_on_break`) === 'true' ||
        (currentUser?.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_is_on_break`) === 'true');

      if (isShiftOnBreak && activeTimer?.timerRunning) {
        const currentSecs = getElapsedSeconds(activeTimer);
        const today = getTodayStr();
        const pausedTimerState = {
          ...activeTimer,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: currentSecs,
          date: today,
          wasPausedForBreak: true
        };
        saveActiveTimerSnapshot(pausedTimerState);

        const allTasks = getCollection(KEYS.TASKS) || [];
        const updatedAll = allTasks.map(t => {
          if (String(t._id || t.id) === String(activeTimer.taskId)) {
            return { ...t, timerRunning: false, startedAt: null, accumulatedSeconds: currentSecs, timerSeconds: currentSecs };
          }
          return t;
        });
        saveCollection(KEYS.TASKS, updatedAll);

        setTasks(prevTasks => prevTasks.map(t => {
          if (String(t._id || t.id) === String(activeTimer.taskId)) {
            return { ...t, timerRunning: false, startedAt: null, accumulatedSeconds: currentSecs, timerSeconds: currentSecs, liveDurationText: formatSeconds(currentSecs) };
          }
          return t;
        }));
        return;
      }

      setTasks((prevTasks) => {
        let changed = false;
        const now = Date.now();

        const updated = prevTasks.map((t) => {
          const tId = String(t._id || t.id);
          const isCompleted = t.status === 'completed' || !!t.completedAt;

          if (isCompleted) {
            if (t.timerRunning) {
              changed = true;
              return { ...t, timerRunning: false, startedAt: null };
            }
            return t;
          }

          const isMyActive = activeTimer && activeTimer.timerRunning && (String(activeTimer.taskId) === tId || String(activeTimer._id) === tId);
          const isTaskRunning = isMyActive || (t.timerRunning && t.startedAt);

          if (isTaskRunning) {
            changed = true;
            const startTs = (isMyActive && activeTimer.startedAt) ? Number(activeTimer.startedAt) : Number(t.startedAt);
            const base = (isMyActive && activeTimer.accumulatedSeconds !== undefined && activeTimer.accumulatedSeconds !== null)
              ? Number(activeTimer.accumulatedSeconds)
              : ((t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null) ? Number(t.accumulatedSeconds) : (Number(t.timerSeconds) || 0));
            const elapsed = Math.max(0, Math.floor((now - startTs) / 1000));
            const liveSecs = base + elapsed;
            const text = formatSeconds(liveSecs);

            return {
              ...t,
              timerRunning: true,
              startedAt: startTs,
              accumulatedSeconds: base,
              timerSeconds: liveSecs,
              liveDurationText: text,
              hoursLoggedText: text,
              sessionDate: getTodayStr()
            };
          }
          return t;
        });

        return changed ? updated : prevTasks;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [getActiveTimerSnapshot, getElapsedSeconds, formatSeconds, userKey, saveActiveTimerSnapshot, currentUser, isTaskAssignedToMe]);

  // Catch up immediately when tab gains focus or visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const activeTimer = getActiveTimerSnapshot();
        if (activeTimer && activeTimer.timerRunning) {
          const liveSecs = getElapsedSeconds(activeTimer);
          const text = formatSeconds(liveSecs);
          setTasks(prev => prev.map(t => t._id === activeTimer.taskId ? { ...t, timerRunning: true, timerSeconds: liveSecs, hoursLoggedText: text } : t));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [getActiveTimerSnapshot, getElapsedSeconds, formatSeconds]);

  // ── Automatic Task Timer Pause & Resume on Break ──
  useEffect(() => {
    const handleBreakStarted = (e) => {
      if (!isEventForMe(e)) return; // Ignore breaks for other employees!
      const activeTimer = getActiveTimerSnapshot();
      if (activeTimer && activeTimer.timerRunning) {
        const currentSecs = getElapsedSeconds(activeTimer);
        const pausedState = {
          ...activeTimer,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: currentSecs,
          wasPausedForBreak: true
        };
        saveActiveTimerSnapshot(pausedState);

        setTasks(prevTasks => prevTasks.map(t => {
          if (t._id === activeTimer.taskId) {
            return { ...t, timerRunning: false, timerSeconds: currentSecs, wasPausedForBreak: true };
          }
          return t;
        }));
      }
    };

    const handleBreakEnded = (e) => {
      if (!isEventForMe(e)) return; // Ignore break ends for other employees!
      const activeTimer = getActiveTimerSnapshot();
      if (activeTimer) {
        // Keep task timer paused so user can explicitly click Resume on the task
        const currentSecs = Number(activeTimer.accumulatedSeconds) || 0;
        const pausedState = {
          ...activeTimer,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: currentSecs,
          wasPausedForBreak: false
        };
        saveActiveTimerSnapshot(pausedState);

        setTasks(prevTasks => prevTasks.map(t => {
          if (t._id === activeTimer.taskId) {
            return { ...t, timerRunning: false, wasPausedForBreak: false, liveDurationText: formatSeconds(currentSecs) };
          }
          return t;
        }));
      }
    };

    window.addEventListener('ems_break_started', handleBreakStarted);
    window.addEventListener('ems_break_ended', handleBreakEnded);
    return () => {
      window.removeEventListener('ems_break_started', handleBreakStarted);
      window.removeEventListener('ems_break_ended', handleBreakEnded);
    };
  }, [getActiveTimerSnapshot, getElapsedSeconds, saveActiveTimerSnapshot, formatSeconds, isEventForMe]);

  // ── Automatic Task Timer Pause on Clock-In (Task timer should NOT auto-start on Shift Clock-In) ──
  useEffect(() => {
    const handleClockedIn = (e) => {
      if (!isEventForMe(e)) return; // Ignore clock-in for other employees!
      const activeTimer = getActiveTimerSnapshot();
      if (activeTimer) {
        const currentSecs = Number(activeTimer.accumulatedSeconds) || 0;
        const today = getTodayStr();
        const pausedState = {
          ...activeTimer,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: currentSecs,
          date: today,
          wasPausedForClockOut: false
        };
        saveActiveTimerSnapshot(pausedState);

        const allTasks = getCollection(KEYS.TASKS) || [];
        const updatedAll = allTasks.map(t => {
          if (t._id === activeTimer.taskId) {
            return { ...t, timerRunning: false, timerSeconds: currentSecs, sessionDate: today };
          }
          if (t.timerRunning && isTaskAssignedToMe(t)) {
            return { ...t, timerRunning: false };
          }
          return t;
        });
        saveCollection(KEYS.TASKS, updatedAll);

        setTasks(prev => prev.map(t => {
          if (t._id === activeTimer.taskId) {
            return {
              ...t,
              timerRunning: false,
              timerSeconds: currentSecs,
              sessionDate: today,
              liveDurationText: formatSeconds(currentSecs)
            };
          }
          if (t.timerRunning && isTaskAssignedToMe(t)) {
            return { ...t, timerRunning: false };
          }
          return t;
        }));
      } else {
        const allTasks = getCollection(KEYS.TASKS) || [];
        const updatedAll = allTasks.map(t => {
          if (t.timerRunning && isTaskAssignedToMe(t)) {
            return { ...t, timerRunning: false };
          }
          return t;
        });
        saveCollection(KEYS.TASKS, updatedAll);
        setTasks(prev => prev.map(t => (t.timerRunning && isTaskAssignedToMe(t) ? { ...t, timerRunning: false } : t)));
      }
    };

    window.addEventListener('ems_clocked_in', handleClockedIn);
    window.addEventListener('ems_reclock_in', handleClockedIn);
    return () => {
      window.removeEventListener('ems_clocked_in', handleClockedIn);
      window.removeEventListener('ems_reclock_in', handleClockedIn);
    };
  }, [getActiveTimerSnapshot, saveActiveTimerSnapshot, formatSeconds, isEventForMe, isTaskAssignedToMe]);

  // ── Automatic Task Timer Pause on Clock-Out ──
  useEffect(() => {
    const handleClockedOut = (e) => {
      if (!isEventForMe(e)) return; // Ignore clock-out for other employees!
      const activeTimer = getActiveTimerSnapshot();
      if (activeTimer) {
        const currentSecs = getElapsedSeconds(activeTimer);
        const today = getTodayStr();
        const pausedState = {
          ...activeTimer,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: currentSecs,
          date: today,
          wasPausedForClockOut: true
        };
        saveActiveTimerSnapshot(pausedState);

        const allTasks = getCollection(KEYS.TASKS) || [];
        const updatedAll = allTasks.map(t => {
          if (t._id === activeTimer.taskId) {
            return { ...t, timerRunning: false, timerSeconds: currentSecs, sessionDate: today };
          }
          return t;
        });
        saveCollection(KEYS.TASKS, updatedAll);

        setTasks(prev => prev.map(t => {
          if (t._id === activeTimer.taskId) {
            return { ...t, timerRunning: false, timerSeconds: currentSecs, sessionDate: today, liveDurationText: formatSeconds(currentSecs) };
          }
          return t;
        }));

        // Automatically log today's task session duration to timesheets
        if (currentSecs > 0) {
          workService.createTimesheet({
            taskId: activeTimer.taskId,
            taskCode: activeTimer.taskCode,
            taskTitle: activeTimer.title,
            projectName: activeTimer.projectName,
            employeeId: activeTimer.assignedToId,
            employeeName: activeTimer.assignedToName,
            date: activeTimer.date || today,
            totalDurationSeconds: currentSecs,
            totalDurationText: formatSeconds(currentSecs),
            memo: 'Shift clock-out session auto-save',
            status: 'stopped'
          }).catch(err => console.warn('Clock-out auto timesheet error:', err));
        }

        addToast('Shift Clocked Out: Active task timer paused & logged ⏸️', 'info');
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      }
    };

    window.addEventListener('ems_clocked_out', handleClockedOut);
    window.addEventListener('ems_force_clock_out', handleClockedOut);
    window.addEventListener('ems_shift_ended', handleClockedOut);
    window.addEventListener('ems_reclock_requests_updated', handleClockedOut);
    return () => {
      window.removeEventListener('ems_clocked_out', handleClockedOut);
      window.removeEventListener('ems_force_clock_out', handleClockedOut);
      window.removeEventListener('ems_shift_ended', handleClockedOut);
      window.removeEventListener('ems_reclock_requests_updated', handleClockedOut);
    };
  }, [getActiveTimerSnapshot, getElapsedSeconds, saveActiveTimerSnapshot, formatSeconds, addToast]);

  // ── Day Change Rollover Check (New Day fresh start, 00:00:00 reset) ──
  useEffect(() => {
    const checkDayRollover = () => {
      const today = getTodayStr();
      const storedWorkDate = localStorage.getItem(`ems_work_session_date_${userKey}`) || today;

      if (storedWorkDate !== today) {
        localStorage.setItem(`ems_work_session_date_${userKey}`, today);
        setWorkSessionDate(today);

        // Check if yesterday had an active unclosed timer
        const rawSaved = localStorage.getItem(activeTimerKey);
        if (rawSaved) {
          try {
            const prev = JSON.parse(rawSaved);
            if (prev && prev.date && prev.date !== today) {
              const duration = Number(prev.accumulatedSeconds) || 60;
              workService.createTimesheet({
                taskId: prev.taskId,
                taskCode: prev.taskCode,
                taskTitle: prev.title,
                projectName: prev.projectName,
                employeeId: prev.assignedToId,
                employeeName: prev.assignedToName,
                date: prev.date || storedWorkDate,
                totalDurationSeconds: Math.min(duration, 8 * 3600),
                totalDurationText: formatSeconds(Math.min(duration, 8 * 3600)),
                memo: 'Automatic end-of-day timesheet close',
                status: 'stopped'
              }).catch(e => console.warn('Auto timesheet close error:', e));
            }
          } catch (e) {}
        }

        // Reset active timer snapshot for the new day
        saveActiveTimerSnapshot(null);

        // Reset all tasks' session timer to 0 for the fresh new day
        const allTasks = getCollection(KEYS.TASKS) || [];
        const resetTasks = allTasks.map(t => ({
          ...t,
          timerRunning: false,
          timerSeconds: 0,
          sessionDate: today
        }));
        saveCollection(KEYS.TASKS, resetTasks);

        setTasks(prev => prev.map(t => ({
          ...t,
          timerRunning: false,
          timerSeconds: 0,
          sessionDate: today
        })));

        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      }
    };

    checkDayRollover();
    const interval = setInterval(checkDayRollover, 15000); // Check every 15s

    const handleRolloverEvent = () => checkDayRollover();
    window.addEventListener('ems_day_rollover', handleRolloverEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ems_day_rollover', handleRolloverEvent);
    };
  }, [userKey, activeTimerKey, saveActiveTimerSnapshot, formatSeconds]);

  // =========================================================================
  // 🏢 PROJECT ACTIONS
  // =========================================================================
  const createProject = async (projectData) => {
    try {
      const created = await workService.createProject(projectData);
      addToast(`Project "${created.name}" created successfully!`, 'success');
      await loadWorkData();
      return created;
    } catch (err) {
      addToast('Failed to create project', 'error');
      throw err;
    }
  };

  const updateProject = async (id, projectData) => {
    try {
      const updated = await workService.updateProject(id, projectData);
      addToast(`Project "${updated.name}" updated`, 'success');
      await loadWorkData();
      return updated;
    } catch (err) {
      addToast('Failed to update project', 'error');
      throw err;
    }
  };

  const deleteProject = async (id) => {
    try {
      await workService.deleteProject(id);
      addToast('Project removed successfully', 'info');
      await loadWorkData();
    } catch (err) {
      addToast('Failed to delete project', 'error');
      throw err;
    }
  };

  const submitProjectForCompletion = async (id, notes = '') => {
    try {
      const allProjects = getCollection(KEYS.PROJECTS) || [];
      const targetProj = allProjects.find(p => String(p._id || p.id) === String(id) || p.projectCode === id);
      const updatePayload = {
        status: 'under_review',
        progress: 100,
        completionSubmittedBy: currentUser?.name || 'Team Member',
        completionSubmittedById: currentUser?._id,
        completionSubmittedAt: new Date().toISOString(),
        completionNotes: notes || 'Project submitted for Admin final sign-off',
        finalApproved: false,
        reopened: false
      };

      const updated = await workService.updateProject(id, updatePayload);
      addToast(`🚀 Project "${targetProj?.name || id}" submitted for Admin completion review!`, 'success');
      await loadWorkData();
      return updated;
    } catch (err) {
      console.error('Error submitting project for completion:', err);
      addToast('Failed to submit project for completion', 'error');
      throw err;
    }
  };

  const approveProjectCompletion = async (id) => {
    try {
      const allProjects = getCollection(KEYS.PROJECTS) || [];
      const targetProj = allProjects.find(p => String(p._id || p.id) === String(id) || p.projectCode === id);
      const approverName = currentUser?.name || 'Admin';
      const updatePayload = {
        status: 'completed',
        progress: 100,
        finalApproved: true,
        finalApprovedBy: approverName,
        finalApprovedAt: new Date().toISOString(),
        reopened: false,
        reopenReason: ''
      };

      const updated = await workService.updateProject(id, updatePayload);

      try {
        hrService.createAttendanceAuditLog({
          type: 'project_final_approved',
          action: 'project_final_approved',
          date: new Date().toISOString().split('T')[0],
          employeeId: currentUser?._id || 'admin',
          employeeName: approverName,
          note: `Project #${targetProj?.projectCode || id} "${targetProj?.name || ''}" officially finalized and approved by ${approverName}`
        });
      } catch (_) {}

      addToast(`🎉 Project "${targetProj?.name || id}" officially finalized & marked complete!`, 'success');
      await loadWorkData();
      return updated;
    } catch (err) {
      console.error('Error approving project completion:', err);
      addToast('Failed to approve project completion', 'error');
      throw err;
    }
  };

  const reopenProject = async (id, reason = 'Work incomplete / revisions required') => {
    try {
      const allProjects = getCollection(KEYS.PROJECTS) || [];
      const targetProj = allProjects.find(p => String(p._id || p.id) === String(id) || p.projectCode === id);
      const adminName = currentUser?.name || 'Admin';
      const updatePayload = {
        status: 'in_progress',
        progress: 85,
        finalApproved: false,
        reopened: true,
        reopenReason: reason || 'Reopened by Admin for required revisions',
        reopenedBy: adminName,
        reopenedAt: new Date().toISOString()
      };

      const updated = await workService.updateProject(id, updatePayload);

      try {
        hrService.createAttendanceAuditLog({
          type: 'project_reopened',
          action: 'project_reopened',
          date: new Date().toISOString().split('T')[0],
          employeeId: currentUser?._id || 'admin',
          employeeName: adminName,
          note: `Project #${targetProj?.projectCode || id} "${targetProj?.name || ''}" reopened by ${adminName}: ${reason}`
        });
      } catch (_) {}

      addToast(`🔄 Project "${targetProj?.name || id}" reopened for revisions!`, 'info');
      await loadWorkData();
      return updated;
    } catch (err) {
      console.error('Error reopening project:', err);
      addToast('Failed to reopen project', 'error');
      throw err;
    }
  };

  // =========================================================================
  // 📋 TASK ACTIONS & ROBUST TIMERS
  // =========================================================================
  const createTask = async (taskData) => {
    try {
      const created = await workService.createTask(taskData);
      await loadWorkData();
      return created;
    } catch (err) {
      addToast('Failed to create task', 'error');
      throw err;
    }
  };

  const updateTask = async (id, taskData) => {
    try {
      const updated = await workService.updateTask(id, taskData);
      addToast(`Task "${updated.title}" updated`, 'success');
      await loadWorkData();
      return updated;
    } catch (err) {
      addToast('Failed to update task', 'error');
      throw err;
    }
  };

  const changeTaskStatus = async (id, status) => {
    try {
      if (status === 'completed') {
        return await completeTask(id);
      }
      const activeTimer = getActiveTimerSnapshot();
      if (activeTimer && activeTimer.taskId === id && activeTimer.timerRunning) {
        if (status === 'on_hold' || status === 'incomplete' || status === 'pending') {
          pauseTaskTimer(id);
        } else {
          await stopTaskTimer(id, `Status changed to ${status}`);
        }
      }
      await workService.updateTaskStatus(id, status);
      await workService.updateTask(id, { status });
      addToast(`Task status changed to ${status.replace('_', ' ').toUpperCase()}`, 'success');
      await loadWorkData();
    } catch (err) {
      addToast('Failed to change task status', 'error');
    }
  };

  const deleteTask = async (id) => {
    try {
      const activeTimer = getActiveTimerSnapshot();
      if (activeTimer && activeTimer.taskId === id) {
        saveActiveTimerSnapshot(null);
      }
      await workService.deleteTask(id);
      addToast('Task deleted successfully', 'info');
      await loadWorkData();
    } catch (err) {
      addToast('Failed to delete task', 'error');
    }
  };

  const purgeAllTasks = async () => {
    try {
      saveActiveTimerSnapshot(null);
      await workService.purgeAllTasks();
      addToast('🧹 All legacy tasks purged successfully! System ready for fresh tasks.', 'success');
      await loadWorkData();
    } catch (err) {
      addToast('Failed to purge tasks', 'error');
    }
  };

  // ── Overdue Task Detection ──
  const isTaskOverdue = useCallback((task) => {
    if (!task || !task.dueDate || task.hasNoDueDate || task.isUntimed || task.status === 'completed') return false;
    const today = getTodayStr();
    return task.dueDate < today;
  }, []);

  const rescheduleTaskForFuture = useCallback(async (taskId, newDueDate, note = '') => {
    try {
      const target = tasks.find(t => String(t._id || t.id) === String(taskId));
      if (!target) return;

      const nowIso = new Date().toISOString();
      const historyItem = {
        id: `hist_${Date.now()}_reschedule`,
        action: 'rescheduled',
        title: 'Task Assigned / Rescheduled for Future Date',
        timestamp: nowIso,
        performedBy: currentUser?.name || 'User',
        performedById: currentUser?._id,
        from: target.dueDate || 'Past / No Date',
        to: newDueDate,
        details: `Task #${target.taskCode || ''} rescheduled to future date: ${newDueDate}${note ? ` (${note})` : ''}`
      };

      const updatedHistory = [...(Array.isArray(target.history) ? target.history : []), historyItem];

      await updateTask(taskId, {
        dueDate: newDueDate,
        hasNoDueDate: false,
        isUntimed: false,
        snoozed: false,
        remindAt: null,
        reminderAlerted: false,
        history: updatedHistory,
        rescheduleNote: note
      });

      if (overdueTaskPrompt && String(overdueTaskPrompt._id || overdueTaskPrompt.id) === String(taskId)) {
        setOverdueTaskPrompt(null);
      }

      addToast(`📅 Task #${target.taskCode || ''} assigned/scheduled for ${newDueDate}!`, 'success');
      await loadWorkData();
    } catch (e) {
      console.error('Error rescheduling task:', e);
      addToast('Failed to reschedule task for future', 'error');
    }
  }, [tasks, currentUser, updateTask, overdueTaskPrompt, loadWorkData, addToast]);

  const extendTaskDeadline = useCallback(async (taskId, days = 1) => {
    try {
      const target = tasks.find(t => String(t._id || t.id) === String(taskId));
      if (!target) return;
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + days);
      const newDueDate = baseDate.toISOString().split('T')[0];

      await rescheduleTaskForFuture(taskId, newDueDate, `Extended +${days} day${days > 1 ? 's' : ''}`);
      // Auto start timer once deadline extended
      setTimeout(() => {
        startTaskTimer(taskId, { forceOverdue: true });
      }, 80);
    } catch (e) {
      addToast('Failed to extend task deadline', 'error');
    }
  }, [tasks, rescheduleTaskForFuture, addToast]);

  // ── Start / Resume Task Timer (Wall-Clock Precision & Real-Time Sync) ──
  const startTaskTimer = (taskId, options = {}) => {
    const allTasks = getCollection(KEYS.TASKS) || [];
    const targetTask = tasks.find(t => String(t._id || t.id) === String(taskId)) ||
      allTasks.find(t => String(t._id || t.id) === String(taskId));
    if (!targetTask) return;

    // Detect if this task is assigned to another employee
    const assignedEmpId = targetTask.assignedToId || targetTask.assignedTo;
    const assignedEmpName = targetTask.assignedToName || 'Employee';
    const isUserAdminOrHR = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr' || currentUser?.role === 'Administrator' || currentUser?.role === 'HR Manager';
    const isForOtherEmployee = isUserAdminOrHR && assignedEmpId && String(assignedEmpId) !== String(userKey) && String(assignedEmpId) !== String(currentUser?._id);

    // Target user who owns this task
    const targetUserKey = isForOtherEmployee ? assignedEmpId : userKey;

    // 1. Shift Sync: Ensure shift is actively marked clocked in for target user
    if (isForOtherEmployee) {
      const isEmpClockedIn = localStorage.getItem(`ems_timer_${targetUserKey}_is_clocked_in`) === 'true';
      if (!isEmpClockedIn) {
        const today = getTodayStr();
        const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(`ems_timer_${targetUserKey}_is_clocked_in`, 'true');
        localStorage.setItem(`ems_timer_${targetUserKey}_is_running`, 'true');
        localStorage.setItem(`ems_timer_${targetUserKey}_login_time`, nowStr);
        localStorage.setItem(`ems_timer_${targetUserKey}_clock_in_timestamp`, Date.now().toString());
        window.dispatchEvent(new CustomEvent('ems_clocked_in', { detail: { userKey: targetUserKey, loginTime: nowStr, date: today } }));
      }
    } else {
      const isClockedIn = localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true' ||
        (currentUser?.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_is_clocked_in`) === 'true');
      if (!isClockedIn) {
        const today = getTodayStr();
        const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'true');
        localStorage.setItem(`ems_timer_${userKey}_is_running`, 'true');
        localStorage.setItem(`ems_timer_${userKey}_login_time`, nowStr);
        localStorage.setItem(`ems_timer_${userKey}_clock_in_timestamp`, Date.now().toString());
        if (currentUser?.employeeCode) {
          localStorage.setItem(`ems_timer_${currentUser.employeeCode}_is_clocked_in`, 'true');
        }
        window.dispatchEvent(new CustomEvent('ems_clocked_in', { detail: { userKey, employeeId: currentUser?._id, employeeCode: currentUser?.employeeCode, loginTime: nowStr, date: today } }));
        window.dispatchEvent(new CustomEvent('ems_request_clock_in', { detail: { userKey, employeeId: currentUser?._id, employeeCode: currentUser?.employeeCode, loginTime: nowStr, date: today } }));
      }

      // 2. Break Guard for self
      const isOnBreak = localStorage.getItem(`ems_timer_${userKey}_is_on_break`) === 'true' ||
        (currentUser?.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_is_on_break`) === 'true');
      if (isOnBreak) {
        addToast('☕ You are currently on break. Please resume work first before tracking task time!', 'warning');
        return;
      }
    }

    // 3. Overdue Task Guard
    const isOverdue = isTaskOverdue(targetTask);
    if (isOverdue && !options.forceOverdue) {
      setOverdueTaskPrompt(targetTask);
      addToast(`⚠️ Task #${targetTask.taskCode || ''} is overdue (Due: ${targetTask.dueDate})! Please update deadline or mark completed.`, 'warning');
      return;
    }

    const today = getTodayStr();
    const now = Date.now();
    const activeTimer = getActiveTimerSnapshot();

    // If an unclosed timer from a previous date exists, auto-archive it
    if (activeTimer && activeTimer.date && activeTimer.date !== today) {
      const prevSecs = Number(activeTimer.accumulatedSeconds) || 0;
      if (prevSecs > 0) {
        workService.createTimesheet({
          taskId: activeTimer.taskId,
          taskCode: activeTimer.taskCode,
          taskTitle: activeTimer.title,
          projectName: activeTimer.projectName,
          employeeId: activeTimer.assignedToId,
          employeeName: activeTimer.assignedToName,
          date: activeTimer.date,
          totalDurationSeconds: prevSecs,
          totalDurationText: formatSeconds(prevSecs),
          memo: 'Auto-saved session from previous day',
          status: 'stopped'
        }).catch(err => console.warn('Auto timesheet archive error:', err));
      }
    }

    // Previous running task detection
    let previousTaskId = null;
    let previousTaskElapsed = 0;
    const runningPrevTask = tasks.find(t => t.timerRunning && String(t._id || t.id) !== String(taskId) && (String(t.activeUserId) === String(targetUserKey) || String(t.assignedToId) === String(targetUserKey)));
    if (runningPrevTask) {
      previousTaskId = runningPrevTask._id;
      const prevStart = runningPrevTask.startedAt ? Number(runningPrevTask.startedAt) : 0;
      const prevBase = (runningPrevTask.accumulatedSeconds !== undefined && runningPrevTask.accumulatedSeconds !== null)
        ? Number(runningPrevTask.accumulatedSeconds)
        : (Number(runningPrevTask.timerSeconds) || 0);
      previousTaskElapsed = prevBase + (prevStart > 0 ? Math.max(0, Math.floor((now - prevStart) / 1000)) : 0);
    } else if (activeTimer && activeTimer.timerRunning && String(activeTimer.taskId) !== String(taskId) && !isForOtherEmployee) {
      previousTaskId = activeTimer.taskId;
      previousTaskElapsed = getElapsedSeconds(activeTimer);
    }

    // Existing seconds for today's session
    let existingSecs = (targetTask.accumulatedSeconds !== undefined && targetTask.accumulatedSeconds !== null)
      ? Number(targetTask.accumulatedSeconds)
      : (Number(targetTask.timerSeconds) || 0);
    if (activeTimer && String(activeTimer.taskId) === String(taskId) && !isForOtherEmployee) {
      existingSecs = Math.max(existingSecs, getElapsedSeconds(activeTimer));
    }

    const newTimerState = {
      taskId: targetTask._id,
      taskCode: targetTask.taskCode || 'TSK',
      title: targetTask.title,
      projectName: targetTask.projectName || 'General Work',
      assignedToId: assignedEmpId || userKey,
      assignedToName: assignedEmpName,
      timerRunning: true,
      startedAt: now,
      accumulatedSeconds: existingSecs,
      date: today,
      lastUpdated: now,
      startedBy: currentUser?.name || 'User',
      startedById: currentUser?._id
    };

    // Save timer snapshot for target employee
    const timerPayload = JSON.stringify(newTimerState);
    localStorage.setItem(`ems_active_task_timer_${targetUserKey}`, timerPayload);
    const targetEmpObj = (employees || []).find(e => String(e._id) === String(targetUserKey) || String(e.employeeCode) === String(targetUserKey));
    if (targetEmpObj) {
      if (targetEmpObj.employeeCode) localStorage.setItem(`ems_active_task_timer_${targetEmpObj.employeeCode}`, timerPayload);
      if (targetEmpObj._id) localStorage.setItem(`ems_active_task_timer_${targetEmpObj._id}`, timerPayload);
    }

    if (!isForOtherEmployee) {
      saveActiveTimerSnapshot(newTimerState);
    }

    // Save in storage collection: pause previous task and start new task
    const updatedAll = allTasks.map(t => {
      const tId = String(t._id || t.id);
      if (tId === String(taskId)) {
        return {
          ...t,
          timerRunning: true,
          startedAt: now,
          accumulatedSeconds: existingSecs,
          timerSeconds: existingSecs,
          activeUserId: targetUserKey,
          activeUserName: assignedEmpName,
          startedBy: currentUser?.name || 'User',
          sessionDate: today,
          liveDurationText: formatSeconds(existingSecs),
          status: t.status === 'incomplete' ? 'in_progress' : t.status
        };
      }
      if (previousTaskId && tId === String(previousTaskId)) {
        return {
          ...t,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: previousTaskElapsed,
          timerSeconds: previousTaskElapsed,
          liveDurationText: formatSeconds(previousTaskElapsed),
          sessionDate: today
        };
      }
      if (t.timerRunning && (String(t.activeUserId) === String(targetUserKey) || String(t.assignedToId) === String(targetUserKey))) {
        const tElapsed = t.startedAt ? Math.max(0, Math.floor((now - Number(t.startedAt)) / 1000)) : 0;
        const tBase = (t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null)
          ? Number(t.accumulatedSeconds)
          : (Number(t.timerSeconds) || 0);
        const tTotal = tBase + tElapsed;
        return {
          ...t,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: tTotal,
          timerSeconds: tTotal,
          liveDurationText: formatSeconds(tTotal),
          sessionDate: today
        };
      }
      return t;
    });
    saveCollection(KEYS.TASKS, updatedAll);

    // Instant cross-tab broadcast
    broadcastSyncEvent(SYNC_EVENTS.TASK_TIMER_STARTED, {
      taskId,
      empKey: targetUserKey,
      taskTitle: targetTask.title,
      startedAt: now,
      accumulatedSeconds: existingSecs,
      startedBy: currentUser?.name || 'User',
      empName: assignedEmpName
    });
    window.dispatchEvent(new CustomEvent('ems_task_timer_started', {
      detail: { taskId, userKey: targetUserKey, empKey: targetUserKey, startedAt: now }
    }));
    if (previousTaskId) {
      window.dispatchEvent(new CustomEvent('ems_task_timer_paused', {
        detail: { taskId: previousTaskId, userKey: targetUserKey, empKey: targetUserKey }
      }));
    }

    setTasks(prev => prev.map(t => {
      const tId = String(t._id || t.id);
      if (tId === String(taskId)) {
        return {
          ...t,
          timerRunning: true,
          startedAt: now,
          accumulatedSeconds: existingSecs,
          timerSeconds: existingSecs,
          activeUserId: targetUserKey,
          activeUserName: assignedEmpName,
          startedBy: currentUser?.name || 'User',
          sessionDate: today,
          liveDurationText: formatSeconds(existingSecs),
          status: t.status === 'incomplete' ? 'in_progress' : t.status
        };
      }
      if (previousTaskId && tId === String(previousTaskId)) {
        return {
          ...t,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: previousTaskElapsed,
          timerSeconds: previousTaskElapsed,
          sessionDate: today,
          liveDurationText: formatSeconds(previousTaskElapsed)
        };
      }
      if (t.timerRunning && (String(t.activeUserId) === String(targetUserKey) || String(t.assignedToId) === String(targetUserKey))) {
        const tElapsed = t.startedAt ? Math.max(0, Math.floor((now - Number(t.startedAt)) / 1000)) : 0;
        const tBase = (t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null)
          ? Number(t.accumulatedSeconds)
          : (Number(t.timerSeconds) || 0);
        const tTotal = tBase + tElapsed;
        return {
          ...t,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: tTotal,
          timerSeconds: tTotal,
          liveDurationText: formatSeconds(tTotal),
          sessionDate: today
        };
      }
      return t;
    }));

    // Daily Activity Audit Record
    try {
      hrService.createAttendanceAuditLog({
        type: 'task_timer_start',
        action: 'task_timer_start',
        date: today,
        employeeId: targetUserKey,
        employeeCode: targetEmpObj?.employeeCode || targetUserKey,
        employeeName: assignedEmpName,
        taskCode: targetTask.taskCode || 'TSK',
        taskTitle: targetTask.title,
        note: `Started working on #${targetTask.taskCode || 'TSK'}: ${targetTask.title}${isForOtherEmployee ? ` (started by ${currentUser?.name || 'Admin'})` : ''}`
      });
    } catch (e) {}

    if (isForOtherEmployee) {
      addToast(`⏱️ Started timer for ${assignedEmpName} on "${targetTask.title}"! Live time is syncing in real time.`, 'success');
    } else if (previousTaskId) {
      const prevTitle = activeTimer?.title || 'Previous Task';
      addToast(`🔄 Auto-switched: "${prevTitle}" paused (${formatSeconds(previousTaskElapsed)} saved), now tracking "${targetTask.title}"!`, 'info');
    } else {
      addToast(`⏱️ Started tracking work on "${targetTask.title}"!`, 'info');
    }
  };

  // ── Pause Task Timer (Wall-Clock Precision & Real-Time Sync) ──
  const pauseTaskTimer = (taskId) => {
    const today = getTodayStr();
    const now = Date.now();
    const activeTimer = getActiveTimerSnapshot();
    const allTasks = getCollection(KEYS.TASKS) || [];
    const targetTask = tasks.find(t => String(t._id || t.id) === String(taskId)) ||
      allTasks.find(t => String(t._id || t.id) === String(taskId));
    if (!targetTask) return;

    const assignedEmpId = targetTask.assignedToId || targetTask.assignedTo;
    const isUserAdminOrHR = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr' || currentUser?.role === 'Administrator' || currentUser?.role === 'HR Manager';
    const isForOtherEmployee = isUserAdminOrHR && assignedEmpId && String(assignedEmpId) !== String(userKey) && String(assignedEmpId) !== String(currentUser?._id);
    const targetUserKey = isForOtherEmployee ? assignedEmpId : userKey;

    let currentSecs = (targetTask.accumulatedSeconds !== undefined && targetTask.accumulatedSeconds !== null)
      ? Number(targetTask.accumulatedSeconds)
      : (Number(targetTask.timerSeconds) || 0);

    if (targetTask.timerRunning && targetTask.startedAt) {
      const elapsed = Math.max(0, Math.floor((now - Number(targetTask.startedAt)) / 1000));
      currentSecs = currentSecs + elapsed;
    } else if (activeTimer && (String(activeTimer.taskId) === String(taskId) || String(activeTimer._id) === String(taskId)) && !isForOtherEmployee) {
      currentSecs = getElapsedSeconds(activeTimer);
    }

    const pausedTimerState = {
      taskId: targetTask._id,
      timerRunning: false,
      startedAt: null,
      accumulatedSeconds: currentSecs,
      date: today
    };

    const timerPayload = JSON.stringify(pausedTimerState);
    localStorage.setItem(`ems_active_task_timer_${targetUserKey}`, timerPayload);
    const targetEmpObj = (employees || []).find(e => String(e._id) === String(targetUserKey) || String(e.employeeCode) === String(targetUserKey));
    if (targetEmpObj) {
      if (targetEmpObj.employeeCode) localStorage.setItem(`ems_active_task_timer_${targetEmpObj.employeeCode}`, timerPayload);
      if (targetEmpObj._id) localStorage.setItem(`ems_active_task_timer_${targetEmpObj._id}`, timerPayload);
    }

    if (!isForOtherEmployee) {
      saveActiveTimerSnapshot(pausedTimerState);
    }

    // Save in storage collection
    const updatedAll = allTasks.map(t => {
      if (String(t._id || t.id) === String(taskId)) {
        return {
          ...t,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: currentSecs,
          timerSeconds: currentSecs,
          sessionDate: today,
          liveDurationText: formatSeconds(currentSecs)
        };
      }
      return t;
    });
    saveCollection(KEYS.TASKS, updatedAll);

    broadcastSyncEvent(SYNC_EVENTS.TASK_TIMER_PAUSED, {
      taskId,
      empKey: targetUserKey,
      accumulatedSeconds: currentSecs,
      pausedBy: currentUser?.name || 'User',
      taskTitle: targetTask.title
    });
    window.dispatchEvent(new CustomEvent('ems_task_timer_paused', {
      detail: { taskId, userKey: targetUserKey, empKey: targetUserKey }
    }));

    setTasks(prev => prev.map(t => {
      if (String(t._id || t.id) === String(taskId)) {
        return {
          ...t,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: currentSecs,
          timerSeconds: currentSecs,
          sessionDate: today,
          liveDurationText: formatSeconds(currentSecs)
        };
      }
      return t;
    }));

    // Persist paused state to backend
    try {
      workService.updateTask(taskId, {
        timerRunning: false,
        startedAt: null,
        accumulatedSeconds: currentSecs,
        timerSeconds: currentSecs,
        sessionDate: today,
        hoursLogged: +(currentSecs / 3600).toFixed(2),
        hoursLoggedText: formatSeconds(currentSecs)
      });
    } catch (e) {}

    // Daily Activity Audit Record
    try {
      hrService.createAttendanceAuditLog({
        type: 'task_timer_pause',
        action: 'task_timer_pause',
        date: today,
        employeeId: targetUserKey,
        employeeCode: targetEmpObj?.employeeCode || targetUserKey,
        employeeName: targetTask.assignedToName || 'Employee',
        taskCode: targetTask.taskCode || 'TSK',
        taskTitle: targetTask.title || 'Task',
        note: `Paused work on #${targetTask.taskCode || 'TSK'}: ${targetTask.title || 'Task'} (${formatSeconds(currentSecs)})${isForOtherEmployee ? ` by ${currentUser?.name || 'Admin'}` : ''}`
      });
    } catch (e) {}

    if (isForOtherEmployee) {
      addToast(`⏸️ Task timer paused for ${targetTask.assignedToName || 'Employee'} (${formatSeconds(currentSecs)} saved)!`, 'info');
    } else {
      addToast('Task timer paused ⏸️', 'info');
    }
  };

  // ── Stop Task Timer & Log to Timesheet ──
  const stopTaskTimer = async (taskId, memo = 'Work session stopped') => {
    const activeTimer = getActiveTimerSnapshot();
    const allTasks = getCollection(KEYS.TASKS) || [];
    const targetTask = tasks.find(t => String(t._id || t.id) === String(taskId)) ||
      allTasks.find(t => String(t._id || t.id) === String(taskId));
    if (!targetTask && !activeTimer) return;

    let totalSecs = (targetTask?.accumulatedSeconds !== undefined && targetTask?.accumulatedSeconds !== null)
      ? Number(targetTask.accumulatedSeconds)
      : (Number(targetTask?.timerSeconds) || 0);

    if (targetTask?.timerRunning && targetTask?.startedAt) {
      const elapsed = Math.max(0, Math.floor((Date.now() - Number(targetTask.startedAt)) / 1000));
      totalSecs = totalSecs + elapsed;
    } else if (activeTimer && String(activeTimer.taskId) === String(taskId)) {
      totalSecs = getElapsedSeconds(activeTimer);
    }

    if (totalSecs <= 0) totalSecs = 60; // Minimum 1 min fallback if stopped instantly

    try {
      await workService.stopTimer({
        taskId: targetTask?._id || taskId,
        taskCode: targetTask?.taskCode || 'TSK',
        taskTitle: targetTask?.title || 'Task',
        projectName: targetTask?.projectName || 'General Work',
        employeeId: targetTask?.assignedToId || userKey,
        employeeName: targetTask?.assignedToName || currentUser?.name || 'User',
        totalDurationSeconds: totalSecs,
        memo: memo || `Work on ${targetTask?.title || 'Task'}`
      });

      saveActiveTimerSnapshot(null);
      if (targetTask?.assignedToId) {
        try { localStorage.removeItem(`ems_active_task_timer_${targetTask.assignedToId}`); } catch {}
      }
      if (targetTask?.activeUserId) {
        try { localStorage.removeItem(`ems_active_task_timer_${targetTask.activeUserId}`); } catch {}
      }

      const todayStr = getTodayStr();
      const hoursLoggedNum = +(totalSecs / 3600).toFixed(2);
      const hoursLoggedFormatted = formatSeconds(totalSecs);

      // In storage tasks collection update timer to stopped but preserve total time logged
      const freshAllTasks = getCollection(KEYS.TASKS) || [];
      const updatedAll = freshAllTasks.map(t => {
        if (String(t._id || t.id) === String(taskId)) {
          return {
            ...t,
            timerRunning: false,
            startedAt: null,
            accumulatedSeconds: totalSecs,
            timerSeconds: totalSecs,
            durationSeconds: totalSecs,
            hoursLogged: hoursLoggedNum,
            hoursLoggedText: hoursLoggedFormatted,
            liveDurationText: hoursLoggedFormatted,
            sessionDate: todayStr
          };
        }
        return t;
      });
      saveCollection(KEYS.TASKS, updatedAll);

      setTasks(prev => prev.map(t => {
        if (String(t._id || t.id) === String(taskId)) {
          return {
            ...t,
            timerRunning: false,
            startedAt: null,
            accumulatedSeconds: totalSecs,
            timerSeconds: totalSecs,
            durationSeconds: totalSecs,
            hoursLogged: hoursLoggedNum,
            hoursLoggedText: hoursLoggedFormatted,
            liveDurationText: hoursLoggedFormatted,
            sessionDate: todayStr
          };
        }
        return t;
      }));

      addToast(`Timer stopped! ${formatSeconds(totalSecs)} logged to Timesheet.`, 'success');
      await loadWorkData();
    } catch (err) {
      addToast('Failed to save timer session', 'error');
    }
  };

  // =========================================================================
  // 🚀 COMPLETE TASK & ADVANCE TO NEXT TASK (Auto duration addition)
  // =========================================================================
  const completeTask = async (taskId, customMemo = '', autoStartNext = false) => {
    try {
      const todayStr = getTodayStr();
      const completedIso = new Date().toISOString();
      const now = Date.now();
      const activeTimer = getActiveTimerSnapshot();
      
      const allTasks = getCollection(KEYS.TASKS) || [];
      const targetTask = (tasks || []).find(t => String(t._id || t.id) === String(taskId)) ||
        allTasks.find(t => String(t._id || t.id) === String(taskId));
      if (!targetTask) return null;

      const assignedEmpId = targetTask.assignedToId || targetTask.assignedTo || userKey;
      const assignedEmpName = targetTask.assignedToName || currentUser?.name || 'User';
      const isUserAdminOrHR = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr' || currentUser?.role === 'Administrator' || currentUser?.role === 'HR Manager';
      const isForOtherEmployee = isUserAdminOrHR && assignedEmpId && String(assignedEmpId) !== String(userKey) && String(assignedEmpId) !== String(currentUser?._id);
      const targetUserKey = isForOtherEmployee ? assignedEmpId : userKey;

      // Calculate duration actually spent on this task session
      let durationSecs = (targetTask.accumulatedSeconds !== undefined && targetTask.accumulatedSeconds !== null)
        ? Number(targetTask.accumulatedSeconds)
        : (Number(targetTask.timerSeconds) || Number(targetTask.durationSeconds) || 0);

      if (targetTask.timerRunning && targetTask.startedAt) {
        const elapsed = Math.max(0, Math.floor((now - Number(targetTask.startedAt)) / 1000));
        durationSecs = durationSecs + elapsed;
      } else if (activeTimer && (String(activeTimer.taskId) === String(taskId) || String(activeTimer._id) === String(taskId)) && !isForOtherEmployee) {
        durationSecs = getElapsedSeconds(activeTimer);
      }

      // Log timesheet for the actual ASSIGNED EMPLOYEE
      if (durationSecs > 0) {
        try {
          await workService.stopTimer({
            taskId: targetTask._id || taskId,
            taskCode: targetTask.taskCode,
            taskTitle: targetTask.title,
            projectName: targetTask.projectName,
            totalDurationSeconds: durationSecs,
            date: todayStr,
            employeeId: assignedEmpId,
            employeeName: assignedEmpName,
            memo: customMemo || `Completed task: ${targetTask.title}${isForOtherEmployee ? ` (completed by ${currentUser?.name || 'Admin'})` : ''}`
          });
        } catch (stopErr) {
          console.warn('Timesheet log error during task completion:', stopErr);
        }
      }

      // Clear active timer for target employee
      localStorage.removeItem(`ems_active_task_timer_${targetUserKey}`);
      const targetEmpObj = (employees || []).find(e => String(e._id) === String(targetUserKey) || String(e.employeeCode) === String(targetUserKey));
      if (targetEmpObj) {
        if (targetEmpObj.employeeCode) localStorage.removeItem(`ems_active_task_timer_${targetEmpObj.employeeCode}`);
        if (targetEmpObj._id) localStorage.removeItem(`ems_active_task_timer_${targetEmpObj._id}`);
      }
      if (!isForOtherEmployee) {
        saveActiveTimerSnapshot(null);
      }

      try {
        const raw = localStorage.getItem('ems_active_task_timer');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (String(parsed?.taskId || parsed?._id) === String(taskId)) {
            localStorage.removeItem('ems_active_task_timer');
          }
        }
      } catch {}

      broadcastSyncEvent(SYNC_EVENTS.TASK_COMPLETED, {
        taskId,
        empKey: targetUserKey,
        taskTitle: targetTask.title,
        durationSecs,
        completedBy: currentUser?.name || 'User'
      });
      window.dispatchEvent(new CustomEvent('ems_task_timer_stopped', { detail: { taskId, userKey: targetUserKey } }));
      window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: { taskId, userKey: targetUserKey } }));

      const hoursLoggedNum = +(durationSecs / 3600).toFixed(2);
      const hoursLoggedFormatted = formatSeconds(durationSecs);
      const completionHistory = {
        id: `hist_${Date.now()}_complete`,
        action: 'completed',
        title: 'Task Completed & Time Logged',
        timestamp: completedIso,
        performedBy: currentUser?.name || 'User',
        performedById: currentUser?._id,
        details: `Task completed by ${currentUser?.name || 'User'}${isForOtherEmployee ? ` (for ${assignedEmpName})` : ''}. Final duration logged: ${hoursLoggedFormatted} (${durationSecs}s)`
      };

      const updatedAll = allTasks.map(t => {
        if (String(t._id || t.id) === String(taskId)) {
          const hist = Array.isArray(t.history) ? [...t.history, completionHistory] : [completionHistory];
          return {
            ...t,
            status: 'completed',
            progress: 100,
            timerRunning: false,
            timerSeconds: durationSecs,
            durationSeconds: durationSecs,
            hoursLogged: hoursLoggedNum,
            hoursLoggedText: hoursLoggedFormatted,
            completedAt: completedIso,
            completedOn: todayStr,
            history: hist
          };
        }
        return t;
      });
      saveCollection(KEYS.TASKS, updatedAll);

      try {
        const currentTarget = tasks.find(t => String(t._id || t.id) === String(taskId));
        const fullHist = Array.isArray(currentTarget?.history) ? [...currentTarget.history, completionHistory] : [completionHistory];
        await workService.updateTask(taskId, {
          status: 'completed',
          progress: 100,
          timerRunning: false,
          timerSeconds: durationSecs,
          durationSeconds: durationSecs,
          hoursLogged: hoursLoggedNum,
          hoursLoggedText: hoursLoggedFormatted,
          completedAt: completedIso,
          completedOn: todayStr,
          history: fullHist
        });
      } catch (svcErr) {}

      setTasks(prev => prev.map(t => {
        if (String(t._id || t.id) === String(taskId)) {
          const hist = Array.isArray(t.history) ? [...t.history, completionHistory] : [completionHistory];
          return {
            ...t,
            status: 'completed',
            progress: 100,
            timerRunning: false,
            timerSeconds: durationSecs,
            durationSeconds: durationSecs,
            hoursLogged: hoursLoggedNum,
            hoursLoggedText: hoursLoggedFormatted,
            completedAt: completedIso,
            completedOn: todayStr,
            history: hist
          };
        }
        return t;
      }));

      // Find remaining pending tasks assigned to this user
      const remainingTasks = updatedAll.filter(t => 
        (String(t.assignedToId) === String(assignedEmpId) || t.assignedToName === assignedEmpName) && 
        t.status !== 'completed' && 
        String(t._id || t.id) !== String(taskId)
      );

      const nextTask = remainingTasks[0] || null;
      const hrsFormatted = formatSeconds(durationSecs);

      try {
        hrService.createAttendanceAuditLog({
          type: 'task_completed',
          action: 'task_completed',
          date: todayStr,
          employeeId: targetUserKey,
          employeeCode: targetEmpObj?.employeeCode || targetUserKey,
          employeeName: assignedEmpName,
          taskCode: targetTask.taskCode || 'TSK',
          taskTitle: targetTask.title,
          note: `Completed #${targetTask.taskCode || 'TSK'}: ${targetTask.title} (${hrsFormatted})${isForOtherEmployee ? ` by Admin ${currentUser?.name || ''}` : ''}`
        });
      } catch (e) {}

      if (autoStartNext && nextTask) {
        setTimeout(() => {
          startTaskTimer(nextTask._id);
        }, 120);
        addToast(`🚀 Task "${targetTask.title}" completed! Next task "${nextTask.title}" started automatically ⏱️`, 'success');
      } else {
        addToast(`✅ Task "${targetTask.title}" completed for ${assignedEmpName}! (${hrsFormatted} logged to Timesheet)`, 'success');
      }

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TIMESHEETS } }));
      await loadWorkData();

      return { completedTask: targetTask, nextTask };
    } catch (err) {
      console.error('Error completing task:', err);
      addToast('Failed to complete task', 'error');
      return null;
    }
  };

  const completeAndNextTask = async (taskId, customMemo = '') => {
    return await completeTask(taskId, customMemo, true);
  };

  // =========================================================================
  // ⏰ TASK SNOOZE, "DO LATER" & CRM REMINDERS
  // =========================================================================
  /**
   * Snooze / Postpone a task and set a reminder.
   * Pauses the timer right here, preserves accumulated seconds, and schedules reminder.
   */
  const snoozeTask = async (taskId, { remindInMinutes = 30, customDateTime = null, note = '' }) => {
    try {
      let targetTask = tasks.find(t => String(t._id || t.id) === String(taskId) || t.taskCode === taskId);
      if (!targetTask) {
        const cached = getCollection(KEYS.TASKS) || [];
        targetTask = cached.find(t => String(t._id || t.id) === String(taskId) || t.taskCode === taskId);
      }
      if (!targetTask) {
        addToast('Task not found for snooze', 'error');
        return;
      }

      // 1. Pause active timer if running for this task and record time spent
      const activeTimer = getActiveTimerSnapshot();
      let currentSecs = (targetTask.accumulatedSeconds !== undefined && targetTask.accumulatedSeconds !== null)
        ? Number(targetTask.accumulatedSeconds)
        : (Number(targetTask.timerSeconds) || 0);

      if (targetTask.timerRunning && targetTask.startedAt) {
        const elapsed = Math.max(0, Math.floor((Date.now() - Number(targetTask.startedAt)) / 1000));
        currentSecs = currentSecs + elapsed;
      } else if (activeTimer && (String(activeTimer.taskId) === String(taskId) || String(activeTimer._id) === String(taskId))) {
        currentSecs = getElapsedSeconds(activeTimer);
      }

      if (activeTimer && (String(activeTimer.taskId) === String(taskId) || String(activeTimer._id) === String(taskId))) {
        saveActiveTimerSnapshot({
          ...activeTimer,
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: currentSecs
        });
      }

      // 2. Compute reminder timestamp (in ms)
      let remindAtTimestamp;
      if (customDateTime) {
        remindAtTimestamp = new Date(customDateTime).getTime();
      } else {
        remindAtTimestamp = Date.now() + (Number(remindInMinutes) * 60 * 1000);
      }

      const reminderTimeStr = new Date(remindAtTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const historyItem = {
        id: `hist_${Date.now()}_snooze`,
        action: 'snoozed',
        title: 'Task Snoozed (CRM Reminder Set)',
        timestamp: new Date().toISOString(),
        performedBy: currentUser?.name || 'User',
        performedById: currentUser?._id,
        details: `Task paused at ${formatSeconds(currentSecs)} and snoozed until ${reminderTimeStr}${note ? ` (${note})` : ''}`
      };
      const updatedHistory = [...(Array.isArray(targetTask.history) ? targetTask.history : []), historyItem];

      // 3. Update task in storage & state
      const updatePayload = {
        status: 'on_hold',
        timerRunning: false,
        timerSeconds: currentSecs,
        snoozed: true,
        remindAt: remindAtTimestamp,
        reminderNote: note || `Paused at ${formatSeconds(currentSecs)}`,
        reminderAlerted: false,
        reminderDismissed: false,
        history: updatedHistory
      };

      await workService.updateTask(taskId, updatePayload);

      // Save collection update
      const allTasks = getCollection(KEYS.TASKS) || [];
      const updatedAll = allTasks.map(t => {
        if (String(t._id || t.id) === String(taskId) || t.taskCode === taskId) {
          return { ...t, ...updatePayload };
        }
        return t;
      });
      saveCollection(KEYS.TASKS, updatedAll);

      setTasks(prev => prev.map(t => {
        if (String(t._id || t.id) === String(taskId) || t.taskCode === taskId) {
          return { ...t, ...updatePayload, hoursLoggedText: formatSeconds(currentSecs) };
        }
        return t;
      }));

      // Clear alerted cache so new reminder can fire when its new time comes
      alertedTaskIdsRef.current.delete(String(taskId));
      if (targetTask?.taskCode) alertedTaskIdsRef.current.delete(String(targetTask.taskCode));

      addToast(`⏰ Task "#${targetTask.taskCode || 'TSK'}" paused & snoozed! CRM will remind you at ${reminderTimeStr}.`, 'info');

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      window.dispatchEvent(new CustomEvent('ems_task_reminded', { detail: { taskId, remindAt: remindAtTimestamp } }));
      return true;
    } catch (err) {
      console.error('Error snoozing task:', err);
      addToast('Failed to set task reminder', 'error');
    }
  };

  /**
   * Resume a snoozed/reminded task immediately: clears reminder and starts timer!
   */
  const resumeSnoozedTask = async (taskId) => {
    try {
      const targetTask = tasks.find(t => t._id === taskId);
      const historyItem = {
        id: `hist_${Date.now()}_resumed`,
        action: 'resumed',
        title: 'Task Resumed from Snooze',
        timestamp: new Date().toISOString(),
        performedBy: currentUser?.name || 'User',
        performedById: currentUser?._id,
        details: 'Task timer resumed from snooze reminder'
      };
      const updatedHistory = [...(Array.isArray(targetTask?.history) ? targetTask.history : []), historyItem];

      const updatePayload = {
        snoozed: false,
        remindAt: null,
        reminderAlerted: false,
        reminderDismissed: true,
        history: updatedHistory
      };

      await workService.updateTask(taskId, updatePayload);

      const allTasks = getCollection(KEYS.TASKS) || [];
      const updatedAll = allTasks.map(t => {
        if (t._id === taskId) {
          return { ...t, ...updatePayload };
        }
        return t;
      });
      saveCollection(KEYS.TASKS, updatedAll);

      setTasks(prev => prev.map(t => {
        if (t._id === taskId) {
          return { ...t, ...updatePayload };
        }
        return t;
      }));

      // Mark as alerted in-memory so reminder never triggers again
      alertedTaskIdsRef.current.add(String(taskId));
      if (targetTask?.taskCode) alertedTaskIdsRef.current.add(String(targetTask.taskCode));

      // Start the task timer right away
      startTaskTimer(taskId);
    } catch (err) {
      console.error('Error resuming task:', err);
      addToast('Failed to resume task', 'error');
    }
  };

  /**
   * Dismiss a reminder banner without starting timer yet
   */
  const dismissTaskReminder = async (taskId) => {
    try {
      alertedTaskIdsRef.current.add(String(taskId));
      const updatePayload = {
        snoozed: false,
        remindAt: null,
        reminderAlerted: true,
        reminderDismissed: true
      };
      await workService.updateTask(taskId, updatePayload);
      const allTasks = getCollection(KEYS.TASKS) || [];
      const updatedAll = allTasks.map(t => String(t._id || t.id) === String(taskId) ? { ...t, ...updatePayload } : t);
      saveCollection(KEYS.TASKS, updatedAll);
      setTasks(prev => prev.map(t => String(t._id || t.id) === String(taskId) ? { ...t, ...updatePayload } : t));
      addToast('Task reminder dismissed', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  // Heartbeat checker for due reminders (strictly once per task, scoped to current assignee)
  useEffect(() => {
    const reminderInterval = setInterval(() => {
      const now = Date.now();
      const allTasks = getCollection(KEYS.TASKS) || [];
      let hasUpdate = false;

      allTasks.forEach(t => {
        const tId = String(t._id || t.id);
        const isDue = t.snoozed && t.remindAt && Number(t.remindAt) <= now;
        const alreadyAlerted = t.reminderAlerted || t.reminderDismissed || alertedTaskIdsRef.current.has(tId);

        if (isDue && !alreadyAlerted && isTaskAssignedToMe(t)) {
          hasUpdate = true;
          t.reminderAlerted = true;
          alertedTaskIdsRef.current.add(tId);
          if (t.taskCode) alertedTaskIdsRef.current.add(String(t.taskCode));

          addToast(`⏰ Reminder: Time to resume task "#${t.taskCode || 'TSK'}: ${t.title}"! (Paused at ${formatSeconds(t.timerSeconds || 0)})`, 'warning');

          // Persist reminderAlerted flag to backend so MongoDB keeps it
          workService.updateTask(tId, { reminderAlerted: true }).catch(err => {
            console.warn('Failed to persist reminderAlerted to backend:', err);
          });
        }
      });

      if (hasUpdate) {
        saveCollection(KEYS.TASKS, allTasks);
        setTasks(prev => prev.map(t => {
          const matched = allTasks.find(x => String(x._id || x.id) === String(t._id || t.id));
          return matched ? { ...t, reminderAlerted: matched.reminderAlerted } : t;
        }));
      }
    }, 8000);

    return () => clearInterval(reminderInterval);
  }, [formatSeconds, addToast, isTaskAssignedToMe]);

  // =========================================================================
  // ⏱️ TIMESHEET ACTIONS
  // =========================================================================
  const logTimesheet = async (entryData) => {
    try {
      const created = await workService.createTimesheet(entryData);
      addToast('Time logged successfully to Timesheet!', 'success');
      await loadWorkData();
      return created;
    } catch (err) {
      addToast('Failed to log time', 'error');
      throw err;
    }
  };

  const deleteTimesheet = async (id) => {
    try {
      await workService.deleteTimesheet(id);
      addToast('Timesheet entry removed', 'info');
      await loadWorkData();
    } catch (err) {
      addToast('Failed to delete timesheet entry', 'error');
    }
  };

  // =========================================================================
  // 🔗 HR & CRM CROSS-CONNECTION INTELLIGENCE
  // =========================================================================
  // Check if an employee is currently on approved leave for a specific date
  const isEmployeeOnLeave = (empId, checkDate = new Date().toISOString().split('T')[0]) => {
    if (!leaves || !leaves.length) return false;
    return leaves.some(l => {
      if (l.employeeId !== empId && l.employee !== empId) return false;
      if (l.status !== 'approved') return false;
      return checkDate >= l.startDate && checkDate <= l.endDate;
    });
  };



  const workContextValue = useMemo(() => ({
    loading,
    projects,
    tasks,
    timesheets,
    activeRunningTask,
    // Filters
    projectFilter,
    setProjectFilter,
    taskFilter,
    setTaskFilter,
    timesheetFilter,
    setTimesheetFilter,
    // Refetch
    loadWorkData,
    formatSeconds,
    // Project Methods
    createProject,
    updateProject,
    deleteProject,
    submitProjectForCompletion,
    approveProjectCompletion,
    reopenProject,
    // Task Methods
    createTask,
    updateTask,
    changeTaskStatus,
    completeTask,
    completeAndNextTask,
    deleteTask,
    purgeAllTasks,
    startTaskTimer,
    resumeTaskTimer: startTaskTimer,
    pauseTaskTimer,
    stopTaskTimer,
    snoozeTask,
    resumeSnoozedTask,
    dismissTaskReminder,
    // Timesheet Methods
    logTimesheet,
    deleteTimesheet,
    // HR cross connection
    employees,
    currentUser,
    isEmployeeOnLeave,
    // Overdue Task Guards
    isTaskOverdue,
    overdueTaskPrompt,
    setOverdueTaskPrompt,
    extendTaskDeadline,
    rescheduleTaskForFuture
  }), [
    loading, projects, tasks, timesheets, activeRunningTask,
    projectFilter, taskFilter, timesheetFilter, loadWorkData,
    formatSeconds, createProject, updateProject, deleteProject,
    submitProjectForCompletion, approveProjectCompletion, reopenProject,
    createTask, updateTask, changeTaskStatus, completeTask,
    completeAndNextTask, deleteTask, purgeAllTasks, startTaskTimer, pauseTaskTimer,
    stopTaskTimer, snoozeTask, resumeSnoozedTask, dismissTaskReminder,
    logTimesheet, deleteTimesheet, employees, currentUser,
    isEmployeeOnLeave, isTaskOverdue, overdueTaskPrompt, extendTaskDeadline, rescheduleTaskForFuture
  ]);

  return (
    <WorkContext.Provider value={workContextValue}>
      {children}
      {overdueTaskPrompt && (
        <OverdueTaskModal
          task={overdueTaskPrompt}
          onClose={() => setOverdueTaskPrompt(null)}
          onExtend={extendTaskDeadline}
          onComplete={completeTask}
          onContinueAnyway={(taskId) => startTaskTimer(taskId, { forceOverdue: true })}
        />
      )}
    </WorkContext.Provider>
  );
};

export const useWork = () => useContext(WorkContext);

