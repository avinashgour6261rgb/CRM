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
import { isSocketConnected } from '../../../shared/services/socketService';
import { isHRorAdmin, isLeaderOrAbove, canDeleteTask, canDeleteProject, isAdmin } from '../../../shared/utils/permissionUtils';
import { readTimerStorage, getTimerMirrorKeys, getTaskTodaySeconds, syncTaskPauseState, calculateShiftWorkSeconds, sanitizeTaskDailySessions, getLocalDateString, isTaskAssignedToUser, isTaskRunningForUser, getWorkerTaskTimer, getWorkerDailySessionSeconds, getWorkerTotalSeconds, getMultiAssigneeCombinedSeconds } from '../../../shared/utils/timerUtils';

const defaultWorkContext = {
  projects: [],
  tasks: [],
  timesheets: [],
  loading: false,
  activeTaskId: null,
  activeTimer: null,
  timerRunning: false,
  timerSeconds: 0,
  refreshWorkData: async () => {},
  createProject: async () => {},
  updateProject: async () => {},
  deleteProject: async () => {},
  createTask: async () => {},
  updateTask: async () => {},
  changeTaskStatus: async () => {},
  completeTask: async () => {},
  completeAndNextTask: async () => {},
  deleteTask: async () => {},
  startTaskTimer: () => {},
  pauseTaskTimer: () => {},
  stopTaskTimer: () => {},
  snoozeTask: async () => {},
  resumeSnoozedTask: async () => {},
  dismissTaskReminder: async () => {},
  logTimesheet: async () => {},
  deleteTimesheet: async () => {},
  employees: [],
  currentUser: null,
  isEmployeeOnLeave: () => false,
  isTaskOverdue: () => false,
  overdueTaskPrompt: null,
  extendTaskDeadline: async () => {},
  rescheduleTaskForFuture: async () => {}
};

