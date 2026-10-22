/**
 * @file workService.js
 * @description Hybrid Data Service for Projects, Tasks, and Timesheets.
 * Connects to backend API with fallback to reactive localStorage engine.
 */

import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { API_BASE as API_BASE_URL } from '../../../shared/config/apiConfig';
import { getUserModulePermissions, isHRorAdmin } from '../../../shared/utils/permissionUtils';

let backendOnlineCache = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 25000; // 25s cache to prevent repeated 500 error spam when backend is offline

const isBackendAvailable = async () => {
  const now = Date.now();
  if (backendOnlineCache !== null && (now - lastCheckTime < CACHE_TTL_MS)) {
    return backendOnlineCache;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    backendOnlineCache = res.ok;
  } catch {
    backendOnlineCache = false;
  }
  lastCheckTime = now;
  return backendOnlineCache;
};

const getLocalDateString = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getAuthUser = () => {
  try {
    const s = localStorage.getItem('ems_auth_session');
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
};

const getAuthHeaders = () => {
  const u = getAuthUser();
  if (u) {
    return {
      'x-user-id': u._id || u.employeeCode || '',
      'x-user-role': u.systemRole || (u.isAdmin ? 'admin' : (u.department === 'Human Resources' ? 'hr' : 'team_member'))
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
            // Persist to local mirror so projects survive offline/refreshes cleanly
            saveCollection(KEYS.PROJECTS, json.data);
            return json.data;
          }
        }
      } catch (err) {
        console.warn('Backend unavailable for projects, using localStorage:', err);
      }
    }

    // LocalStorage Fallback
    let list = getCollection(KEYS.PROJECTS) || [];
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
            saveCollection(KEYS.TASKS, json.data);
            return json.data;
          }
        }
      } catch (err) {
        console.warn('Backend unavailable for tasks, using localStorage:', err);
      }
    }

    // LocalStorage Fallback
    let list = getCollection(KEYS.TASKS);
    const authUser = getAuthUser();
    const isPrivileged = authUser && isHRorAdmin(authUser);
    const perms = getUserModulePermissions(authUser);
    const canViewAll = isPrivileged || perms?.viewAllTasks;

    // Strict tenant isolation: regular employees can ONLY view tasks assigned to or created by them unless granted viewAllTasks
    if (!canViewAll && authUser) {
      list = list.filter(t => {
        const isDirectAssignee =
          t.assignedToId === authUser._id ||
          t.assignedTo === authUser._id ||
          t.assignedToId === authUser.employeeCode ||
          t.assignedTo === authUser.employeeCode ||
          (t.assignedToName && authUser.name && t.assignedToName.toLowerCase() === authUser.name.toLowerCase());
        const isMultiAssignee =
          (Array.isArray(t.assignedToIds) && (t.assignedToIds.includes(authUser._id) || t.assignedToIds.includes(authUser.employeeCode))) ||
          (Array.isArray(t.assignees) && t.assignees.some(a => a._id === authUser._id || a.employeeCode === authUser.employeeCode || (a.name && authUser.name && a.name.toLowerCase() === authUser.name.toLowerCase())));
        const isCreator =
          t.assignedById === authUser._id ||
          t.assignedBy === authUser._id ||
          t.assignedById === authUser.employeeCode ||
          (t.assignedBy && authUser.name && t.assignedBy.toLowerCase() === authUser.name.toLowerCase());
        return isDirectAssignee || isMultiAssignee || isCreator;
      });
    } else if (filters.assignedTo && filters.assignedTo !== 'all') {
      list = list.filter(t =>
        t.assignedToId === filters.assignedTo ||
        t.assignedTo === filters.assignedTo ||
        (Array.isArray(t.assignedToIds) && t.assignedToIds.includes(filters.assignedTo)) ||
        (Array.isArray(t.assignees) && t.assignees.some(a => a._id === filters.assignedTo || a.employeeCode === filters.assignedTo))
      );
    }

    if (filters.projectId && filters.projectId !== 'all') {
      list = list.filter(t => t.projectId === filters.projectId || t.projectCode === filters.projectId);
    }
    if (filters.status && filters.status !== 'all') {
      list = list.filter(t => t.status === filters.status);
    } else if (filters.hideCompleted) {
      list = list.filter(t => t.status !== 'completed');
    }
    if (filters.priority && filters.priority !== 'all') {
      list = list.filter(t => t.priority === filters.priority);
    }
    if (filters.assignedBy && filters.assignedBy !== 'all') {
      list = list.filter(t => t.assignedById === filters.assignedBy || t.assignedBy === filters.assignedBy);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.taskCode?.toLowerCase().includes(q) ||
        t.projectName?.toLowerCase().includes(q) ||
        t.assignedToName?.toLowerCase().includes(q)
      );
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

    const tasks = getCollection(KEYS.TASKS);
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
          if (Array.isArray(json.data) && json.data.length > 0) {
            saveCollection(KEYS.TIMESHEETS, json.data);
          }
          return json.data;
        }
      } catch (err) {
        console.warn('Backend timesheet fetch failed, using local storage:', err);
      }
    }

    // LocalStorage Fallback
    let list = getCollection(KEYS.TIMESHEETS);
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
      list = list.filter(ts => ts.employeeId === filters.employeeId || ts.employee === filters.employeeId || ts.employeeCode === filters.employeeId);
    }

    if (filters.projectId && filters.projectId !== 'all') {
      list = list.filter(ts => ts.projectId === filters.projectId || ts.project === filters.projectId);
    }
    if (filters.taskId && filters.taskId !== 'all') {
      list = list.filter(ts => ts.taskId === filters.taskId || ts.task === filters.taskId);
    }
    if (filters.date) {
      list = list.filter(ts => ts.date === filters.date);
    }
    if (filters.status && filters.status !== 'all') {
      list = list.filter(ts => ts.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(ts =>
        ts.taskTitle?.toLowerCase().includes(q) ||
        ts.projectName?.toLowerCase().includes(q) ||
        ts.employeeName?.toLowerCase().includes(q) ||
        ts.memo?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async createTimesheet(entryData) {
    const authUser = getAuthUser();
    const enrichedData = {
      ...entryData,
      employeeId: entryData.employeeId || authUser?._id || authUser?.employeeCode || '',
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
          const timesheets = getCollection(KEYS.TIMESHEETS);
          const idx = timesheets.findIndex(t => t._id === json.data._id);
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

    const timesheets = getCollection(KEYS.TIMESHEETS);
    const newEntry = {
      _id: `time_${Date.now()}`,
      ...entryData,
      createdAt: new Date().toISOString()
    };
    timesheets.unshift(newEntry);
    saveCollection(KEYS.TIMESHEETS, timesheets);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TIMESHEETS } }));

    // Update task logged hours
    if (entryData.taskId) {
      const tasks = getCollection(KEYS.TASKS);
      const tIndex = tasks.findIndex(t => t._id === entryData.taskId);
      if (tIndex !== -1) {
        const durationHours = (entryData.totalDurationSeconds || 0) / 3600;
        tasks[tIndex].hoursLogged = Number(((tasks[tIndex].hoursLogged || 0) + durationHours).toFixed(2));
        const totalSecs = Math.round(tasks[tIndex].hoursLogged * 3600);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        tasks[tIndex].hoursLoggedText = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
        saveCollection(KEYS.TASKS, tasks);
      }
    }

    return newEntry;
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
          const timesheets = getCollection(KEYS.TIMESHEETS);
          const idx = timesheets.findIndex(t => t._id === json.data._id);
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
    const { taskId, totalDurationSeconds, memo, startTime, endTime } = stopData;
    const tasks = getCollection(KEYS.TASKS);
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      task.timerRunning = false;
      task.timerSeconds = totalDurationSeconds;
      task.durationSeconds = totalDurationSeconds;
      const hoursAdded = totalDurationSeconds / 3600;
      task.hoursLogged = Number(((task.hoursLogged || 0) + hoursAdded).toFixed(2));
      const totalSecs = Math.round(task.hoursLogged * 3600);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      task.hoursLoggedText = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
      saveCollection(KEYS.TASKS, tasks);
    }

    const hrs = String(Math.floor(totalDurationSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalDurationSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalDurationSeconds % 60).padStart(2, '0');
    const durationText = `${hrs}:${mins}:${secs}`;

    const authUser = getAuthUser();
    const timesheets = getCollection(KEYS.TIMESHEETS);
    const newLog = {
      _id: `time_${Date.now()}`,
      taskId: task?._id || taskId,
      taskCode: task?.taskCode || stopData.taskCode || '',
      taskTitle: task?.title || stopData.taskTitle || 'Tracked Session',
      projectId: task?.projectId || '',
      employeeId: stopData.employeeId || authUser?._id || authUser?.employeeCode || task?.assignedToId || '',
      employeeName: stopData.employeeName || authUser?.name || task?.assignedToName || 'Team Member',
      employeeAvatar: authUser?.avatar || task?.assignedToAvatar || '',
      employeeRole: authUser?.role || task?.assignedToRole || '',
      date: stopData.date || getLocalDateString(),
      startTime: startTime || new Date(Date.now() - totalDurationSeconds * 1000).toTimeString().split(' ')[0],
      endTime: endTime || new Date().toTimeString().split(' ')[0],
      totalDurationSeconds,
      totalDurationText: durationText,
      memo: memo || 'Work session saved',
      status: 'stopped',
      createdAt: new Date().toISOString()
    };
    timesheets.unshift(newLog);
    saveCollection(KEYS.TIMESHEETS, timesheets);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TIMESHEETS } }));
    return newLog;
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
