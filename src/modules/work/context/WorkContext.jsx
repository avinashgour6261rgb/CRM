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
import { OverdueTaskModal } from '../components/tasks/OverdueTaskModal';

const WorkContext = createContext();

export const WorkProvider = ({ children }) => {
  const { addToast } = useToast();
  const { currentUser: authUser } = useAuth();
  const { employees, leaves, currentUser: hrUser } = useHR();
  const currentUser = authUser || hrUser;

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overdueTaskPrompt, setOverdueTaskPrompt] = useState(null);

  // Derive stable userKey matching TimerContext for seamless cross-module sync
  const userKey = useMemo(() => {
    return currentUser?.employeeCode || (currentUser?._id ? String(currentUser._id) : 'ADM-001');
  }, [currentUser]);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [workSessionDate, setWorkSessionDate] = useState(() => {
    return localStorage.getItem(`ems_work_session_date_${userKey}`) || getTodayStr();
  });

  const activeTimerKey = useMemo(() => `ems_active_task_timer_${userKey}`, [userKey]);

  const isTaskAssignedToMe = useCallback((t) => {
    if (!t) return false;
    const myIds = [userKey, currentUser?._id, currentUser?.employeeCode, currentUser?.email]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());

    const directIds = [t.assignedToId, t.assignedTo, t.employeeId, t.assignedToEmail]
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
        currentUser?._id ? `ems_active_task_timer_${currentUser._id}` : null,
        'ems_active_task_timer'
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
      return Number(timerState.accumulatedSeconds) || 0;
    }
    const base = Number(timerState.accumulatedSeconds) || 0;
    if (!timerState.timerRunning || !timerState.startedAt) {
      return base;
    }
    const elapsedSinceStart = Math.max(0, Math.floor((Date.now() - Number(timerState.startedAt)) / 1000));
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
    try {
      setLoading(true);
      const [prjs, rawTsks, times] = await Promise.all([
        workService.getProjects(projectFilter),
        workService.getTasks(taskFilter),
        workService.getTimesheets(timesheetFilter)
      ]);

      const activeTimer = getActiveTimerSnapshot();
      const localTasks = getCollection(KEYS.TASKS) || [];
      const today = getTodayStr();

      let mergedTasks = (rawTsks || []).map(t => {
        const tId = String(t._id || t.id);
        const isActive = activeTimer && (String(activeTimer.taskId) === tId || String(activeTimer._id) === tId);

        // Find local task copy to preserve today's paused or accumulated seconds
        const localCopy = localTasks.find(lt => String(lt._id || lt.id) === tId);
        const localSecs = (localCopy && (localCopy.sessionDate === today || !localCopy.sessionDate))
          ? (Number(localCopy.timerSeconds) || 0)
          : 0;

        if (isActive) {
          const currentSecs = Math.max(getElapsedSeconds(activeTimer), localSecs, Number(t.timerSeconds) || 0);
          return {
            ...t,
            timerRunning: !!activeTimer.timerRunning,
            timerSeconds: currentSecs,
            startedAt: activeTimer.startedAt || t.startedAt,
            accumulatedSeconds: activeTimer.accumulatedSeconds || 0,
            liveDurationText: formatSeconds(currentSecs),
            hoursLoggedText: t.hoursLogged ? `${t.hoursLogged}h` : (t.hoursLoggedText || '0h')
          };
        }

        const effectiveSecs = Math.max(Number(t.timerSeconds) || 0, localSecs);
        return {
          ...t,
          timerRunning: false,
          timerSeconds: effectiveSecs,
          liveDurationText: formatSeconds(effectiveSecs),
          hoursLoggedText: t.hoursLogged ? `${t.hoursLogged}h` : (t.hoursLoggedText || '0h')
        };
      });

      setProjects(prjs || []);
      setTasks(mergedTasks);
      setTimesheets(times || []);
    } catch (err) {
      console.error('Error loading Work module data:', err);
      addToast('Failed to sync Work module data', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectFilter, taskFilter, timesheetFilter, getActiveTimerSnapshot, getElapsedSeconds, formatSeconds, addToast]);

  // Derived reactive active running task for easy access
  const activeRunningTask = useMemo(() => {
    return tasks.find(t => t.timerRunning) || null;
  }, [tasks]);

  useEffect(() => {
    loadWorkData();

    const handleStorageUpdate = (e) => {
      if (['ems_projects', 'ems_tasks', 'ems_timesheets', activeTimerKey, 'ems_active_task_timer'].includes(e.detail?.key)) {
        loadWorkData();
      }
    };
    window.addEventListener('hrms_storage_change', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('hrms_storage_change', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [loadWorkData, activeTimerKey]);

  // =========================================================================
  // ⏱️ WALL-CLOCK LIVE TICKING TASK TIMER ENGINE (Refresh & Tab-switch Immune)
  // =========================================================================
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const activeTimer = getActiveTimerSnapshot();
      if (!activeTimer || !activeTimer.timerRunning) return;

      const isShiftOnBreak = localStorage.getItem(`ems_timer_${userKey}_is_on_break`) === 'true' ||
        (currentUser?.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_is_on_break`) === 'true');

      if (isShiftOnBreak) {
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
            return { ...t, timerRunning: false, timerSeconds: currentSecs };
          }
          return t;
        });
        saveCollection(KEYS.TASKS, updatedAll);

        setTasks(prevTasks => prevTasks.map(t => {
          if (String(t._id || t.id) === String(activeTimer.taskId)) {
            return { ...t, timerRunning: false, timerSeconds: currentSecs, liveDurationText: formatSeconds(currentSecs) };
          }
          return t;
        }));
        return;
      }

      const liveSecs = getElapsedSeconds(activeTimer);
      const text = formatSeconds(liveSecs);

      setTasks((prevTasks) => {
        let changed = false;
        const updated = prevTasks.map((t) => {
          if (String(t._id || t.id) === String(activeTimer.taskId)) {
            changed = true;
            return {
              ...t,
              timerRunning: true,
              timerSeconds: liveSecs,
              liveDurationText: text,
              hoursLoggedText: text
            };
          }
          if (t.timerRunning && String(t._id || t.id) !== String(activeTimer.taskId) && isTaskAssignedToMe(t)) {
            changed = true;
            return { ...t, timerRunning: false };
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
            return { ...t, timerRunning: false, timerSeconds: currentSecs };
          }
          return t;
        });
        saveCollection(KEYS.TASKS, updatedAll);

        setTasks(prev => prev.map(t => {
          if (t._id === activeTimer.taskId) {
            return { ...t, timerRunning: false, timerSeconds: currentSecs, liveDurationText: formatSeconds(currentSecs) };
          }
          return t;
        }));

        addToast('Shift Clocked Out: Active task timer automatically paused ⏸️', 'info');
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

  // =========================================================================
  // 📋 TASK ACTIONS & ROBUST TIMERS
  // =========================================================================
  const createTask = async (taskData) => {
    try {
      const created = await workService.createTask(taskData);
      addToast(`Task "${created.title}" assigned successfully!`, 'success');
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

  // ── Overdue Task Detection ──
  const isTaskOverdue = useCallback((task) => {
    if (!task || !task.dueDate || task.hasNoDueDate || task.status === 'completed') return false;
    const today = getTodayStr();
    return task.dueDate < today;
  }, []);

  const extendTaskDeadline = useCallback(async (taskId, days = 1) => {
    try {
      const target = tasks.find(t => t._id === taskId);
      if (!target) return;
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + days);
      const newDueDate = baseDate.toISOString().split('T')[0];

      await updateTask(taskId, { dueDate: newDueDate, hasNoDueDate: false });
      addToast(`📅 Task #${target.taskCode || ''} deadline extended to ${newDueDate}`, 'success');
      setOverdueTaskPrompt(null);
      // Auto start timer once deadline extended
      setTimeout(() => {
        startTaskTimer(taskId, { forceOverdue: true });
      }, 80);
    } catch (e) {
      addToast('Failed to extend task deadline', 'error');
    }
  }, [tasks, updateTask, addToast]);

  // ── Start / Resume Task Timer (Wall-Clock Precision) ──
  const startTaskTimer = (taskId, options = {}) => {
    // 1. Shift Sync: Ensure shift is actively marked clocked in for this user
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
    }

    // 2. Break Guard: cannot start task timer while on break
    const isOnBreak = localStorage.getItem(`ems_timer_${userKey}_is_on_break`) === 'true' ||
      (currentUser?.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_is_on_break`) === 'true');
    if (isOnBreak) {
      addToast('☕ You are currently on break. Please resume work first before tracking task time!', 'warning');
      return;
    }

    const targetTask = tasks.find(t => t._id === taskId);
    if (!targetTask) return;

    // 3. Overdue Task Guard: cannot start or run overdue task without resolving deadline or completing
    const isOverdue = isTaskOverdue(targetTask);
    if (isOverdue && !options.forceOverdue) {
      setOverdueTaskPrompt(targetTask);
      addToast(`⚠️ Task #${targetTask.taskCode || ''} is overdue (Due: ${targetTask.dueDate})! Please update deadline or mark completed.`, 'warning');
      return;
    }

    const today = getTodayStr();
    const now = Date.now();
    const activeTimer = getActiveTimerSnapshot();

    // Check existing seconds for today's session
    let existingSecs = 0;
    if (activeTimer && activeTimer.taskId === taskId && activeTimer.date === today) {
      existingSecs = getElapsedSeconds(activeTimer);
    } else if (targetTask.sessionDate === today) {
      existingSecs = Number(targetTask.timerSeconds) || 0;
    }

    const newTimerState = {
      taskId: targetTask._id,
      taskCode: targetTask.taskCode || 'TSK',
      title: targetTask.title,
      projectName: targetTask.projectName || 'General Work',
      assignedToId: targetTask.assignedToId || userKey,
      assignedToName: targetTask.assignedToName || currentUser?.name || 'User',
      timerRunning: true,
      startedAt: now,
      accumulatedSeconds: existingSecs,
      date: today,
      lastUpdated: now
    };

    saveActiveTimerSnapshot(newTimerState);

    // Save in storage collection - only pause other tasks belonging to THIS user
    const allTasks = getCollection(KEYS.TASKS) || [];
    const updatedAll = allTasks.map(t => {
      if (t._id === taskId) {
        return {
          ...t,
          timerRunning: true,
          timerSeconds: existingSecs,
          sessionDate: today,
          status: t.status === 'incomplete' ? 'in_progress' : t.status
        };
      }
      if (t.timerRunning && isTaskAssignedToMe(t)) {
        return { ...t, timerRunning: false };
      }
      return t;
    });
    saveCollection(KEYS.TASKS, updatedAll);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));

    setTasks(prev => prev.map(t => {
      if (t._id === taskId) {
        return {
          ...t,
          timerRunning: true,
          timerSeconds: existingSecs,
          sessionDate: today,
          liveDurationText: formatSeconds(existingSecs),
          status: t.status === 'incomplete' ? 'in_progress' : t.status
        };
      }
      if (t.timerRunning) {
        return { ...t, timerRunning: false };
      }
      return t;
    }));

    // ── Real-time Daily Activity Audit Record ──
    try {
      hrService.createAttendanceAuditLog({
        type: 'task_timer_start',
        date: today,
        employeeId: userKey,
        employeeCode: currentUser?.employeeCode || userKey,
        employeeName: currentUser?.name || 'User',
        taskCode: targetTask.taskCode || 'TSK',
        taskTitle: targetTask.title,
        note: `Started working on #${targetTask.taskCode || 'TSK'}: ${targetTask.title}`
      });
    } catch (e) {
      console.warn('Audit log error on task start:', e);
    }

    addToast('Task timer started! ⏱️ Tracking active work.', 'info');
  };

  // ── Pause Task Timer ──
  const pauseTaskTimer = (taskId) => {
    const activeTimer = getActiveTimerSnapshot();
    const targetTask = tasks.find(t => t._id === taskId);
    const today = getTodayStr();
    const currentSecs = (activeTimer && activeTimer.taskId === taskId)
      ? getElapsedSeconds(activeTimer)
      : (targetTask?.timerSeconds || 0);

    const pausedTimerState = {
      ...(activeTimer || {}),
      taskId,
      timerRunning: false,
      startedAt: null,
      accumulatedSeconds: currentSecs,
      date: today
    };
    saveActiveTimerSnapshot(pausedTimerState);

    // Save in storage collection
    const allTasks = getCollection(KEYS.TASKS) || [];
    const updatedAll = allTasks.map(t => {
      if (t._id === taskId) {
        return { ...t, timerRunning: false, timerSeconds: currentSecs, sessionDate: today };
      }
      return t;
    });
    saveCollection(KEYS.TASKS, updatedAll);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));

    setTasks(prev => prev.map(t => {
      if (t._id === taskId) {
        return { ...t, timerRunning: false, timerSeconds: currentSecs, sessionDate: today, liveDurationText: formatSeconds(currentSecs) };
      }
      return t;
    }));

    // ── Real-time Daily Activity Audit Record ──
    try {
      hrService.createAttendanceAuditLog({
        type: 'task_timer_pause',
        date: today,
        employeeId: userKey,
        employeeCode: currentUser?.employeeCode || userKey,
        employeeName: currentUser?.name || 'User',
        taskCode: targetTask?.taskCode || 'TSK',
        taskTitle: targetTask?.title || 'Task',
        note: `Paused work on #${targetTask?.taskCode || 'TSK'}: ${targetTask?.title || 'Task'} (${formatSeconds(currentSecs)})`
      });
    } catch (e) {
      console.warn('Audit log error on task pause:', e);
    }

    addToast('Task timer paused ⏸️', 'info');
  };

  // ── Stop Task Timer & Log to Timesheet ──
  const stopTaskTimer = async (taskId, memo = 'Work session stopped') => {
    const activeTimer = getActiveTimerSnapshot();
    const targetTask = tasks.find(t => t._id === taskId);
    if (!targetTask && !activeTimer) return;

    let totalSecs = (activeTimer && activeTimer.taskId === taskId)
      ? getElapsedSeconds(activeTimer)
      : (targetTask?.timerSeconds || 0);

    if (totalSecs <= 0) totalSecs = 60; // Minimum 1 min fallback if stopped instantly

    try {
      await workService.stopTimer({
        taskId: targetTask?._id || taskId,
        totalDurationSeconds: totalSecs,
        memo: memo || `Work on ${targetTask?.title || 'Task'}`
      });

      saveActiveTimerSnapshot(null);

      // In storage tasks collection reset timer
      const allTasks = getCollection(KEYS.TASKS) || [];
      const updatedAll = allTasks.map(t => {
        if (t._id === taskId) {
          return { ...t, timerRunning: false, timerSeconds: 0 };
        }
        return t;
      });
      saveCollection(KEYS.TASKS, updatedAll);

      setTasks(prev => prev.map(t => {
        if (t._id === taskId) {
          return { ...t, timerRunning: false, timerSeconds: 0 };
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
  const completeTask = async (taskId, customMemo = '') => {
    try {
      const activeTimer = getActiveTimerSnapshot();
      const targetTask = tasks.find(t => t._id === taskId);
      if (!targetTask) return null;

      // Calculate duration spent on this task
      let durationSecs = (activeTimer && activeTimer.taskId === taskId)
        ? getElapsedSeconds(activeTimer)
        : ((targetTask.timerSeconds && targetTask.timerSeconds > 0)
          ? targetTask.timerSeconds
          : (targetTask.estimatedHours ? Math.round(targetTask.estimatedHours * 3600) : 3600));

      if (durationSecs <= 0) durationSecs = 1800;

      // Stop timer and log entry into timesheet
      await workService.stopTimer({
        taskId: targetTask._id,
        totalDurationSeconds: durationSecs,
        memo: customMemo || `Completed task: ${targetTask.title}`
      });

      saveActiveTimerSnapshot(null);

      // Update status to completed with timestamp
      const todayStr = getTodayStr();
      const completedIso = new Date().toISOString();
      await workService.updateTaskStatus(taskId, 'completed');
      await workService.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        timerRunning: false,
        timerSeconds: 0,
        completedAt: completedIso,
        completedOn: todayStr
      });

      // Refresh work data
      await loadWorkData();

      // Find remaining pending tasks assigned to this user
      const assignedEmpId = targetTask.assignedToId || currentUser?._id;
      const updatedTasks = getCollection(KEYS.TASKS) || [];
      const remainingTasks = updatedTasks.filter(t => 
        (t.assignedToId === assignedEmpId || t.assignedToName === targetTask.assignedToName) && 
        t.status !== 'completed' && 
        t._id !== taskId
      );

      const nextTask = remainingTasks[0] || null;
      const hrsFormatted = formatSeconds(durationSecs);

      // ── Real-time Daily Activity Audit Record ──
      try {
        hrService.createAttendanceAuditLog({
          type: 'task_completed',
          date: new Date().toISOString().split('T')[0],
          employeeId: userKey,
          employeeCode: currentUser?.employeeCode || userKey,
          employeeName: currentUser?.name || 'User',
          taskCode: targetTask.taskCode || 'TSK',
          taskTitle: targetTask.title,
          note: `Completed #${targetTask.taskCode || 'TSK'}: ${targetTask.title} (${hrsFormatted})`
        });
      } catch (e) {
        console.warn('Audit log error on task completion:', e);
      }

      if (nextTask) {
        addToast(`🎉 Task "${targetTask.title}" completed! ${hrsFormatted} added to duration. Next task "${nextTask.title}" is now active!`, 'success');
      } else {
        addToast(`🏆 Task "${targetTask.title}" completed! ${hrsFormatted} added. All assigned tasks are done!`, 'success');
      }

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      return { completedTask: targetTask, nextTask };
    } catch (err) {
      console.error('Error completing task:', err);
      addToast('Failed to complete task', 'error');
      return null;
    }
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
      const targetTask = tasks.find(t => t._id === taskId);
      if (!targetTask) return;

      // 1. Pause active timer if running for this task and record time spent
      const activeTimer = getActiveTimerSnapshot();
      let currentSecs = (activeTimer && activeTimer.taskId === taskId)
        ? getElapsedSeconds(activeTimer)
        : (targetTask.timerSeconds || 0);

      if (activeTimer && activeTimer.taskId === taskId) {
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

      // 3. Update task in storage & state
      const updatePayload = {
        timerRunning: false,
        timerSeconds: currentSecs,
        snoozed: true,
        remindAt: remindAtTimestamp,
        reminderNote: note || `Paused at ${formatSeconds(currentSecs)}`,
        reminderAlerted: false,
        reminderDismissed: false
      };

      await workService.updateTask(taskId, updatePayload);

      // Save collection update
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
          return { ...t, ...updatePayload, hoursLoggedText: formatSeconds(currentSecs) };
        }
        return t;
      }));

      const reminderTimeStr = new Date(remindAtTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addToast(`⏰ Task "#${targetTask.taskCode || 'TSK'}" paused & saved! CRM will remind you at ${reminderTimeStr}.`, 'info');

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      window.dispatchEvent(new CustomEvent('ems_task_reminded', { detail: { taskId, remindAt: remindAtTimestamp } }));
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
      const updatePayload = {
        snoozed: false,
        remindAt: null,
        reminderAlerted: false,
        reminderDismissed: true
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
      const updatePayload = {
        snoozed: false,
        remindAt: null,
        reminderDismissed: true
      };
      await workService.updateTask(taskId, updatePayload);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, ...updatePayload } : t));
      addToast('Task reminder dismissed', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  // Heartbeat checker for due reminders
  useEffect(() => {
    const reminderInterval = setInterval(() => {
      const now = Date.now();
      const allTasks = getCollection(KEYS.TASKS) || [];
      let hasUpdate = false;

      allTasks.forEach(t => {
        if (t.snoozed && t.remindAt && Number(t.remindAt) <= now && !t.reminderAlerted && !t.reminderDismissed) {
          hasUpdate = true;
          t.reminderAlerted = true;
          addToast(`⏰ Reminder: Time to resume task "#${t.taskCode || 'TSK'}: ${t.title}"! (Paused at ${formatSeconds(t.timerSeconds || 0)})`, 'warning');
        }
      });

      if (hasUpdate) {
        saveCollection(KEYS.TASKS, allTasks);
        setTasks(prev => prev.map(t => {
          const matched = allTasks.find(x => x._id === t._id);
          return matched ? { ...t, reminderAlerted: matched.reminderAlerted } : t;
        }));
      }
    }, 8000);

    return () => clearInterval(reminderInterval);
  }, [formatSeconds, addToast]);

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



  return (
    <WorkContext.Provider value={{
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
      // Task Methods
      createTask,
      updateTask,
      changeTaskStatus,
      completeTask,
      deleteTask,
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
      extendTaskDeadline
    }}>
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