const WorkContext = createContext(defaultWorkContext);

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
    const isPriv = auth && (auth.isAdmin || auth.systemRole === 'admin' || auth.systemRole === 'hr' || auth.role === 'Administrator' || isHRorAdmin(auth));
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
  const shiftWorkSecondsRef = useRef(0);
  // Anti-resurrection lock: prevents in-flight heartbeats / lagging GET /api/tasks polls from un-pausing a just-paused task
  const lastTaskActionRef = useRef({ taskId: '', action: '', at: 0 });
  const startTaskTimerRef = useRef(null);

  useEffect(() => {
    const handleShiftTick = (e) => {
      if (e?.detail?.workSeconds !== undefined) {
        shiftWorkSecondsRef.current = Number(e.detail.workSeconds) || 0;
      }
    };
    window.addEventListener('ems_shift_tick', handleShiftTick);
    return () => window.removeEventListener('ems_shift_tick', handleShiftTick);
  }, []);

  // Derive stable userKey matching TimerContext for seamless cross-module sync
  const userKey = useMemo(() => {
    return currentUser?.employeeCode || (currentUser?._id ? String(currentUser._id) : '');
  }, [currentUser]);

  const getTodayStr = () => getLocalDateString();
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

    const directIds = [t.assignedToId, directAssignedTo, t.assignedToCode, t.assignedToEmail]
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

    if (t.assignedToName && currentUser?.name) {
      const myName = currentUser.name.trim().toLowerCase();
      const aName = t.assignedToName.trim().toLowerCase();
      if (myName === aName || myName.includes(aName) || aName.includes(myName)) return true;
      const myTokens = myName.split(/\s+/).filter(tok => tok.length >= 3);
      const aTokens = aName.split(/\s+/).filter(tok => tok.length >= 3);
      if (myTokens.some(mt => aTokens.includes(mt))) return true;
    }
    return false;
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
            if (parsed.status === 'completed' || parsed.completedAt) {
              try { localStorage.removeItem(k); } catch (_) {}
              continue;
            }
            return parsed;
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [activeTimerKey, currentUser]);

  // Permission authorization helper:
  // Admin, HR, Assigner/Creator, Assigned Member, Active Worker, or anyone working on the task can control it!
  const canUserControlTask = useCallback((targetTask) => {
    if (!targetTask || !currentUser) return false;

    // 1. Admin or HR check (Role, SystemRole, or Department)
    const isUserAdminOrHR = Boolean(
      currentUser?.isAdmin ||
      currentUser?.isSuperAdmin ||
      currentUser?.isDelegatedAdmin ||
      currentUser?.systemRole === 'admin' ||
      currentUser?.systemRole === 'hr' ||
      currentUser?.role === 'Administrator' ||
      isHRorAdmin(currentUser)
    );
    if (isUserAdminOrHR) return true;

    // 2. Assigner / Creator check
    const myIds = [userKey, currentUser?._id, currentUser?.id, currentUser?.employeeCode, currentUser?.email]
      .filter(Boolean).map(s => String(s).toLowerCase().trim());
    const creatorIds = [targetTask.assignedById, targetTask.assignedByCode]
      .filter(Boolean).map(s => String(s).toLowerCase().trim());
    if (myIds.some(id => creatorIds.includes(id))) return true;
    if (targetTask.assignedBy && currentUser?.name && targetTask.assignedBy.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;

    // 3. Assigned member (single or multi-assignee)
    if (isTaskAssignedToMe(targetTask)) return true;

    // 4. Active Worker / Currently Working on this task
    // ("jo jis task pe kam kar sakta hai wo use pause complate sab kar sakta hai")
    const activeWorkerIds = [
      targetTask.activeWorkerId,
      targetTask.activeUserId,
      targetTask.activeWorkerCode,
      targetTask.workerId,
      targetTask.workerCode,
      targetTask.startedById
    ].filter(Boolean).map(s => String(s).toLowerCase().trim());
    if (myIds.some(id => activeWorkerIds.includes(id))) return true;

    const myName = (currentUser?.name || '').trim().toLowerCase();
    const activeWorkerNames = [
      targetTask.activeWorkerName,
      targetTask.activeUserName,
      targetTask.workerName,
      targetTask.startedBy
    ].filter(Boolean).map(s => String(s).trim().toLowerCase());
    if (myName && activeWorkerNames.some(w => w === myName || w.includes(myName) || myName.includes(w))) {
      return true;
    }

    // 5. Active Timer Snapshot check: If this task is in the user's active timer right now
    const activeTimer = getActiveTimerSnapshot();
    if (activeTimer && (String(activeTimer.taskId) === String(targetTask._id || targetTask.id) || (activeTimer.taskCode && targetTask.taskCode && String(activeTimer.taskCode).trim().toLowerCase() === String(targetTask.taskCode).trim().toLowerCase()))) {
      return true;
    }

    // 6. Check worker timers map in multi-assignee task
    const workerTimer = getWorkerTaskTimer(targetTask, currentUser);
    if (workerTimer && (workerTimer.timerRunning || Number(workerTimer.accumulatedSeconds) > 0 || Number(workerTimer.todayWorkSeconds) > 0)) {
      return true;
    }

    // 7. Team Leader / Delegation check
    if (isLeaderOrAbove(currentUser)) return true;

    return false;
  }, [currentUser, userKey, isTaskAssignedToMe, getActiveTimerSnapshot]);

  const isEventForMe = useCallback((e) => {
    if (!e || !e.detail) return true;
    const { userKey: evKey, employeeId: evId, employeeCode: evCode } = e.detail;
    if (!evKey && !evId && !evCode) return true;
    const myIds = [userKey, currentUser?._id, currentUser?.employeeCode, currentUser?.email].filter(Boolean).map(s => String(s).toLowerCase().trim());
    const evIds = [evKey, evId, evCode].filter(Boolean).map(s => String(s).toLowerCase().trim());
    return myIds.some(id => evIds.includes(id));
  }, [userKey, currentUser]);

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

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMidnightMs = todayMidnight.getTime();
    if (startTs < todayMidnightMs) {
      // Started on a previous day: do not add runaway ghost time to today
      return base;
    }

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
  const loadWorkData = useCallback(async (isSilent = false) => {
    if (!currentUser && !localStorage.getItem('ems_auth_session')) return;
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      if (!isSilent) setLoading(true);
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

      // Authoritative task list from backend MongoDB Atlas
      const localMap = new Map();
      localTasks.forEach(lt => {
        const id = String(lt._id || lt.id);
        if (id && !isLegacyTask(lt)) {
          localMap.set(id, lt);
          if (lt.taskCode) localMap.set(`code_${String(lt.taskCode).trim().toLowerCase()}`, lt);
        }
      });

      const todayStr = getTodayStr();

      // 1. Map backend tasks with live timer overlay
      (rawTsks || []).forEach(bt => {
        const id = String(bt._id || bt.id);
        if (id && !isLegacyTask(bt)) {
          const existing = localMap.get(id) || (bt.taskCode ? localMap.get(`code_${String(bt.taskCode).trim().toLowerCase()}`) : null);
          if (existing) {
            const localSecs = Number(existing.timerSeconds) || 0;
            const backendSecs = Number(bt.timerSeconds) || 0;
            const localAccum = Number(existing.accumulatedSeconds) || 0;
            const backendAccum = Number(bt.accumulatedSeconds) || 0;

            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);
            const todayMidnightMs = todayMidnight.getTime();

            const isLocalActive = activeTimer && (String(activeTimer.taskId) === id || String(activeTimer._id) === id);
            const isLocalTimerRunning = isLocalActive && Boolean(activeTimer.timerRunning);
            const isLocalTimerPaused = isLocalActive && !activeTimer.timerRunning;
            const recentLocalPause = Boolean(
              lastTaskActionRef.current &&
              lastTaskActionRef.current.taskId === id &&
              (lastTaskActionRef.current.action === 'pause' || lastTaskActionRef.current.action === 'stop') &&
              (Date.now() - Number(lastTaskActionRef.current.at || 0) < 15000)
            );
            const localPausedAt = Math.max(
              Number(activeTimer?.pausedAt || 0),
              Number(existing.pausedAt || 0),
              recentLocalPause ? Number(lastTaskActionRef.current.at || 0) : 0
            );
            const myWorkerTimer = getWorkerTaskTimer(bt, currentUser);
            const hasIsolatedWorkerTimer = Boolean(myWorkerTimer && typeof myWorkerTimer.timerRunning === 'boolean');
            const backendStartedAtNum = Number((hasIsolatedWorkerTimer ? myWorkerTimer.startedAt : bt.startedAt) || 0);
            const backendRunningFlag = hasIsolatedWorkerTimer ? Boolean(myWorkerTimer.timerRunning) : Boolean(bt.timerRunning);
            const isBackendStartNewerThanLocalPause = Boolean(
              backendRunningFlag && backendStartedAtNum >= todayMidnightMs && backendStartedAtNum > localPausedAt + 1000
            );

            let effectiveRunning = false;
            let effectiveStartedAt = null;

            if (recentLocalPause && !isBackendStartNewerThanLocalPause) {
              effectiveRunning = false;
              effectiveStartedAt = null;
            } else if (isLocalTimerRunning) {
              // If backend explicitly paused AFTER our local start, honor remote pause!
              const backendUpdatedAt = hasIsolatedWorkerTimer && myWorkerTimer.updatedAt
                ? Number(myWorkerTimer.updatedAt)
                : (bt.updatedAt ? new Date(bt.updatedAt).getTime() : 0);
              const localStartAt = Number(activeTimer.startedAt) || Number(existing.startedAt) || 0;
              if (!backendRunningFlag && backendUpdatedAt > localStartAt + 2500 && !(lastTaskActionRef.current.taskId === id && lastTaskActionRef.current.action === 'start' && Date.now() - lastTaskActionRef.current.at < 12000)) {
                effectiveRunning = false;
                effectiveStartedAt = null;
              } else {
                effectiveRunning = true;
                effectiveStartedAt = localStartAt || Date.now();
              }
            } else if (isLocalTimerPaused) {
              // ONLY flip from locally-paused back to running if another device genuinely started a NEW session AFTER our pause!
              if (isBackendStartNewerThanLocalPause) {
                effectiveRunning = true;
                effectiveStartedAt = backendStartedAtNum;
              } else {
                effectiveRunning = false;
                effectiveStartedAt = null;
              }
            } else {
              // Not current user's local active timer - check backend / existing
              if (existing.timerRunning && !backendRunningFlag && existing.startedAt && Date.now() - Number(existing.startedAt) < 12000) {
                effectiveRunning = true;
                effectiveStartedAt = Number(existing.startedAt);
              } else if (!existing.timerRunning && backendRunningFlag && localPausedAt > 0 && backendStartedAtNum <= localPausedAt + 1000) {
                effectiveRunning = false;
                effectiveStartedAt = null;
              } else {
                const isStartedToday = backendStartedAtNum > 0 && backendStartedAtNum >= todayMidnightMs;
                effectiveRunning = Boolean(backendRunningFlag && isStartedToday);
                effectiveStartedAt = effectiveRunning ? backendStartedAtNum : null;
              }
            }

            // CRITICAL: Protect dailySessions from being wiped while strictly isolating past days from today!
            const mergedDailySessions = {
              ...(bt.dailySessions && typeof bt.dailySessions === 'object' ? bt.dailySessions : {}),
              ...(existing.dailySessions && typeof existing.dailySessions === 'object' ? existing.dailySessions : {})
            };
            if (isLocalActive && activeTimer.date === todayStr) {
              const activeToday = Number(activeTimer.todayWorkSeconds ?? activeTimer.accumulatedTodaySeconds ?? 0);
              if (activeToday > 0) {
                mergedDailySessions[todayStr] = Math.max(Number(mergedDailySessions[todayStr]) || 0, activeToday);
              }
            }

            // If existing or backend recorded work on an earlier sessionDate, preserve it under that earlier date
            if (existing.sessionDate && existing.sessionDate !== todayStr && Number(existing.todayWorkSeconds) > 0) {
              mergedDailySessions[existing.sessionDate] = Math.max(Number(mergedDailySessions[existing.sessionDate]) || 0, Number(existing.todayWorkSeconds));
            }
            if (bt.sessionDate && bt.sessionDate !== todayStr && Number(bt.todayWorkSeconds) > 0) {
              mergedDailySessions[bt.sessionDate] = Math.max(Number(mergedDailySessions[bt.sessionDate]) || 0, Number(bt.todayWorkSeconds));
            }

            // Deeply merge assigneeTimers and assigneeSessions so per-worker state is NEVER wiped out
            const mergedAssigneeTimers = {
              ...(existing.assigneeTimers && typeof existing.assigneeTimers === 'object' ? existing.assigneeTimers : {}),
              ...(bt.assigneeTimers && typeof bt.assigneeTimers === 'object' ? bt.assigneeTimers : {})
            };
            if (existing.assigneeTimers && typeof existing.assigneeTimers === 'object') {
              Object.entries(existing.assigneeTimers).forEach(([wKey, exTimer]) => {
                if (exTimer && typeof exTimer === 'object') {
                  const curTimer = mergedAssigneeTimers[wKey] || {};
                  const backendIsNewer = Number(curTimer.updatedAt || 0) > Number(exTimer.updatedAt || 0);
                  mergedAssigneeTimers[wKey] = {
                    ...exTimer,
                    ...curTimer,
                    accumulatedSeconds: backendIsNewer
                      ? Number(curTimer.accumulatedSeconds || 0)
                      : Math.max(Number(exTimer.accumulatedSeconds || 0), Number(curTimer.accumulatedSeconds || 0)),
                    todayWorkSeconds: backendIsNewer
                      ? (curTimer.sessionDate === todayStr ? Number(curTimer.todayWorkSeconds || 0) : 0)
                      : Math.max(
                          exTimer.sessionDate === todayStr ? Number(exTimer.todayWorkSeconds || 0) : 0,
                          curTimer.sessionDate === todayStr ? Number(curTimer.todayWorkSeconds || 0) : 0
                        )
                  };
                }
              });
            }

            const mergedAssigneeSessions = {
              ...(existing.assigneeSessions && typeof existing.assigneeSessions === 'object' ? existing.assigneeSessions : {}),
              ...(bt.assigneeSessions && typeof bt.assigneeSessions === 'object' ? bt.assigneeSessions : {})
            };
            if (existing.assigneeSessions && typeof existing.assigneeSessions === 'object') {
              Object.entries(existing.assigneeSessions).forEach(([wKey, exDates]) => {
                if (exDates && typeof exDates === 'object') {
                  mergedAssigneeSessions[wKey] = {
                    ...exDates,
                    ...(mergedAssigneeSessions[wKey] || {})
                  };
                  Object.entries(exDates).forEach(([dKey, secVal]) => {
                    mergedAssigneeSessions[wKey][dKey] = Math.max(
                      Number(secVal) || 0,
                      Number(mergedAssigneeSessions[wKey]?.[dKey]) || 0
                    );
                  });
                }
              });
            }

            // Worker-specific timers
            const existingWorkerTimer = getWorkerTaskTimer(existing, currentUser);
            const localWorkerAccum = Number(existingWorkerTimer?.accumulatedSeconds || 0);
            const backendWorkerAccum = Number(myWorkerTimer?.accumulatedSeconds || 0);
            const workerAccumSecs = Math.max(localWorkerAccum, backendWorkerAccum);

            const localWorkerToday = (existingWorkerTimer?.sessionDate === todayStr) ? Number(existingWorkerTimer?.todayWorkSeconds || 0) : 0;
            const backendWorkerToday = (myWorkerTimer?.sessionDate === todayStr) ? Number(myWorkerTimer?.todayWorkSeconds || 0) : 0;
            const workerTodaySecs = Math.max(localWorkerToday, backendWorkerToday);

            // Today's work is strictly work performed on todayStr (NEVER fold live `todayWorkSeconds` back into frozen baseline while running!)
            const existingIsToday = existing.sessionDate === todayStr;
            const backendIsToday = bt.sessionDate === todayStr;
            const hasExplicitDailyToday = mergedDailySessions[todayStr] !== undefined && mergedDailySessions[todayStr] !== null;
            const activeSnapToday = (isLocalActive && activeTimer.date === todayStr)
              ? Number(activeTimer.accumulatedTodaySeconds ?? (activeTimer.timerRunning ? 0 : activeTimer.todayWorkSeconds) ?? 0)
              : 0;
            const existingTodayStrict = existingIsToday
              ? (existing.accumulatedTodaySeconds !== undefined && existing.accumulatedTodaySeconds !== null
                  ? Number(existing.accumulatedTodaySeconds)
                  : (effectiveRunning ? 0 : Number(existing.todayWorkSeconds || 0)))
              : 0;
            const backendTodayStrict = backendIsToday
              ? (bt.accumulatedTodaySeconds !== undefined && bt.accumulatedTodaySeconds !== null
                  ? Number(bt.accumulatedTodaySeconds)
                  : (effectiveRunning ? 0 : Number(bt.todayWorkSeconds || 0)))
              : 0;

            const safeLocalToday = Math.max(
              existingTodayStrict,
              hasExplicitDailyToday ? (Number(mergedDailySessions[todayStr]) || 0) : 0,
              workerTodaySecs
            );
            const safeBackendToday = Math.max(
              backendTodayStrict,
              workerTodaySecs
            );
            const effectiveTodaySecs = Math.max(
              safeLocalToday,
              safeBackendToday,
              activeSnapToday
            );

            // Lifetime accumulated seconds: NEVER fold live `localSecs` / `backendSecs` (which include live elapsed!) into frozen `effectiveAccum`!
            const safeLocalAccum = (effectiveRunning && localAccum > backendAccum + 3600)
              ? backendAccum
              : localAccum;
            const effectiveAccum = Math.max(
              safeLocalAccum,
              backendAccum,
              effectiveRunning ? 0 : backendSecs,
              workerAccumSecs,
              effectiveTodaySecs,
              activeSnapToday
            );

            const nowMergeMs = Date.now();
            const todayMidMerge = new Date(nowMergeMs);
            todayMidMerge.setHours(0, 0, 0, 0);
            const mergeElapsed = (effectiveRunning && effectiveStartedAt && Number(effectiveStartedAt) >= todayMidMerge.getTime() && Number(effectiveStartedAt) <= nowMergeMs)
              ? Math.max(0, Math.floor((nowMergeMs - Number(effectiveStartedAt)) / 1000))
              : 0;
            const liveMergeToday = effectiveTodaySecs + mergeElapsed;
            const isMultiTask = Boolean(
              (Array.isArray(bt.assignedToIds) && bt.assignedToIds.length > 1) ||
              (Array.isArray(bt.assignees) && bt.assignees.length > 1) ||
              (Array.isArray(existing.assignedToIds) && existing.assignedToIds.length > 1) ||
              (Array.isArray(existing.assignees) && existing.assignees.length > 1)
            );
            const liveMergeTotal = isMultiTask
              ? getMultiAssigneeCombinedSeconds({ ...existing, ...bt, assigneeTimers: mergedAssigneeTimers, assigneeSessions: mergedAssigneeSessions }, nowMergeMs)
              : (effectiveAccum + mergeElapsed);

            taskMap.set(id, {
              ...existing,
              ...bt,
              timerRunning: effectiveRunning,
              startedAt: effectiveStartedAt,
              timerSeconds: liveMergeTotal,
              accumulatedSeconds: effectiveAccum,
              todayWorkSeconds: liveMergeToday,
              accumulatedTodaySeconds: effectiveTodaySecs,
              dailySessions: mergedDailySessions,
              assigneeTimers: mergedAssigneeTimers,
              assigneeSessions: mergedAssigneeSessions,
              liveTodaySeconds: liveMergeToday,
              liveDurationText: formatSeconds(liveMergeToday),
              hoursLoggedText: formatSeconds(liveMergeTotal),
              hoursLogged: +(liveMergeTotal / 3600).toFixed(2),
              sessionDate: effectiveTodaySecs > 0 ? todayStr : (existing.sessionDate || bt.sessionDate || todayStr),
              status: bt.status || existing.status
            });
          } else {
            taskMap.set(id, { ...bt });
          }
        }
      });

      // 2. Preserve any pending local-only offline tasks (tsk_ prefix) not yet synced
      const remoteIds = new Set((rawTsks || []).map(r => String(r._id || r.id)));
      const remoteCodes = new Set((rawTsks || []).map(r => (r.taskCode || '').toLowerCase()).filter(Boolean));
      localTasks.forEach(lt => {
        const id = String(lt._id || lt.id);
        const code = (lt.taskCode || '').toLowerCase();
        const alreadyHasCode = code && remoteCodes.has(code);
        const alreadyHasSameTitleAndProject = (rawTsks || []).some(rt =>
          rt.title && lt.title && rt.title.trim().toLowerCase() === lt.title.trim().toLowerCase() &&
          String(rt.projectId || rt.project || '') === String(lt.projectId || lt.project || '')
        );
        if (id.startsWith('tsk_') && !remoteIds.has(id) && !alreadyHasCode && !alreadyHasSameTitleAndProject && !isLegacyTask(lt)) {
          taskMap.set(id, { ...lt });
        }
      });

      // 3. Apply active timer state if running (strictly 1 active running task per user)
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const todayMidnightMs = todayMidnight.getTime();

      const mergedList = Array.from(taskMap.values()).map(t => {
        const tId = String(t._id || t.id);
        const isCompleted = t.status === 'completed' || !!t.completedAt;

        // Completed tasks MUST NEVER have a running timer
        if (isCompleted) {
          const staticSecs = Number(t.timerSeconds) || Number(t.durationSeconds) || 0;
          const todaySecs = getTaskTodaySeconds(t, todayStr, Date.now(), false, false);
          return {
            ...t,
            timerRunning: false,
            startedAt: null,
            timerSeconds: staticSecs,
            accumulatedSeconds: staticSecs,
            todayWorkSeconds: todaySecs,
            liveDurationText: formatSeconds(todaySecs),
            hoursLoggedText: formatSeconds(staticSecs)
          };
        }

        const isAssignedToMe = isTaskAssignedToMe(t);
        const isLocallyPausedSnapshot = Boolean(
          activeTimer && !activeTimer.timerRunning && (String(activeTimer.taskId) === tId || String(activeTimer._id) === tId)
        );
        const isRecentPauseAction = Boolean(
          lastTaskActionRef.current &&
          lastTaskActionRef.current.taskId === tId &&
          (lastTaskActionRef.current.action === 'pause' || lastTaskActionRef.current.action === 'stop') &&
          (Date.now() - Number(lastTaskActionRef.current.at || 0) < 15000)
        );
        let isActive = activeTimer && activeTimer.timerRunning && !isRecentPauseAction && (String(activeTimer.taskId) === tId || String(activeTimer._id) === tId);

        // For current user: ONLY the single active task timer is running!
        let isRunning = false;
        const isRunningForMe = isTaskRunningForUser(t, currentUser);
        if (isAssignedToMe) {
          if (isRecentPauseAction) {
            isRunning = false;
          } else if (isActive) {
            isRunning = isRunningForMe;
          } else {
            // Check if user genuinely started this task on another device AFTER any local pause
            const startNum = Number(t.startedAt || 0);
            const isStartedToday = startNum >= todayMidnightMs;
            const pausedAtTs = Number(activeTimer?.pausedAt || t.pausedAt || 0);
            const isNewerThanPause = !isLocallyPausedSnapshot || (startNum > pausedAtTs + 1000);
            if (t.timerRunning && isStartedToday && isNewerThanPause && isRunningForMe) {
              isRunning = true;
              isActive = true;
              const baseTodayHydrated = Number(t.dailySessions?.[todayStr] ?? t.accumulatedTodaySeconds ?? 0);
              const hydratedTimer = {
                taskId: t._id || t.id,
                taskCode: t.taskCode,
                title: t.title,
                projectName: t.projectName,
                startedAt: startNum,
                accumulatedSeconds: Number(t.accumulatedSeconds) || 0,
                accumulatedTodaySeconds: baseTodayHydrated,
                todayWorkSeconds: baseTodayHydrated,
                timerRunning: true,
                date: todayStr
              };
              saveActiveTimerSnapshot(hydratedTimer);
            }
          }
        } else {
          const isStartedToday = t.startedAt && Number(t.startedAt) >= todayMidnightMs;
          isRunning = Boolean(t.timerRunning && isStartedToday);
        }

        if (isRunning) {
          const startedAtTs = (isActive && activeTimer.startedAt) ? activeTimer.startedAt : (t.startedAt || Date.now());
          const startNum = Number(startedAtTs) || 0;
          let elapsed = 0;
          if (startNum >= todayMidnightMs && startNum <= Date.now()) {
            elapsed = Math.max(0, Math.floor((Date.now() - startNum) / 1000));
          }

          // STRICT FROZEN BASELINE: Never read live `t.timerSeconds` (which already includes elapsed!)
          const baseLifetime = (isActive && activeTimer.accumulatedSeconds !== undefined && activeTimer.accumulatedSeconds !== null)
            ? Number(activeTimer.accumulatedSeconds)
            : ((t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null)
              ? Number(t.accumulatedSeconds)
              : Math.max(0, (Number(t.timerSeconds) || 0) - elapsed));

          // STRICT FROZEN TODAY BASELINE: Check !== undefined && !== null (never `|| t.todayWorkSeconds` because 0 is falsy!)
          let baseToday = 0;
          if (isActive && activeTimer.accumulatedTodaySeconds !== undefined && activeTimer.accumulatedTodaySeconds !== null && activeTimer.date === todayStr) {
            baseToday = Number(activeTimer.accumulatedTodaySeconds);
          } else if (t.dailySessions && t.dailySessions[todayStr] !== undefined && t.dailySessions[todayStr] !== null) {
            baseToday = Number(t.dailySessions[todayStr]);
          } else if (t.sessionDate === todayStr && t.accumulatedTodaySeconds !== undefined && t.accumulatedTodaySeconds !== null) {
            baseToday = Number(t.accumulatedTodaySeconds);
          } else if (t.sessionDate === todayStr && t.todayWorkSeconds !== undefined && t.todayWorkSeconds !== null) {
            baseToday = Math.max(0, Number(t.todayWorkSeconds) - elapsed);
          }

          const currentLifetimeSecs = baseLifetime + elapsed;
          const currentTodaySecs = baseToday + elapsed;

          return {
            ...t,
            timerRunning: true,
            timerSeconds: currentLifetimeSecs,
            accumulatedSeconds: baseLifetime,
            accumulatedTodaySeconds: baseToday,
            todayWorkSeconds: currentTodaySecs,
            liveTodaySeconds: currentTodaySecs,
            startedAt: startedAtTs,
            dailySessions: { ...(t.dailySessions || {}), [todayStr]: baseToday },
            liveDurationText: formatSeconds(currentTodaySecs),
            hoursLoggedText: formatSeconds(currentLifetimeSecs)
          };
        }

        const workerT = getWorkerTaskTimer(t, currentUser);
        const staticLifetime = Math.max(
          (t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null) ? Number(t.accumulatedSeconds) : (Number(t.timerSeconds) || 0),
          Number(workerT?.accumulatedSeconds || 0)
        );

        const staticToday = Math.max(
          (t.dailySessions?.[todayStr] !== undefined)
            ? Number(t.dailySessions[todayStr])
            : (t.sessionDate === todayStr && t.todayWorkSeconds !== undefined
              ? Number(t.todayWorkSeconds)
              : 0),
          (workerT?.sessionDate === todayStr ? Number(workerT?.todayWorkSeconds || 0) : 0)
        );

        return {
          ...t,
          timerRunning: false,
          startedAt: null,
          timerSeconds: staticLifetime,
          accumulatedSeconds: staticLifetime,
          todayWorkSeconds: staticToday,
          accumulatedTodaySeconds: staticToday,
          liveTodaySeconds: staticToday,
          liveDurationText: formatSeconds(staticToday),
          hoursLoggedText: formatSeconds(staticLifetime),
          hoursLogged: +(staticLifetime / 3600).toFixed(2)
        };
      });

      // 4. Strict Deduplication: ensure each task appears strictly ONCE by taskCode or ID
      const finalTasksMap = new Map();
      mergedList.forEach(t => {
        const canonicalKey = (t.taskCode && t.taskCode.trim())
          ? `code_${t.taskCode.trim().toLowerCase()}`
          : `id_${t._id || t.id}`;
        if (!finalTasksMap.has(canonicalKey)) {
          finalTasksMap.set(canonicalKey, t);
        } else {
          const existing = finalTasksMap.get(canonicalKey);
          // Prefer MongoDB ObjectId over local tsk_ stub
          const isExistingStub = String(existing._id || '').startsWith('tsk_');
          const isCurrentStub = String(t._id || '').startsWith('tsk_');
          const base = (!isCurrentStub && isExistingStub) ? t : existing;
          const other = (!isCurrentStub && isExistingStub) ? existing : t;
          const mergedDaily = {
            ...(existing.dailySessions && typeof existing.dailySessions === 'object' ? existing.dailySessions : {}),
            ...(t.dailySessions && typeof t.dailySessions === 'object' ? t.dailySessions : {})
          };
          if (existing.sessionDate && existing.sessionDate !== todayStr && Number(existing.todayWorkSeconds) > 0) {
            mergedDaily[existing.sessionDate] = Math.max(Number(mergedDaily[existing.sessionDate]) || 0, Number(existing.todayWorkSeconds));
          }
          if (t.sessionDate && t.sessionDate !== todayStr && Number(t.todayWorkSeconds) > 0) {
            mergedDaily[t.sessionDate] = Math.max(Number(mergedDaily[t.sessionDate]) || 0, Number(t.todayWorkSeconds));
          }

          const existingIsToday = existing.sessionDate === todayStr;
          const tIsToday = t.sessionDate === todayStr;
          const chosenRunning = Boolean(
            (existing.timerRunning && existing.startedAt) || (t.timerRunning && t.startedAt)
          );
          const chosenStartedAt = chosenRunning
            ? Math.max(Number(existing.startedAt) || 0, Number(t.startedAt) || 0) || null
            : null;

          // Keep frozen baseline separate from live ticking seconds when running
          const frozenToday = Math.max(
            (existingIsToday && existing.accumulatedTodaySeconds !== undefined && existing.accumulatedTodaySeconds !== null) ? Number(existing.accumulatedTodaySeconds) : 0,
            (tIsToday && t.accumulatedTodaySeconds !== undefined && t.accumulatedTodaySeconds !== null) ? Number(t.accumulatedTodaySeconds) : 0,
            Number(mergedDaily[todayStr]) || 0
          );
          const maxToday = chosenRunning
            ? Math.max(
                existingIsToday ? (Number(existing.todayWorkSeconds) || 0) : 0,
                tIsToday ? (Number(t.todayWorkSeconds) || 0) : 0,
                frozenToday
              )
            : Math.max(
                existingIsToday ? (Number(existing.todayWorkSeconds) || 0) : 0,
                tIsToday ? (Number(t.todayWorkSeconds) || 0) : 0,
                frozenToday
              );

          finalTasksMap.set(canonicalKey, {
            ...other,
            ...base,
            timerRunning: chosenRunning,
            startedAt: chosenStartedAt,
            timerSeconds: Math.max(Number(existing.timerSeconds) || 0, Number(t.timerSeconds) || 0),
            accumulatedSeconds: Math.max(Number(existing.accumulatedSeconds) || 0, Number(t.accumulatedSeconds) || 0),
            todayWorkSeconds: maxToday,
            accumulatedTodaySeconds: chosenRunning ? frozenToday : maxToday,
            dailySessions: mergedDaily,
            sessionDate: maxToday > 0 || chosenRunning ? todayStr : (existing.sessionDate || t.sessionDate || todayStr)
          });
          }
        });
        const cleanMergedTasks = Array.from(finalTasksMap.values()).map(sanitizeTaskDailySessions);

        // Keep localStorage synchronized so tasks survive refreshes silently without recursive loop
        localStorage.setItem(KEYS.TASKS, JSON.stringify(cleanMergedTasks));

        // Synchronize running task timer across devices / laptops
        const remoteRunningTask = cleanMergedTasks.find(t =>
          t.timerRunning &&
          t.status !== 'completed' &&
          !t.completedAt &&
          isTaskRunningForUser(t, currentUser)
        );
        const curSnapshot = getActiveTimerSnapshot();

        if (remoteRunningTask) {
          const rTaskId = String(remoteRunningTask._id || remoteRunningTask.id);
          if (!curSnapshot || String(curSnapshot.taskId) !== rTaskId || !curSnapshot.timerRunning) {
            saveActiveTimerSnapshot({
              taskId: remoteRunningTask._id || remoteRunningTask.id,
              taskCode: remoteRunningTask.taskCode || 'TSK',
              title: remoteRunningTask.title,
              projectName: remoteRunningTask.projectName || 'General Work',
              assignedToId: userKey,
              assignedToName: remoteRunningTask.assignedToName || currentUser?.name || 'User',
              timerRunning: true,
              startedAt: remoteRunningTask.startedAt || Date.now(),
              accumulatedSeconds: remoteRunningTask.accumulatedSeconds !== undefined ? Number(remoteRunningTask.accumulatedSeconds) : (Number(remoteRunningTask.timerSeconds) || 0),
              accumulatedTodaySeconds: remoteRunningTask.accumulatedTodaySeconds !== undefined ? Number(remoteRunningTask.accumulatedTodaySeconds) : (Number(remoteRunningTask.todayWorkSeconds) || 0),
              todayWorkSeconds: Number(remoteRunningTask.todayWorkSeconds) || Number(remoteRunningTask.accumulatedTodaySeconds) || 0,
              date: today,
              lastUpdated: Date.now()
            });
          }
        } else if (curSnapshot?.timerRunning) {
          const matchTask = cleanMergedTasks.find(t => String(t._id || t.id) === String(curSnapshot.taskId) || (curSnapshot.taskCode && t.taskCode === curSnapshot.taskCode));
          if (matchTask && (!isTaskAssignedToMe(matchTask) || !isTaskRunningForUser(matchTask, currentUser))) {
            // CurSnapshot is for a task NOT assigned to me or running by another teammate! Clear it immediately to prevent cross-account pollution
            saveActiveTimerSnapshot(null);
          } else if (matchTask && !matchTask.timerRunning) {
          saveActiveTimerSnapshot({
            ...curSnapshot,
            timerRunning: false,
            startedAt: null,
            accumulatedSeconds: matchTask.accumulatedSeconds !== undefined ? Number(matchTask.accumulatedSeconds) : Number(matchTask.timerSeconds)
          });
        }
      }

      // Self-heal corrupted timesheets where creator / admin was wrongly assigned instead of task assignee
      let allTimesheets = times || getCollection(KEYS.TIMESHEETS) || [];
      try {
        let tsRepaired = false;
        allTimesheets = allTimesheets.map(ts => {
          if (!ts || (!ts.taskId && !ts.taskCode)) return ts;
          const task = cleanMergedTasks.find(t =>
            (ts.taskId && String(t._id || t.id) === String(ts.taskId)) ||
            (ts.taskCode && t.taskCode && String(t.taskCode).trim().toLowerCase() === String(ts.taskCode).trim().toLowerCase())
          );
          if (task && (task.assignedToId || task.assignedToName)) {
            const correctEmpId = task.assignedToId || (typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?._id);
            const correctEmpName = task.assignedToName;
            const correctEmpCode = task.assignedToCode;
            const isAssignedToAdmin = isTaskAssignedToUser(task, { _id: 'ADM-001', employeeCode: 'ADM-001', name: 'Administrator' });
            if (!isAssignedToAdmin && (ts.employeeId === 'ADM-001' || ts.employeeName === 'Administrator' || ts.memo?.includes('Shift clock-out'))) {
              tsRepaired = true;
              ts = {
                ...ts,
                employee: correctEmpId,
                employeeId: correctEmpId,
                employeeCode: correctEmpCode || ts.employeeCode,
                employeeName: correctEmpName || ts.employeeName
              };
            }
            // Heal timesheet date if a past day session was mistakenly saved under today's date
            if (task.startDate && task.startDate < todayStr && ts.date === todayStr && ts.memo?.includes('Shift clock-out') && Number(ts.totalDurationSeconds) >= (Number(task.accumulatedSeconds) || 0) - 60) {
              tsRepaired = true;
              ts = {
                ...ts,
                date: task.startDate
              };
            }
          }
          return ts;
        });
        if (tsRepaired) {
          localStorage.setItem(KEYS.TIMESHEETS, JSON.stringify(allTimesheets));
        }
      } catch (_) {}

      setProjects(prjs || []);
      setTasks(cleanMergedTasks);
      setTimesheets(allTimesheets);
      if (Array.isArray(allTimesheets) && allTimesheets.length > 0) {
        try {
          const existingTimes = getCollection(KEYS.TIMESHEETS) || [];
          const tsMap = new Map();
          existingTimes.forEach(t => {
            if (!t) return;
            const k = String(t._id || `${t.date}_${t.taskId || t.taskCode}_${t.employeeId || t.employee || ''}`);
            if (k) tsMap.set(k, t);
          });
          allTimesheets.forEach(t => {
            if (!t) return;
            const k = String(t._id || `${t.date}_${t.taskId || t.taskCode}_${t.employeeId || t.employee || ''}`);
            if (k) tsMap.set(k, { ...(tsMap.get(k) || {}), ...t });
          });
          const mergedTimes = Array.from(tsMap.values());
          localStorage.setItem(KEYS.TIMESHEETS, JSON.stringify(mergedTimes));
        } catch (_) {}
      }
    } catch (err) {
      console.error('Error loading Work module data:', err);
      if (!isSilent) addToast('Failed to sync Work module data', 'error');
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) setLoading(false);
    }
  }, [projectFilter, taskFilter, timesheetFilter, getActiveTimerSnapshot, getElapsedSeconds, formatSeconds, addToast, isTaskAssignedToMe, saveActiveTimerSnapshot, userKey, currentUser]);

  // Derived reactive active running task strictly scoped to current logged-in user
  const activeRunningTask = useMemo(() => {
    if (!currentUser) return null;
    const hadClockedOut = Boolean(
      readTimerStorage(currentUser, 'clock_out') ||
      readTimerStorage(currentUser, 'clockout_time') ||
      readTimerStorage(currentUser, 'had_clocked_out') === 'true' ||
      readTimerStorage(currentUser, 'had_clocked_out') === true ||
      localStorage.getItem(`ems_timer_${userKey}_clock_out`) ||
      localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`) === 'true' ||
      (currentUser?.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_clock_out`))
    );
    if (hadClockedOut) return null;

    const isShiftClockedIn = readTimerStorage(currentUser, 'is_clocked_in') === 'true' ||
      readTimerStorage(currentUser, 'is_clocked_in') === true ||
      localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true' ||
      (currentUser?.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_is_clocked_in`) === 'true');
    if (!isShiftClockedIn) return null;

    const matched = tasks.find(t =>
      t.timerRunning &&
      t.status !== 'completed' &&
      !t.completedAt &&
      isTaskRunningForUser(t, currentUser)
    );
    if (matched) return matched;

    // Direct active timer snapshot fallback
    const activeTimer = getActiveTimerSnapshot();
    if (activeTimer && activeTimer.timerRunning && activeTimer.status !== 'completed' && !activeTimer.completedAt && isTaskRunningForUser(activeTimer, currentUser)) {
      const matchInTasks = tasks.find(t => String(t._id || t.id) === String(activeTimer.taskId || activeTimer._id));
      if (matchInTasks) {
        if (matchInTasks.status === 'completed' || matchInTasks.completedAt) {
          saveActiveTimerSnapshot(null);
          return null;
        }
        return {
          ...matchInTasks,
          timerRunning: true,
          startedAt: activeTimer.startedAt
        };
      }
      return activeTimer;
    }

    return null;
  }, [tasks, currentUser, isTaskAssignedToMe, userKey, getActiveTimerSnapshot]);

  useEffect(() => {
    loadWorkData(false);

    const scheduleDebouncedLoad = (silent = true) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        loadWorkData(silent);
      }, 400);
    };

    const handleStorageUpdate = (e) => {
      if (isFetchingRef.current) return;
      const changedKey = e?.key || e?.detail?.key;
      if (
        !changedKey ||
        ['ems_auth_session', 'all', 'ems_projects', 'ems_tasks', 'ems_timesheets', activeTimerKey, 'ems_active_task_timer'].includes(changedKey) ||
        changedKey.startsWith('ems_active_task_timer') ||
        changedKey.startsWith('ems_timer_')
      ) {
        scheduleDebouncedLoad(true);
      }
    };
    window.addEventListener('hrms_storage_change', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // Cross-tab & Cross-Browser real-time event subscription for 0ms latency sync
    const unsubscribeSync = subscribeToSyncEvents((ev) => {
      if (!ev) return;

      if (ev.type === SYNC_EVENTS.TASK_TIMER_STARTED && ev.payload) {
        const { taskId: syncTaskId, empKey: syncEmpKey, startedAt: syncStartedAt, accumulatedSeconds: syncAccum, taskTitle: syncTitle } = ev.payload;
        const targetId = String(syncTaskId || '');
        const isMyEmp = String(syncEmpKey || '') === String(userKey) ||
          (currentUser?.employeeCode && String(syncEmpKey || '') === String(currentUser.employeeCode)) ||
          (currentUser?._id && String(syncEmpKey || '') === String(currentUser._id));

        if (isMyEmp && targetId) {
          const startTs = Number(syncStartedAt) || Date.now();
          const accumSecs = Number(syncAccum) || 0;
          const accumToday = Number(ev.payload.accumulatedTodaySeconds ?? 0);
          saveActiveTimerSnapshot({
            taskId: targetId,
            taskCode: ev.payload.taskCode || 'TSK',
            title: syncTitle || 'Task',
            projectName: ev.payload.projectName || 'General Work',
            startedAt: startTs,
            accumulatedSeconds: accumSecs,
            accumulatedTodaySeconds: accumToday,
            todayWorkSeconds: accumToday,
            timerRunning: true,
            date: getTodayStr()
          });
        }

        setTasks(prev => prev.map(t => {
          const tId = String(t._id || t.id);
          if (tId === targetId) {
            const isMulti = (Array.isArray(t.assignedToIds) && t.assignedToIds.length > 1) ||
              (Array.isArray(t.assignees) && t.assignees.length > 1);
            const alreadyRunningForMe = !isMyEmp && isMulti && isTaskRunningForUser(t, currentUser);
            const syncWorkerKey = String(ev.payload.activeWorkerId || ev.payload.empKey || '');
            const nextAssigneeTimers = syncWorkerKey ? {
              ...(t.assigneeTimers || {}),
              [syncWorkerKey]: {
                timerRunning: true,
                startedAt: Number(syncStartedAt) || Date.now(),
                accumulatedSeconds: Number(syncAccum) || 0,
                todayWorkSeconds: Number(ev.payload.accumulatedTodaySeconds ?? 0),
                sessionDate: getTodayStr(),
                workerId: syncWorkerKey,
                workerName: ev.payload.activeWorkerName || ev.payload.empName || '',
                updatedAt: Date.now()
              }
            } : t.assigneeTimers;

            if (alreadyRunningForMe) {
              return { ...t, assigneeTimers: nextAssigneeTimers };
            }

            return {
              ...t,
              timerRunning: true,
              startedAt: Number(syncStartedAt) || Date.now(),
              accumulatedSeconds: Number(syncAccum) || t.accumulatedSeconds || 0,
              assigneeTimers: nextAssigneeTimers,
              activeWorkerId: ev.payload.activeWorkerId || ev.payload.empKey,
              activeWorkerName: ev.payload.activeWorkerName || ev.payload.empName || ev.payload.startedBy,
              activeWorkerAvatar: ev.payload.activeWorkerAvatar || '',
              activeWorkerRole: ev.payload.activeWorkerRole || '',
              activeUserId: ev.payload.activeUserId || ev.payload.activeWorkerId || ev.payload.empKey,
              activeUserName: ev.payload.activeUserName || ev.payload.activeWorkerName || ev.payload.empName || ev.payload.startedBy,
              status: t.status === 'incomplete' ? 'in_progress' : t.status
            };
          }
          if (isMyEmp && isTaskAssignedToMe(t) && t.timerRunning) {
            return {
              ...t,
              timerRunning: false,
              startedAt: null,
              activeWorkerId: null,
              activeWorkerName: null,
              activeWorkerAvatar: null,
              activeWorkerRole: null,
              activeUserId: null,
              activeUserName: null
            };
          }
          return t;
        }));
      } else if (ev.type === SYNC_EVENTS.TASK_TIMER_PAUSED && ev.payload) {
        const { taskId: syncTaskId, empKey: syncEmpKey, accumulatedSeconds: syncAccum, todayWorkSeconds: syncToday, accumulatedTodaySeconds: syncAccumToday, dailySessions: syncSessions } = ev.payload;
        const targetId = String(syncTaskId || '');
        const myIds = [userKey, currentUser?._id, currentUser?.employeeCode, currentUser?.email].filter(Boolean).map(s => String(s).toLowerCase().trim());
        const syncIds = [syncEmpKey, ev.payload.employeeId, ev.payload.employeeCode].filter(Boolean).map(s => String(s).toLowerCase().trim());
        const isMyEmp = myIds.some(id => syncIds.includes(id));

        const accum = Number(syncAccum) || 0;
        const todaySecs = Number(syncToday ?? syncAccumToday ?? 0);
        const todayDate = getTodayStr();

        if (isMyEmp) {
          saveActiveTimerSnapshot({
            taskId: targetId,
            taskCode: ev.payload.taskCode || '',
            title: ev.payload.taskTitle || '',
            timerRunning: false,
            startedAt: null,
            accumulatedSeconds: accum,
            accumulatedTodaySeconds: todaySecs,
            timerSeconds: accum,
            todayWorkSeconds: todaySecs,
            liveTodaySeconds: todaySecs,
            dailySessions: syncSessions || { [todayDate]: todaySecs },
            date: todayDate,
            sessionDate: todayDate
          });
        }

        setTasks(prev => prev.map(t => {
          const tId = String(t._id || t.id);
          if (tId === targetId) {
            const finalAccum = accum || Number(t.accumulatedSeconds) || 0;
            const finalToday = todaySecs || Number(t.accumulatedTodaySeconds ?? t.dailySessions?.[todayDate] ?? t.todayWorkSeconds ?? 0);
            return {
              ...t,
              timerRunning: false,
              startedAt: null,
              activeWorkerId: null,
              activeWorkerName: null,
              activeWorkerAvatar: null,
              activeWorkerRole: null,
              activeUserId: null,
              activeUserName: null,
              accumulatedSeconds: finalAccum,
              timerSeconds: finalAccum,
              accumulatedTodaySeconds: finalToday,
              todayWorkSeconds: finalToday,
              liveTodaySeconds: finalToday,
              dailySessions: { ...(t.dailySessions || {}), ...(syncSessions || {}), [todayDate]: finalToday },
              sessionDate: todayDate,
              liveDurationText: formatSeconds(finalToday),
              hoursLoggedText: formatSeconds(finalAccum)
            };
          }
          return t;
        }));
      } else if ((ev.type === SYNC_EVENTS.TASK_TIMER_STOPPED || ev.type === SYNC_EVENTS.TASK_COMPLETED) && ev.payload) {
        const { taskId: syncTaskId, empKey: syncEmpKey } = ev.payload;
        const targetId = String(syncTaskId || '');
        const myIds = [userKey, currentUser?._id, currentUser?.employeeCode, currentUser?.email].filter(Boolean).map(s => String(s).toLowerCase().trim());
        const syncIds = [syncEmpKey, ev.payload.employeeId, ev.payload.employeeCode].filter(Boolean).map(s => String(s).toLowerCase().trim());
        const isMyEmp = myIds.some(id => syncIds.includes(id));

        if (isMyEmp) {
          saveActiveTimerSnapshot(null);
        }

        setTasks(prev => prev.map(t => {
          const tId = String(t._id || t.id);
          if (tId === targetId) {
            return {
              ...t,
              timerRunning: false,
              startedAt: null,
              status: ev.type === SYNC_EVENTS.TASK_COMPLETED ? 'completed' : t.status
            };
          }
          return t;
        }));
      } else if (ev.type === SYNC_EVENTS.SHIFT_CLOCKED_OUT || ev.type === 'SHIFT_CLOCKED_OUT' || ev.type === 'SHIFT_FORCE_CLOCKED_OUT') {
        const payload = ev.payload || {};
        const myIds = [userKey, currentUser?._id, currentUser?.employeeCode, currentUser?.email].filter(Boolean).map(s => String(s).toLowerCase().trim());
        const syncIds = [payload.userKey, payload.employeeId, payload.employeeCode].filter(Boolean).map(s => String(s).toLowerCase().trim());
        const isMyEmp = myIds.some(id => syncIds.includes(id));

        if (isMyEmp) {
          const active = getActiveTimerSnapshot();
          if (active && active.timerRunning) {
            saveActiveTimerSnapshot({
              ...active,
              timerRunning: false,
              startedAt: null,
              wasPausedForClockOut: true
            });
          }
          setTasks(prev => prev.map(t => {
            if (t.timerRunning && (isTaskAssignedToMe(t) || (active && String(t._id || t.id) === String(active.taskId)))) {
              return { ...t, timerRunning: false, startedAt: null, wasPausedForClockOut: true };
            }
            return t;
          }));
        }
      } else if (ev.type === SYNC_EVENTS.BREAK_STARTED || ev.type === 'BREAK_STARTED') {
        const payload = ev.payload || {};
        const myIds = [userKey, currentUser?._id, currentUser?.employeeCode, currentUser?.email].filter(Boolean).map(s => String(s).toLowerCase().trim());
        const syncIds = [payload.userKey, payload.employeeId, payload.employeeCode].filter(Boolean).map(s => String(s).toLowerCase().trim());
        const isMyEmp = myIds.some(id => syncIds.includes(id));

        if (isMyEmp) {
          const active = getActiveTimerSnapshot();
          if (active && active.timerRunning) {
            saveActiveTimerSnapshot({
              ...active,
              timerRunning: false,
              startedAt: null,
              wasPausedForBreak: true
            });
          }
          setTasks(prev => prev.map(t => {
            if (t.timerRunning && (isTaskAssignedToMe(t) || (active && String(t._id || t.id) === String(active.taskId)))) {
              return { ...t, timerRunning: false, startedAt: null, wasPausedForBreak: true };
            }
            return t;
          }));
        }
      }

      if ([
        SYNC_EVENTS.TASK_TIMER_STARTED,
        SYNC_EVENTS.TASK_TIMER_PAUSED,
        SYNC_EVENTS.TASK_TIMER_STOPPED,
        SYNC_EVENTS.TASK_COMPLETED,
        SYNC_EVENTS.SHIFT_CLOCKED_OUT,
        SYNC_EVENTS.BREAK_STARTED,
        SYNC_EVENTS.STORAGE_MUTATION
      ].includes(ev.type)) {
        scheduleDebouncedLoad(true);
      }
    });

    // Socket-aware periodic safety-net sync (0ms live sync via Socket.IO; 120s poll when connected, 20s fallback when disconnected)
    let pollTick = 0;
    const syncInterval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      pollTick += 1;
      if (isSocketConnected() && pollTick % 6 !== 0) return;
      scheduleDebouncedLoad(true);
    }, 20000);

    const handleTelemetryUpdate = (e) => {
      const data = e?.detail;
      if (!data) return;
      const isMyEmp = (data.employeeId && (String(data.employeeId) === String(userKey) || String(data.employeeId) === String(currentUser?._id))) ||
        (data.employeeCode && currentUser?.employeeCode && String(data.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase());
      if (!isMyEmp) return;

      if (data.activeTask && data.activeTask.taskId) {
        const at = data.activeTask;
        const targetId = String(at.taskId);
        const todayDate = getTodayStr();
        const curSnapshot = getActiveTimerSnapshot();

        if (at.timerRunning === true) {
          const startTs = Number(at.startedAt) || 0;
          if (!startTs) return; // Never start a timer with a missing startedAt (would fabricate a 00:00:00 timer!)

          // ANTI-RESURRECTION GUARD: Never let a stale/in-flight telemetry packet un-pause a task we just paused!
          const recentPause = lastTaskActionRef.current &&
            lastTaskActionRef.current.taskId === targetId &&
            (lastTaskActionRef.current.action === 'pause' || lastTaskActionRef.current.action === 'stop') &&
            (Date.now() - Number(lastTaskActionRef.current.at || 0) < 15000);
          const localPausedAt = Math.max(
            Number(curSnapshot?.pausedAt || 0),
            recentPause ? Number(lastTaskActionRef.current.at || 0) : 0
          );
          if (localPausedAt > 0 && startTs <= localPausedAt + 1000) {
            return;
          }

          const accumSecs = Number(at.accumulatedSeconds) || 0;
          if (!curSnapshot || String(curSnapshot.taskId) !== targetId || !curSnapshot.timerRunning) {
            const baseTodayFromTelem = (at.accumulatedTodaySeconds !== undefined && at.accumulatedTodaySeconds !== null)
              ? Number(at.accumulatedTodaySeconds)
              : (Number(at.todayWorkSeconds) || 0);
            saveActiveTimerSnapshot({
              taskId: targetId,
              taskCode: at.taskCode || 'TSK',
              title: at.title || at.taskTitle || 'Task',
              projectName: at.projectName || 'General Work',
              startedAt: startTs,
              accumulatedSeconds: accumSecs,
              accumulatedTodaySeconds: baseTodayFromTelem,
              todayWorkSeconds: baseTodayFromTelem,
              liveTodaySeconds: baseTodayFromTelem,
              dailySessions: { [todayDate]: baseTodayFromTelem },
              timerRunning: true,
              date: todayDate,
              sessionDate: todayDate
            });

            setTasks(prev => prev.map(t => {
              const tId = String(t._id || t.id);
              if (tId === targetId) {
                const mergedToday = Math.max(baseTodayFromTelem, Number(t.dailySessions?.[todayDate]) || 0);
                return {
                  ...t,
                  timerRunning: true,
                  startedAt: startTs,
                  accumulatedSeconds: Math.max(accumSecs, Number(t.accumulatedSeconds) || 0),
                  accumulatedTodaySeconds: mergedToday,
                  todayWorkSeconds: mergedToday,
                  liveTodaySeconds: mergedToday,
                  dailySessions: { ...(t.dailySessions || {}), [todayDate]: mergedToday },
                  sessionDate: todayDate,
                  status: t.status === 'incomplete' ? 'in_progress' : t.status
                };
              }
              if (isTaskAssignedToMe(t) && t.timerRunning) {
                return { ...t, timerRunning: false, startedAt: null };
              }
              return t;
            }));
          }
        } else {
          // Remote Pause synced via telemetry
          const pauseAccum = Number(at.accumulatedSeconds) || 0;
          const pauseToday = (at.accumulatedTodaySeconds !== undefined && at.accumulatedTodaySeconds !== null)
            ? Number(at.accumulatedTodaySeconds)
            : (Number(at.todayWorkSeconds) || 0);
          const pausedAtNow = Date.now();
          if (curSnapshot && String(curSnapshot.taskId) === targetId && curSnapshot.timerRunning) {
            const finalAccum = Math.max(pauseAccum, Number(curSnapshot.accumulatedSeconds) || 0);
            const finalToday = Math.max(pauseToday, Number(curSnapshot.accumulatedTodaySeconds ?? curSnapshot.todayWorkSeconds ?? 0));
            saveActiveTimerSnapshot({
              ...curSnapshot,
              timerRunning: false,
              startedAt: null,
              pausedAt: pausedAtNow,
              accumulatedSeconds: finalAccum,
              timerSeconds: finalAccum,
              accumulatedTodaySeconds: finalToday,
              todayWorkSeconds: finalToday,
              liveTodaySeconds: finalToday,
              dailySessions: { ...(curSnapshot.dailySessions || {}), [todayDate]: finalToday },
              sessionDate: todayDate
            });
            setTasks(prev => prev.map(t => {
              if (String(t._id || t.id) === targetId) {
                const tAccum = Math.max(finalAccum, Number(t.accumulatedSeconds) || 0);
                const tToday = Math.max(finalToday, Number(t.dailySessions?.[todayDate]) || 0);
                return {
                  ...t,
                  timerRunning: false,
                  startedAt: null,
                  pausedAt: pausedAtNow,
                  accumulatedSeconds: tAccum,
                  timerSeconds: tAccum,
                  accumulatedTodaySeconds: tToday,
                  todayWorkSeconds: tToday,
                  liveTodaySeconds: tToday,
                  dailySessions: { ...(t.dailySessions || {}), [todayDate]: tToday },
                  sessionDate: todayDate,
                  liveDurationText: formatSeconds(tToday),
                  hoursLoggedText: formatSeconds(tAccum)
                };
              }
              return t;
            }));
          }
        }
      }
    };

    // Instant 0ms remote Socket.IO task start/pause synchronization across different browsers & devices
    const handleRemoteTaskTimerEvent = (e) => {
      const detail = e?.detail;
      if (!detail || !detail.remote) return;
      const targetId = String(detail._id || detail.id || detail.taskId || '');
      if (!targetId) return;
      const todayDate = getTodayStr();
      const curSnapshot = getActiveTimerSnapshot();

      if (detail.timerRunning === true && detail.startedAt) {
        const startTs = Number(detail.startedAt);
        const recentPause = lastTaskActionRef.current &&
          lastTaskActionRef.current.taskId === targetId &&
          (lastTaskActionRef.current.action === 'pause' || lastTaskActionRef.current.action === 'stop') &&
          (Date.now() - Number(lastTaskActionRef.current.at || 0) < 15000);
        const localPausedAt = Math.max(
          Number(curSnapshot?.pausedAt || 0),
          recentPause ? Number(lastTaskActionRef.current.at || 0) : 0
        );
        if (localPausedAt > 0 && startTs <= localPausedAt + 1000) return;

        const baseToday = Number(detail.dailySessions?.[todayDate] ?? detail.accumulatedTodaySeconds ?? (detail.sessionDate === todayDate ? detail.todayWorkSeconds : 0) ?? 0);
        const baseAccum = Number(detail.accumulatedSeconds ?? detail.timerSeconds ?? 0);
        if (isTaskAssignedToMe(detail) && isTaskRunningForUser(detail, currentUser)) {
          saveActiveTimerSnapshot({
            taskId: targetId,
            taskCode: detail.taskCode || 'TSK',
            title: detail.title || 'Task',
            projectName: detail.projectName || 'General Work',
            startedAt: startTs,
            accumulatedSeconds: baseAccum,
            accumulatedTodaySeconds: baseToday,
            todayWorkSeconds: baseToday,
            liveTodaySeconds: baseToday,
            dailySessions: { ...(detail.dailySessions || {}), [todayDate]: baseToday },
            timerRunning: true,
            date: todayDate,
            sessionDate: todayDate
          });
        }
        setTasks(prev => prev.map(t => {
          const tId = String(t._id || t.id);
          if (tId === targetId) {
            return {
              ...t,
              ...detail,
              timerRunning: true,
              startedAt: startTs,
              accumulatedSeconds: baseAccum,
              accumulatedTodaySeconds: baseToday,
              todayWorkSeconds: baseToday,
              liveTodaySeconds: baseToday,
              dailySessions: { ...(t.dailySessions || {}), ...(detail.dailySessions || {}), [todayDate]: baseToday },
              sessionDate: todayDate
            };
          }
          if (isTaskAssignedToMe(detail) && isTaskRunningForUser(detail, currentUser) && isTaskAssignedToMe(t) && t.timerRunning) {
            return { ...t, timerRunning: false, startedAt: null };
          }
          return t;
        }));
      } else if (detail.timerRunning === false) {
        const pausedAtNow = Date.now();
        const baseToday = Number(detail.dailySessions?.[todayDate] ?? detail.accumulatedTodaySeconds ?? (detail.sessionDate === todayDate ? detail.todayWorkSeconds : 0) ?? 0);
        const baseAccum = Number(detail.accumulatedSeconds ?? detail.timerSeconds ?? 0);
        if (curSnapshot && String(curSnapshot.taskId) === targetId) {
          saveActiveTimerSnapshot({
            ...curSnapshot,
            timerRunning: false,
            startedAt: null,
            pausedAt: pausedAtNow,
            accumulatedSeconds: Math.max(baseAccum, Number(curSnapshot.accumulatedSeconds) || 0),
            timerSeconds: Math.max(baseAccum, Number(curSnapshot.accumulatedSeconds) || 0),
            accumulatedTodaySeconds: Math.max(baseToday, Number(curSnapshot.accumulatedTodaySeconds) || 0),
            todayWorkSeconds: Math.max(baseToday, Number(curSnapshot.todayWorkSeconds) || 0),
            liveTodaySeconds: Math.max(baseToday, Number(curSnapshot.todayWorkSeconds) || 0),
            dailySessions: { ...(curSnapshot.dailySessions || {}), ...(detail.dailySessions || {}), [todayDate]: Math.max(baseToday, Number(curSnapshot.accumulatedTodaySeconds) || 0) },
            sessionDate: todayDate
          });
        }
        setTasks(prev => prev.map(t => {
          if (String(t._id || t.id) === targetId) {
            const finalToday = Math.max(baseToday, Number(t.dailySessions?.[todayDate]) || 0);
            const finalAccum = Math.max(baseAccum, Number(t.accumulatedSeconds) || 0);
            return {
              ...t,
              ...detail,
              timerRunning: false,
              startedAt: null,
              pausedAt: pausedAtNow,
              accumulatedSeconds: finalAccum,
              timerSeconds: finalAccum,
              accumulatedTodaySeconds: finalToday,
              todayWorkSeconds: finalToday,
              liveTodaySeconds: finalToday,
              dailySessions: { ...(t.dailySessions || {}), ...(detail.dailySessions || {}), [todayDate]: finalToday },
              sessionDate: todayDate,
              liveDurationText: formatSeconds(finalToday),
              hoursLoggedText: formatSeconds(finalAccum)
            };
          }
          return t;
        }));
      }
    };

    let lastFocusLoadTs = 0;
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusLoadTs < 15000) return;
      lastFocusLoadTs = now;
      scheduleDebouncedLoad(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleFocus();
    };
    const handleReconnect = () => {
      lastFocusLoadTs = Date.now();
      scheduleDebouncedLoad(true);
    };
    const handleRemoteSync = (e) => {
      const k = e?.detail?.key;
      if (!k || k === 'all' || k === KEYS.TASKS || k === KEYS.PROJECTS || k === KEYS.TIMESHEETS) {
        scheduleDebouncedLoad(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('ems_telemetry_update', handleTelemetryUpdate);
    window.addEventListener('ems_task_timer_started', handleRemoteTaskTimerEvent);
    window.addEventListener('ems_task_timer_paused', handleRemoteTaskTimerEvent);
    window.addEventListener('ems_remote_sync', handleRemoteSync);
    window.addEventListener('ems_socket_reconnected', handleReconnect);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('ems_telemetry_update', handleTelemetryUpdate);
      window.removeEventListener('ems_task_timer_started', handleRemoteTaskTimerEvent);
      window.removeEventListener('ems_task_timer_paused', handleRemoteTaskTimerEvent);
      window.removeEventListener('ems_remote_sync', handleRemoteSync);
      window.removeEventListener('ems_socket_reconnected', handleReconnect);
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
        (currentUser?.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_is_on_break`) === 'true') ||
        readTimerStorage(currentUser, 'is_on_break') === 'true' ||
        readTimerStorage(currentUser, 'is_on_break') === true;

      const storedClockedIn = readTimerStorage(currentUser, 'is_clocked_in') === 'true' ||
        readTimerStorage(currentUser, 'is_clocked_in') === true ||
        localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true' ||
        (currentUser?.employeeCode && localStorage.getItem(`ems_timer_${currentUser.employeeCode}_is_clocked_in`) === 'true') ||
        (currentUser?._id && localStorage.getItem(`ems_timer_${currentUser._id}_is_clocked_in`) === 'true');

      let isShiftClockedIn = Boolean(storedClockedIn);

      if (!isShiftClockedIn) {
        try {
          const attRaw = localStorage.getItem('hrms_attendance');
          if (attRaw) {
            const list = JSON.parse(attRaw) || [];
            const today = getTodayStr();
            const rec = list.find(a => a.date === today && (
              String(a.employeeId) === String(userKey) ||
              String(a.employee) === String(userKey) ||
              (currentUser?.employeeCode && String(a.employeeCode) === String(currentUser.employeeCode)) ||
              (currentUser?._id && String(a.employeeId) === String(currentUser._id))
            ));
            if (rec && (rec.clockInTime || rec.clockIn) && !rec.clockOutTime && rec.isClockedIn !== false) {
              isShiftClockedIn = true;
            }
          }
        } catch (_) {}
      }

      const hadClockedOut = !isShiftClockedIn && Boolean(
        readTimerStorage(currentUser, 'clock_out') ||
        readTimerStorage(currentUser, 'clockout_time') ||
        readTimerStorage(currentUser, 'had_clocked_out') === 'true' ||
        readTimerStorage(currentUser, 'had_clocked_out') === true ||
        localStorage.getItem(`ems_timer_${userKey}_clock_out`) ||
        localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`) === 'true'
      );

      // Auto-pause task timer strictly when employee is on break OR not clocked in OR clocked out!
      if ((isShiftOnBreak || !isShiftClockedIn || hadClockedOut) && activeTimer?.timerRunning) {
        const today = getTodayStr();
        const pausedTimer = syncTaskPauseState(activeTimer, {
          nowMs: Date.now(),
          todayStr: today,
          wasPausedForClockOut: Boolean(!isShiftClockedIn),
          wasPausedForBreak: Boolean(isShiftOnBreak)
        });
        const currentSecs = pausedTimer.accumulatedSeconds;
        const todaySecs = Number(pausedTimer.todayWorkSeconds) || 0;
        saveActiveTimerSnapshot(pausedTimer);

        const allTasks = getCollection(KEYS.TASKS) || [];
        const updatedAll = allTasks.map(t => {
          if (String(t._id || t.id) === String(activeTimer.taskId)) {
            return {
              ...t,
              ...pausedTimer,
              _id: t._id,
              id: t.id
            };
          }
          return t;
        });
        saveCollection(KEYS.TASKS, updatedAll);

        setTasks(prevTasks => prevTasks.map(t => {
          if (String(t._id || t.id) === String(activeTimer.taskId)) {
            return {
              ...t,
              ...pausedTimer,
              _id: t._id,
              id: t.id
            };
          }
          return t;
        }));

        // Log session to timesheet if clock-out caused pause (strictly log TODAY'S work portion)
        if (!isShiftClockedIn && todaySecs > 0) {
          const matchedTask = allTasks.find(t => String(t._id || t.id) === String(activeTimer.taskId) || (activeTimer.taskCode && t.taskCode === activeTimer.taskCode));
          const targetEmpId = matchedTask?.assignedToId || (typeof matchedTask?.assignedTo === 'string' ? matchedTask.assignedTo : matchedTask?.assignedTo?._id) || activeTimer.assignedToId || userKey;
          const targetEmpCode = matchedTask?.assignedToCode || activeTimer.assignedToCode || '';
          const targetEmpName = matchedTask?.assignedToName || activeTimer.assignedToName || currentUser?.name || 'User';

          // Strictly ensure that if the task belongs to someone else, we NEVER overwrite employeeId/Name with Admin's
          const isTaskForMe = matchedTask ? isTaskAssignedToMe(matchedTask) : true;
          if (isTaskForMe) {
            workService.createTimesheet({
              taskId: activeTimer.taskId,
              taskCode: activeTimer.taskCode,
              taskTitle: activeTimer.title,
              projectName: activeTimer.projectName,
              employeeId: targetEmpId,
              employeeCode: targetEmpCode,
              employeeName: targetEmpName,
              date: today,
              totalDurationSeconds: todaySecs,
              totalDurationText: formatSeconds(todaySecs),
              memo: 'Shift clock-out auto-save',
              status: 'stopped'
            }).catch(() => {});
          }
        }
        return;
      }

      setTasks((prevTasks) => {
        let changed = false;
        const now = Date.now();
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const todayMidnightMs = todayMidnight.getTime();

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

          const isAssignedToMe = isTaskAssignedToMe(t);
          const isMyActive = activeTimer && activeTimer.timerRunning && (String(activeTimer.taskId) === tId || String(activeTimer._id) === tId);
          const isMyRunning = isTaskRunningForUser(t, currentUser);

          if (isAssignedToMe && (!isShiftClockedIn || isShiftOnBreak) && t.timerRunning && isMyRunning) {
            changed = true;
            return { ...t, timerRunning: false, startedAt: null };
          }

          let isTaskRunning = false;
          if (isAssignedToMe) {
            isTaskRunning = Boolean(isMyActive && isMyRunning && isShiftClockedIn && !isShiftOnBreak);
          } else {
            // For other employees' tasks: tick live so Admin / Team members see the time moving in real time!
            const isStartedToday = t.startedAt && Number(t.startedAt) >= todayMidnightMs;
            isTaskRunning = Boolean(t.timerRunning && isStartedToday);
          }

          if (isTaskRunning) {
            changed = true;
            const todayStr = getTodayStr();
            const isMulti = (Array.isArray(t.assignedToIds) && t.assignedToIds.length > 1) ||
              (Array.isArray(t.assignees) && t.assignees.length > 1);
            const myWorkerTimer = isMulti ? getWorkerTaskTimer(t, currentUser) : null;
            const startTs = (isMyActive && activeTimer.startedAt)
              ? Number(activeTimer.startedAt)
              : (myWorkerTimer?.startedAt ? Number(myWorkerTimer.startedAt) : Number(t.startedAt));
            let elapsed = 0;
            if (startTs >= todayMidnightMs && startTs <= now) {
              elapsed = Math.max(0, Math.floor((now - startTs) / 1000));
            }

            // STRICT FROZEN LIFETIME BASELINE: Never read live `t.timerSeconds` (already includes elapsed!)
            const baseLifetime = (isMyActive && activeTimer.accumulatedSeconds !== undefined && activeTimer.accumulatedSeconds !== null)
              ? Number(activeTimer.accumulatedSeconds)
              : (myWorkerTimer?.accumulatedSeconds !== undefined && myWorkerTimer?.accumulatedSeconds !== null
                ? Number(myWorkerTimer.accumulatedSeconds)
                : ((t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null)
                  ? Number(t.accumulatedSeconds)
                  : Math.max(0, (Number(t.timerSeconds) || 0) - elapsed)));

            // STRICT FROZEN TODAY BASELINE:
            // For multi-assignee tasks, NEVER fall back to teammate's shared `t.dailySessions[todayStr]` or `t.todayWorkSeconds`!
            let baseToday = 0;
            if (isMulti && isMyActive) {
              if (activeTimer.accumulatedTodaySeconds !== undefined && activeTimer.accumulatedTodaySeconds !== null && activeTimer.date === todayStr) {
                baseToday = Number(activeTimer.accumulatedTodaySeconds);
              } else {
                baseToday = getWorkerDailySessionSeconds(t, currentUser, todayStr);
              }
            } else if (isMyActive && activeTimer.accumulatedTodaySeconds !== undefined && activeTimer.accumulatedTodaySeconds !== null && activeTimer.date === todayStr) {
              baseToday = Number(activeTimer.accumulatedTodaySeconds);
            } else if (t.dailySessions && t.dailySessions[todayStr] !== undefined && t.dailySessions[todayStr] !== null) {
              baseToday = Number(t.dailySessions[todayStr]);
            } else if (t.sessionDate === todayStr && t.accumulatedTodaySeconds !== undefined && t.accumulatedTodaySeconds !== null) {
              baseToday = Number(t.accumulatedTodaySeconds);
            } else if (t.sessionDate === todayStr && t.todayWorkSeconds !== undefined && t.todayWorkSeconds !== null) {
              baseToday = Math.max(0, Number(t.todayWorkSeconds) - elapsed);
            }

            const liveTodaySecs = baseToday + elapsed;
            const workerLifetimeSecs = baseLifetime + elapsed;
            const liveLifetimeSecs = isMulti
              ? Math.max(
                  workerLifetimeSecs,
                  getMultiAssigneeCombinedSeconds({
                    ...t,
                    assigneeTimers: {
                      ...(t.assigneeTimers || {}),
                      [userKey]: {
                        ...(myWorkerTimer || {}),
                        timerRunning: true,
                        startedAt: startTs,
                        accumulatedSeconds: baseLifetime,
                        todayWorkSeconds: baseToday,
                        sessionDate: todayStr
                      }
                    }
                  }, now)
                )
              : workerLifetimeSecs;

            const lifetimeText = formatSeconds(liveLifetimeSecs);
            const todayText = formatSeconds(liveTodaySecs);

            return {
              ...t,
              timerRunning: true,
              startedAt: startTs,
              accumulatedSeconds: baseLifetime,
              accumulatedTodaySeconds: baseToday,
              timerSeconds: liveLifetimeSecs,
              todayWorkSeconds: liveTodaySecs,
              liveTodaySeconds: liveTodaySecs,
              dailySessions: isMulti ? t.dailySessions : { ...(t.dailySessions || {}), [todayStr]: baseToday },
              liveDurationText: todayText,
              hoursLoggedText: lifetimeText,
              sessionDate: todayStr
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
      const today = getTodayStr();
      if (activeTimer && activeTimer.timerRunning) {
        const nowMs = Date.now();
        const pausedState = {
          ...syncTaskPauseState(activeTimer, { nowMs, todayStr: today, wasPausedForBreak: true }),
          pausedAt: nowMs
        };
        const currentSecs = Number(pausedState.accumulatedSeconds) || 0;
        const todaySecs = Number(pausedState.todayWorkSeconds) || 0;
        lastTaskActionRef.current = { taskId: String(activeTimer.taskId), action: 'pause', at: nowMs };
        saveActiveTimerSnapshot(pausedState);

        const allTasks = getCollection(KEYS.TASKS) || [];
        const updatedAll = allTasks.map(t => {
          if (String(t._id || t.id) === String(activeTimer.taskId)) {
            return {
              ...t,
              ...pausedState,
              _id: t._id,
              id: t.id
            };
          }
          return t;
        });
        saveCollection(KEYS.TASKS, updatedAll);

        setTasks(prevTasks => prevTasks.map(t => {
          if (String(t._id || t.id) === String(activeTimer.taskId)) {
            return {
              ...t,
              ...pausedState,
              _id: t._id,
              id: t.id
            };
          }
          return t;
        }));

        try {
          workService.updateTask(activeTimer.taskId, {
            timerRunning: false,
            startedAt: null,
            accumulatedSeconds: currentSecs,
            timerSeconds: currentSecs,
            todayWorkSeconds: todaySecs,
            accumulatedTodaySeconds: todaySecs,
            liveTodaySeconds: todaySecs,
            dailySessions: pausedState.dailySessions,
            sessionDate: today,
            hoursLogged: +(currentSecs / 3600).toFixed(2),
            hoursLoggedText: formatSeconds(currentSecs)
          }).catch(() => {});
        } catch {}

        broadcastSyncEvent(SYNC_EVENTS.TASK_TIMER_PAUSED, {
          taskId: activeTimer.taskId,
          empKey: userKey,
          accumulatedSeconds: currentSecs,
          accumulatedTodaySeconds: todaySecs,
          todayWorkSeconds: todaySecs,
          dailySessions: pausedState.dailySessions,
          pausedForBreak: true
        });
        window.dispatchEvent(new CustomEvent('ems_task_timer_paused', {
          detail: { taskId: activeTimer.taskId, userKey, empKey: userKey }
        }));
      }
    };

    const handleBreakEnded = (e) => {
      if (!isEventForMe(e)) return; // Ignore break ends for other employees!
      const activeTimer = getActiveTimerSnapshot();
      if (activeTimer) {
        if ((activeTimer.wasPausedForBreak || activeTimer.pausedForBreak) && typeof startTaskTimerRef.current === 'function') {
          // If task was running and was paused specifically for break, resume it seamlessly!
          startTaskTimerRef.current(activeTimer.taskId);
          return;
        }
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
          if (String(t._id || t.id) === String(activeTimer.taskId)) {
            const todaySecs = Number(pausedState.todayWorkSeconds ?? t.todayWorkSeconds ?? 0);
            return {
              ...t,
              timerRunning: false,
              wasPausedForBreak: false,
              todayWorkSeconds: todaySecs,
              liveTodaySeconds: todaySecs,
              liveDurationText: formatSeconds(todaySecs)
            };
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
  }, [getActiveTimerSnapshot, getElapsedSeconds, saveActiveTimerSnapshot, formatSeconds, isEventForMe, userKey]);

  // ── On Clock-In: Keep paused tasks paused (NEVER silently auto-restart without explicit user Resume click) ──
  useEffect(() => {
    const handleClockedIn = (e) => {
      if (!isEventForMe(e)) return;
      const activeTimer = getActiveTimerSnapshot();
      // Only clear the wasPausedForClockOut marker while keeping timerRunning: false so user explicitly clicks Resume
      if (activeTimer && activeTimer.wasPausedForClockOut) {
        saveActiveTimerSnapshot({
          ...activeTimer,
          timerRunning: false,
          startedAt: null,
          wasPausedForClockOut: false
        });
      }
    };

    window.addEventListener('ems_clocked_in', handleClockedIn);
    window.addEventListener('ems_reclock_in', handleClockedIn);
    return () => {
      window.removeEventListener('ems_clocked_in', handleClockedIn);
      window.removeEventListener('ems_reclock_in', handleClockedIn);
    };
  }, [getActiveTimerSnapshot, saveActiveTimerSnapshot, isEventForMe]);

  // ── Automatic Task Timer Pause on Clock-Out ──
  useEffect(() => {
    const handleClockedOut = (e) => {
      if (!isEventForMe(e)) return; // Ignore clock-out for other employees!
      const activeTimer = getActiveTimerSnapshot();
      const wasActivelyRunning = Boolean(activeTimer && activeTimer.timerRunning);
      const today = getTodayStr();
      const todaySecs = activeTimer ? Number(activeTimer.todayWorkSeconds || getTaskTodaySeconds(activeTimer, today, Date.now(), false, false)) : 0;

      if (wasActivelyRunning) {
        const pausedState = syncTaskPauseState(activeTimer, { nowMs: Date.now(), todayStr: today, wasPausedForClockOut: true });
        saveActiveTimerSnapshot(pausedState);
      }

      const allTasks = getCollection(KEYS.TASKS) || [];
      const updatedAll = allTasks.map(t => {
        const matchesActive = activeTimer && (String(t._id || t.id) === String(activeTimer.taskId || activeTimer._id));
        const matchesMe = isTaskAssignedToMe(t) && isTaskRunningForUser(t, currentUser);
        if (matchesActive || (matchesMe && t.timerRunning)) {
          const pausedT = syncTaskPauseState(t, { nowMs: Date.now(), todayStr: today, wasPausedForClockOut: true });
          return pausedT ? { ...t, ...pausedT, _id: t._id, id: t.id } : { ...t, timerRunning: false, startedAt: null };
        }
        return t;
      });
      saveCollection(KEYS.TASKS, updatedAll);

      setTasks(prev => prev.map(t => {
        const matchesActive = activeTimer && (String(t._id || t.id) === String(activeTimer.taskId || activeTimer._id));
        const matchesMe = isTaskAssignedToMe(t) && isTaskRunningForUser(t, currentUser);
        if (matchesActive || (matchesMe && t.timerRunning)) {
          const pausedT = syncTaskPauseState(t, { nowMs: Date.now(), todayStr: today, wasPausedForClockOut: true });
          return pausedT ? { ...t, ...pausedT, _id: t._id, id: t.id } : { ...t, timerRunning: false, startedAt: null };
        }
        return t;
      }));

      // Automatically log today's task session duration to timesheets ONLY if a task timer was actively running
      if (wasActivelyRunning && todaySecs > 0 && !e?.detail?.isRemoteSync) {
        const matchedTask = allTasks.find(t => String(t._id || t.id) === String(activeTimer.taskId) || (activeTimer.taskCode && t.taskCode === activeTimer.taskCode));
        const isTaskForMe = matchedTask ? isTaskAssignedToMe(matchedTask) : true;
        if (isTaskForMe) {
          const targetEmpId = matchedTask?.assignedToId || (typeof matchedTask?.assignedTo === 'string' ? matchedTask.assignedTo : matchedTask?.assignedTo?._id) || activeTimer.assignedToId || userKey;
          const targetEmpCode = matchedTask?.assignedToCode || activeTimer.assignedToCode || '';
          const targetEmpName = matchedTask?.assignedToName || activeTimer.assignedToName || currentUser?.name || 'User';

          workService.createTimesheet({
            taskId: activeTimer.taskId,
            taskCode: activeTimer.taskCode,
            taskTitle: activeTimer.title,
            projectName: activeTimer.projectName,
            employeeId: targetEmpId,
            employeeCode: targetEmpCode,
            employeeName: targetEmpName,
            date: today,
            totalDurationSeconds: todaySecs,
            totalDurationText: formatSeconds(todaySecs),
            memo: 'Shift clock-out session auto-save',
            status: 'stopped'
          }).catch(err => console.warn('Clock-out auto timesheet error:', err));
        }
      }

      if (wasActivelyRunning) {
        addToast('Shift Clocked Out: Active task timer paused & logged ⏸️', 'info');
      }
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
    };

    window.addEventListener('ems_clocked_out', handleClockedOut);
    window.addEventListener('ems_force_clock_out', handleClockedOut);
    window.addEventListener('ems_shift_ended', handleClockedOut);
    return () => {
      window.removeEventListener('ems_clocked_out', handleClockedOut);
      window.removeEventListener('ems_force_clock_out', handleClockedOut);
      window.removeEventListener('ems_shift_ended', handleClockedOut);
    };
  }, [getActiveTimerSnapshot, getElapsedSeconds, saveActiveTimerSnapshot, formatSeconds, addToast]);

  // ── Day Change Rollover Check (New Day fresh start, 00:00:00 reset) ──
  useEffect(() => {
    const checkDayRollover = () => {
      const today = getTodayStr();

      // 🌙 Strict 11:59 PM Auto-Seal: Stop active task timer before midnight so zero time leaks to next day
      const nowMidnightCheck = new Date();
      if (nowMidnightCheck.getHours() === 23 && nowMidnightCheck.getMinutes() >= 59) {
        const rawSaved = localStorage.getItem(activeTimerKey);
        if (rawSaved) {
          try {
            const current = JSON.parse(rawSaved);
            if (current && current.timerRunning) {
              const currentTodaySecs = getTaskTodaySeconds(current, today, nowMidnightCheck.getTime(), true, false);
              const safeTodaySecs = Math.min(currentTodaySecs > 0 ? currentTodaySecs : (Number(current.todayWorkSeconds ?? current.accumulatedTodaySeconds) || 0), 14 * 3600);
              saveActiveTimerSnapshot(null);
              try {
                const empK = current?.userKey || userKey;
                hrService.sendHeartbeat({
                  employeeId: empK,
                  employeeCode: empK,
                  taskOnly: true,
                  activeTask: null
                }).catch(() => {});
              } catch (_) {}
              setTasks(prev => prev.map(t => {
                if (String(t._id || t.id) === String(current.taskId)) {
                  return syncTaskPauseState(t, { nowMs: nowMidnightCheck.getTime(), todayStr: today, wasPausedForClockOut: true });
                }
                return t;
              }));
              if (safeTodaySecs > 0) {
                workService.createTimesheet({
                  taskId: current.taskId,
                  taskCode: current.taskCode,
                  taskTitle: current.title || current.taskTitle,
                  projectName: current.projectName,
                  employeeId: current.assignedToId || userKey,
                  employeeName: current.assignedToName || currentUser?.name,
                  date: today,
                  totalDurationSeconds: safeTodaySecs,
                  totalDurationText: formatSeconds(safeTodaySecs),
                  memo: '11:59 PM auto-close same-day timesheet save',
                  status: 'stopped'
                }).catch(e => console.warn('11:59 PM auto-timesheet error:', e));
              }
              window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
            }
          } catch (_) {}
        }
      }

      const storedWorkDate = localStorage.getItem(`ems_work_session_date_${userKey}`) || today;

      if (storedWorkDate !== today) {
        localStorage.setItem(`ems_work_session_date_${userKey}`, today);
        setWorkSessionDate(today);

        // Check if yesterday had an active unclosed timer across midnight (laptop closed / sleep overnight)
        const rawSaved = localStorage.getItem(activeTimerKey);
        if (rawSaved) {
          try {
            const prev = JSON.parse(rawSaved);
            if (prev && prev.date && prev.date !== today) {
              const prevDate = prev.date || storedWorkDate;
              const prevStartTs = prev.startedAt ? Number(prev.startedAt) : null;
              let elapsedBeforeMidnight = 0;
              if (prev.timerRunning && prevStartTs) {
                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);
                if (prevStartTs < todayMidnight.getTime()) {
                  elapsedBeforeMidnight = Math.max(0, Math.floor((todayMidnight.getTime() - prevStartTs) / 1000));
                }
              }
              // 🛡️ CRITICAL FIX: Only archive THAT specific day's work, NEVER lifetime accumulatedSeconds across all days!
              const prevDayBase = Number(
                prev.accumulatedTodaySeconds ??
                prev.todayWorkSeconds ??
                (prev.dailySessions && prev.dailySessions[prevDate]) ??
                0
              );
              const fallbackLifetime = (prev.startDate === prevDate) ? (Number(prev.accumulatedSeconds) || 0) : 0;
              const effectivePrevDaySecs = prevDayBase > 0 ? prevDayBase : fallbackLifetime;
              const duration = Math.min(effectivePrevDaySecs + elapsedBeforeMidnight, 14 * 3600);
              if (duration > 0) {
                workService.createTimesheet({
                  taskId: prev.taskId,
                  taskCode: prev.taskCode,
                  taskTitle: prev.title || prev.taskTitle,
                  projectName: prev.projectName,
                  employeeId: prev.assignedToId || userKey,
                  employeeName: prev.assignedToName || currentUser?.name,
                  date: prevDate,
                  totalDurationSeconds: duration,
                  totalDurationText: formatSeconds(duration),
                  memo: 'Automatic midnight rollover session save',
                  status: 'stopped'
                }).catch(e => console.warn('Auto timesheet close error:', e));
              }
            }
          } catch (e) {}
        }

        // Reset active timer snapshot for the new day so Day 2 starts clean
        saveActiveTimerSnapshot(null);

        // Reset running state and today work values across midnight rollover so Day 2 starts clean at 0s
        const allTasks = getCollection(KEYS.TASKS) || [];
        const resetTasks = allTasks.map(t => ({
          ...t,
          timerRunning: false,
          startedAt: null,
          todayWorkSeconds: 0,
          accumulatedTodaySeconds: 0,
          sessionDate: today
        }));
        saveCollection(KEYS.TASKS, resetTasks);
        setTasks(resetTasks);
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
      const actorCode = currentUser?.employeeCode || '';
      const rawActorName = currentUser?.name || 'Administrator';
      const actorName = actorCode ? `${rawActorName} (${actorCode})` : rawActorName;

      const payload = {
        ...projectData,
        lastUpdatedBy: projectData.lastUpdatedBy || actorName,
        lastUpdatedById: projectData.lastUpdatedById || currentUser?._id,
        lastUpdatedByCode: projectData.lastUpdatedByCode || actorCode,
        lastUpdatedAt: new Date().toISOString()
      };

      const updated = await workService.updateProject(id, payload);
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
      const allProjects = getCollection(KEYS.PROJECTS) || [];
      const targetProj = (projects || []).find(p => String(p._id || p.id) === String(id) || p.projectCode === id) ||
        allProjects.find(p => String(p._id || p.id) === String(id) || p.projectCode === id);

      if (!canDeleteProject(currentUser, targetProj)) {
        addToast('⛔ Access Denied: You do not have permission to delete projects.', 'error');
        return;
      }

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
      const approverCode = currentUser?.employeeCode || '';
      const rawApproverName = currentUser?.name || 'Administrator';
      const approverName = approverCode ? `${rawApproverName} (${approverCode})` : rawApproverName;
      const updatePayload = {
        status: 'completed',
        progress: 100,
        finalApproved: true,
        finalApprovedBy: approverName,
        finalApprovedById: currentUser?._id,
        finalApprovedByCode: approverCode,
        finalApprovedAt: new Date().toISOString(),
        reopened: false,
        reopenReason: ''
      };

      const updated = await workService.updateProject(id, updatePayload);

      try {
        hrService.createAttendanceAuditLog({
          type: 'project_final_approved',
          action: 'project_final_approved',
          date: getTodayStr(),
          employeeId: currentUser?._id || 'admin',
          employeeCode: approverCode,
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
      const adminCode = currentUser?.employeeCode || '';
      const rawAdminName = currentUser?.name || 'Administrator';
      const adminName = adminCode ? `${rawAdminName} (${adminCode})` : rawAdminName;
      const updatePayload = {
        status: 'in_progress',
        progress: 85,
        finalApproved: false,
        reopened: true,
        reopenReason: reason || 'Reopened by Admin for required revisions',
        reopenedBy: adminName,
        reopenedById: currentUser?._id,
        reopenedByCode: adminCode,
        reopenedAt: new Date().toISOString()
      };

      const updated = await workService.updateProject(id, updatePayload);

      try {
        hrService.createAttendanceAuditLog({
          type: 'project_reopened',
          action: 'project_reopened',
          date: getTodayStr(),
          employeeId: currentUser?._id || 'admin',
          employeeCode: adminCode,
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
      const allTasks = getCollection(KEYS.TASKS) || [];
      const targetTask = (tasks || []).find(t => String(t._id || t.id) === String(id)) ||
        allTasks.find(t => String(t._id || t.id) === String(id));
      if (targetTask && !canUserControlTask(targetTask)) {
        addToast('⛔ Access Denied: Only assigned team members, the task creator, or HR/Admin can update this task.', 'error');
        return;
      }

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

      const isReopening = status !== 'completed' && (targetTask?.status === 'completed' || !!targetTask?.completedAt);
      const actorName = currentUser?.name || 'Administrator';
      const actorCode = currentUser?.employeeCode || '';
      const actorLabel = actorCode ? `${actorName} (${actorCode})` : actorName;
      const statusHistory = {
        id: `hist_${Date.now()}_status`,
        action: isReopening ? 'reopened' : 'status_changed',
        title: isReopening ? 'Task Reopened' : `Status Changed to ${status.replace('_', ' ').toUpperCase()}`,
        timestamp: new Date().toISOString(),
        performedBy: actorLabel,
        performedById: currentUser?._id,
        performedByCode: actorCode,
        fromStatus: targetTask?.status || 'unknown',
        toStatus: status,
        details: isReopening
          ? `Task reopened from Completed to ${status.replace('_', ' ').toUpperCase()} by ${actorLabel}`
          : `Task status changed to "${status.replace('_', ' ').toUpperCase()}" by ${actorLabel}`
      };

      const updatedHistory = Array.isArray(targetTask?.history) ? [...targetTask.history, statusHistory] : [statusHistory];

      const statusPayload = {
        status,
        history: updatedHistory,
        lastActionBy: actorLabel
      };
      if (isReopening) {
        statusPayload.completedAt = null;
        statusPayload.completedOn = null;
        statusPayload.completedBy = null;
        statusPayload.completedById = null;
        statusPayload.completedByCode = null;
        statusPayload.progress = targetTask?.progress === 100 ? 50 : (targetTask?.progress || 0);
      }

      // Save to localStorage collection immediately
      const updatedAll = allTasks.map(t =>
        String(t._id || t.id) === String(id) ? { ...t, ...statusPayload } : t
      );
      saveCollection(KEYS.TASKS, updatedAll);

      await workService.updateTaskStatus(id, status);
      await workService.updateTask(id, statusPayload);
      addToast(isReopening ? 'Task reopened successfully!' : `Task status changed to ${status.replace('_', ' ').toUpperCase()}`, 'success');
      await loadWorkData();
    } catch (err) {
      addToast('Failed to change task status', 'error');
    }
  };

  const deleteTask = async (id) => {
    try {
      const allTasks = getCollection(KEYS.TASKS) || [];
      const targetTask = (tasks || []).find(t => String(t._id || t.id) === String(id)) ||
        allTasks.find(t => String(t._id || t.id) === String(id));

      if (!canDeleteTask(currentUser, targetTask)) {
        addToast('⛔ Access Denied: You do not have permission to delete tasks.', 'error');
        return;
      }

      const activeTimer = getActiveTimerSnapshot();
      if (activeTimer && (activeTimer.taskId === id || activeTimer._id === id)) {
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

      // Explicitly preserve current timer progress, but isolate today seconds to actual today
      const currentAccum = Number(target.accumulatedSeconds ?? target.timerSeconds ?? 0);
      const isTargetToday = (target.sessionDate === getTodayStr());
      const currentToday = isTargetToday ? Number(target.todayWorkSeconds ?? target.accumulatedTodaySeconds ?? 0) : 0;
      const currentSessions = (target.dailySessions && typeof target.dailySessions === 'object') ? target.dailySessions : {};

      await updateTask(taskId, {
        dueDate: newDueDate,
        hasNoDueDate: false,
        isUntimed: false,
        snoozed: false,
        remindAt: null,
        reminderAlerted: false,
        history: updatedHistory,
        rescheduleNote: note,
        accumulatedSeconds: currentAccum,
        timerSeconds: currentAccum,
        todayWorkSeconds: currentToday,
        accumulatedTodaySeconds: currentToday,
        dailySessions: currentSessions,
        sessionDate: getTodayStr()
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
      const allTasks = getCollection(KEYS.TASKS) || [];
      const target = tasks.find(t => String(t._id || t.id) === String(taskId)) ||
        allTasks.find(t => String(t._id || t.id) === String(taskId));
      if (!target) return;
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + days);
      const newDueDate = getLocalDateString(baseDate);

      // Preserve active timer progress in snapshot if this task was active/paused
      const activeTimer = getActiveTimerSnapshot();
      const isMyActive = activeTimer && (String(activeTimer.taskId) === String(taskId) || String(activeTimer._id) === String(taskId));
      if (isMyActive) {
        saveActiveTimerSnapshot({
          ...activeTimer,
          dueDate: newDueDate
        });
      }

      await rescheduleTaskForFuture(taskId, newDueDate, `Extended +${days} day${days > 1 ? 's' : ''}`);
      // Auto start timer once deadline extended, preserving all previous timer progress
      setTimeout(() => {
        startTaskTimer(taskId, { forceOverdue: true, resuming: true });
      }, 100);
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

    // Strict Permission Guard: Only authorized members can start/control this task
    if (!canUserControlTask(targetTask)) {
      addToast('⛔ Access Denied: Only assigned team members, the task creator, or HR/Admin can start this task.', 'error');
      return;
    }

    // ── STEP 1: Determine the worker for this task ──
    const isAssignedToMe = isTaskAssignedToMe(targetTask);
    const isUserAdminOrHR = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr' || currentUser?.role === 'Administrator' || currentUser?.role === 'HR Manager' || isHRorAdmin(currentUser);

    // Collect all candidate assignees (handles multi-assignees and single assignee)
    let candidateEmpIds = [];
    if (Array.isArray(targetTask.assignedToIds) && targetTask.assignedToIds.length > 0) {
      candidateEmpIds = targetTask.assignedToIds;
    } else if (Array.isArray(targetTask.assignees) && targetTask.assignees.length > 0) {
      candidateEmpIds = targetTask.assignees.map(a => a._id || a.employeeCode).filter(Boolean);
    } else if (targetTask.assignedToId) {
      candidateEmpIds = [targetTask.assignedToId];
    } else if (targetTask.assignedTo) {
      const aId = typeof targetTask.assignedTo === 'object' ? (targetTask.assignedTo._id || targetTask.assignedTo.id) : targetTask.assignedTo;
      if (aId) candidateEmpIds = [aId];
    }

    let isForOtherEmployee = false;
    let targetWorkerObj = null;
    let targetWorkerKey = String(userKey);
    let targetWorkerName = currentUser?.name || 'Team Member';

    if (isAssignedToMe || candidateEmpIds.length === 0) {
      // Current user is running their own task
      isForOtherEmployee = false;
      targetWorkerObj = currentUser;
      targetWorkerKey = String(userKey);
      targetWorkerName = currentUser?.name || 'Team Member';
    } else {
      // Task is assigned to someone else, and started by Admin or Manager
      isForOtherEmployee = true;

      // In multi-assignee scenarios, find a candidate who is actively clocked in today
      let chosenEmp = null;
      for (const candId of candidateEmpIds) {
        const found = (employees || []).find(e => String(e._id) === String(candId) || String(e.employeeCode) === String(candId));
        if (found) {
          const storedClockedIn = readTimerStorage(found, 'is_clocked_in') === 'true' || readTimerStorage(found, 'is_clocked_in') === true;
          const hadClockedOut = readTimerStorage(found, 'had_clocked_out') === 'true' || Boolean(readTimerStorage(found, 'clock_out'));
          if (storedClockedIn && !hadClockedOut) {
            chosenEmp = found;
            break;
          }
        }
      }

      // If no active clocked-in candidate found, select the first assigned employee to run validation against
      if (!chosenEmp && candidateEmpIds.length > 0) {
        const firstId = candidateEmpIds[0];
        chosenEmp = (employees || []).find(e => String(e._id) === String(firstId) || String(e.employeeCode) === String(firstId)) || {
          _id: firstId,
          employeeCode: targetTask.assignedToCode || firstId,
          name: targetTask.assignedToName || 'Employee'
        };
      }

      targetWorkerObj = chosenEmp || { _id: userKey, employeeCode: userKey, name: 'Employee' };
      targetWorkerKey = String(targetWorkerObj.employeeCode || targetWorkerObj._id || userKey);
      targetWorkerName = targetWorkerObj.name || targetTask.assignedToName || 'Employee';
    }

    const today = getTodayStr();

    // ── CHECK 1: Approved Leave Guard ──
    const isWorkerOnLeave = (leaves || []).some(l =>
      l.status === 'approved' &&
      l.startDate <= today &&
      l.endDate >= today &&
      (
        (targetWorkerObj?._id && (String(l.employeeId) === String(targetWorkerObj._id) || String(l.employee) === String(targetWorkerObj._id))) ||
        (targetWorkerObj?.employeeCode && (l.employeeCode === targetWorkerObj.employeeCode || l.employeeId === targetWorkerObj.employeeCode)) ||
        (targetWorkerName && l.employeeName && l.employeeName.trim().toLowerCase() === targetWorkerName.trim().toLowerCase())
      )
    );

    if (isWorkerOnLeave) {
      if (isForOtherEmployee) {
        addToast(`⛔ Cannot start task: "${targetWorkerName}" is on approved leave today.`, 'warning');
      } else {
        addToast('⛔ Cannot start task: You are marked on approved leave today.', 'warning');
      }
      return;
    }

    // ── CHECK 2: Shift Clock-In & Clock-Out Guards ──
    const storedSessionDate = readTimerStorage(targetWorkerObj, 'work_session_date');
    const storedClockedIn = (storedSessionDate === today || !storedSessionDate) && (
      readTimerStorage(targetWorkerObj, 'is_clocked_in') === 'true' ||
      readTimerStorage(targetWorkerObj, 'is_clocked_in') === true ||
      localStorage.getItem(`ems_timer_${targetWorkerKey}_is_clocked_in`) === 'true' ||
      (targetWorkerObj.employeeCode && localStorage.getItem(`ems_timer_${targetWorkerObj.employeeCode}_is_clocked_in`) === 'true') ||
      (targetWorkerObj._id && localStorage.getItem(`ems_timer_${targetWorkerObj._id}_is_clocked_in`) === 'true')
    );

    let attClockedIn = false;
    let attClockedOut = false;
    let attOnLeave = false;
    try {
      const attRaw = localStorage.getItem('hrms_attendance');
      if (attRaw) {
        const list = JSON.parse(attRaw) || [];
        const mirrorKeys = getTimerMirrorKeys(targetWorkerObj).map(k => String(k).toLowerCase());
        const rec = list.find(a => a.date === today && (
          (a.employeeId && mirrorKeys.includes(String(a.employeeId).toLowerCase())) ||
          (a.employee && mirrorKeys.includes(String(a.employee._id || a.employee).toLowerCase())) ||
          (a.employeeCode && mirrorKeys.includes(String(a.employeeCode).toLowerCase())) ||
          (targetWorkerName && a.employeeName && a.employeeName.trim().toLowerCase() === targetWorkerName.trim().toLowerCase())
        ));
        if (rec) {
          if (rec.status === 'on_leave') attOnLeave = true;
          if (rec.clockOutTime || rec.clockOut) attClockedOut = true;
          if ((rec.clockInTime || rec.clockIn) && !rec.clockOutTime && rec.isClockedIn !== false) {
            attClockedIn = true;
          }
        }
      }
    } catch (_) {}

    if (attOnLeave) {
      if (isForOtherEmployee) {
        addToast(`⛔ Cannot start task: "${targetWorkerName}" is on approved leave today.`, 'warning');
      } else {
        addToast('⛔ Cannot start task: You are marked on approved leave today.', 'warning');
      }
      return;
    }

    const storedClockedOut = (storedSessionDate === today || !storedSessionDate) && (
      readTimerStorage(targetWorkerObj, 'had_clocked_out') === 'true' ||
      Boolean(readTimerStorage(targetWorkerObj, 'clock_out')) ||
      Boolean(readTimerStorage(targetWorkerObj, 'clockout_time')) ||
      attClockedOut
    );

    const isWorkerActiveShift = (storedClockedIn || attClockedIn) && !storedClockedOut;

    if (storedClockedOut && !isWorkerActiveShift) {
      if (isForOtherEmployee) {
        addToast(`⚠️ Employee "${targetWorkerName}" has already Clocked Out for today. Shift must be active to track tasks.`, 'warning');
      } else {
        addToast('⚠️ You have already Clocked Out for today. Please Clock In to resume tracking task time.', 'warning');
      }
      return;
    }

    if (!isWorkerActiveShift) {
      if (isForOtherEmployee) {
        addToast(`⚠️ Employee "${targetWorkerName}" has not Clocked In for today's shift yet. Task timer cannot be started until they clock in.`, 'warning');
      } else {
        addToast('⚠️ Shift is not clocked in! Please Clock In to your shift before starting task timer.', 'warning');
      }
      return;
    }

    // ── CHECK 3: Shift Break Guard (Tea / Lunch) ──
    const isWorkerOnBreak = (storedSessionDate === today || !storedSessionDate) && (
      readTimerStorage(targetWorkerObj, 'is_on_break') === 'true' ||
      readTimerStorage(targetWorkerObj, 'is_on_break') === true ||
      localStorage.getItem(`ems_timer_${targetWorkerKey}_is_on_break`) === 'true' ||
      (targetWorkerObj.employeeCode && localStorage.getItem(`ems_timer_${targetWorkerObj.employeeCode}_is_on_break`) === 'true') ||
      (targetWorkerObj._id && localStorage.getItem(`ems_timer_${targetWorkerObj._id}_is_on_break`) === 'true')
    );

    if (isWorkerOnBreak) {
      const brkType = readTimerStorage(targetWorkerObj, 'break_type') || 'Break';
      if (isForOtherEmployee) {
        addToast(`☕ Employee "${targetWorkerName}" is currently on ${brkType}. Please wait until they resume shift before starting task timer.`, 'warning');
      } else {
        addToast(`☕ You are currently on ${brkType}. Please resume work first before tracking task time!`, 'warning');
      }
      return;
    }

    // Worker identity mapping
    const assignedEmpId = targetWorkerObj._id || targetWorkerKey;
    const assignedEmpName = targetWorkerName;
    const targetUserKey = isForOtherEmployee ? String(assignedEmpId) : String(userKey);
    const targetEmpObj = targetWorkerObj;
    const currentWorkerId = isForOtherEmployee ? String(assignedEmpId) : String(currentUser?._id || userKey);
    const currentWorkerName = targetWorkerName;
    const currentWorkerAvatar = targetWorkerObj?.avatar || '';
    const currentWorkerRole = targetWorkerObj?.role || targetWorkerObj?.systemRole || 'Staff';

    // ── Overdue Task Guard ──
    // Only prompt when starting a fresh overdue task that hasn't been worked on today yet.
    // If the task was already worked on today (e.g. resuming from break or paused session), allow continuing seamlessly!
    const isAlreadyWorkedToday = (targetTask.sessionDate === today && (Number(targetTask.todayWorkSeconds) > 0 || Number(targetTask.accumulatedTodaySeconds) > 0)) ||
      (targetTask.dailySessions && Number(targetTask.dailySessions[today]) > 0) ||
      Boolean(targetTask.wasPausedForBreak) ||
      Boolean(options.resuming);

    const isOverdue = isTaskOverdue(targetTask);
    if (isOverdue && !options.forceOverdue && !isAlreadyWorkedToday) {
      setOverdueTaskPrompt(targetTask);
      addToast(`⚠️ Task #${targetTask.taskCode || ''} is overdue (Due: ${targetTask.dueDate})! Please update deadline or mark completed.`, 'warning');
      return;
    }

    const now = Date.now();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMidnightMs = todayMidnight.getTime();
    const maxTodayElapsed = Math.max(0, Math.floor((now - todayMidnightMs) / 1000));
    const activeTimer = getActiveTimerSnapshot();
    lastTaskActionRef.current = { taskId: String(taskId), action: 'start', at: now };

    // If an unclosed timer from a previous date exists, auto-archive it (strictly that specific day's work)
    if (activeTimer && activeTimer.date && activeTimer.date !== today) {
      const prevDate = activeTimer.date;
      const prevDayBase = Number(
        activeTimer.accumulatedTodaySeconds ??
        activeTimer.todayWorkSeconds ??
        (activeTimer.dailySessions && activeTimer.dailySessions[prevDate]) ??
        0
      );
      const fallbackLifetime = (activeTimer.startDate === prevDate) ? (Number(activeTimer.accumulatedSeconds) || 0) : 0;
      const prevSecs = Math.min(prevDayBase > 0 ? prevDayBase : fallbackLifetime, 14 * 3600);
      if (prevSecs > 0) {
        workService.createTimesheet({
          taskId: activeTimer.taskId,
          taskCode: activeTimer.taskCode,
          taskTitle: activeTimer.title,
          projectName: activeTimer.projectName,
          employeeId: activeTimer.assignedToId,
          employeeName: activeTimer.assignedToName,
          date: prevDate,
          totalDurationSeconds: prevSecs,
          totalDurationText: formatSeconds(prevSecs),
          memo: 'Auto-saved session from previous day',
          status: 'stopped'
        }).catch(err => console.warn('Auto timesheet archive error:', err));
      }
    }

    // Previous running task detection (match ALL IDs of target worker + per-assignee timer map)
    let previousTaskId = null;
    let previousTaskElapsed = 0;
    const workerMatchIds = [
      targetWorkerObj?._id,
      targetWorkerObj?.id,
      targetWorkerObj?.employeeCode,
      targetUserKey
    ].filter(Boolean).map(s => String(s).toLowerCase().trim());

    const runningPrevTask = tasks.find(t => {
      if (String(t._id || t.id) === String(taskId)) return false;
      if (t.status === 'completed' || t.completedAt) return false;
      const workerTimer = getWorkerTaskTimer(t, targetWorkerObj || { _id: targetUserKey });
      if (workerTimer?.timerRunning) return true;
      if (!t.timerRunning) return false;
      const activeIds = [t.activeWorkerId, t.activeUserId, t.assignedToId].filter(Boolean).map(s => String(s).toLowerCase().trim());
      if (activeIds.some(id => workerMatchIds.includes(id))) return true;
      if (!isForOtherEmployee && activeTimer && activeTimer.timerRunning && String(activeTimer.taskId) === String(t._id || t.id)) return true;
      return false;
    });

    const prevTaskCandidate = runningPrevTask ||
      (activeTimer && activeTimer.timerRunning && String(activeTimer.taskId) !== String(taskId) && !isForOtherEmployee
        ? (tasks.find(t => (t.status !== 'completed' && !t.completedAt) && (String(t._id || t.id) === String(activeTimer.taskId) || (activeTimer.taskCode && t.taskCode && t.taskCode === activeTimer.taskCode))) ||
           allTasks.find(t => (t.status !== 'completed' && !t.completedAt) && (String(t._id || t.id) === String(activeTimer.taskId) || (activeTimer.taskCode && t.taskCode && t.taskCode === activeTimer.taskCode))))
        : null);

    if (prevTaskCandidate) {
      previousTaskId = prevTaskCandidate._id || prevTaskCandidate.id;
    } else if (activeTimer && activeTimer.timerRunning && String(activeTimer.taskId) !== String(taskId) && !isForOtherEmployee) {
      previousTaskId = activeTimer.taskId;
    }

    let prevLiveElapsed = 0;
    let prevAccumBase = 0;
    let prevTodayBase = 0;

    const prevActiveMatches = Boolean(
      activeTimer &&
      !isForOtherEmployee &&
      previousTaskId &&
      String(activeTimer.taskId) === String(previousTaskId)
    );
    const prevWorkerTimer = prevTaskCandidate
      ? getWorkerTaskTimer(prevTaskCandidate, targetWorkerObj || { _id: targetUserKey })
      : null;

    const prevStartTs = Number(
      (prevActiveMatches && activeTimer?.startedAt)
        ? activeTimer.startedAt
        : (prevWorkerTimer?.startedAt || prevTaskCandidate?.startedAt || 0)
    );
    if (prevStartTs > 0 && prevStartTs <= now && prevStartTs >= todayMidnightMs) {
      prevLiveElapsed = Math.max(0, Math.floor((now - prevStartTs) / 1000));
    }

    if (prevActiveMatches) {
      prevAccumBase = Math.max(prevAccumBase, Number(activeTimer.accumulatedSeconds ?? activeTimer.timerSeconds ?? 0));
      if (activeTimer.date === today) {
        prevTodayBase = Math.max(prevTodayBase, Number(activeTimer.accumulatedTodaySeconds ?? activeTimer.todayWorkSeconds ?? 0));
      }
    }
    if (prevTaskCandidate) {
      prevAccumBase = Math.max(
        prevAccumBase,
        Number(prevTaskCandidate.accumulatedSeconds ?? 0),
        Math.max(0, (Number(prevTaskCandidate.timerSeconds) || 0) - prevLiveElapsed),
        Number(prevWorkerTimer?.accumulatedSeconds || 0)
      );
      const prevTaskToday = prevTaskCandidate.dailySessions?.[today] !== undefined
        ? Number(prevTaskCandidate.dailySessions[today])
        : (prevTaskCandidate.sessionDate === today ? (Number(prevTaskCandidate.accumulatedTodaySeconds ?? prevTaskCandidate.todayWorkSeconds ?? 0)) : 0);
      const prevWorkerToday = (prevWorkerTimer?.sessionDate === today) ? Number(prevWorkerTimer?.todayWorkSeconds || 0) : 0;
      prevTodayBase = Math.max(prevTodayBase, prevTaskToday, prevWorkerToday);
    }

    const finalPrevAccum = prevAccumBase + prevLiveElapsed;
    const finalPrevToday = prevTodayBase + prevLiveElapsed;
    previousTaskElapsed = finalPrevAccum;

    // Multi-day isolation: calculate time logged on previous days
    const allTimesheets = getCollection(KEYS.TIMESHEETS) || [];
    const prevDaysLogged = allTimesheets
      .filter(ts => (String(ts.taskId) === String(taskId) || (targetTask.taskCode && ts.taskCode === targetTask.taskCode)) && ts.date !== today)
      .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

    // If task was last worked on an earlier date and had unlogged time, auto-archive it for that date
    if (targetTask.sessionDate && targetTask.sessionDate !== today) {
      const rawPrevSecs = (targetTask.accumulatedSeconds !== undefined && targetTask.accumulatedSeconds !== null)
        ? Number(targetTask.accumulatedSeconds)
        : (Number(targetTask.timerSeconds) || 0);
      const sessionDateWork = (targetTask.dailySessions && Number(targetTask.dailySessions[targetTask.sessionDate]) > 0)
        ? Number(targetTask.dailySessions[targetTask.sessionDate])
        : Math.max(0, rawPrevSecs - prevDaysLogged);
      const unloggedFromPrevDay = Math.min(sessionDateWork, 14 * 3600);
      if (unloggedFromPrevDay > 0) {
        workService.createTimesheet({
          taskId: targetTask._id || taskId,
          taskCode: targetTask.taskCode,
          taskTitle: targetTask.title,
          projectName: targetTask.projectName,
          employeeId: assignedEmpId,
          employeeName: assignedEmpName,
          date: targetTask.sessionDate,
          totalDurationSeconds: unloggedFromPrevDay,
          totalDurationText: formatSeconds(unloggedFromPrevDay),
          memo: `Work session completed on ${targetTask.sessionDate}`,
          status: 'stopped'
        }).catch(err => console.warn('Auto timesheet archive error:', err));
      }
    }

    // Existing seconds for today's session (strictly SAME-DAY cumulative):
    // For MULTI-ASSIGNEE tasks: calculate this specific worker's today work, NOT other members' work!
    const isMultiAssignee = (Array.isArray(targetTask.assignedToIds) && targetTask.assignedToIds.length > 1) ||
      (Array.isArray(targetTask.assignees) && targetTask.assignees.length > 1);

    let existingTodaySecs = 0;
    const existingWorkerTimer = getWorkerTaskTimer(targetTask, targetWorkerObj);
    const workerKey = String(targetUserKey);
    const workerIdStr = String(targetWorkerObj?._id || '');
    const workerCodeStr = String(targetWorkerObj?.employeeCode || '');
    const sessions = targetTask.assigneeSessions || {};
    const workerSessions = sessions[workerKey] || sessions[workerIdStr] || sessions[workerCodeStr] || {};
    const directWorkerToday = Number(workerSessions[today]) || 0;
    const timerWorkerToday = (existingWorkerTimer && existingWorkerTimer.sessionDate === today)
      ? (Number(existingWorkerTimer.todayWorkSeconds) || 0)
      : 0;
    const activeSnapToday = (!isForOtherEmployee && activeTimer && String(activeTimer.taskId) === String(taskId) && activeTimer.date === today)
      ? Number(activeTimer.accumulatedTodaySeconds ?? activeTimer.todayWorkSeconds ?? 0)
      : 0;

    const taskInStorage = allTasks.find(t => String(t._id || t.id) === String(taskId));
    const storageToday = taskInStorage?.dailySessions?.[today] !== undefined
      ? Number(taskInStorage.dailySessions[today])
      : (taskInStorage?.sessionDate === today && taskInStorage?.todayWorkSeconds !== undefined ? Number(taskInStorage.todayWorkSeconds) : 0);
    const directTaskToday = targetTask.dailySessions?.[today] !== undefined
      ? Number(targetTask.dailySessions[today])
      : (targetTask.sessionDate === today && targetTask.todayWorkSeconds !== undefined ? Number(targetTask.todayWorkSeconds) : 0);

    const todayTsSecs = allTimesheets
      .filter(ts => ts.date === today && (
        String(ts.taskId) === String(taskId) ||
        (targetTask.taskCode && ts.taskCode && String(ts.taskCode).trim().toLowerCase() === String(targetTask.taskCode).trim().toLowerCase())
      ) && (
        !isMultiAssignee ||
        String(ts.employeeId) === workerIdStr ||
        String(ts.employeeCode) === workerCodeStr ||
        String(ts.employeeId) === workerKey ||
        (ts.employeeName && targetWorkerName && ts.employeeName.trim().toLowerCase() === targetWorkerName.trim().toLowerCase())
      ))
      .reduce((maxVal, ts) => Math.max(maxVal, Number(ts.totalDurationSeconds) || 0), 0);

    if (isMultiAssignee) {
      existingTodaySecs = Math.min(maxTodayElapsed, Math.max(directWorkerToday, timerWorkerToday, activeSnapToday, todayTsSecs));
    } else {
      const calcToday = getTaskTodaySeconds(targetTask, today, now, false, false);
      existingTodaySecs = Math.min(maxTodayElapsed, Math.max(calcToday, directTaskToday, storageToday, activeSnapToday, todayTsSecs));
    }

    const workerAccumSecs = existingWorkerTimer ? Number(existingWorkerTimer.accumulatedSeconds || 0) : 0;
    const workerTotalSecs = isMultiAssignee
      ? Math.max(workerAccumSecs, getWorkerTotalSeconds(targetTask, targetWorkerObj, now), existingTodaySecs)
      : Math.max(
          Number(targetTask.accumulatedSeconds ?? targetTask.timerSeconds ?? 0),
          Number(taskInStorage?.accumulatedSeconds ?? taskInStorage?.timerSeconds ?? 0),
          workerAccumSecs,
          existingTodaySecs
        );
    let existingSecs = workerTotalSecs;
    if (activeTimer && String(activeTimer.taskId) === String(taskId) && activeTimer.date === today && !isForOtherEmployee) {
      const activeBase = Number(activeTimer.accumulatedSeconds ?? activeTimer.timerSeconds ?? 0);
      if (!isMultiAssignee) {
        existingSecs = Math.max(existingSecs, activeBase);
      }
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
      accumulatedTodaySeconds: existingTodaySecs,
      timerSeconds: existingSecs,
      todayWorkSeconds: existingTodaySecs,
      liveTodaySeconds: existingTodaySecs,
      dailySessions: { ...(targetTask.dailySessions || {}), [today]: existingTodaySecs },
      date: today,
      sessionDate: today,
      lastUpdated: now,
      startedBy: currentUser?.name || 'User',
      startedById: currentUser?._id
    };

    // Save timer snapshot for target employee
    const timerPayload = JSON.stringify(newTimerState);
    localStorage.setItem(`ems_active_task_timer_${targetUserKey}`, timerPayload);
    if (targetEmpObj) {
      if (targetEmpObj.employeeCode) localStorage.setItem(`ems_active_task_timer_${targetEmpObj.employeeCode}`, timerPayload);
      if (targetEmpObj._id) localStorage.setItem(`ems_active_task_timer_${targetEmpObj._id}`, timerPayload);
    }

    if (!isForOtherEmployee && isTaskAssignedToMe(targetTask)) {
      saveActiveTimerSnapshot(newTimerState);
    }

    // Save in storage collection: pause previous task and start new task
    const workerTimerState = {
      timerRunning: true,
      startedAt: now,
      accumulatedSeconds: existingSecs,
      todayWorkSeconds: existingTodaySecs,
      sessionDate: today,
      workerId: currentWorkerId,
      workerName: currentWorkerName,
      updatedAt: now
    };
    const updatedAssigneeTimers = {
      ...(targetTask.assigneeTimers || {}),
      [currentWorkerId]: workerTimerState,
      ...(targetWorkerObj?.employeeCode ? { [targetWorkerObj.employeeCode]: workerTimerState } : {})
    };
    const updatedAssigneeSessions = {
      ...(targetTask.assigneeSessions || {}),
      [currentWorkerId]: {
        ...((targetTask.assigneeSessions && targetTask.assigneeSessions[currentWorkerId]) || {}),
        [today]: existingTodaySecs
      },
      ...(targetWorkerObj?.employeeCode ? {
        [targetWorkerObj.employeeCode]: {
          ...((targetTask.assigneeSessions && targetTask.assigneeSessions[targetWorkerObj.employeeCode]) || {}),
          [today]: existingTodaySecs
        }
      } : {})
    };
    const updatedDailySessions = { ...(targetTask.dailySessions || {}), [today]: existingTodaySecs };
    const updatedAll = allTasks.map(t => {
      const tId = String(t._id || t.id);
      if (tId === String(taskId)) {
        return {
          ...t,
          timerRunning: true,
          startedAt: now,
          accumulatedSeconds: existingSecs,
          accumulatedTodaySeconds: existingTodaySecs,
          timerSeconds: existingSecs,
          todayWorkSeconds: existingTodaySecs,
          liveTodaySeconds: existingTodaySecs,
          dailySessions: updatedDailySessions,
          assigneeTimers: updatedAssigneeTimers,
          assigneeSessions: updatedAssigneeSessions,
          activeWorkerId: currentWorkerId,
          activeWorkerName: currentWorkerName,
          activeWorkerAvatar: currentWorkerAvatar,
          activeWorkerRole: currentWorkerRole,
          activeUserId: currentWorkerId,
          activeUserName: currentWorkerName,
          startedBy: currentUser?.name || 'User',
          sessionDate: today,
          liveDurationText: formatSeconds(existingTodaySecs),
          status: t.status === 'incomplete' ? 'in_progress' : t.status
        };
      }
      const isPrev = Boolean(
        previousTaskId && (
          tId === String(previousTaskId) ||
          (prevTaskCandidate?.taskCode && t.taskCode && String(t.taskCode).trim().toLowerCase() === String(prevTaskCandidate.taskCode).trim().toLowerCase())
        )
      );
      if (isPrev) {
        const pausedPrev = syncTaskPauseState(t, {
          nowMs: now,
          todayStr: today,
          knownElapsed: prevLiveElapsed,
          workerUser: targetWorkerObj
        });
        const safeAccum = Math.max(finalPrevAccum, Number(pausedPrev?.accumulatedSeconds || 0));
        const safeToday = Math.max(finalPrevToday, Number(pausedPrev?.todayWorkSeconds || 0));
        const prevDailySessions = {
          ...((t.dailySessions && typeof t.dailySessions === 'object') ? t.dailySessions : {}),
          [today]: safeToday
        };
        const prevWorkerPause = {
          timerRunning: false,
          startedAt: null,
          pausedAt: now,
          accumulatedSeconds: safeAccum,
          todayWorkSeconds: safeToday,
          sessionDate: today,
          workerId: currentWorkerId,
          workerName: currentWorkerName,
          updatedAt: now
        };
        const prevTimers = {
          ...(t.assigneeTimers || {}),
          [currentWorkerId]: prevWorkerPause,
          ...(targetWorkerObj?.employeeCode ? { [targetWorkerObj.employeeCode]: prevWorkerPause } : {})
        };
        const prevAssigneeSessions = {
          ...(t.assigneeSessions || {}),
          [currentWorkerId]: {
            ...((t.assigneeSessions && t.assigneeSessions[currentWorkerId]) || {}),
            [today]: safeToday
          }
        };
        return {
          ...t,
          ...pausedPrev,
          timerRunning: false,
          startedAt: null,
          activeWorkerId: null,
          activeWorkerName: null,
          activeWorkerAvatar: null,
          activeWorkerRole: null,
          activeUserId: null,
          activeUserName: null,
          accumulatedSeconds: safeAccum,
          accumulatedTodaySeconds: safeToday,
          timerSeconds: safeAccum,
          todayWorkSeconds: safeToday,
          liveTodaySeconds: safeToday,
          dailySessions: prevDailySessions,
          assigneeTimers: prevTimers,
          assigneeSessions: prevAssigneeSessions,
          liveDurationText: formatSeconds(safeToday),
          hoursLoggedText: formatSeconds(safeAccum),
          hoursLogged: +(safeAccum / 3600).toFixed(2),
          _id: t._id,
          id: t.id
        };
      }
      const isMyRunningTask = String(t.activeUserId || '').toLowerCase() === String(targetUserKey || '').toLowerCase() ||
        Boolean(getWorkerTaskTimer(t, targetWorkerObj)?.timerRunning) ||
        (activeTimer && String(activeTimer.taskId) === tId && !isForOtherEmployee);
      if ((t.timerRunning || getWorkerTaskTimer(t, targetWorkerObj)?.timerRunning) && isMyRunningTask) {
        const pausedPrev = syncTaskPauseState(t, { nowMs: now, todayStr: today, workerUser: targetWorkerObj });
        return pausedPrev ? { ...t, ...pausedPrev, _id: t._id, id: t.id } : { ...t, timerRunning: false, startedAt: null };
      }
      return t;
    });
    saveCollection(KEYS.TASKS, updatedAll);

    // Persist running state to MongoDB Atlas via workService.updateTask
    try {
      const otherTeammatesRunning = isMultiAssignee && targetTask.assigneeTimers && Object.entries(targetTask.assigneeTimers).some(([k, v]) => {
        const lk = String(k).toLowerCase();
        return v?.timerRunning && lk !== String(currentWorkerId).toLowerCase() && lk !== String(targetWorkerObj?.employeeCode || '').toLowerCase();
      });
      workService.updateTask(taskId, {
        timerRunning: true,
        ...(otherTeammatesRunning ? {} : {
          startedAt: now,
          accumulatedSeconds: existingSecs,
          timerSeconds: existingSecs,
          todayWorkSeconds: existingTodaySecs,
          accumulatedTodaySeconds: existingTodaySecs,
          dailySessions: updatedDailySessions
        }),
        status: targetTask.status === 'incomplete' ? 'in_progress' : targetTask.status,
        sessionDate: today,
        activeWorkerId: currentWorkerId,
        activeWorkerName: currentWorkerName,
        activeWorkerAvatar: currentWorkerAvatar,
        activeWorkerRole: currentWorkerRole,
        activeUserId: currentWorkerId,
        activeUserName: currentWorkerName,
        assigneeTimerUpdate: {
          workerId: currentWorkerId,
          workerCode: targetWorkerObj?.employeeCode || '',
          timerState: workerTimerState
        },
        assigneeSessionUpdate: {
          workerId: currentWorkerId,
          date: today,
          seconds: existingTodaySecs
        }
      }).catch(err => console.warn('Sync task timer start to backend notice:', err));

      if (previousTaskId) {
        const pausedPrevObj = updatedAll.find(t => String(t._id || t.id) === String(previousTaskId));
        const prevToday = Math.max(finalPrevToday, pausedPrevObj ? (Number(pausedPrevObj.todayWorkSeconds) || 0) : 0);
        const prevAccum = Math.max(finalPrevAccum, pausedPrevObj ? (Number(pausedPrevObj.accumulatedSeconds) || 0) : 0);
        const prevOtherRunning = pausedPrevObj?.assigneeTimers && Object.entries(pausedPrevObj.assigneeTimers).some(([k, v]) => {
          const lk = String(k).toLowerCase();
          return v?.timerRunning && lk !== String(currentWorkerId).toLowerCase() && lk !== String(targetWorkerObj?.employeeCode || '').toLowerCase();
        });
        workService.updateTask(previousTaskId, {
          ...(prevOtherRunning ? {} : {
            timerRunning: false,
            startedAt: null,
            activeWorkerId: null,
            activeWorkerName: null,
            activeWorkerAvatar: null,
            activeWorkerRole: null,
            activeUserId: null,
            activeUserName: null,
            accumulatedSeconds: prevAccum,
            timerSeconds: prevAccum,
            todayWorkSeconds: prevToday,
            accumulatedTodaySeconds: prevToday,
            liveTodaySeconds: prevToday,
            dailySessions: pausedPrevObj?.dailySessions || { [today]: prevToday },
            hoursLogged: +(prevAccum / 3600).toFixed(2),
            hoursLoggedText: formatSeconds(prevAccum)
          }),
          sessionDate: today,
          assigneeTimerUpdate: {
            workerId: currentWorkerId,
            workerCode: targetWorkerObj?.employeeCode || '',
            timerState: {
              timerRunning: false,
              startedAt: null,
              pausedAt: now,
              accumulatedSeconds: prevAccum,
              todayWorkSeconds: prevToday,
              sessionDate: today,
              workerId: currentWorkerId,
              workerName: currentWorkerName,
              updatedAt: now
            }
          },
          assigneeSessionUpdate: {
            workerId: currentWorkerId,
            date: today,
            seconds: prevToday
          }
        }).catch(() => {});

        // AUTO-SAVE TIMESHEET ENTRY: Ensure worked time is immediately logged to KEYS.TIMESHEETS!
        if (prevToday > 0 && prevTaskCandidate) {
          const prevWorkerObj = targetWorkerObj || currentUser;
          const prevEmpId = prevWorkerObj?._id || prevWorkerObj?.employeeCode || userKey;
          const prevEmpName = prevWorkerObj?.name || currentUser?.name || 'Employee';
          const prevEmpCode = prevWorkerObj?.employeeCode || (!/^[a-fA-F0-9]{24}$/.test(String(prevEmpId)) ? String(prevEmpId) : '');
          workService.createTimesheet({
            taskId: prevTaskCandidate._id || previousTaskId,
            taskCode: prevTaskCandidate.taskCode || 'TSK',
            taskTitle: prevTaskCandidate.title || 'Task',
            projectName: prevTaskCandidate.projectName || 'General Work',
            employeeId: prevEmpId,
            employeeCode: prevEmpCode,
            employeeName: prevEmpName,
            date: today,
            totalDurationSeconds: prevToday,
            totalDurationText: formatSeconds(prevToday),
            memo: 'Auto-saved session on switching tasks',
            status: 'stopped'
          }).catch(err => console.warn('Auto timesheet save on switch error:', err));
        }
      }

      // Transmit real-time task-only telemetry (NEVER overwrite shift workSeconds/isClockedIn or employeeName!)
      const realEmpId = targetEmpObj?._id || targetUserKey;
      const realEmpCode = targetEmpObj?.employeeCode || (!/^[a-fA-F0-9]{24}$/.test(String(targetUserKey)) ? targetUserKey : '');
      const realEmpName = targetEmpObj?.name || assignedEmpName;
      hrService.sendHeartbeat({
        employeeId: realEmpId,
        employeeCode: realEmpCode,
        employeeName: realEmpName,
        taskOnly: true,
        activeTask: {
          taskId,
          taskCode: targetTask.taskCode,
          title: targetTask.title,
          timerRunning: true,
          startedAt: now,
          accumulatedTodaySeconds: existingTodaySecs,
          todayWorkSeconds: existingTodaySecs,
          accumulatedSeconds: existingSecs,
          activeWorkerId: realEmpId,
          activeUserId: realEmpId,
          activeWorkerName: realEmpName,
          activeWorkerCode: realEmpCode
        }
      }).catch(() => {});

      // Mandatory Actor Audit Log whenever someone starts a task on behalf of ANOTHER employee
      if (isForOtherEmployee && currentUser) {
        hrService.createAttendanceAuditLog({
          type: 'remote_task_started',
          action: `Task Started by ${currentUser.name || 'User'}`,
          date: today,
          employeeId: String(realEmpId),
          employeeCode: realEmpCode,
          employeeName: realEmpName,
          actor: `${currentUser.name || 'User'} (${currentUser.employeeCode || currentUser.role || 'Staff'})`,
          actorId: String(currentUser._id || currentUser.id || currentUser.employeeCode || ''),
          actorName: currentUser.name || 'User',
          actorCode: currentUser.employeeCode || '',
          actorRole: currentUser.role || currentUser.systemRole || 'Staff',
          details: `${currentUser.name} (${currentUser.employeeCode || currentUser.role || 'Staff'}) started task #${targetTask.taskCode || 'TSK'} "${targetTask.title}" for ${realEmpName}`
        }).catch(() => {});
      }
    } catch (e) {}

    // Instant cross-tab broadcast
    broadcastSyncEvent(SYNC_EVENTS.TASK_TIMER_STARTED, {
      taskId,
      taskCode: targetTask.taskCode,
      empKey: targetUserKey,
      taskTitle: targetTask.title,
      startedAt: now,
      accumulatedSeconds: existingSecs,
      accumulatedTodaySeconds: existingTodaySecs,
      todayWorkSeconds: existingTodaySecs,
      startedBy: currentUser?.name || 'User',
      empName: assignedEmpName,
      activeWorkerId: currentWorkerId,
      activeWorkerName: currentWorkerName,
      activeWorkerAvatar: currentWorkerAvatar,
      activeWorkerRole: currentWorkerRole,
      activeUserId: currentWorkerId,
      activeUserName: currentWorkerName
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
          accumulatedTodaySeconds: existingTodaySecs,
          timerSeconds: existingSecs,
          todayWorkSeconds: existingTodaySecs,
          liveTodaySeconds: existingTodaySecs,
          dailySessions: updatedDailySessions,
          assigneeTimers: updatedAssigneeTimers,
          assigneeSessions: updatedAssigneeSessions,
          activeWorkerId: currentWorkerId,
          activeWorkerName: currentWorkerName,
          activeWorkerAvatar: currentWorkerAvatar,
          activeWorkerRole: currentWorkerRole,
          activeUserId: currentWorkerId,
          activeUserName: currentWorkerName,
          startedBy: currentUser?.name || 'User',
          sessionDate: today,
          liveDurationText: formatSeconds(existingTodaySecs),
          status: t.status === 'incomplete' ? 'in_progress' : t.status
        };
      }
      const isPrev = Boolean(
        previousTaskId && (
          tId === String(previousTaskId) ||
          (prevTaskCandidate?.taskCode && t.taskCode && String(t.taskCode).trim().toLowerCase() === String(prevTaskCandidate.taskCode).trim().toLowerCase())
        )
      );
      if (isPrev) {
        const safeAccum = Math.max(finalPrevAccum, Number(t.accumulatedSeconds ?? t.timerSeconds ?? 0));
        const safeToday = Math.max(finalPrevToday, Number(t.dailySessions?.[today] ?? t.todayWorkSeconds ?? 0));
        return {
          ...t,
          timerRunning: false,
          startedAt: null,
          activeWorkerId: null,
          activeWorkerName: null,
          activeWorkerAvatar: null,
          activeWorkerRole: null,
          activeUserId: null,
          activeUserName: null,
          accumulatedSeconds: safeAccum,
          accumulatedTodaySeconds: safeToday,
          timerSeconds: safeAccum,
          todayWorkSeconds: safeToday,
          liveTodaySeconds: safeToday,
          dailySessions: {
            ...((t.dailySessions && typeof t.dailySessions === 'object') ? t.dailySessions : {}),
            [today]: safeToday
          },
          liveDurationText: formatSeconds(safeToday),
          hoursLoggedText: formatSeconds(safeAccum),
          hoursLogged: +(safeAccum / 3600).toFixed(2),
          _id: t._id,
          id: t.id
        };
      }
      if (t.timerRunning && (String(t.activeUserId) === String(targetUserKey) || String(t.assignedToId) === String(targetUserKey))) {
        const pausedPrev = syncTaskPauseState(t, { nowMs: now, todayStr: today, workerUser: targetWorkerObj });
        return pausedPrev ? { ...t, ...pausedPrev, _id: t._id, id: t.id } : { ...t, timerRunning: false, startedAt: null };
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
  startTaskTimerRef.current = startTaskTimer;

  // ── Pause Task Timer (Wall-Clock Precision & Real-Time Sync) ──
  const pauseTaskTimer = (taskId) => {
    const today = getTodayStr();
    const now = Date.now();
    const activeTimer = getActiveTimerSnapshot();
    const allTasks = getCollection(KEYS.TASKS) || [];
    const targetTask = tasks.find(t => String(t._id || t.id) === String(taskId)) ||
      allTasks.find(t => String(t._id || t.id) === String(taskId));
    if (!targetTask) return;

    // Strict Permission Guard: Only authorized members can pause/control this task
    if (!canUserControlTask(targetTask)) {
      addToast('⛔ Access Denied: Only assigned team members, the task creator, or HR/Admin can pause this task.', 'error');
      return;
    }

    const isUserAdminOrHR = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr' || currentUser?.role === 'Administrator' || currentUser?.role === 'HR Manager' || isHRorAdmin(currentUser);
    const isAssignedSelf = isTaskAssignedToMe(targetTask);
    const activeWorkerId = isAssignedSelf
      ? String(currentUser?._id || userKey)
      : (targetTask.activeWorkerId || targetTask.activeUserId || userKey);
    const workerObj = isAssignedSelf
      ? currentUser
      : ((employees || []).find(e =>
          String(e._id) === String(activeWorkerId) ||
          String(e.employeeCode) === String(activeWorkerId)
        ) || currentUser);
    const workerKey = String(workerObj?.employeeCode || workerObj?._id || userKey);
    const workerIdStr = String(workerObj?._id || userKey);
    const workerNameStr = String(workerObj?.name || currentUser?.name || 'Team Member');

    const assignedEmpId = activeWorkerId;
    const isForOtherEmployee = (isUserAdminOrHR || targetTask.assignedById === currentUser?._id) &&
      !isAssignedSelf &&
      assignedEmpId &&
      String(assignedEmpId) !== String(userKey) &&
      String(assignedEmpId) !== String(currentUser?._id);
    const targetUserKey = isForOtherEmployee ? String(assignedEmpId) : String(userKey);
    lastTaskActionRef.current = { taskId: String(taskId), action: 'pause', at: now };

    // Merge activeTimer snapshot into targetTask BEFORE computing pause state so ZERO live elapsed seconds are ever dropped!
    const matchesActiveSnap = Boolean(
      activeTimer &&
      !isForOtherEmployee &&
      (String(activeTimer.taskId) === String(taskId) || String(activeTimer._id) === String(taskId))
    );
    const workerSpecificTimer = getWorkerTaskTimer(targetTask, workerObj);
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMidnightMs = todayMidnight.getTime();
    const isWorkerRunning = Boolean(
      workerSpecificTimer?.timerRunning ||
      (matchesActiveSnap && activeTimer?.timerRunning) ||
      (!workerSpecificTimer && targetTask.timerRunning)
    );
    const startTs = (workerSpecificTimer?.timerRunning && workerSpecificTimer?.startedAt)
      ? Number(workerSpecificTimer.startedAt)
      : ((matchesActiveSnap && activeTimer?.startedAt)
          ? Number(activeTimer.startedAt)
          : (targetTask.timerRunning && targetTask.startedAt ? Number(targetTask.startedAt) : now));
    const effectiveStartTs = Math.max(startTs, todayMidnightMs);
    const sessionElapsed = (isWorkerRunning && startTs > 0 && startTs <= now)
      ? Math.max(0, Math.floor((now - effectiveStartTs) / 1000))
      : 0;

    // Update worker's specific sessions and total hours (persist under both workerKey and workerIdStr)
    const isMultiPause = (Array.isArray(targetTask.assignedToIds) && targetTask.assignedToIds.length > 1) ||
      (Array.isArray(targetTask.assignees) && targetTask.assignees.length > 1);
    const updatedAssigneeSessions = { ...(targetTask.assigneeSessions || {}) };
    const prevWorkerToday = getWorkerDailySessionSeconds(targetTask, workerObj, today);
    const workerTodayTotal = prevWorkerToday + sessionElapsed;
    updatedAssigneeSessions[workerKey] = { ...(updatedAssigneeSessions[workerKey] || {}), [today]: workerTodayTotal };
    if (workerIdStr && workerIdStr !== workerKey) {
      updatedAssigneeSessions[workerIdStr] = { ...(updatedAssigneeSessions[workerIdStr] || {}), [today]: workerTodayTotal };
    }

    const updatedAssigneeHours = { ...(targetTask.assigneeHours || {}) };
    const prevWorkerTotal = Math.max(
      Number(updatedAssigneeHours[workerKey]) || 0,
      Number(updatedAssigneeHours[workerIdStr]) || 0,
      Number(workerSpecificTimer?.accumulatedSeconds) || 0,
      prevWorkerToday
    );
    const workerLifetimeTotal = Math.max(prevWorkerTotal + sessionElapsed, workerTodayTotal);
    updatedAssigneeHours[workerKey] = workerLifetimeTotal;
    if (workerIdStr && workerIdStr !== workerKey) {
      updatedAssigneeHours[workerIdStr] = workerLifetimeTotal;
    }

    const workerMatchKeys = new Set(
      [workerKey, workerIdStr, workerObj?.employeeCode, workerObj?._id, workerObj?.id, workerObj?.email]
        .filter(Boolean)
        .map(k => String(k).trim())
    );
    const pausedWorkerState = {
      ...(workerSpecificTimer || {}),
      timerRunning: false,
      startedAt: null,
      pausedAt: now,
      accumulatedSeconds: workerLifetimeTotal,
      todayWorkSeconds: workerTodayTotal,
      sessionDate: today,
      workerId: workerIdStr,
      workerName: workerNameStr,
      updatedAt: now
    };
    const updatedAssigneeTimers = { ...(targetTask.assigneeTimers || {}) };
    for (const existingK of Object.keys(updatedAssigneeTimers)) {
      if (workerMatchKeys.has(existingK) || [...workerMatchKeys].some(mk => mk.toLowerCase() === existingK.toLowerCase())) {
        updatedAssigneeTimers[existingK] = {
          ...(updatedAssigneeTimers[existingK] || {}),
          ...pausedWorkerState
        };
      }
    }
    updatedAssigneeTimers[workerKey] = { ...pausedWorkerState };
    if (workerIdStr && workerIdStr !== workerKey) {
      updatedAssigneeTimers[workerIdStr] = { ...pausedWorkerState };
    }

    const mergedDailyBeforePause = {
      ...(matchesActiveSnap && activeTimer.dailySessions && typeof activeTimer.dailySessions === 'object' ? activeTimer.dailySessions : {}),
      ...(targetTask.dailySessions && typeof targetTask.dailySessions === 'object' ? targetTask.dailySessions : {})
    };
    if (matchesActiveSnap && activeTimer.date === today) {
      const snapTodayBase = Number(activeTimer.accumulatedTodaySeconds ?? activeTimer.todayWorkSeconds ?? 0);
      mergedDailyBeforePause[today] = Math.max(Number(mergedDailyBeforePause[today]) || 0, snapTodayBase);
    }
    mergedDailyBeforePause[today] = (Number(mergedDailyBeforePause[today]) || 0) + sessionElapsed;

    const effectiveTaskForPause = {
      ...targetTask,
      timerRunning: Boolean(targetTask.timerRunning || (matchesActiveSnap && activeTimer.timerRunning)),
      startedAt: startTs,
      accumulatedSeconds: Math.max(
        (Number(targetTask.accumulatedSeconds) || 0) + sessionElapsed,
        matchesActiveSnap ? ((Number(activeTimer.accumulatedSeconds) || 0) + sessionElapsed) : 0
      ),
      accumulatedTodaySeconds: Math.max(
        targetTask.sessionDate === today ? (Number(targetTask.accumulatedTodaySeconds) || 0) : 0,
        (matchesActiveSnap && activeTimer.date === today) ? (Number(activeTimer.accumulatedTodaySeconds) || 0) : 0,
        Number(mergedDailyBeforePause[today]) || 0
      ),
      dailySessions: mergedDailyBeforePause,
      assigneeSessions: updatedAssigneeSessions,
      assigneeHours: updatedAssigneeHours,
      assigneeTimers: updatedAssigneeTimers
    };

    const pausedTask = {
      ...syncTaskPauseState(effectiveTaskForPause, { nowMs: now, todayStr: today, wasPausedForClockOut: false, wasPausedForBreak: false, knownElapsed: 0 }),
      pausedAt: now,
      timerRunning: false,
      startedAt: null,
      activeWorkerId: null,
      activeWorkerName: null,
      activeWorkerAvatar: null,
      activeWorkerRole: null,
      activeUserId: null,
      activeUserName: null,
      lastWorkerId: workerIdStr,
      lastWorkerName: workerNameStr,
      assigneeSessions: updatedAssigneeSessions,
      assigneeHours: updatedAssigneeHours,
      assigneeTimers: updatedAssigneeTimers
    };
    const combinedMultiSecs = isMultiPause
      ? getMultiAssigneeCombinedSeconds(pausedTask, now)
      : pausedTask.accumulatedSeconds;

    if (isMultiPause && combinedMultiSecs > 0) {
      pausedTask.accumulatedSeconds = combinedMultiSecs;
      pausedTask.timerSeconds = combinedMultiSecs;
      pausedTask.hoursLogged = +(combinedMultiSecs / 3600).toFixed(2);
      pausedTask.hoursLoggedText = formatSeconds(combinedMultiSecs);
    }

    const currentSecs = pausedTask.accumulatedSeconds;
    const updatedTodaySecs = pausedTask.todayWorkSeconds;
    const dailySessionsMap = pausedTask.dailySessions;

    const pausedTimerState = isMultiPause
      ? {
          ...pausedTask,
          accumulatedSeconds: workerLifetimeTotal,
          timerSeconds: workerLifetimeTotal,
          todayWorkSeconds: workerTodayTotal,
          accumulatedTodaySeconds: workerTodayTotal,
          liveTodaySeconds: workerTodayTotal,
          taskId: targetTask._id,
          date: today,
          pausedAt: now
        }
      : {
          ...pausedTask,
          taskId: targetTask._id,
          date: today,
          pausedAt: now
        };

    const timerPayload = JSON.stringify(pausedTimerState);
    localStorage.setItem(`ems_active_task_timer_${targetUserKey}`, timerPayload);
    const targetEmpObj = (employees || []).find(e => String(e._id) === String(targetUserKey) || String(e.employeeCode) === String(targetUserKey));
    if (targetEmpObj) {
      if (targetEmpObj.employeeCode) localStorage.setItem(`ems_active_task_timer_${targetEmpObj.employeeCode}`, timerPayload);
      if (targetEmpObj._id) localStorage.setItem(`ems_active_task_timer_${targetEmpObj._id}`, timerPayload);
    }

    if (!isForOtherEmployee && isTaskAssignedToMe(targetTask)) {
      saveActiveTimerSnapshot(pausedTimerState);
    }

    try {
      const realEmpId = targetEmpObj?._id || targetUserKey;
      const realEmpCode = targetEmpObj?.employeeCode || (!/^[a-fA-F0-9]{24}$/.test(String(targetUserKey)) ? targetUserKey : '');
      const realEmpName = targetEmpObj?.name || targetTask.assignedToName || '';
      hrService.sendHeartbeat({
        employeeId: realEmpId,
        employeeCode: realEmpCode,
        employeeName: realEmpName,
        taskOnly: true,
        activeTask: {
          taskId: targetTask._id,
          taskCode: targetTask.taskCode,
          title: targetTask.title,
          timerRunning: false,
          startedAt: null,
          accumulatedTodaySeconds: updatedTodaySecs,
          todayWorkSeconds: updatedTodaySecs,
          accumulatedSeconds: currentSecs,
          activeWorkerId: realEmpId,
          activeUserId: realEmpId,
          activeWorkerName: realEmpName,
          activeWorkerCode: realEmpCode
        }
      }).catch(() => {});

      // AUTO-SAVE TIMESHEET ENTRY: Ensure paused session is safely stored in TIMESHEETS (isolated per worker for multi-assignee)
      const tsDurationToSave = isMultiPause ? workerTodayTotal : updatedTodaySecs;
      if (tsDurationToSave > 0) {
        workService.createTimesheet({
          taskId: targetTask._id || taskId,
          taskCode: targetTask.taskCode || 'TSK',
          taskTitle: targetTask.title || 'Task',
          projectName: targetTask.projectName || 'General Work',
          employeeId: activeWorkerId || userKey,
          employeeCode: realEmpCode,
          employeeName: workerNameStr || currentUser?.name || 'Employee',
          date: today,
          totalDurationSeconds: tsDurationToSave,
          totalDurationText: formatSeconds(tsDurationToSave),
          memo: 'Task paused session',
          status: 'stopped'
        }).catch(() => {});
      }

      if (isForOtherEmployee && currentUser) {
        hrService.createAttendanceAuditLog({
          type: 'remote_task_paused',
          action: `Task Paused by ${currentUser.name || 'User'}`,
          date: today,
          employeeId: String(realEmpId),
          employeeCode: realEmpCode,
          employeeName: realEmpName,
          actor: `${currentUser.name || 'User'} (${currentUser.employeeCode || currentUser.role || 'Staff'})`,
          actorId: String(currentUser._id || currentUser.id || currentUser.employeeCode || ''),
          actorName: currentUser.name || 'User',
          actorCode: currentUser.employeeCode || '',
          actorRole: currentUser.role || currentUser.systemRole || 'Staff',
          details: `${currentUser.name} (${currentUser.employeeCode || currentUser.role || 'Staff'}) paused task #${targetTask.taskCode || 'TSK'} "${targetTask.title}" for ${realEmpName}`
        }).catch(() => {});
      }
    } catch (_) {}

    // Save in storage collection
    const updatedAll = allTasks.map(t => {
      if (String(t._id || t.id) === String(taskId)) {
        return {
          ...t,
          ...pausedTask,
          _id: t._id,
          id: t.id
        };
      }
      return t;
    });
    saveCollection(KEYS.TASKS, updatedAll);

    broadcastSyncEvent(SYNC_EVENTS.TASK_TIMER_PAUSED, {
      taskId,
      taskCode: targetTask.taskCode,
      empKey: targetUserKey,
      accumulatedSeconds: currentSecs,
      accumulatedTodaySeconds: updatedTodaySecs,
      todayWorkSeconds: updatedTodaySecs,
      dailySessions: dailySessionsMap,
      pausedBy: currentUser?.name || 'User',
      taskTitle: targetTask.title,
      activeWorkerId: null,
      activeWorkerName: null,
      activeWorkerAvatar: null,
      activeWorkerRole: null,
      activeUserId: null,
      activeUserName: null
    });
    window.dispatchEvent(new CustomEvent('ems_task_timer_paused', {
      detail: { taskId, userKey: targetUserKey, empKey: targetUserKey }
    }));

    setTasks(prev => prev.map(t => {
      if (String(t._id || t.id) === String(taskId)) {
        return {
          ...t,
          ...pausedTask,
          _id: t._id,
          id: t.id
        };
      }
      return t;
    }));

    // Persist paused state to backend (isolate multi-assignee timers so teammate's running timer stays intact)
    const pausedWorkerTimerState = {
      timerRunning: false,
      startedAt: null,
      pausedAt: now,
      accumulatedSeconds: currentSecs,
      todayWorkSeconds: updatedTodaySecs,
      sessionDate: today,
      workerId: workerIdStr,
      workerName: workerNameStr,
      updatedAt: now
    };
    const otherTeammatesStillRunning = targetTask.assigneeTimers && Object.entries(targetTask.assigneeTimers).some(([k, v]) => {
      const lk = String(k).toLowerCase();
      return v?.timerRunning && lk !== String(workerIdStr).toLowerCase() && lk !== String(workerKey).toLowerCase();
    });
    try {
      workService.updateTask(taskId, {
        ...(otherTeammatesStillRunning ? {} : {
          timerRunning: false,
          startedAt: null,
          activeWorkerId: null,
          activeWorkerName: null,
          activeWorkerAvatar: null,
          activeWorkerRole: null,
          activeUserId: null,
          activeUserName: null,
          accumulatedSeconds: currentSecs,
          timerSeconds: currentSecs,
          todayWorkSeconds: updatedTodaySecs,
          accumulatedTodaySeconds: updatedTodaySecs,
          liveTodaySeconds: updatedTodaySecs,
          dailySessions: dailySessionsMap
        }),
        sessionDate: today,
        hoursLogged: +(currentSecs / 3600).toFixed(2),
        hoursLoggedText: formatSeconds(currentSecs),
        assigneeTimerUpdate: {
          workerId: workerIdStr,
          workerCode: workerObj?.employeeCode || '',
          timerState: pausedWorkerTimerState
        },
        assigneeSessionUpdate: {
          workerId: workerIdStr,
          date: today,
          seconds: updatedTodaySecs
        }
      }).catch(err => console.warn('Sync task timer pause to backend notice:', err));
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

    if (targetTask && !canUserControlTask(targetTask)) {
      addToast('⛔ Access Denied: Only assigned team members, the task creator, or HR/Admin can stop this task.', 'error');
      return;
    }

    const todayStr = getTodayStr();
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMidnightMs = todayMidnight.getTime();
    lastTaskActionRef.current = { taskId: String(taskId), action: 'stop', at: Date.now() };

    // Calculate live session elapsed (today-only, capped at midnight)
    let sessionElapsed = 0;
    if (targetTask?.timerRunning && targetTask?.startedAt) {
      const effectiveStart = Math.max(Number(targetTask.startedAt), todayMidnightMs);
      sessionElapsed = Math.max(0, Math.floor((Date.now() - effectiveStart) / 1000));
    } else if (activeTimer && String(activeTimer.taskId) === String(taskId)) {
      const base = Number(activeTimer.accumulatedSeconds) || 0;
      sessionElapsed = Math.max(0, getElapsedSeconds(activeTimer) - base);
    }

    const isMultiAssignee = (Array.isArray(targetTask?.assignedToIds) && targetTask.assignedToIds.length > 1) ||
      (Array.isArray(targetTask?.assignees) && targetTask.assignees.length > 1);

    // Identify the active worker who actually worked on this session
    const activeWorkerId = targetTask?.activeWorkerId || activeTimer?.activeWorkerId || currentUser?._id;
    const workerObj = (employees || []).find(e => 
      String(e._id) === String(activeWorkerId) || 
      String(e.employeeCode) === String(activeWorkerId)
    ) || currentUser;
    const workerId = workerObj?._id || userKey;
    const workerCode = workerObj?.employeeCode || userKey;
    const workerName = workerObj?.name || currentUser?.name || 'Team Member';
    const workerKey = String(workerCode || workerId);

    let durationToLog = 0;
    if (isMultiAssignee) {
      const workerSessions = targetTask?.assigneeSessions?.[workerKey] || targetTask?.assigneeSessions?.[String(workerId)] || {};
      const prevWorkerToday = Number(workerSessions[todayStr]) || 0;
      durationToLog = prevWorkerToday + sessionElapsed;
    } else {
      let todaySessionSecs = 0;
      if (targetTask?.dailySessions && typeof targetTask.dailySessions === 'object' && targetTask.dailySessions[todayStr] !== undefined) {
        todaySessionSecs = (Number(targetTask.dailySessions[todayStr]) || 0) + sessionElapsed;
      } else if (targetTask?.sessionDate === todayStr && targetTask?.accumulatedTodaySeconds !== undefined && targetTask?.accumulatedTodaySeconds !== null) {
        todaySessionSecs = Number(targetTask.accumulatedTodaySeconds) + sessionElapsed;
      } else if (targetTask?.sessionDate === todayStr && targetTask?.todayWorkSeconds !== undefined) {
        const baseSecs = targetTask.timerRunning
          ? Math.max(0, (Number(targetTask.todayWorkSeconds) || 0) - sessionElapsed)
          : (Number(targetTask.todayWorkSeconds) || 0);
        todaySessionSecs = baseSecs + sessionElapsed;
      } else {
        todaySessionSecs = sessionElapsed;
      }
      durationToLog = todaySessionSecs;
    }

    const baseAccum = (targetTask?.accumulatedSeconds !== undefined && targetTask?.accumulatedSeconds !== null)
      ? Number(targetTask.accumulatedSeconds)
      : (activeTimer ? (Number(activeTimer.accumulatedSeconds) || 0) : 0);
    const totalSecs = baseAccum + sessionElapsed;
    const allTimesheets = getCollection(KEYS.TIMESHEETS) || [];

    try {
      if (durationToLog > 0) {
        await workService.stopTimer({
          taskId: targetTask?._id || taskId,
          taskCode: targetTask?.taskCode || 'TSK',
          taskTitle: targetTask?.title || 'Task',
          projectName: targetTask?.projectName || 'General Work',
          employeeId: workerId,
          employeeCode: workerCode,
          employeeName: workerName,
          totalDurationSeconds: durationToLog,
          date: todayStr,
          memo: memo || `Work on ${targetTask?.title || 'Task'}`
        });
      }

      saveActiveTimerSnapshot(null);
      if (targetTask?.assignedToId) {
        try { localStorage.removeItem(`ems_active_task_timer_${targetTask.assignedToId}`); } catch {}
      }
      if (targetTask?.activeUserId) {
        try { localStorage.removeItem(`ems_active_task_timer_${targetTask.activeUserId}`); } catch {}
      }
      try {
        const empK = targetTask?.activeUserId || targetTask?.assignedToId || userKey;
        hrService.sendHeartbeat({
          employeeId: empK,
          employeeCode: empK,
          taskOnly: true,
          activeTask: null
        }).catch(() => {});
      } catch (_) {}

      const hoursLoggedNum = +(totalSecs / 3600).toFixed(2);
      const hoursLoggedFormatted = formatSeconds(totalSecs);

      // In storage tasks collection update timer to stopped but preserve total time logged
      const freshAllTasks = getCollection(KEYS.TASKS) || [];
      const updatedDailySessions = { ...(targetTask?.dailySessions || {}), [todayStr]: todaySessionSecs };
      const stoppedAt = Date.now();
      const updatedAssigneeTimers = { ...(targetTask?.assigneeTimers || {}) };
      const stopMatchKeys = new Set([String(workerId), String(workerCode), String(workerKey)].filter(Boolean).map(s => s.toLowerCase()));
      for (const ek of Object.keys(updatedAssigneeTimers)) {
        if (stopMatchKeys.has(String(ek).toLowerCase())) {
          updatedAssigneeTimers[ek] = {
            ...(updatedAssigneeTimers[ek] || {}),
            timerRunning: false,
            startedAt: null,
            pausedAt: stoppedAt,
            todayWorkSeconds: durationToLog,
            sessionDate: todayStr,
            updatedAt: stoppedAt
          };
        }
      }
      const updatedAll = freshAllTasks.map(t => {
        if (String(t._id || t.id) === String(taskId)) {
          return {
            ...t,
            timerRunning: false,
            startedAt: null,
            activeWorkerId: null,
            activeWorkerName: null,
            activeWorkerAvatar: null,
            activeWorkerRole: null,
            activeUserId: null,
            activeUserName: null,
            accumulatedSeconds: totalSecs,
            timerSeconds: totalSecs,
            durationSeconds: totalSecs,
            todayWorkSeconds: todaySessionSecs,
            dailySessions: updatedDailySessions,
            assigneeTimers: updatedAssigneeTimers,
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
            activeWorkerId: null,
            activeWorkerName: null,
            activeWorkerAvatar: null,
            activeWorkerRole: null,
            activeUserId: null,
            activeUserName: null,
            accumulatedSeconds: totalSecs,
            timerSeconds: totalSecs,
            durationSeconds: totalSecs,
            todayWorkSeconds: todaySessionSecs,
            dailySessions: updatedDailySessions,
            assigneeTimers: updatedAssigneeTimers,
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
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const todayMidnightMs = todayMidnight.getTime();
      const completedIso = new Date().toISOString();
      const now = Date.now();
      const activeTimer = getActiveTimerSnapshot();
      
      const allTasks = getCollection(KEYS.TASKS) || [];
      const targetTask = (tasks || []).find(t => String(t._id || t.id) === String(taskId)) ||
        allTasks.find(t => String(t._id || t.id) === String(taskId));
      if (!targetTask) return null;

      // Strict Permission Guard: Only authorized members can complete this task
      if (!canUserControlTask(targetTask)) {
        addToast('⛔ Access Denied: Only assigned team members, the task creator, or HR/Admin can complete this task.', 'error');
        return null;
      }

      const assignedEmpId = targetTask.assignedToId ||
        (typeof targetTask.assignedTo === 'string' ? targetTask.assignedTo : targetTask.assignedTo?._id) ||
        (Array.isArray(targetTask.assignedToIds) && targetTask.assignedToIds[0]) ||
        (Array.isArray(targetTask.assignees) && (targetTask.assignees[0]?._id || targetTask.assignees[0]?.employeeCode)) ||
        userKey;
      const assignedEmpName = targetTask.assignedToName ||
        (Array.isArray(targetTask.assignees) && targetTask.assignees[0]?.name) ||
        currentUser?.name ||
        'User';
      const isUserAdminOrHR = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr' || currentUser?.role === 'Administrator' || currentUser?.role === 'HR Manager' || isHRorAdmin(currentUser);
      const isForOtherEmployee = (isUserAdminOrHR || targetTask.assignedById === currentUser?._id) &&
        !isTaskAssignedToMe(targetTask) &&
        assignedEmpId &&
        String(assignedEmpId) !== String(userKey) &&
        String(assignedEmpId) !== String(currentUser?._id);
      const targetUserKey = isForOtherEmployee ? String(assignedEmpId) : String(userKey);
      lastTaskActionRef.current = { taskId: String(taskId), action: 'stop', at: now };

      const isMultiAssignee = (Array.isArray(targetTask.assignedToIds) && targetTask.assignedToIds.length > 1) ||
        (Array.isArray(targetTask.assignees) && targetTask.assignees.length > 1);
      const activeSnapMatches = activeTimer && (String(activeTimer.taskId) === String(taskId) || String(activeTimer._id) === String(taskId));
      const completerWorkerId = targetTask.activeWorkerId ||
        (activeSnapMatches ? activeTimer?.activeWorkerId : null) ||
        targetTask.lastWorkerId ||
        currentUser?._id;
      const completerObj = (employees || []).find(e =>
        String(e._id) === String(completerWorkerId) ||
        String(e.employeeCode) === String(completerWorkerId)
      ) || currentUser;
      const completerWorkerTimer = getWorkerTaskTimer(targetTask, completerObj);

      // 1. Prior accumulated seconds from closed sessions (baseline before this active run started)
      const baseAccumulated = isMultiAssignee
        ? Math.max(
            Number(completerWorkerTimer?.accumulatedSeconds) || 0,
            getWorkerDailySessionSeconds(targetTask, completerObj, todayStr)
          )
        : ((activeTimer && (String(activeTimer.taskId) === String(taskId) || String(activeTimer._id) === String(taskId)))
            ? (Number(activeTimer.accumulatedSeconds) || 0)
            : (Number(targetTask.accumulatedSeconds) || 0));

      // 2. Compute current session elapsed seconds strictly once
      let liveSessionElapsed = 0;
      const activeStartTs = (completerWorkerTimer?.timerRunning && completerWorkerTimer?.startedAt)
        ? Number(completerWorkerTimer.startedAt)
        : ((activeTimer && (String(activeTimer.taskId) === String(taskId) || String(activeTimer._id) === String(taskId)) && activeTimer.timerRunning && activeTimer.startedAt)
            ? Number(activeTimer.startedAt)
            : ((targetTask.timerRunning && targetTask.startedAt) ? Number(targetTask.startedAt) : 0));
      if (activeStartTs > 0 && activeStartTs <= now) {
        const effectiveStart = Math.max(activeStartTs, todayMidnightMs);
        liveSessionElapsed = Math.max(0, Math.floor((now - effectiveStart) / 1000));
      }

      // 3. True Total Duration: Base plus Live Session (Guaranteed 1x, Never Doubled)
      let durationSecs = baseAccumulated + liveSessionElapsed;
      if (durationSecs === 0) {
        durationSecs = Math.max(
          Number(targetTask.accumulatedSeconds) || 0,
          Number(targetTask.timerSeconds) || 0,
          Number(targetTask.durationSeconds) || 0
        );
      }
      let todayElapsedSecs = liveSessionElapsed;

      // ── STRICT CALENDAR-DAY ISOLATION ──
      // Calculate strictly what was worked TODAY vs PAST DAYS:
      let todaySessionSecs = 0;
      if (targetTask?.dailySessions && typeof targetTask.dailySessions === 'object' && targetTask.dailySessions[todayStr] !== undefined) {
        todaySessionSecs = (Number(targetTask.dailySessions[todayStr]) || 0) + todayElapsedSecs;
      } else if (targetTask?.timerRunning) {
        const baseSecs = Math.max(0, (Number(targetTask.todayWorkSeconds) || 0) - todayElapsedSecs);
        todaySessionSecs = baseSecs + todayElapsedSecs;
      } else if (targetTask.startDate === todayStr || (targetTask.createdAt && String(targetTask.createdAt).startsWith(todayStr))) {
        todaySessionSecs = Number(targetTask.todayWorkSeconds ?? targetTask.accumulatedTodaySeconds ?? durationSecs);
      } else {
        // Task created/worked on previous days and NOT run today has ZERO seconds today!
        todaySessionSecs = 0;
      }
      const durationToLogToday = Math.min(Number(todaySessionSecs) || 0, durationSecs);
      const pastDurationToArchive = Math.max(0, durationSecs - durationToLogToday);

      const allTimesheets = getCollection(KEYS.TIMESHEETS) || [];
      const updatedDailySessions = { ...(targetTask.dailySessions || {}) };

      // Archive Past Days Work (Sessions from yesterday / earlier days for single-assignee tasks)
      if (pastDurationToArchive > 0 && !isMultiAssignee) {
        let hasLoggedPastSession = false;

        // Check if dailySessions already partitioned past dates
        if (targetTask.dailySessions && typeof targetTask.dailySessions === 'object') {
          for (const [sessDate, sessSecs] of Object.entries(targetTask.dailySessions)) {
            if (sessDate !== todayStr && Number(sessSecs) > 0) {
              hasLoggedPastSession = true;
              updatedDailySessions[sessDate] = Number(sessSecs);
              const alreadyLoggedOnDate = allTimesheets
                .filter(ts => (String(ts.taskId) === String(targetTask._id || taskId) || (targetTask.taskCode && ts.taskCode === targetTask.taskCode)) && ts.date === sessDate)
                .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);
              const unloggedOnDate = Math.max(0, Number(sessSecs) - alreadyLoggedOnDate);
              if (unloggedOnDate > 0) {
                workService.stopTimer({
                  taskId: targetTask._id || taskId,
                  taskCode: targetTask.taskCode,
                  taskTitle: targetTask.title,
                  projectName: targetTask.projectName,
                  totalDurationSeconds: unloggedOnDate,
                  date: sessDate,
                  employeeId: assignedEmpId,
                  employeeCode: targetTask.assignedToCode || '',
                  employeeName: assignedEmpName,
                  memo: `Work session completed on ${sessDate}`
                }).catch(err => console.warn('Archive past date timesheet error:', err));
              }
            }
          }
        }

        // If dailySessions was empty or didn't capture past dates, attribute pastDurationToArchive to the task's past date
        if (!hasLoggedPastSession) {
          const pastDate = (targetTask.sessionDate && targetTask.sessionDate < todayStr)
            ? targetTask.sessionDate
            : (targetTask.startDate && targetTask.startDate < todayStr
              ? targetTask.startDate
              : (targetTask.createdAt ? targetTask.createdAt.split('T')[0] : ''));
          const effectivePastDate = (pastDate && pastDate < todayStr) ? pastDate : (() => {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            return getLocalDateString(y);
          })();

          updatedDailySessions[effectivePastDate] = pastDurationToArchive;
          const alreadyLoggedOnPastDate = allTimesheets
            .filter(ts => (String(ts.taskId) === String(targetTask._id || taskId) || (targetTask.taskCode && ts.taskCode === targetTask.taskCode)) && ts.date === effectivePastDate)
            .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);
          const unloggedPast = Math.max(0, pastDurationToArchive - alreadyLoggedOnPastDate);
          if (unloggedPast > 0) {
            workService.stopTimer({
              taskId: targetTask._id || taskId,
              taskCode: targetTask.taskCode,
              taskTitle: targetTask.title,
              projectName: targetTask.projectName,
              totalDurationSeconds: unloggedPast,
              date: effectivePastDate,
              employeeId: assignedEmpId,
              employeeCode: targetTask.assignedToCode || '',
              employeeName: assignedEmpName,
              memo: `Work session completed on ${effectivePastDate}`
            }).catch(() => {});
          }
        }
      }

      // Log Today's Work to Timesheets ONLY for the worker who actually completed/worked on the task today!
      const activeWorkerId = completerWorkerId;
      const workerObj = completerObj;
      const useActualWorker = Boolean(targetTask.activeWorkerId || targetTask.lastWorkerId || !isForOtherEmployee);
      const workerId = useActualWorker ? (workerObj?._id || userKey) : assignedEmpId;
      const workerCode = useActualWorker ? (workerObj?.employeeCode || '') : (targetTask.assignedToCode || '');
      const workerName = useActualWorker ? (workerObj?.name || currentUser?.name || 'User') : assignedEmpName;
      const workerKey = String(workerCode || workerId);

      let durationToLogForCompleter = 0;
      if (isMultiAssignee) {
        const prevWorkerToday = getWorkerDailySessionSeconds(targetTask, completerObj, todayStr);
        durationToLogForCompleter = prevWorkerToday + todayElapsedSecs;
      } else {
        durationToLogForCompleter = durationToLogToday;
      }

      const updatedAssigneeTimers = { ...(targetTask.assigneeTimers || {}) };
      for (const [k, v] of Object.entries(updatedAssigneeTimers)) {
        if (v && typeof v === 'object') {
          updatedAssigneeTimers[k] = {
            ...v,
            timerRunning: false,
            startedAt: null,
            pausedAt: v.timerRunning ? now : v.pausedAt,
            updatedAt: now
          };
        }
      }
      const updatedAssigneeSessions = { ...(targetTask.assigneeSessions || {}) };
      const updatedAssigneeHours = { ...(targetTask.assigneeHours || {}) };
      if (isMultiAssignee) {
        const workerLifetimeFinal = Math.max(baseAccumulated + liveSessionElapsed, durationToLogForCompleter);
        const completerTimerState = {
          ...(completerWorkerTimer || {}),
          timerRunning: false,
          startedAt: null,
          pausedAt: now,
          accumulatedSeconds: workerLifetimeFinal,
          todayWorkSeconds: durationToLogForCompleter,
          sessionDate: todayStr,
          workerId: String(workerId),
          workerName: String(workerName),
          updatedAt: now
        };
        updatedAssigneeTimers[workerKey] = completerTimerState;
        if (workerId && String(workerId) !== workerKey) {
          updatedAssigneeTimers[String(workerId)] = completerTimerState;
        }
        updatedAssigneeSessions[workerKey] = { ...(updatedAssigneeSessions[workerKey] || {}), [todayStr]: durationToLogForCompleter };
        if (workerId && String(workerId) !== workerKey) {
          updatedAssigneeSessions[String(workerId)] = { ...(updatedAssigneeSessions[String(workerId)] || {}), [todayStr]: durationToLogForCompleter };
        }
        updatedAssigneeHours[workerKey] = workerLifetimeFinal;
        if (workerId && String(workerId) !== workerKey) {
          updatedAssigneeHours[String(workerId)] = workerLifetimeFinal;
        }
      }

      if (durationToLogForCompleter > 0) {
        updatedDailySessions[todayStr] = durationToLogForCompleter;
        try {
          await workService.stopTimer({
            taskId: targetTask._id || taskId,
            taskCode: targetTask.taskCode,
            taskTitle: targetTask.title,
            projectName: targetTask.projectName,
            totalDurationSeconds: durationToLogForCompleter,
            date: todayStr,
            employeeId: workerId,
            employeeCode: workerCode,
            employeeName: workerName,
            memo: customMemo || `Completed task: ${targetTask.title}${isForOtherEmployee ? ` (completed by ${currentUser?.name || 'Admin'})` : ''}`
          });
        } catch (stopErr) {
          console.warn('Timesheet log error during task completion:', stopErr);
        }
      } else {
        updatedDailySessions[todayStr] = 0;
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
        hrService.sendHeartbeat({
          employeeId: targetUserKey,
          employeeCode: targetUserKey,
          activeTask: null
        }).catch(() => {});
      } catch (_) {}

      try {
        const raw = localStorage.getItem('ems_active_task_timer');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (String(parsed?.taskId || parsed?._id) === String(taskId)) {
            localStorage.removeItem('ems_active_task_timer');
          }
        }
      } catch {}

      const actorName = currentUser?.name || 'Administrator';
      const actorCode = currentUser?.employeeCode || '';
      const actorLabel = actorCode ? `${actorName} (${actorCode})` : actorName;

      broadcastSyncEvent(SYNC_EVENTS.TASK_COMPLETED, {
        taskId,
        empKey: targetUserKey,
        taskTitle: targetTask.title,
        durationSecs,
        completedBy: actorLabel
      });
      window.dispatchEvent(new CustomEvent('ems_task_timer_stopped', { detail: { taskId, userKey: targetUserKey } }));
      window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: { taskId, userKey: targetUserKey } }));

      const finalTaskDuration = isMultiAssignee
        ? getMultiAssigneeCombinedSeconds({
            ...targetTask,
            assigneeTimers: updatedAssigneeTimers,
            assigneeSessions: updatedAssigneeSessions,
            assigneeHours: updatedAssigneeHours
          }, now)
        : (durationSecs > 0
            ? durationSecs
            : Math.max(
                durationToLogToday,
                Number(targetTask.accumulatedSeconds) || 0,
                Number(targetTask.durationSeconds) || 0
              ));
      const hoursLoggedNum = +(finalTaskDuration / 3600).toFixed(2);
      const hoursLoggedFormatted = formatSeconds(finalTaskDuration);
      const completionHistory = {
        id: `hist_${Date.now()}_complete`,
        action: 'completed',
        title: 'Task Completed & Time Logged',
        timestamp: completedIso,
        performedBy: actorLabel,
        performedById: currentUser?._id,
        performedByCode: actorCode,
        details: `Task completed by ${actorLabel}${isForOtherEmployee ? ` (for ${assignedEmpName})` : ''}. Final duration logged: ${hoursLoggedFormatted} (${durationSecs}s)`
      };

      const updatedAll = allTasks.map(t => {
        if (String(t._id || t.id) === String(taskId)) {
          const hist = Array.isArray(t.history) ? [...t.history, completionHistory] : [completionHistory];
          return {
            ...t,
            status: 'completed',
            progress: 100,
            timerRunning: false,
            startedAt: null,
            activeWorkerId: null,
            activeWorkerName: null,
            activeWorkerAvatar: null,
            activeWorkerRole: null,
            activeUserId: null,
            activeUserName: null,
            timerSeconds: finalTaskDuration,
            durationSeconds: finalTaskDuration,
            accumulatedSeconds: finalTaskDuration,
            todayWorkSeconds: durationToLogForCompleter,
            accumulatedTodaySeconds: durationToLogForCompleter,
            dailySessions: updatedDailySessions,
            assigneeTimers: updatedAssigneeTimers,
            assigneeSessions: updatedAssigneeSessions,
            assigneeHours: updatedAssigneeHours,
            hoursLogged: hoursLoggedNum,
            hoursLoggedText: hoursLoggedFormatted,
            completedAt: completedIso,
            completedOn: todayStr,
            completedBy: actorLabel,
            completedByName: actorName,
            completedByCode: actorCode,
            completedById: currentUser?._id,
            lastActionBy: actorLabel,
            sessionDate: todayStr,
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
          startedAt: null,
          activeWorkerId: null,
          activeWorkerName: null,
          activeWorkerAvatar: null,
          activeWorkerRole: null,
          activeUserId: null,
          activeUserName: null,
          timerSeconds: finalTaskDuration,
          durationSeconds: finalTaskDuration,
          accumulatedSeconds: finalTaskDuration,
          todayWorkSeconds: durationToLogForCompleter,
          dailySessions: updatedDailySessions,
          assigneeTimers: updatedAssigneeTimers,
          assigneeSessions: updatedAssigneeSessions,
          assigneeHours: updatedAssigneeHours,
          hoursLogged: hoursLoggedNum,
          hoursLoggedText: hoursLoggedFormatted,
          completedAt: completedIso,
          completedOn: todayStr,
          completedBy: actorLabel,
          completedByName: actorName,
          completedByCode: actorCode,
          completedById: currentUser?._id,
          lastActionBy: actorLabel,
          sessionDate: todayStr,
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
            startedAt: null,
            activeWorkerId: null,
            activeWorkerName: null,
            activeWorkerAvatar: null,
            activeWorkerRole: null,
            activeUserId: null,
            activeUserName: null,
            timerSeconds: finalTaskDuration,
            durationSeconds: finalTaskDuration,
            accumulatedSeconds: finalTaskDuration,
            todayWorkSeconds: durationToLogForCompleter,
            accumulatedTodaySeconds: durationToLogForCompleter,
            dailySessions: updatedDailySessions,
            assigneeTimers: updatedAssigneeTimers,
            assigneeSessions: updatedAssigneeSessions,
            assigneeHours: updatedAssigneeHours,
            hoursLogged: hoursLoggedNum,
            hoursLoggedText: hoursLoggedFormatted,
            completedAt: completedIso,
            completedOn: todayStr,
            completedBy: actorLabel,
            completedByName: actorName,
            completedByCode: actorCode,
            completedById: currentUser?._id,
            lastActionBy: actorLabel,
            sessionDate: todayStr,
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
   * Dismiss a reminder banner without starting timer yet (Scoped per user so one user dismissing doesn't hide it for other assignees)
   */
  const dismissTaskReminder = async (taskId, userOverrideId) => {
    try {
      const activeUid = userOverrideId || currentUser?._id || currentUser?.employeeCode || 'global';
      alertedTaskIdsRef.current.add(String(taskId));
      const allTasks = getCollection(KEYS.TASKS) || [];
      const currentTask = allTasks.find(t => String(t._id || t.id) === String(taskId));
      const existingDismissedBy = Array.isArray(currentTask?.reminderDismissedBy) ? currentTask.reminderDismissedBy : (currentTask?.reminderDismissed ? ['global'] : []);
      const updatedDismissedBy = [...new Set([...existingDismissedBy, String(activeUid)])];

      const updatePayload = {
        snoozed: false,
        remindAt: null,
        reminderAlerted: true,
        reminderDismissed: true,
        reminderDismissedBy: updatedDismissedBy
      };
      await workService.updateTask(taskId, updatePayload);
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

  const updateTimesheet = async (id, entryData) => {
    try {
      const updated = await workService.updateTimesheet(id, entryData);
      const targetTaskId = updated?.taskId || entryData?.taskId;
      if (targetTaskId && entryData?.totalDurationSeconds !== undefined) {
        // Calculate the TRUE cumulative total across all timesheets for this task (preserves multi-day history)
        const allTs = getCollection(KEYS.TIMESHEETS) || [];
        const taskTimesheets = allTs.filter(ts => String(ts.taskId) === String(targetTaskId) || (ts.taskCode && ts.taskCode === updated?.taskCode));
        
        let totalTaskSecs = 0;
        let todaySecs = 0;
        const todayStr = getTodayStr();
        const dateSessions = {};

        taskTimesheets.forEach(ts => {
          const isThisEntry = String(ts._id) === String(id);
          const dur = isThisEntry ? Number(entryData.totalDurationSeconds) : Number(ts.totalDurationSeconds || 0);
          const entryDate = isThisEntry ? (entryData.date || ts.date) : ts.date;
          totalTaskSecs += dur;
          if (entryDate) {
            dateSessions[entryDate] = (dateSessions[entryDate] || 0) + dur;
          }
          if (entryDate === todayStr) {
            todaySecs += dur;
          }
        });

        // If target entry was newly modified and wasn't in local timesheets list yet:
        if (!taskTimesheets.some(ts => String(ts._id) === String(id))) {
          const dur = Number(entryData.totalDurationSeconds);
          totalTaskSecs += dur;
          const entryDate = entryData.date || todayStr;
          dateSessions[entryDate] = (dateSessions[entryDate] || 0) + dur;
          if (entryDate === todayStr) todaySecs += dur;
        }

        const hrsLoggedNum = +(totalTaskSecs / 3600).toFixed(2);
        const hrs = Math.floor(totalTaskSecs / 3600);
        const mins = Math.floor((totalTaskSecs % 3600) / 60);
        const hrsLoggedStr = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;

        try {
          await workService.updateTask(targetTaskId, {
            hoursLogged: hrsLoggedNum,
            hoursLoggedText: hrsLoggedStr,
            accumulatedSeconds: totalTaskSecs,
            timerSeconds: totalTaskSecs,
            durationSeconds: totalTaskSecs,
            ...(entryData.date === todayStr ? { todayWorkSeconds: todaySecs, liveTodaySeconds: todaySecs } : {}),
            dailySessions: dateSessions
          });
        } catch (_) {}
      }
      addToast('Timesheet entry updated successfully!', 'success');
      await loadWorkData();
      return updated;
    } catch (err) {
      addToast('Failed to update timesheet entry', 'error');
      throw err;
    }
  };

  const deleteTimesheet = async (id) => {
    try {
      const allTs = getCollection(KEYS.TIMESHEETS) || [];
      const entryToDelete = allTs.find(ts => String(ts._id) === String(id));
      await workService.deleteTimesheet(id);

      if (entryToDelete && (entryToDelete.taskId || entryToDelete.taskCode)) {
        const remainingTs = allTs.filter(ts => String(ts._id) !== String(id) && (String(ts.taskId) === String(entryToDelete.taskId) || (ts.taskCode && ts.taskCode === entryToDelete.taskCode)));
        const totalTaskSecs = remainingTs.reduce((sum, ts) => sum + (Number(ts.totalDurationSeconds) || 0), 0);
        const todayStr = getTodayStr();
        const todaySecs = remainingTs.filter(ts => ts.date === todayStr).reduce((sum, ts) => sum + (Number(ts.totalDurationSeconds) || 0), 0);
        const hrsLoggedNum = +(totalTaskSecs / 3600).toFixed(2);
        const hrs = Math.floor(totalTaskSecs / 3600);
        const mins = Math.floor((totalTaskSecs % 3600) / 60);
        const hrsLoggedStr = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;

        try {
          await workService.updateTask(entryToDelete.taskId, {
            hoursLogged: hrsLoggedNum,
            hoursLoggedText: hrsLoggedStr,
            accumulatedSeconds: totalTaskSecs,
            timerSeconds: totalTaskSecs,
            durationSeconds: totalTaskSecs,
            todayWorkSeconds: todaySecs,
            liveTodaySeconds: todaySecs
          });
        } catch (_) {}
      }

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
  const isEmployeeOnLeave = (empId, checkDate = getTodayStr()) => {
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
    startTaskTimer,
    resumeTaskTimer: startTaskTimer,
    pauseTaskTimer,
    stopTaskTimer,
    snoozeTask,
    resumeSnoozedTask,
    dismissTaskReminder,
    // Timesheet Methods
    logTimesheet,
    updateTimesheet,
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
    completeAndNextTask, deleteTask, startTaskTimer, pauseTaskTimer,
    stopTaskTimer, snoozeTask, resumeSnoozedTask, dismissTaskReminder,
    logTimesheet, updateTimesheet, deleteTimesheet, employees, currentUser,
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

export const useWork = () => {
  const context = useContext(WorkContext);
  return context || defaultWorkContext;
};

