/**
 * @file workService.js
 * @description Hybrid Data Service for Projects, Tasks, and Timesheets.
 * Connects to backend API with fallback to reactive localStorage engine.
 */

import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { API_BASE as API_BASE_URL } from '../../../shared/config/apiConfig';
import { getUserModulePermissions, isHRorAdmin, isProjectVisibleToUser } from '../../../shared/utils/permissionUtils';
import { matchesFilter, matchesAssignee, matchesProject, matchesSearch, matchesDateRange } from '../../../shared/utils/filterUtils';

let backendOnlineCache = null;
let lastCheckTime = 0;
let backendCheckPromise = null;
const CACHE_TTL_MS = 25000; // 25s cache to prevent repeated 500 error spam when backend is offline

const isBackendAvailable = async () => {
  const now = Date.now();
  if (backendOnlineCache !== null && (now - lastCheckTime < CACHE_TTL_MS)) {
    return backendOnlineCache;
  }
  if (backendCheckPromise) {
    return backendCheckPromise;
  }
  backendCheckPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      backendOnlineCache = res.ok;
    } catch {
      backendOnlineCache = false;
    } finally {
      lastCheckTime = Date.now();
      backendCheckPromise = null;
    }
    return backendOnlineCache;
  })();
  return backendCheckPromise;
};

const getLocalDateString = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatSecondsSafe = (secs) => {
  const s = Math.max(0, Number(secs) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const remSecs = s % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
};

const getAuthUser = () => {
  try {
    const s = localStorage.getItem('ems_auth_session');
    if (!s) return null;
    const parsed = JSON.parse(s);
    return parsed?.user || parsed;
  } catch (e) {
    return null;
  }
};

const getAuthHeaders = () => {
  const u = getAuthUser();
  if (u) {
    return {
      'x-user-id': String(u._id || u.id || u.employeeCode || u.email || ''),
      'x-user-email': String(u.email || ''),
      'x-user-code': String(u.employeeCode || ''),
      'x-user-role': String(u.systemRole || (u.isAdmin ? 'admin' : (u.department === 'Human Resources' ? 'hr' : 'team_member')))
    };
  }
  return {};
};

export const workService = {
  // ==========================================
  // 🏢 PROJECTS
  // ==========================================
  async getProjects(filters = {}) {
    if (await isBackendAvailable()) {
      try {
        const queryParams = new URLSearchParams();
        if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
        if (filters.category && filters.category !== 'all') queryParams.append('category', filters.category);
        if (filters.department && filters.department !== 'all') queryParams.append('department', filters.department);
        if (filters.search) queryParams.append('search', filters.search);

        const qs = queryParams.toString();
        const url = qs ? `${API_BASE_URL}/projects?${qs}` : `${API_BASE_URL}/projects`;
        const res = await fetch(url, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data)) {
            // Silently persist to local mirror without triggering recursive storage events
            localStorage.setItem(KEYS.PROJECTS, JSON.stringify(json.data));
            const authUser = getAuthUser();
            const isPrivileged = authUser && isHRorAdmin(authUser);
            const perms = getUserModulePermissions(authUser);
            const canViewAll = isPrivileged || perms?.viewAllProjects;
            if (!canViewAll && authUser) {
              return json.data.filter(p => isProjectVisibleToUser(p, authUser));
            }
            return json.data;
          }
        }
      } catch (err) {
        console.warn('Backend unavailable for projects, using localStorage:', err);
      }
    }

    // LocalStorage Fallback
    let list = getCollection(KEYS.PROJECTS) || [];
    const authUser = getAuthUser();
    const isPrivileged = authUser && isHRorAdmin(authUser);
    const perms = getUserModulePermissions(authUser);
    const canViewAll = isPrivileged || perms?.viewAllProjects;

    // Strict tenant isolation: regular employees can ONLY view projects assigned to them, created by them, or public company-wide
    if (!canViewAll && authUser) {
      list = list.filter(p => isProjectVisibleToUser(p, authUser));
    }
    if (filters.status && filters.status !== 'all') {
      list = list.filter(p => p.status === filters.status);
    }
    if (filters.category && filters.category !== 'all') {
      list = list.filter(p => p.category?.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.department && filters.department !== 'all') {
      list = list.filter(p => p.department?.toLowerCase() === filters.department.toLowerCase());
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.projectCode?.toLowerCase().includes(q) ||
        p.client?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async createProject(projectData) {
    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(projectData)
        });
        if (res.ok) {
          const json = await res.json();
          const createdPrj = json.data;
          // Synchronize to local mirror immediately
          const projects = getCollection(KEYS.PROJECTS) || [];
          const existingIdx = projects.findIndex(p => p._id === createdPrj._id || (p.projectCode && p.projectCode === createdPrj.projectCode));
          if (existingIdx >= 0) {
            projects[existingIdx] = createdPrj;
          } else {
            projects.unshift(createdPrj);
          }
          saveCollection(KEYS.PROJECTS, projects);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.PROJECTS } }));
          return createdPrj;
        }
      } catch (err) {
        console.warn('Backend project creation failed, using local storage:', err);
      }
    }

    const projects = getCollection(KEYS.PROJECTS) || [];
    const newProject = {
      _id: `prj_${Date.now()}`,
      ...projectData,
      createdAt: new Date().toISOString()
    };
    projects.unshift(newProject);
    saveCollection(KEYS.PROJECTS, projects);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.PROJECTS } }));
    return newProject;
  },

  async updateProject(id, updateData) {
    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(updateData)
        });
        if (res.ok) {
          const json = await res.json();
          const updatedPrj = json.data;
          const projects = getCollection(KEYS.PROJECTS) || [];
          const index = projects.findIndex(p => p._id === id || p.projectCode === id);
          if (index !== -1) {
            projects[index] = { ...projects[index], ...updatedPrj };
            saveCollection(KEYS.PROJECTS, projects);
            window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.PROJECTS } }));
          }
          return updatedPrj;
        }
      } catch (err) {
        console.warn('Backend project update failed, using local storage:', err);
      }
    }

    const projects = getCollection(KEYS.PROJECTS) || [];
    const index = projects.findIndex(p => p._id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updateData };
      saveCollection(KEYS.PROJECTS, projects);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.PROJECTS } }));
      return projects[index];
    }
    return null;
  },

  async deleteProject(id) {
    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const projects = getCollection(KEYS.PROJECTS) || [];
          const filtered = projects.filter(p => String(p._id || p.id) !== String(id) && p.projectCode !== id);
          saveCollection(KEYS.PROJECTS, filtered);

          // Also remove associated tasks locally
          const tasks = getCollection(KEYS.TASKS) || [];
          const remainingTasks = tasks.filter(t => String(t.projectId || t.project) !== String(id) && t.projectCode !== id);
          if (remainingTasks.length !== tasks.length) {
            saveCollection(KEYS.TASKS, remainingTasks);
            window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
          }

          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.PROJECTS } }));
          return true;
        }
      } catch (err) {
        console.warn('Backend project deletion failed, using local storage:', err);
      }
    }

    const projects = getCollection(KEYS.PROJECTS) || [];
    const filtered = projects.filter(p => String(p._id || p.id) !== String(id) && p.projectCode !== id);
    saveCollection(KEYS.PROJECTS, filtered);

    // Also remove associated tasks locally
    const tasks = getCollection(KEYS.TASKS) || [];
    const remainingTasks = tasks.filter(t => String(t.projectId || t.project) !== String(id) && t.projectCode !== id);
    if (remainingTasks.length !== tasks.length) {
      saveCollection(KEYS.TASKS, remainingTasks);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
    }

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.PROJECTS } }));
    return true;
  },

  // ==========================================
  // 📋 TASKS
  // ==========================================
  async getTasks(filters = {}) {
    if (await isBackendAvailable()) {
      try {
        const queryParams = new URLSearchParams();
        if (filters.projectId && filters.projectId !== 'all') queryParams.append('projectId', filters.projectId);
        if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
        if (filters.priority && filters.priority !== 'all') queryParams.append('priority', filters.priority);
        if (filters.assignedTo && filters.assignedTo !== 'all') queryParams.append('assignedTo', filters.assignedTo);
        if (filters.hideCompleted) queryParams.append('hideCompleted', 'true');
        if (filters.search) queryParams.append('search', filters.search);

        const qs = queryParams.toString();
        const url = qs ? `${API_BASE_URL}/tasks?${qs}` : `${API_BASE_URL}/tasks`;
        const res = await fetch(url, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data)) {
            // Authoritative remoteList from MongoDB Atlas (including deletions and reassignments)
            const localList = getCollection(KEYS.TASKS) || [];
            const remoteList = json.data;
            const localMap = new Map();
            localList.forEach(lt => {
              const id = String(lt._id || lt.id);
              if (id) localMap.set(id, lt);
            });

            // Map authoritative remote tasks, overlaying live ticking timer only if running locally
            const merged = remoteList.map(rt => {
              const id = String(rt._id || rt.id);
              const local = localMap.get(id);
              if (local) {
                const localTimerSecs = Number(local.timerSeconds) || 0;
                const remoteTimerSecs = Number(rt.timerSeconds) || 0;
                const localAccum = Number(local.accumulatedSeconds) || 0;
                const remoteAccum = Number(rt.accumulatedSeconds) || 0;
                const localHoursLogged = Number(local.hoursLogged) || 0;
                const remoteHoursLogged = Number(rt.hoursLogged) || 0;

                const isRemoteActive = Boolean(rt.timerRunning && rt.startedAt);
                const localStartedRecently = Boolean(local.timerRunning && local.startedAt && (Date.now() - Number(local.startedAt) < 4000));

                const effectiveRunning = isRemoteActive ? true : (localStartedRecently ? true : false);
                const effectiveStartedAt = isRemoteActive ? rt.startedAt : (localStartedRecently ? local.startedAt : null);
                // Invariant: Task timer seconds and accumulated seconds can never run backwards!
                const effectiveSecs = Math.max(localTimerSecs, remoteTimerSecs);
                const effectiveAccum = Math.max(localAccum, remoteAccum);
                const maxHours = Math.max(localHoursLogged, remoteHoursLogged, +(effectiveSecs / 3600).toFixed(2));

                return {
                  ...local,
                  ...rt,
                  timerRunning: effectiveRunning,
                  startedAt: effectiveStartedAt,
                  timerSeconds: effectiveSecs,
                  accumulatedSeconds: effectiveAccum,
                  hoursLogged: maxHours,
                  hoursLoggedText: maxHours > 0 ? (local.hoursLoggedText || `${maxHours}h`) : (local.hoursLoggedText || rt.hoursLoggedText || '0s'),
                  sessionDate: rt.sessionDate || local.sessionDate,
                  status: rt.status || local.status
                };
              }
              return rt;
            });

            // Preserve any pending local-only offline tasks (tsk_ prefix) not yet synced
            const remoteIds = new Set(remoteList.map(r => String(r._id || r.id)));
            const remoteCodes = new Set(remoteList.map(r => (r.taskCode || '').toLowerCase()).filter(Boolean));
            localList.forEach(lt => {
              const id = String(lt._id || lt.id);
              const code = (lt.taskCode || '').toLowerCase();
              const alreadyHasCode = code && remoteCodes.has(code);
              const alreadyHasSameTitleAndProject = remoteList.some(rt =>
                rt.title && lt.title && rt.title.trim().toLowerCase() === lt.title.trim().toLowerCase() &&
                String(rt.projectId || rt.project || '') === String(lt.projectId || lt.project || '')
              );
              if (id.startsWith('tsk_') && !remoteIds.has(id) && !alreadyHasCode && !alreadyHasSameTitleAndProject) {
                merged.push(lt);
              }
            });

            // Canonical task deduplication: ensure each task is unique by taskCode or ID
            const taskDedupeMap = new Map();
            merged.forEach(t => {
              const cKey = (t.taskCode && t.taskCode.trim())
                ? `code_${t.taskCode.trim().toLowerCase()}`
                : `id_${t._id || t.id}`;
              if (!taskDedupeMap.has(cKey)) {
                taskDedupeMap.set(cKey, t);
              } else {
                const existing = taskDedupeMap.get(cKey);
                const isExistingStub = String(existing._id || '').startsWith('tsk_');
                const isCurrentStub = String(t._id || '').startsWith('tsk_');
                const base = (!isCurrentStub && isExistingStub) ? t : existing;
                const other = (!isCurrentStub && isExistingStub) ? existing : t;
                taskDedupeMap.set(cKey, {
                  ...other,
                  ...base,
                  timerRunning: existing.timerRunning || t.timerRunning,
                  startedAt: existing.timerRunning ? existing.startedAt : t.startedAt,
                  timerSeconds: Math.max(Number(existing.timerSeconds) || 0, Number(t.timerSeconds) || 0),
                  accumulatedSeconds: Math.max(Number(existing.accumulatedSeconds) || 0, Number(t.accumulatedSeconds) || 0)
                });
              }
            });
            const deduplicatedMerged = Array.from(taskDedupeMap.values());

            localStorage.setItem(KEYS.TASKS, JSON.stringify(deduplicatedMerged));
            return deduplicatedMerged;
          }
        }
      } catch (err) {
        console.warn('Backend unavailable for tasks, using localStorage:', err);
      }
    }

    // LocalStorage Fallback
    let list = getCollection(KEYS.TASKS) || [];
    const authUser = getAuthUser();
    const isPrivileged = authUser && isHRorAdmin(authUser);
    const perms = getUserModulePermissions(authUser);
    const canViewAll = isPrivileged || perms?.viewAllTasks;

    // Strict tenant isolation: regular employees can ONLY view tasks assigned to or created by them unless granted viewAllTasks
    if (!canViewAll && authUser) {
      list = list.filter(t => {
        const uId = String(authUser._id || authUser.id || '').toLowerCase();
        const uCode = String(authUser.employeeCode || '').toLowerCase();
        const uName = String(authUser.name || '').trim().toLowerCase();

        const isDirectAssignee =
          (t.assignedToId && (String(t.assignedToId).toLowerCase() === uId || String(t.assignedToId).toLowerCase() === uCode)) ||
          (t.assignedToCode && String(t.assignedToCode).toLowerCase() === uCode) ||
          (t.assignedTo && (String(t.assignedTo).toLowerCase() === uId || String(t.assignedTo).toLowerCase() === uCode)) ||
          (t.assignedToName && t.assignedToName.trim().toLowerCase() === uName);

        const isMultiAssignee =
          (Array.isArray(t.assignedToIds) && t.assignedToIds.some(id => String(id).toLowerCase() === uId || String(id).toLowerCase() === uCode)) ||
          (Array.isArray(t.assignees) && t.assignees.some(a =>
            String(a._id).toLowerCase() === uId ||
            String(a.employeeCode).toLowerCase() === uCode ||
            (a.name && a.name.trim().toLowerCase() === uName)
          ));

        const isCreator =
          (t.assignedById && (String(t.assignedById).toLowerCase() === uId || String(t.assignedById).toLowerCase() === uCode)) ||
          (t.assignedByCode && String(t.assignedByCode).toLowerCase() === uCode) ||
          (t.assignedBy && (String(t.assignedBy).toLowerCase() === uId || t.assignedBy.trim().toLowerCase() === uName));

        return isDirectAssignee || isMultiAssignee || isCreator;
      });
    } else if (filters.assignedTo && filters.assignedTo !== 'all') {
      list = list.filter(t => matchesAssignee(t, filters.assignedTo));
    }

    if (filters.projectId && filters.projectId !== 'all') {
      list = list.filter(t => matchesProject(t, filters.projectId));
    }
    if (filters.status && filters.status !== 'all') {
      list = list.filter(t => matchesFilter(t.status, filters.status));
    } else if (filters.hideCompleted) {
      list = list.filter(t => t.status !== 'completed');
    }
    if (filters.priority && filters.priority !== 'all') {
      list = list.filter(t => matchesFilter(t.priority, filters.priority));
    }
    if (filters.assignedBy && filters.assignedBy !== 'all') {
      list = list.filter(t => matchesFilter(t.assignedById, filters.assignedBy) || matchesFilter(t.assignedBy, filters.assignedBy));
    }
    if (filters.search) {
      list = list.filter(t => matchesSearch(t, filters.search, [
        'title', 'taskCode', 'projectName', 'assignedToName', 'assignedBy', 'category', 'description'
      ]));
    }

    const today = getLocalDateString();
    return list.map(t => ({
      ...t,
      isOverdue: !!(t.dueDate && !t.hasNoDueDate && !t.isUntimed && t.dueDate < today && t.status !== 'completed')
    }));
  },

  async createTask(taskData) {
    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(taskData)
        });
        if (res.ok) {
          const json = await res.json();
          const createdTask = json.data;
          // Synchronize to local collection mirror immediately
          const tasks = getCollection(KEYS.TASKS) || [];
          const existingIdx = tasks.findIndex(t => t._id === createdTask._id || (t.taskCode && t.taskCode === createdTask.taskCode));
          if (existingIdx >= 0) {
            tasks[existingIdx] = createdTask;
          } else {
            tasks.unshift(createdTask);
          }
          saveCollection(KEYS.TASKS, tasks);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
          return createdTask;
        }
      } catch (err) {
        console.warn('Backend task creation failed, using local storage:', err);
      }
    }

    const tasks = getCollection(KEYS.TASKS) || [];
    const code = taskData.taskCode || `${taskData.projectCode || 'TSK'}-${tasks.length + 1}`;
    const nowIso = new Date().toISOString();
    const authUser = getAuthUser();

    // Initialize full chronological assignment & creation history
    const initialHistory = Array.isArray(taskData.history) && taskData.history.length > 0
      ? taskData.history
      : [{
          id: `hist_${Date.now()}_create`,
          action: 'created',
          title: 'Task Created & Assigned',
          timestamp: nowIso,
          performedBy: taskData.assignedBy || authUser?.name || 'Administrator',
          performedById: taskData.assignedById || authUser?._id || 'admin',
          assignedTo: taskData.assignedToName || 'Unassigned',
          details: `Task #${code} created and assigned to ${taskData.assignedToName || 'team members'} by ${taskData.assignedBy || authUser?.name || 'Administrator'}. (Due: ${taskData.hasNoDueDate ? 'No Due Date' : (taskData.dueDate || 'Open')})`,
          metadata: {
            priority: taskData.priority || 'medium',
            category: taskData.category || 'General',
            projectName: taskData.projectName || 'General Work',
            isPersonal: !!taskData.isPersonal
          }
        }];

    const newTask = {
      _id: `tsk_${Date.now()}`,
      ...taskData,
      taskCode: code,
      hoursLogged: taskData.hoursLogged || 0,
      hoursLoggedText: taskData.hoursLoggedText || '0s',
      timerRunning: false,
      timerSeconds: 0,
      history: initialHistory,
      createdAt: nowIso
    };
    tasks.unshift(newTask);
    saveCollection(KEYS.TASKS, tasks);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
    return newTask;
  },

  async updateTask(id, updateData) {
    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(updateData)
        });
        if (res.ok) {
          const json = await res.json();
          const updatedTask = json.data;
          const tasks = getCollection(KEYS.TASKS) || [];
          const index = tasks.findIndex(t => String(t._id || t.id) === String(id) || t.taskCode === id);
          if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updatedTask };
            saveCollection(KEYS.TASKS, tasks);
            window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
          }
          return updatedTask;
        }
      } catch (err) {
        console.warn('Backend task update failed, using local storage:', err);
      }
    }

    const tasks = getCollection(KEYS.TASKS) || [];
    const index = tasks.findIndex(t => String(t._id || t.id) === String(id) || t.taskCode === id);
    if (index !== -1) {
      const currentTask = tasks[index];
      const authUser = getAuthUser();
      const nowIso = new Date().toISOString();
      let newHistory = Array.isArray(currentTask.history) ? [...currentTask.history] : [];

      if (updateData.history) {
        newHistory = updateData.history;
      } else {
        // Track reassignment
        if (updateData.assignedToName && updateData.assignedToName !== currentTask.assignedToName) {
          newHistory.push({
            id: `hist_${Date.now()}_reassigned`,
            action: 'reassigned',
            title: 'Task Reassigned',
            timestamp: nowIso,
            performedBy: authUser?.name || 'Manager',
            performedById: authUser?._id,
            from: currentTask.assignedToName || 'Previous Assignee',
            to: updateData.assignedToName,
            details: `Task reassigned from ${currentTask.assignedToName || 'Previous Assignee'} to ${updateData.assignedToName}`
          });
        }
        // Track deadline / reschedule for future
        if (updateData.dueDate && updateData.dueDate !== currentTask.dueDate) {
          newHistory.push({
            id: `hist_${Date.now()}_rescheduled`,
            action: 'rescheduled',
            title: 'Task Rescheduled / Deadline Updated',
            timestamp: nowIso,
            performedBy: authUser?.name || 'User',
            performedById: authUser?._id,
            from: currentTask.dueDate || 'None',
            to: updateData.dueDate,
            details: `Deadline updated from ${currentTask.dueDate || 'No Due Date'} to ${updateData.dueDate}${updateData.rescheduleNote ? ` (${updateData.rescheduleNote})` : ''}`
          });
        }
        // Track status changes
        if (updateData.status && updateData.status !== currentTask.status) {
          newHistory.push({
            id: `hist_${Date.now()}_status`,
            action: 'status_changed',
            title: `Status: ${updateData.status.replace('_', ' ').toUpperCase()}`,
            timestamp: nowIso,
            performedBy: authUser?.name || 'User',
            performedById: authUser?._id,
            from: currentTask.status,
            to: updateData.status,
            details: `Status transitioned from ${currentTask.status} to ${updateData.status}`
          });
        }
      }

      tasks[index] = { ...currentTask, ...updateData, history: newHistory };
      saveCollection(KEYS.TASKS, tasks);
      return tasks[index];
    }
    return null;
  },

  async updateTaskStatus(id, status) {
    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/tasks/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          const json = await res.json();
          return json.data;
        }
      } catch (err) {
        console.warn('Backend task status update failed, using local storage:', err);
      }
    }

    const tasks = getCollection(KEYS.TASKS);
    const index = tasks.findIndex(t => t._id === id);
    if (index !== -1) {
      const currentTask = tasks[index];
      const authUser = getAuthUser();
      const nowIso = new Date().toISOString();
      const oldStatus = currentTask.status;

      const historyItem = {
        id: `hist_${Date.now()}_status`,
        action: 'status_changed',
        title: `Status: ${status.replace('_', ' ').toUpperCase()}`,
        timestamp: nowIso,
        performedBy: authUser?.name || 'User',
        performedById: authUser?._id,
        from: oldStatus,
        to: status,
        details: `Task status changed from ${oldStatus} to ${status}`
      };

      const newHistory = [...(Array.isArray(currentTask.history) ? currentTask.history : []), historyItem];

      tasks[index] = {
        ...currentTask,
        status,
        history: newHistory
      };

      if (status === 'completed') {
        tasks[index].completedOn = new Date().toISOString().split('T')[0];
        tasks[index].completedAt = nowIso;
        tasks[index].timerRunning = false;
      }
      saveCollection(KEYS.TASKS, tasks);
      return tasks[index];
    }
    return null;
  },

  async deleteTask(id) {
    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const tasks = getCollection(KEYS.TASKS) || [];
          const filtered = tasks.filter(t => String(t._id || t.id) !== String(id) && t.taskCode !== id);
          saveCollection(KEYS.TASKS, filtered);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
          return true;
        }
      } catch (err) {
        console.warn('Backend task delete failed, using local storage:', err);
      }
    }

    const tasks = getCollection(KEYS.TASKS) || [];
    const filtered = tasks.filter(t => String(t._id || t.id) !== String(id) && t.taskCode !== id);
    saveCollection(KEYS.TASKS, filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
    return true;
  },

  async purgeAllTasks() {
    if (await isBackendAvailable()) {
      try {
        await fetch(`${API_BASE_URL}/tasks/purge/all`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
      } catch (err) {
        console.warn('Backend purge failed, clearing local:', err);
      }
    }
    saveCollection(KEYS.TASKS, []);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
    return true;
  },

  // ==========================================
  // ⏱️ TIMESHEET & TRACKING
  // ==========================================
  async getTimesheets(filters = {}) {
    if (await isBackendAvailable()) {
      try {
        const queryParams = new URLSearchParams();
        if (filters.employeeId && filters.employeeId !== 'all') queryParams.append('employeeId', filters.employeeId);
        if (filters.projectId && filters.projectId !== 'all') queryParams.append('projectId', filters.projectId);
        if (filters.taskId && filters.taskId !== 'all') queryParams.append('taskId', filters.taskId);
        if (filters.date) queryParams.append('date', filters.date);
        if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
        if (filters.search) queryParams.append('search', filters.search);

        const qs = queryParams.toString();
        const url = qs ? `${API_BASE_URL}/timesheet?${qs}` : `${API_BASE_URL}/timesheet`;
        const res = await fetch(url, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data)) {
            const localTimesheets = getCollection(KEYS.TIMESHEETS) || [];
            const remoteTimesheets = json.data;
            const tsMap = new Map();

            const getTsCanonicalKey = (ts) => {
              const d = ts.date || (ts.createdAt ? String(ts.createdAt).split('T')[0] : '');
              const t = String(ts.taskId || ts.taskCode || ts.taskTitle || ts._id || '');
              const e = String(ts.employeeId || ts.employeeCode || ts.employee || '');
              return `${d}_${t}_${e}`.toLowerCase();
            };

            localTimesheets.forEach(lts => {
              const cKey = getTsCanonicalKey(lts);
              if (cKey) tsMap.set(cKey, lts);
            });
            remoteTimesheets.forEach(ts => {
              const cKey = getTsCanonicalKey(ts);
              if (cKey) {
                const existing = tsMap.get(cKey);
                if (existing) {
                  // Invariant: Timesheet duration can never decrease due to stale remote fetches
                  const localSecs = Number(existing.totalDurationSeconds) || 0;
                  const remoteSecs = Number(ts.totalDurationSeconds) || 0;
                  const maxSecs = Math.max(localSecs, remoteSecs);
                  tsMap.set(cKey, {
                    ...existing,
                    ...ts,
                    totalDurationSeconds: maxSecs,
                    totalDurationText: maxSecs > 0 ? (maxSecs === localSecs ? existing.totalDurationText : ts.totalDurationText) : ts.totalDurationText
                  });
                } else {
                  tsMap.set(cKey, ts);
                }
              }
            });
            const merged = Array.from(tsMap.values());
            if (merged.length > 0) {
              localStorage.setItem(KEYS.TIMESHEETS, JSON.stringify(merged));
              window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TIMESHEETS } }));
            }

            // Return remote list (already filtered by backend) or apply fallback filters
            let filteredRemote = remoteTimesheets;
            if (filters.employeeId && filters.employeeId !== 'all') {
              filteredRemote = filteredRemote.filter(ts =>
                matchesFilter(ts.employeeId, filters.employeeId) ||
                matchesFilter(ts.employee, filters.employeeId) ||
                matchesFilter(ts.employeeCode, filters.employeeId) ||
                matchesFilter(ts.employeeName, filters.employeeId)
              );
            }
            if (filters.projectId && filters.projectId !== 'all') {
              filteredRemote = filteredRemote.filter(ts => matchesProject(ts, filters.projectId));
            }
            if (filters.status && filters.status !== 'all') {
              filteredRemote = filteredRemote.filter(ts => matchesFilter(ts.status, filters.status));
            }
            if (filters.date) {
              filteredRemote = filteredRemote.filter(ts => matchesDateRange(ts.date, filters.date, filters.date));
            }
            if (filters.search) {
              filteredRemote = filteredRemote.filter(ts => matchesSearch(ts, filters.search, [
                'taskCode', 'taskTitle', 'projectName', 'employeeName', 'memo', 'projectCode'
              ]));
            }
            return filteredRemote;
          }
        }
      } catch (err) {
        console.warn('Backend timesheet fetch failed, using local storage:', err);
      }
    }

    // LocalStorage Fallback
    let list = getCollection(KEYS.TIMESHEETS) || [];
    const authUser = getAuthUser();
    const isPrivileged = authUser && (authUser.isAdmin || authUser.systemRole === 'admin' || authUser.systemRole === 'hr' || authUser.role === 'Administrator' || authUser.role === 'HR Manager');

    // Strict tenant isolation: regular employees can ONLY view their own personal timesheets
    if (!isPrivileged && authUser) {
      list = list.filter(ts =>
        ts.employeeId === authUser._id ||
        ts.employee === authUser._id ||
        ts.employeeId === authUser.employeeCode ||
        ts.employee === authUser.employeeCode ||
        (ts.employeeName && authUser.name && ts.employeeName.toLowerCase() === authUser.name.toLowerCase())
      );
    } else if (filters.employeeId && filters.employeeId !== 'all') {
      list = list.filter(ts =>
        matchesFilter(ts.employeeId, filters.employeeId) ||
        matchesFilter(ts.employee, filters.employeeId) ||
        matchesFilter(ts.employeeCode, filters.employeeId) ||
        matchesFilter(ts.employeeName, filters.employeeId)
      );
    }

    if (filters.projectId && filters.projectId !== 'all') {
      list = list.filter(ts => matchesProject(ts, filters.projectId));
    }
    if (filters.taskId && filters.taskId !== 'all') {
      list = list.filter(ts => matchesFilter(ts.taskId, filters.taskId) || matchesFilter(ts.task, filters.taskId) || matchesFilter(ts.taskCode, filters.taskId));
    }
    if (filters.date) {
      list = list.filter(ts => matchesDateRange(ts.date, filters.date, filters.date));
    }
    if (filters.status && filters.status !== 'all') {
      list = list.filter(ts => matchesFilter(ts.status, filters.status));
    }
    if (filters.search) {
      list = list.filter(ts => matchesSearch(ts, filters.search, [
        'taskTitle', 'projectName', 'employeeName', 'memo', 'taskCode', 'projectCode'
      ]));
    }
    return list;
  },

  async createTimesheet(entryData) {
    const authUser = getAuthUser();
    const enrichedData = {
      ...entryData,
      employeeId: entryData.employeeId || authUser?._id || authUser?.employeeCode || '',
      employeeCode: entryData.employeeCode || authUser?.employeeCode || '',
      employeeName: entryData.employeeName || authUser?.name || 'Employee'
    };

    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/timesheet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(enrichedData)
        });
        if (res.ok) {
          const json = await res.json();
          const timesheets = getCollection(KEYS.TIMESHEETS) || [];
          const idx = timesheets.findIndex(t =>
            t._id === json.data._id ||
            (t.date === json.data.date &&
              (String(t.taskId) === String(json.data.taskId) || (json.data.taskCode && t.taskCode === json.data.taskCode)))
          );
          if (idx !== -1) timesheets[idx] = json.data;
          else timesheets.unshift(json.data);
          saveCollection(KEYS.TIMESHEETS, timesheets);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TIMESHEETS } }));
          return json.data;
        }
      } catch (err) {
        console.warn('Backend timesheet creation failed, using local storage:', err);
      }
    }

    const timesheets = getCollection(KEYS.TIMESHEETS) || [];
    const targetDate = entryData.date || getLocalDateString();
    const durationSecs = Number(entryData.totalDurationSeconds) || 0;
    const targetEmpId = String(enrichedData.employeeId || '');

    // Check if a timesheet for this task on this date already exists
    const existingIdx = timesheets.findIndex(ts => {
      if (ts.date !== targetDate) return false;
      const isTaskMatch = (entryData.taskId && String(ts.taskId) === String(entryData.taskId)) ||
        (entryData.taskCode && ts.taskCode === entryData.taskCode) ||
        (entryData.taskTitle && ts.taskTitle === entryData.taskTitle);
      if (!isTaskMatch) return false;
      if (!targetEmpId) return true;
      const tsEmp = String(ts.employeeId || ts.employeeCode || ts.employee || '');
      const entEmp = String(enrichedData.employeeId || enrichedData.employeeCode || targetEmpId);
      if (tsEmp === entEmp) return true;
      if (ts.employeeName && enrichedData.employeeName && ts.employeeName.toLowerCase().trim() === enrichedData.employeeName.toLowerCase().trim()) return true;
      return false;
    });

    let savedEntry = null;
    if (existingIdx !== -1) {
      const effectiveDuration = Math.max(Number(timesheets[existingIdx].totalDurationSeconds) || 0, durationSecs);
      timesheets[existingIdx] = {
        ...timesheets[existingIdx],
        ...entryData,
        totalDurationSeconds: effectiveDuration,
        totalDurationText: entryData.totalDurationText || formatSecondsSafe(effectiveDuration),
        updatedAt: new Date().toISOString()
      };
      savedEntry = timesheets[existingIdx];
    } else {
      savedEntry = {
        _id: `time_${Date.now()}`,
        ...enrichedData,
        totalDurationSeconds: durationSecs,
        totalDurationText: entryData.totalDurationText || formatSecondsSafe(durationSecs),
        date: targetDate,
        createdAt: new Date().toISOString()
      };
      timesheets.unshift(savedEntry);
    }
    saveCollection(KEYS.TIMESHEETS, timesheets);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TIMESHEETS } }));

    // Accurately recalculate task logged hours strictly by summing all timesheets for this task
    if (entryData.taskId) {
      const tasks = getCollection(KEYS.TASKS) || [];
      const tIndex = tasks.findIndex(t => String(t._id || t.id) === String(entryData.taskId) || (entryData.taskCode && t.taskCode === entryData.taskCode));
      if (tIndex !== -1) {
        const allTaskTimesheets = timesheets.filter(ts => String(ts.taskId) === String(tasks[tIndex]._id || tasks[tIndex].id) || (tasks[tIndex].taskCode && ts.taskCode === tasks[tIndex].taskCode));
        const totalSecs = allTaskTimesheets.reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        tasks[tIndex].hoursLogged = Number((totalSecs / 3600).toFixed(2));
        tasks[tIndex].hoursLoggedText = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
        saveCollection(KEYS.TASKS, tasks);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      }
    }

    return savedEntry;
  },

  async stopTimer(stopData) {
    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/timesheet/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(stopData)
        });
        if (res.ok) {
          const json = await res.json();
          const timesheets = getCollection(KEYS.TIMESHEETS) || [];
          const idx = timesheets.findIndex(t => t._id === json.data._id || (t.date === json.data.date && String(t.taskId) === String(json.data.taskId)));
          if (idx !== -1) timesheets[idx] = json.data;
          else timesheets.unshift(json.data);
          saveCollection(KEYS.TIMESHEETS, timesheets);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TIMESHEETS } }));
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
          return json.data;
        }
      } catch (err) {
        console.warn('Backend timer stop failed, using local storage:', err);
      }
    }

    // Local calculation & saving
    const { taskId, totalDurationSeconds = 0, memo, startTime, endTime } = stopData;
    const targetDate = stopData.date || getLocalDateString();
    const tasks = getCollection(KEYS.TASKS) || [];
    const task = tasks.find(t => String(t._id || t.id) === String(taskId) || (stopData.taskCode && t.taskCode === stopData.taskCode));

    const hrs = String(Math.floor(totalDurationSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalDurationSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalDurationSeconds % 60).padStart(2, '0');
    const durationText = `${hrs}:${mins}:${secs}`;

    const authUser = getAuthUser();
    const timesheets = getCollection(KEYS.TIMESHEETS) || [];
    const targetEmpId = String(stopData.employeeId || authUser?._id || authUser?.employeeCode || task?.assignedToId || '');

    const existingIdx = timesheets.findIndex(ts => {
      if (ts.date !== targetDate) return false;
      const isTaskMatch = (String(ts.taskId) === String(taskId)) ||
        (task?.taskCode && ts.taskCode === task.taskCode) ||
        (stopData.taskCode && ts.taskCode === stopData.taskCode) ||
        (task?.title && ts.taskTitle === task.title);
      if (!isTaskMatch) return false;
      if (!targetEmpId) return true;
      const tsEmp = String(ts.employeeId || ts.employeeCode || ts.employee || '');
      if (tsEmp === targetEmpId) return true;
      if (stopData.employeeCode && tsEmp === String(stopData.employeeCode)) return true;
      if (ts.employeeName && stopData.employeeName && ts.employeeName.toLowerCase().trim() === stopData.employeeName.toLowerCase().trim()) return true;
      return false;
    });

    let finalLog = null;
    if (existingIdx !== -1) {
      const priorSecs = Number(timesheets[existingIdx].totalDurationSeconds) || 0;
      // Invariant: Never allow logged time to decrease! Take the maximum of prior logged vs new cumulative duration
      const effectiveSecs = Math.max(priorSecs, totalDurationSeconds);
      const eHrs = String(Math.floor(effectiveSecs / 3600)).padStart(2, '0');
      const eMins = String(Math.floor((effectiveSecs % 3600) / 60)).padStart(2, '0');
      const eSecs = String(effectiveSecs % 60).padStart(2, '0');
      const effectiveDurationText = `${eHrs}:${eMins}:${eSecs}`;

      timesheets[existingIdx] = {
        ...timesheets[existingIdx],
        totalDurationSeconds: effectiveSecs,
        totalDurationText: effectiveDurationText,
        endTime: endTime || new Date().toTimeString().split(' ')[0],
        memo: memo || timesheets[existingIdx].memo,
        status: 'stopped',
        updatedAt: new Date().toISOString()
      };
      finalLog = timesheets[existingIdx];
    } else {
      finalLog = {
        _id: `time_${Date.now()}`,
        taskId: task?._id || taskId,
        taskCode: task?.taskCode || stopData.taskCode || '',
        taskTitle: task?.title || stopData.taskTitle || 'Tracked Session',
        projectId: task?.projectId || '',
        employeeId: targetEmpId,
        employeeCode: stopData.employeeCode || authUser?.employeeCode || '',
        employeeName: stopData.employeeName || authUser?.name || task?.assignedToName || 'Team Member',
        employeeAvatar: authUser?.avatar || task?.assignedToAvatar || '',
        employeeRole: authUser?.role || task?.assignedToRole || '',
        date: targetDate,
        startTime: startTime || new Date(Date.now() - totalDurationSeconds * 1000).toTimeString().split(' ')[0],
        endTime: endTime || new Date().toTimeString().split(' ')[0],
        totalDurationSeconds,
        totalDurationText: durationText,
        memo: memo || 'Work session saved',
        status: 'stopped',
        createdAt: new Date().toISOString()
      };
      timesheets.unshift(finalLog);
    }
    saveCollection(KEYS.TIMESHEETS, timesheets);

    if (task) {
      task.timerRunning = false;
      const effectiveTaskSecs = Math.max(
        Number(task.accumulatedSeconds) || 0,
        Number(task.timerSeconds) || 0,
        Number(task.durationSeconds) || 0,
        totalDurationSeconds
      );
      task.timerSeconds = effectiveTaskSecs;
      task.durationSeconds = effectiveTaskSecs;
      task.accumulatedSeconds = effectiveTaskSecs;

      const allTaskTimesheets = timesheets.filter(ts => String(ts.taskId) === String(task._id || task.id) || (task.taskCode && ts.taskCode === task.taskCode));
      const dateMap = {};
      allTaskTimesheets.forEach(ts => {
        const d = ts.date || 'default';
        const s = Number(ts.totalDurationSeconds) || 0;
        dateMap[d] = Math.max(dateMap[d] || 0, s);
      });
      const uniqueDaySecs = Object.values(dateMap).reduce((s, val) => s + val, 0);
      const totalSecs = Math.max(effectiveTaskSecs, uniqueDaySecs);
      const totalHrs = Math.floor(totalSecs / 3600);
      const totalMins = Math.floor((totalSecs % 3600) / 60);
      task.hoursLogged = Number((totalSecs / 3600).toFixed(2));
      task.hoursLoggedText = `${String(totalHrs).padStart(2, '0')}h ${String(totalMins).padStart(2, '0')}m`;
      saveCollection(KEYS.TASKS, tasks);
    }

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TIMESHEETS } }));
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
    return finalLog;
  },

  async deleteTimesheet(id) {
    if (await isBackendAvailable()) {
      try {
        const res = await fetch(`${API_BASE_URL}/timesheet/${id}`, { method: 'DELETE' });
        if (res.ok) return true;
      } catch (err) {
        console.warn('Backend timesheet delete failed, using local storage:', err);
      }
    }

    const timesheets = getCollection(KEYS.TIMESHEETS);
    const filtered = timesheets.filter(t => t._id !== id);
    saveCollection(KEYS.TIMESHEETS, filtered);
    return true;
  }
};
