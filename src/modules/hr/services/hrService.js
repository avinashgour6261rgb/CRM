/**
 * @file hrService.js
 * @description Centralized Enterprise Data Layer for HRMS & Employee Management.
 * 
 * ARCHITECTURAL DESIGN:
 * 1. Hybrid Backend Engine: Calls real Express/MongoDB `/api/*` endpoints when server is online.
 * 2. High-Availability Fallback: Automatically falls back to LocalStorage engine if backend is offline.
 * 3. Dynamic Scalability: Adding new employees or modifying records instantly updates all HR modules
 *    (Dashboard, Leaves, Attendance Matrix, Holidays, Appreciations) via reactive state.
 */

import { getCollection, saveCollection, KEYS, initStorage } from '../../../shared/services/storageService';
import { API_BASE } from '../../../shared/config/apiConfig';
import { holidaySyncService } from './holidaySyncService';

// Ensure storage is initialized
initStorage();

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
      'x-user-id': String(u._id || u.id || u.employeeCode || u.email || ''),
      'x-user-email': String(u.email || ''),
      'x-user-code': String(u.employeeCode || ''),
      'x-user-role': String(u.systemRole || (u.isAdmin ? 'admin' : (u.department === 'Human Resources' ? 'hr' : 'team_member')))
    };
  }
  return {};
};

let hrBackendOnline = null;
let lastHrCheckTime = 0;
const HR_CACHE_TTL = 5000;
let healthCheckPromise = null;

async function checkHrBackendOnline() {
  const now = Date.now();
  if (hrBackendOnline === true && (now - lastHrCheckTime < HR_CACHE_TTL)) {
    return true;
  }
  if (healthCheckPromise) {
    return await healthCheckPromise;
  }

  healthCheckPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const json = await res.json().catch(() => null);
        hrBackendOnline = !!(json && (json.status === 'online' || json.status === 'ok' || json.success));
      } else {
        hrBackendOnline = false;
      }
    } catch {
      hrBackendOnline = false;
    }
    lastHrCheckTime = Date.now();
    healthCheckPromise = null;
    return hrBackendOnline;
  })();

  return await healthCheckPromise;
}

/**
 * Safe fetch helper that attempts backend API first, falling back to local storage
 */
async function fetchWithFallback(url, options, fallbackFn) {
  const method = (options?.method || 'GET').toUpperCase();
  const isReadOp = method === 'GET';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options?.headers || {})
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');

    if (res.ok && isJson) {
      hrBackendOnline = true;
      lastHrCheckTime = Date.now();
      const json = await res.json().catch(() => null);
      if (json !== null) {
        return json.data !== undefined ? json.data : json;
      }
    } else {
      const errJson = isJson ? await res.json().catch(() => null) : null;
      // For mutation requests (POST/PUT/DELETE), propagate validation/conflict errors to user
      if (!isReadOp && errJson?.message) {
        if (res.status === 409 || res.status === 400 || res.status === 422) {
          throw new Error(errJson.message);
        }
      }
      hrBackendOnline = false;
      lastHrCheckTime = Date.now();
    }
  } catch (err) {
    // Only rethrow validation/conflict errors on explicit write operations (POST/PUT/DELETE)
    if (!isReadOp && err?.message && !err.message.includes('fetch') && !err.message.includes('abort') && !err.message.includes('network') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    hrBackendOnline = false;
    lastHrCheckTime = Date.now();
  }

  try {
    return await fallbackFn();
  } catch (fbErr) {
    console.warn('Fallback error in fetchWithFallback:', fbErr);
    return [];
  }
}

export const hrService = {
  isBackendOnline() {
    return hrBackendOnline === true;
  },
  // =========================================================================
  // 👥 EMPLOYEES & WORKFORCE MANAGEMENT
  // =========================================================================
  
  async getEmployees(params = {}) {
    const result = await fetchWithFallback(`${API_BASE}/employees`, { method: 'GET' }, async () => {
      return getCollection(KEYS.EMPLOYEES);
    });

    const backendList = Array.isArray(result) ? result : (result?.data || []);
    const localList = getCollection(KEYS.EMPLOYEES) || [];

    // Prioritize authoritative MongoDB Atlas database records
    let finalEmployees = backendList.length > 0 ? backendList : localList;
    if (backendList.length > 0) {
      try {
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(backendList));
      } catch (_) {}
    }

    let filtered = finalEmployees;
    if (params.department && params.department !== 'all') {
      filtered = filtered.filter(e => e.department === params.department);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q) ||
        e.employeeCode?.toLowerCase().includes(q)
      );
    }
    return filtered;
  },

  async getCurrentUser() {
    const authUser = getAuthUser();
    if (authUser) {
      const employees = getCollection(KEYS.EMPLOYEES) || [];
      const matched = employees.find(e =>
        (authUser._id && String(e._id) === String(authUser._id)) ||
        (authUser.employeeCode && String(e.employeeCode) === String(authUser.employeeCode)) ||
        (authUser.email && e.email?.toLowerCase() === authUser.email?.toLowerCase())
      );
      if (matched) return { ...authUser, ...matched, isCurrentUser: true };
      return authUser;
    }

    return fetchWithFallback(`${API_BASE}/employees/current`, { method: 'GET' }, async () => {
      try {
        const savedAuth = localStorage.getItem('ems_auth_session');
        if (savedAuth) {
          const parsedAuth = JSON.parse(savedAuth);
          const employees = getCollection(KEYS.EMPLOYEES) || [];
          const matched = employees.find(e => e._id === parsedAuth._id || e.id === parsedAuth._id || e.email?.toLowerCase() === parsedAuth.email?.toLowerCase());
          if (matched) return { ...parsedAuth, ...matched, isCurrentUser: true };
          return parsedAuth;
        }
      } catch (e) {}
      return null;
    });
  },

  async createEmployee(employeeData) {
    const empCode = (employeeData.employeeCode || `EMP-${Date.now().toString().slice(-3)}`).toUpperCase();
    const systemRole = employeeData.systemRole || (employeeData.role?.toLowerCase().includes('admin') ? 'admin' : (employeeData.role?.toLowerCase().includes('hr') ? 'hr' : 'team_member'));
    const password = employeeData.password || 'emp123';
    const permissions = employeeData.permissions || {};

    const fullEmpData = {
      ...employeeData,
      employeeCode: empCode,
      systemRole,
      password,
      permissions
    };

    const result = await fetchWithFallback(`${API_BASE}/employees`, {
      method: 'POST',
      body: JSON.stringify(fullEmpData)
    }, async () => {
      const employees = getCollection(KEYS.EMPLOYEES);

      // Duplicate check in fallback
      const codeToTest = empCode.trim().toLowerCase();
      const existing = employees.find(e => (e.employeeCode || '').toLowerCase() === codeToTest || e._id === codeToTest);
      if (existing) {
        throw new Error(`Employee ID "${employeeData.employeeCode}" already exists for ${existing.name}`);
      }

      const emailToTest = (employeeData.email || '').trim().toLowerCase();
      const existingEmail = employees.find(e => (e.email || '').toLowerCase() === emailToTest);
      if (existingEmail) {
        throw new Error(`Email "${employeeData.email}" is already registered with ${existingEmail.name}`);
      }

      const newEmployee = {
        _id: `emp_${Date.now()}`,
        ...fullEmpData,
        avatar: employeeData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(employeeData.name)}`,
        role: employeeData.role || 'Team Member',
        department: employeeData.department || 'General',
        status: employeeData.status || 'active',
        joiningDate: employeeData.joiningDate || new Date().toISOString().split('T')[0],
        dob: employeeData.dob || '',
        phone: employeeData.phone || '',
        gender: employeeData.gender || 'Other',
        isCurrentUser: false,
        leaveBalance: employeeData.leaveBalance || { casual: 10, sick: 8, earned: 15, maternity: 0 },
        createdAt: new Date().toISOString()
      };

      employees.push(newEmployee);
      saveCollection(KEYS.EMPLOYEES, employees);
      return newEmployee;
    });

    // Ensure local storage copy exists with all security and permission attributes
    try {
      const localEmps = getCollection(KEYS.EMPLOYEES) || [];
      const idx = localEmps.findIndex(e => e._id === result?._id || e.employeeCode === empCode || e.email === employeeData.email);
      const finalized = { ...fullEmpData, ...(result || {}), password, systemRole, permissions };
      if (idx >= 0) {
        localEmps[idx] = finalized;
      } else {
        localEmps.push(finalized);
      }
      saveCollection(KEYS.EMPLOYEES, localEmps);

      if (permissions && Object.keys(permissions).length > 0) {
        const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
        const parsed = rawMap ? JSON.parse(rawMap) : {};
        parsed[empCode] = permissions;
        if (result?._id) parsed[result._id] = permissions;
        localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(parsed));
      }

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
      return finalized;
    } catch (e) {
      console.warn('Error syncing created employee to storage:', e);
      return result;
    }
  },

  async updateEmployee(employeeId, updateData) {
    const result = await fetchWithFallback(`${API_BASE}/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    }, async () => {
      const employees = getCollection(KEYS.EMPLOYEES);
      let index = employees.findIndex(e => 
        e._id === employeeId || 
        e.employeeCode === employeeId || 
        (updateData.email && e.email?.toLowerCase() === updateData.email?.toLowerCase()) || 
        (e.isCurrentUser && updateData.isCurrentUser) ||
        ((employeeId === 'emp_admin' || updateData.systemRole === 'admin') && (e.systemRole === 'admin' || e.isAdmin))
      );
      if (index === -1) {
        const currIdx = employees.findIndex(e => e.isCurrentUser || e.systemRole === 'admin' || e.isAdmin);
        if (currIdx !== -1) {
          employees[currIdx] = { ...employees[currIdx], ...updateData, updatedAt: new Date().toISOString() };
          saveCollection(KEYS.EMPLOYEES, employees);
          return employees[currIdx];
        }
        // If still not found, create new record
        const newRecord = { _id: employeeId || `emp_${Date.now()}`, ...updateData, updatedAt: new Date().toISOString() };
        employees.push(newRecord);
        saveCollection(KEYS.EMPLOYEES, employees);
        return newRecord;
      }

      employees[index] = { ...employees[index], ...updateData, updatedAt: new Date().toISOString() };
      saveCollection(KEYS.EMPLOYEES, employees);
      return employees[index];
    });

    try {
      const localEmps = getCollection(KEYS.EMPLOYEES) || [];
      const idx = localEmps.findIndex(e => 
        e._id === employeeId || 
        e.employeeCode === employeeId || 
        (updateData.email && e.email?.toLowerCase() === updateData.email?.toLowerCase()) || 
        (e.isCurrentUser && updateData.isCurrentUser) ||
        ((employeeId === 'emp_admin' || updateData.systemRole === 'admin') && (e.systemRole === 'admin' || e.isAdmin))
      );
      if (idx >= 0) {
        localEmps[idx] = { ...localEmps[idx], ...updateData, ...(result || {}) };
        saveCollection(KEYS.EMPLOYEES, localEmps);
      }
      if (updateData.permissions) {
        const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
        const parsed = rawMap ? JSON.parse(rawMap) : {};
        parsed[employeeId] = updateData.permissions;
        if (localEmps[idx]?.employeeCode) parsed[localEmps[idx].employeeCode] = updateData.permissions;
        localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(parsed));
      }
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
    } catch (e) {}

    return result;
  },

  async deleteEmployee(employeeId) {
    return fetchWithFallback(`${API_BASE}/employees/${employeeId}`, {
      method: 'DELETE'
    }, async () => {
      let employees = getCollection(KEYS.EMPLOYEES);
      employees = employees.filter(e => e._id !== employeeId);
      saveCollection(KEYS.EMPLOYEES, employees);
      return { success: true };
    });
  },

  // =========================================================================
  // 🌴 LEAVES MANAGEMENT
  // =========================================================================

  async getLeaves(filters = {}) {
    const query = new URLSearchParams();
    if (filters.employeeId && filters.employeeId !== 'all') query.append('employeeId', filters.employeeId);
    if (filters.status && filters.status !== 'all') query.append('status', filters.status);
    if (filters.leaveType && filters.leaveType !== 'all') query.append('leaveType', filters.leaveType);
    if (filters.search) query.append('search', filters.search);

    const result = await fetchWithFallback(`${API_BASE}/leaves?${query.toString()}`, { method: 'GET' }, async () => {
      let leaves = getCollection(KEYS.LEAVES);
      const authUser = getAuthUser();
      const isPrivileged = authUser && (authUser.isAdmin || authUser.systemRole === 'admin' || authUser.systemRole === 'hr' || authUser.role === 'Administrator' || authUser.role === 'HR Manager');

      // Scoping: Non-privileged users view leaves where they are either applicant or designated reviewer
      if (!isPrivileged && authUser) {
        const uId = String(authUser._id || authUser.id || '').trim();
        const uCode = String(authUser.employeeCode || '').trim();
        const uName = String(authUser.name || '').trim().toLowerCase();
        const uEmail = String(authUser.email || '').trim().toLowerCase();

        leaves = leaves.filter(l => {
          const isApplicant =
            (uId && (l.employeeId === uId || l.employee === uId)) ||
            (uCode && (l.employeeCode === uCode || l.employeeId === uCode)) ||
            (uName && l.employeeName && l.employeeName.toLowerCase() === uName) ||
            (uEmail && l.employeeEmail && l.employeeEmail.toLowerCase() === uEmail);

          const lAppId = String(l.appliedToId || l.approverId || '').trim();
          const lAppCode = String(l.appliedToCode || '').trim();
          const lAppName = String(l.appliedToName || l.approverName || '').trim().toLowerCase();
          const lAppEmail = String(l.appliedToEmail || l.approverEmail || '').trim().toLowerCase();

          const isApprover =
            (uId && lAppId && (uId === lAppId || uId.toLowerCase() === lAppId.toLowerCase())) ||
            (uCode && lAppId && (uCode === lAppId || uCode.toLowerCase() === lAppId.toLowerCase())) ||
            (uCode && lAppCode && (uCode === lAppCode || uCode.toLowerCase() === lAppCode.toLowerCase())) ||
            (uName && lAppName && uName === lAppName) ||
            (uEmail && lAppEmail && uEmail === lAppEmail);

          return isApplicant || isApprover;
        });
      } else if (filters.employeeId && filters.employeeId !== 'all') {
        leaves = leaves.filter(l => l.employeeId === filters.employeeId || l.employee === filters.employeeId || l.employeeCode === filters.employeeId);
      }

      if (filters.status && filters.status !== 'all') {
        leaves = leaves.filter(l => l.status.toLowerCase() === filters.status.toLowerCase());
      }
      if (filters.leaveType && filters.leaveType !== 'all') {
        leaves = leaves.filter(l => l.leaveType === filters.leaveType);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        leaves = leaves.filter(l => 
          l.employeeName?.toLowerCase().includes(q) ||
          l.leaveType?.toLowerCase().includes(q) ||
          l.reason?.toLowerCase().includes(q)
        );
      }
      if (filters.startDate && filters.endDate) {
        leaves = leaves.filter(l => l.startDate >= filters.startDate && l.endDate <= filters.endDate);
      }

      return leaves;
    });

    let ackList = [];
    try {
      ackList = JSON.parse(localStorage.getItem('ems_acknowledged_leaves') || '[]');
    } catch (_) {}
    const ackSet = new Set(ackList.map(String));

    const finalLeaves = (Array.isArray(result) ? result : (result?.data || [])).map(l => ({
      ...l,
      isAcknowledged: Boolean(l.isAcknowledged || ackSet.has(String(l._id)))
    }));

    return finalLeaves;
  },

  async createLeave(leaveData) {
    const authUser = getAuthUser();
    const enriched = {
      ...leaveData,
      employeeId: leaveData.employeeId || authUser?._id || authUser?.employeeCode || '',
      employeeName: leaveData.employeeName || authUser?.name || 'Employee',
      employeeCode: leaveData.employeeCode || authUser?.employeeCode || '',
      employeeRole: leaveData.employeeRole || authUser?.role || 'Team Member',
      appliedToId: leaveData.appliedToId || '',
      appliedToCode: leaveData.appliedToCode || '',
      appliedToEmail: leaveData.appliedToEmail || '',
      appliedToName: leaveData.appliedToName || 'Reviewer',
      appliedToRole: leaveData.appliedToRole || 'Approver',
      appliedToAvatar: leaveData.appliedToAvatar || ''
    };
    const createdLeave = await fetchWithFallback(`${API_BASE}/leaves`, {
      method: 'POST',
      body: JSON.stringify(enriched)
    }, async () => {
      const leaves = getCollection(KEYS.LEAVES);
      const newLeave = {
        _id: `leave_${Date.now()}`,
        ...enriched,
        status: 'pending',
        appliedOn: new Date().toISOString()
      };
      leaves.unshift(newLeave);
      saveCollection(KEYS.LEAVES, leaves);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));
      return newLeave;
    });

    if (createdLeave) {
      const leaves = getCollection(KEYS.LEAVES) || [];
      const idx = leaves.findIndex(l => String(l._id || l.id) === String(createdLeave._id || createdLeave.id));
      if (idx === -1) {
        leaves.unshift(createdLeave);
      } else {
        leaves[idx] = createdLeave;
      }
      saveCollection(KEYS.LEAVES, leaves);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));

      // Deduct employee leave balance upon leave application
      if (createdLeave.isPaid !== false && createdLeave.leaveType !== 'Unpaid Leave') {
        let employees = getCollection(KEYS.EMPLOYEES) || [];
        const targetEmpKey = createdLeave.employeeId || createdLeave.employee || createdLeave.employeeCode;
        const empIdx = employees.findIndex(e =>
          String(e._id) === String(targetEmpKey) ||
          (e.employeeCode && (e.employeeCode === targetEmpKey || e.employeeCode === createdLeave.employeeCode)) ||
          (e.name && createdLeave.employeeName && e.name.toLowerCase() === createdLeave.employeeName.toLowerCase())
        );

        if (empIdx >= 0) {
          const emp = employees[empIdx];
          const balance = { ...(emp.leaveBalance || { casual: 10, sick: 8, earned: 15, maternity: 0 }) };
          const days = Number(createdLeave.durationDays) || 1;
          const lt = (createdLeave.leaveType || '').toLowerCase();

          if (lt.includes('cas') || lt === 'cl') balance.casual = Math.max(0, (balance.casual || 10) - days);
          else if (lt.includes('sic') || lt === 'sl') balance.sick = Math.max(0, (balance.sick || 8) - days);
          else if (lt.includes('earn') || lt.includes('ann') || lt.includes('paid') || lt === 'el') balance.earned = Math.max(0, (balance.earned || 15) - days);
          else if (lt.includes('mat') || lt.includes('pat')) balance.maternity = Math.max(0, (balance.maternity || 0) - days);
          else {
            if ((balance.casual || 0) >= days) balance.casual -= days;
            else balance.earned = Math.max(0, (balance.earned || 0) - days);
          }

          emp.leaveBalance = balance;
          employees[empIdx] = emp;
          saveCollection(KEYS.EMPLOYEES, employees);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));

          const authRaw = localStorage.getItem('ems_auth_session') || localStorage.getItem('hrms_current_user');
          if (authRaw) {
            try {
              const authObj = JSON.parse(authRaw);
              if (authObj && (String(authObj._id) === String(emp._id) || authObj.employeeCode === emp.employeeCode)) {
                const updatedAuth = { ...authObj, leaveBalance: balance };
                localStorage.setItem('ems_auth_session', JSON.stringify(updatedAuth));
                localStorage.setItem('hrms_current_user', JSON.stringify(updatedAuth));
                window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
              }
            } catch (_) {}
          }
        }
      }
    }
    return createdLeave;
  },

  async updateLeaveStatus(leaveId, status, approverName = 'HR Admin', rejectionReason = '') {
    const updateLocalState = (targetLeave, updatedEmployeeBalance = null) => {
      const leaves = getCollection(KEYS.LEAVES) || [];
      const index = leaves.findIndex(l => String(l._id || l.id) === String(leaveId));
      const previousStatus = index !== -1 ? leaves[index].status : targetLeave.status;

      if (index !== -1) {
        leaves[index] = {
          ...leaves[index],
          ...targetLeave,
          status,
          approvedBy: status === 'approved' ? approverName : null,
          rejectedBy: status === 'rejected' ? approverName : null,
          cancelledBy: status === 'cancelled' ? approverName : null,
          rejectionReason: status === 'rejected' ? (rejectionReason || 'Declined by reviewer') : null,
          cancellationReason: status === 'cancelled' ? (rejectionReason || 'Cancelled by reviewer') : null,
          actionBy: approverName,
          actionDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        saveCollection(KEYS.LEAVES, leaves);
      }

      // Update employee leave balance in local collection
      let employees = getCollection(KEYS.EMPLOYEES) || [];
      const targetEmpKey = targetLeave.employeeId || targetLeave.employee || targetLeave.employeeCode;
      const empIdx = employees.findIndex(e =>
        String(e._id) === String(targetEmpKey) ||
        (e.employeeCode && (e.employeeCode === targetEmpKey || e.employeeCode === targetLeave.employeeCode)) ||
        (e.name && targetLeave.employeeName && e.name.toLowerCase() === targetLeave.employeeName.toLowerCase())
      );

      if (empIdx >= 0) {
        const emp = employees[empIdx];
        let balance = updatedEmployeeBalance || { ...(emp.leaveBalance || { casual: 10, sick: 8, earned: 15, maternity: 0 }) };
        const days = Number(targetLeave.durationDays) || 1;
        const lt = (targetLeave.leaveType || '').toLowerCase();

        if (!updatedEmployeeBalance) {
          // If previous was pending, it was already deducted on apply; only deduct if previously cancelled or rejected
          if (status === 'approved' && previousStatus !== 'approved' && previousStatus !== 'pending') {
            // Deduct on approval
            if (lt.includes('cas') || lt === 'cl') balance.casual = Math.max(0, (balance.casual || 10) - days);
            else if (lt.includes('sic') || lt === 'sl') balance.sick = Math.max(0, (balance.sick || 8) - days);
            else if (lt.includes('earn') || lt.includes('ann') || lt.includes('paid') || lt === 'el') balance.earned = Math.max(0, (balance.earned || 15) - days);
            else if (lt.includes('mat') || lt.includes('pat')) balance.maternity = Math.max(0, (balance.maternity || 0) - days);
            else {
              if ((balance.casual || 0) >= days) balance.casual -= days;
              else balance.earned = Math.max(0, (balance.earned || 0) - days);
            }
          } else if ((previousStatus === 'approved' || previousStatus === 'pending') && (status === 'cancelled' || status === 'rejected')) {
            // Restore on cancellation/rejection
            if (lt.includes('cas') || lt === 'cl') balance.casual = (balance.casual || 0) + days;
            else if (lt.includes('sic') || lt === 'sl') balance.sick = (balance.sick || 0) + days;
            else if (lt.includes('earn') || lt.includes('ann') || lt.includes('paid') || lt === 'el') balance.earned = (balance.earned || 0) + days;
            else if (lt.includes('mat') || lt.includes('pat')) balance.maternity = (balance.maternity || 0) + days;
            else balance.casual = (balance.casual || 0) + days;
          }
        }

        emp.leaveBalance = balance;
        employees[empIdx] = emp;
        saveCollection(KEYS.EMPLOYEES, employees);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));

        // If this is currentUser, update auth session too
        const authRaw = localStorage.getItem('ems_auth_session') || localStorage.getItem('hrms_current_user');
        if (authRaw) {
          try {
            const authObj = JSON.parse(authRaw);
            if (authObj && (String(authObj._id) === String(emp._id) || (authObj.employeeCode && emp.employeeCode && authObj.employeeCode === emp.employeeCode) || (authObj.name && emp.name && authObj.name.toLowerCase() === emp.name.toLowerCase()))) {
              const updatedAuth = { ...authObj, leaveBalance: balance };
              localStorage.setItem('ems_auth_session', JSON.stringify(updatedAuth));
              localStorage.setItem('hrms_current_user', JSON.stringify(updatedAuth));
              window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
            }
          } catch (_) {}
        }
      }

      // Synchronize Attendance Matrix in local mirror
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        let attendance = getCollection(KEYS.ATTENDANCE) || [];
        const start = new Date(targetLeave.startDate);
        const end = new Date(targetLeave.endDate || targetLeave.startDate);
        const cur = new Date(start);

        if (status === 'approved') {
          while (cur <= end) {
            const dStr = cur.toISOString().split('T')[0];
            const existingIdx = attendance.findIndex(a =>
              a.date === dStr && (
                String(a.employeeId) === String(targetEmpKey) ||
                String(a.employee) === String(targetEmpKey) ||
                (a.employeeCode && (a.employeeCode === targetEmpKey || a.employeeCode === targetLeave.employeeCode))
              )
            );
            const onLeaveRec = {
              employee: targetEmpKey,
              employeeId: targetEmpKey,
              employeeName: targetLeave.employeeName,
              employeeCode: targetLeave.employeeCode,
              employeeRole: targetLeave.employeeRole,
              date: dStr,
              status: 'on_leave',
              notes: `Approved ${targetLeave.leaveType} (${targetLeave.durationDays}d)`
            };
            if (existingIdx >= 0) attendance[existingIdx] = { ...attendance[existingIdx], ...onLeaveRec };
            else attendance.push(onLeaveRec);
            cur.setDate(cur.getDate() + 1);
          }
        } else if (status === 'cancelled' || status === 'rejected') {
          while (cur <= end) {
            const dStr = cur.toISOString().split('T')[0];
            attendance = attendance.filter(a => {
              const matchesEmp = String(a.employeeId) === String(targetEmpKey) ||
                String(a.employee) === String(targetEmpKey) ||
                (a.employeeCode && (a.employeeCode === targetEmpKey || a.employeeCode === targetLeave.employeeCode));
              if (!matchesEmp || a.date !== dStr) return true;
              if (dStr > todayStr) return false; // Delete future attendance
              if (a.status === 'on_leave') return false; // Delete on_leave
              return true;
            });
            cur.setDate(cur.getDate() + 1);
          }
        }
        saveCollection(KEYS.ATTENDANCE, attendance);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      } catch (attErr) {
        console.warn('Local attendance sync for leave failed:', attErr);
      }

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));
      window.dispatchEvent(new CustomEvent('ems_leaves_updated', { detail: { leaveId, status, approverName } }));
    };

    let existingTarget = null;
    const leaves = getCollection(KEYS.LEAVES) || [];
    existingTarget = leaves.find(l => String(l._id || l.id) === String(leaveId)) || {};

    const resData = await fetchWithFallback(`${API_BASE}/leaves/${leaveId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, approverName, approvedBy: approverName, rejectionReason, cancellationReason: rejectionReason })
    }, async () => {
      const targetLeave = { ...existingTarget, status };
      updateLocalState(targetLeave);
      return targetLeave;
    });

    const leaveData = (resData && resData.data) ? resData.data : resData;
    const updatedEmpBal = (resData && resData.updatedEmployee && resData.updatedEmployee.leaveBalance)
      ? resData.updatedEmployee.leaveBalance
      : null;

    updateLocalState(leaveData || existingTarget, updatedEmpBal);
    return leaveData;
  },

  async acknowledgeLeave(leaveId) {
    if (!leaveId) return null;
    try {
      const stored = JSON.parse(localStorage.getItem('ems_acknowledged_leaves') || '[]');
      if (!stored.includes(String(leaveId))) {
        stored.push(String(leaveId));
        localStorage.setItem('ems_acknowledged_leaves', JSON.stringify(stored));
      }
    } catch (_) {}

    // Update in localStorage collection
    const leaves = getCollection(KEYS.LEAVES);
    const index = leaves.findIndex(l => String(l._id) === String(leaveId));
    if (index >= 0) {
      leaves[index].isAcknowledged = true;
      saveCollection(KEYS.LEAVES, leaves);
    }

    // Call backend API if online
    try {
      await fetchWithFallback(`${API_BASE}/leaves/${leaveId}/acknowledge`, {
        method: 'PATCH'
      }, async () => ({ success: true, _id: leaveId, isAcknowledged: true }));
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));
    return index >= 0 ? leaves[index] : { _id: leaveId, isAcknowledged: true };
  },

  async deleteLeave(leaveId) {
    if (!leaveId) return false;

    const restoreLocalBalanceAndAttendance = (targetLeave, updatedBalance = null) => {
      if (!targetLeave) return;
      const days = Number(targetLeave.durationDays) || 1;
      const targetEmpKey = targetLeave.employeeId || targetLeave.employee || targetLeave.employeeCode;

      // 1. Restore employee leave balance if leave was paid and was pending or approved
      if (targetLeave.isPaid !== false && targetLeave.leaveType !== 'Unpaid Leave' && (targetLeave.status === 'pending' || targetLeave.status === 'approved')) {
        let employees = getCollection(KEYS.EMPLOYEES) || [];
        const empIdx = employees.findIndex(e =>
          String(e._id) === String(targetEmpKey) ||
          (e.employeeCode && (e.employeeCode === targetEmpKey || e.employeeCode === targetLeave.employeeCode)) ||
          (e.name && targetLeave.employeeName && e.name.toLowerCase() === targetLeave.employeeName.toLowerCase())
        );

        if (empIdx >= 0) {
          const emp = employees[empIdx];
          let balance = updatedBalance || { ...(emp.leaveBalance || { casual: 10, sick: 8, earned: 15, maternity: 0 }) };
          if (!updatedBalance) {
            const lt = (targetLeave.leaveType || '').toLowerCase();
            if (lt.includes('cas') || lt === 'cl') balance.casual = (balance.casual || 0) + days;
            else if (lt.includes('sic') || lt === 'sl') balance.sick = (balance.sick || 0) + days;
            else if (lt.includes('earn') || lt.includes('ann') || lt.includes('paid') || lt === 'el') balance.earned = (balance.earned || 0) + days;
            else if (lt.includes('mat') || lt.includes('pat')) balance.maternity = (balance.maternity || 0) + days;
            else balance.casual = (balance.casual || 0) + days;
          }

          emp.leaveBalance = balance;
          employees[empIdx] = emp;
          saveCollection(KEYS.EMPLOYEES, employees);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));

          // Update active auth session if current user
          const authRaw = localStorage.getItem('ems_auth_session') || localStorage.getItem('hrms_current_user');
          if (authRaw) {
            try {
              const authObj = JSON.parse(authRaw);
              if (authObj && (String(authObj._id) === String(emp._id) || authObj.employeeCode === emp.employeeCode || (authObj.name && emp.name && authObj.name.toLowerCase() === emp.name.toLowerCase()))) {
                const updatedAuth = { ...authObj, leaveBalance: balance };
                localStorage.setItem('ems_auth_session', JSON.stringify(updatedAuth));
                localStorage.setItem('hrms_current_user', JSON.stringify(updatedAuth));
                window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
              }
            } catch (_) {}
          }
        }
      }

      // 2. Clean up attendance matrix if leave was approved
      if (targetLeave.status === 'approved') {
        const todayStr = new Date().toISOString().split('T')[0];
        let attendance = getCollection(KEYS.ATTENDANCE) || [];
        const start = new Date(targetLeave.startDate);
        const end = new Date(targetLeave.endDate || targetLeave.startDate);
        const cur = new Date(start);
        while (cur <= end) {
          const dStr = cur.toISOString().split('T')[0];
          attendance = attendance.filter(a => {
            const matchesEmp = String(a.employeeId) === String(targetEmpKey) ||
              String(a.employee) === String(targetEmpKey) ||
              (a.employeeCode && (a.employeeCode === targetEmpKey || a.employeeCode === targetLeave.employeeCode));
            if (!matchesEmp || a.date !== dStr) return true;
            if (dStr > todayStr) return false;
            if (a.status === 'on_leave') return false;
            return true;
          });
          cur.setDate(cur.getDate() + 1);
        }
        saveCollection(KEYS.ATTENDANCE, attendance);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      }
    };

    const leaves = getCollection(KEYS.LEAVES) || [];
    const targetLeave = leaves.find(l => String(l._id || l.id) === String(leaveId));

    const res = await fetchWithFallback(`${API_BASE}/leaves/${leaveId}`, {
      method: 'DELETE'
    }, async () => {
      let remaining = leaves.filter(l => String(l._id || l.id) !== String(leaveId));
      saveCollection(KEYS.LEAVES, remaining);
      restoreLocalBalanceAndAttendance(targetLeave);
      return { success: true };
    });

    let remainingLeaves = (getCollection(KEYS.LEAVES) || []).filter(l => String(l._id || l.id) !== String(leaveId));
    saveCollection(KEYS.LEAVES, remainingLeaves);

    const updatedBal = (res && res.updatedEmployee && res.updatedEmployee.leaveBalance) ? res.updatedEmployee.leaveBalance : null;
    restoreLocalBalanceAndAttendance(targetLeave, updatedBal);

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));
    window.dispatchEvent(new CustomEvent('ems_leaves_updated', { detail: { leaveId, status: 'deleted' } }));
    return res;
  },

  // =========================================================================
  // 📅 ATTENDANCE MATRIX & TIME LOGS
  // =========================================================================

  async getMonthlyAttendance(month = 9, year = 2026, employeeId = 'all') {
    const query = new URLSearchParams({ month: String(month), year: String(year) });
    if (employeeId && employeeId !== 'all') query.append('employeeId', employeeId);

    return fetchWithFallback(`${API_BASE}/attendance/monthly?${query.toString()}`, { method: 'GET' }, async () => {
      let attendance = getCollection(KEYS.ATTENDANCE) || [];
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;

      attendance = attendance.filter(a => a.date && a.date.startsWith(monthStr));
      if (employeeId && employeeId !== 'all') {
        const employees = getCollection(KEYS.EMPLOYEES) || [];
        const targetEmp = employees.find(e => e._id === employeeId || e.employeeCode === employeeId);
        attendance = attendance.filter(a => {
          if (a.employeeId === employeeId || a.employeeCode === employeeId) return true;
          if (targetEmp) {
            if (a.employeeId === targetEmp._id || a.employeeId === targetEmp.employeeCode || a.employeeCode === targetEmp.employeeCode) return true;
            if (a.employeeName && targetEmp.name && a.employeeName.trim().toLowerCase() === targetEmp.name.trim().toLowerCase()) return true;
          }
          return false;
        });
      }

      return attendance;
    });
  },

  async markAttendance(attendanceData) {
    return fetchWithFallback(`${API_BASE}/attendance/mark`, {
      method: 'POST',
      body: JSON.stringify(attendanceData)
    }, async () => {
      let attendance = getCollection(KEYS.ATTENDANCE) || [];
      const { employeeId, date, status, clockInTime, clockOutTime, notes } = attendanceData;

      const employees = getCollection(KEYS.EMPLOYEES) || [];
      const targetEmp = employees.find(e =>
        e._id === employeeId ||
        e.employeeCode === employeeId ||
        (attendanceData.employeeName && e.name?.toLowerCase() === attendanceData.employeeName.toLowerCase())
      );

      const existingIndex = attendance.findIndex(a =>
        a.date === date && (
          a.employeeId === employeeId ||
          a.employeeCode === employeeId ||
          (targetEmp && (a.employeeId === targetEmp._id || a.employeeId === targetEmp.employeeCode || a.employeeCode === targetEmp.employeeCode)) ||
          (targetEmp?.name && a.employeeName && a.employeeName.trim().toLowerCase() === targetEmp.name.trim().toLowerCase())
        )
      );

      // Exact mathematical calculation for totalWorkingHours and late detection
      let computedHours = 0;
      let isLateCalc = status === 'late';
      let lateByMinutes = 0;

      const effectiveClockIn = clockInTime || attendanceData.clockIn;
      const effectiveClockOut = clockOutTime || attendanceData.clockOut;

      if (['present', 'late', 'half_day'].includes(status) && effectiveClockIn && effectiveClockOut) {
        try {
          const parseToSecs = (str) => {
            if (!str) return 0;
            const m = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
            if (!m) return 0;
            let h = parseInt(m[1], 10);
            const min = parseInt(m[2], 10);
            const sec = parseInt(m[3] || '0', 10);
            const ampm = (m[4] || '').toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return h * 3600 + min * 60 + sec;
          };

          const inSecs = parseToSecs(effectiveClockIn);
          const outSecs = parseToSecs(effectiveClockOut);
          const diffSecs = Math.max(0, outSecs - inSecs);
          computedHours = +(diffSecs / 3600).toFixed(2);

          const shiftGraceSecs = 9 * 3600 + 30 * 60;
          if (inSecs > shiftGraceSecs) {
            isLateCalc = true;
            lateByMinutes = Math.floor((inSecs - shiftGraceSecs) / 60);
          }
        } catch {}
      } else if (status === 'half_day') {
        computedHours = 4.0;
      }

      const finalClockIn = effectiveClockIn || null;
      const finalClockOut = effectiveClockOut || null;

      const record = {
        _id: existingIndex >= 0 ? attendance[existingIndex]._id : `att_${targetEmp?._id || employeeId}_${Date.now()}`,
        employeeId: targetEmp?._id || employeeId,
        employeeCode: targetEmp?.employeeCode || attendanceData.employeeCode || '',
        employeeName: targetEmp?.name || attendanceData.employeeName || 'Employee',
        date,
        status: status || 'present',
        clockInTime: finalClockIn,
        clockIn: finalClockIn,
        clockOutTime: finalClockOut,
        totalWorkingHours: (attendanceData.workSeconds ? +(Number(attendanceData.workSeconds) / 3600).toFixed(2) : (computedHours || (attendanceData.totalWorkingHours ? parseFloat(attendanceData.totalWorkingHours) : 0))),
        isLate: isLateCalc,
        lateByMinutes,
        notes: notes || '',
        clockInTimestamp: attendanceData.clockInTimestamp !== undefined ? attendanceData.clockInTimestamp : (existingIndex >= 0 ? attendance[existingIndex].clockInTimestamp : undefined),
        clockOutTimestamp: attendanceData.clockOutTimestamp !== undefined ? attendanceData.clockOutTimestamp : (existingIndex >= 0 ? attendance[existingIndex].clockOutTimestamp : undefined),
        workSeconds: attendanceData.workSeconds !== undefined ? attendanceData.workSeconds : (existingIndex >= 0 ? attendance[existingIndex].workSeconds : 0),
        breakSeconds: attendanceData.breakSeconds !== undefined ? attendanceData.breakSeconds : (existingIndex >= 0 ? attendance[existingIndex].breakSeconds : 0),
        isOnBreak: attendanceData.isOnBreak !== undefined ? attendanceData.isOnBreak : false,
        breakType: attendanceData.breakType !== undefined ? attendanceData.breakType : null,
        breakHistory: attendanceData.breakHistory !== undefined ? attendanceData.breakHistory : (existingIndex >= 0 ? attendance[existingIndex].breakHistory : []),
        punchSessions: attendanceData.punchSessions !== undefined ? attendanceData.punchSessions : (existingIndex >= 0 ? attendance[existingIndex].punchSessions : []),
        isClockedIn: attendanceData.isClockedIn !== undefined ? attendanceData.isClockedIn : (Boolean(finalClockIn) && !finalClockOut),
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        attendance[existingIndex] = { ...attendance[existingIndex], ...record };
      } else {
        attendance.unshift(record);
      }

      saveCollection(KEYS.ATTENDANCE, attendance);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      return record;
    });
  },

  // =========================================================================
  // 📋 ATTENDANCE AUDIT TRAIL & ADMIN OVERRIDES
  // =========================================================================

  async getAttendanceAuditLogs(filters = {}) {
    const { employeeId, date, month, year, type, onlyOverrides } = filters;
    const query = new URLSearchParams();
    if (employeeId && employeeId !== 'all') query.append('employeeId', employeeId);
    if (date) query.append('date', date);
    if (month) query.append('month', String(month));
    if (year) query.append('year', String(year));
    if (type && type !== 'all') query.append('type', type);
    if (onlyOverrides) query.append('onlyOverrides', 'true');

    return fetchWithFallback(`${API_BASE}/attendance/audit?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders()
    }, async () => {
      let logs = getCollection(KEYS.ATTENDANCE_AUDIT);
      const authUser = getAuthUser();
      const isPrivileged = authUser?.isAdmin || authUser?.systemRole === 'admin' || authUser?.department === 'Human Resources';

      // Tenant Scoping fallback
      if (!isPrivileged && authUser) {
        const myId = authUser._id || authUser.id;
        const myCode = authUser.employeeCode;
        logs = logs.filter(l => l.employeeId === myId || l.employeeId === myCode || l.actorId === myId || l.actorId === myCode);
      } else if (employeeId && employeeId !== 'all') {
        logs = logs.filter(l => l.employeeId === employeeId || l.employeeCode === employeeId);
      }

      if (date) logs = logs.filter(l => l.date === date);
      if (month && year) {
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        logs = logs.filter(l => l.date.startsWith(prefix));
      }
      if (type && type !== 'all') logs = logs.filter(l => l.type === type);
      if (onlyOverrides) logs = logs.filter(l => l.isAdminOverride);

      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });
  },

  async createAttendanceAuditLog(auditData = {}) {
    const authUser = getAuthUser();
    const type = auditData.type || auditData.action || 'system';
    const action = auditData.action || auditData.type || 'audit';
    const employeeId = auditData.employeeId || auditData.employeeCode || authUser?._id || authUser?.employeeCode || 'SYS';

    const enriched = {
      _id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      date: auditData.date || new Date().toISOString().split('T')[0],
      timeFormatted: auditData.timeFormatted || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      actor: auditData.actor || (authUser?.isAdmin ? 'admin' : 'employee'),
      actorId: auditData.actorId || authUser?._id || authUser?.employeeCode || 'unknown',
      actorName: auditData.actorName || authUser?.name || 'User',
      ...auditData,
      employeeId,
      type,
      action
    };

    const { _id, ...backendPayload } = enriched;

    return fetchWithFallback(`${API_BASE}/attendance/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(backendPayload)
    }, async () => {
      const logs = getCollection(KEYS.ATTENDANCE_AUDIT);
      logs.unshift(enriched);
      saveCollection(KEYS.ATTENDANCE_AUDIT, logs);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE_AUDIT } }));
      return enriched;
    }).catch(err => {
      console.warn('Attendance audit log backend sync notice:', err);
      return enriched;
    });
  },

  async adminForceClockOut(employeeId, auditNote, targetDate = null) {
    const authUser = getAuthUser();
    const payload = {
      employeeId,
      date: targetDate || new Date().toISOString().split('T')[0],
      auditNote
    };

    return fetchWithFallback(`${API_BASE}/attendance/force-clock-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    }, async () => {
      const today = targetDate || new Date().toISOString().split('T')[0];
      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const adminId = authUser?._id || authUser?.employeeCode || 'ADMIN';
      const adminName = authUser?.name || 'Administrator';

      // 1. Update Attendance
      let attendance = getCollection(KEYS.ATTENDANCE) || [];
      const employees = getCollection(KEYS.EMPLOYEES) || [];
      const targetEmp = employees.find(e => e._id === employeeId || e.employeeCode === employeeId);

      const existingIdx = attendance.findIndex(a =>
        a.date === today && (
          a.employeeId === employeeId ||
          a.employeeCode === employeeId ||
          (targetEmp && (a.employeeId === targetEmp._id || a.employeeId === targetEmp.employeeCode || a.employeeCode === targetEmp.employeeCode)) ||
          (targetEmp?.name && a.employeeName && a.employeeName.trim().toLowerCase() === targetEmp.name.trim().toLowerCase())
        )
      );

      if (existingIdx >= 0) {
        attendance[existingIdx].clockOutTime = nowStr;
        attendance[existingIdx].clockOut = nowStr;
        attendance[existingIdx].notes = `Forced clock-out by Admin ${adminName} (${adminId}): "${auditNote}"`;
        attendance[existingIdx].markedBy = adminName;
        attendance[existingIdx].updatedAt = new Date().toISOString();
      } else {
        attendance.unshift({
          _id: `att_${targetEmp?._id || employeeId}_${Date.now()}`,
          employeeId: targetEmp?._id || employeeId,
          employeeCode: targetEmp?.employeeCode || '',
          employeeName: targetEmp?.name || 'Employee',
          date: today,
          status: 'present',
          clockInTime: nowStr,
          clockIn: nowStr,
          workSeconds: 0,
          totalWorkingHours: 0,
          clockOutTime: nowStr,
          clockOut: nowStr,
          
          notes: `Forced clock-out by Admin ${adminName} (${adminId}): "${auditNote}"`,
          markedBy: adminName,
          updatedAt: new Date().toISOString()
        });
      }
      saveCollection(KEYS.ATTENDANCE, attendance);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));

      // 2. Add Audit Log

      const auditEntry = {
        _id: `audit_force_${Date.now()}`,
        employeeId: String(employeeId),
        employeeName: targetEmp?.name || 'Employee',
        employeeCode: targetEmp?.employeeCode || '',
        date: today,
        timestamp: new Date().toISOString(),
        timeFormatted: nowStr,
        type: 'admin_force_clock_out',
        action: 'Admin Force Clock-Out',
        actor: 'admin',
        actorId: String(adminId),
        actorName: adminName,
        isAdminOverride: true,
        adminId: String(adminId),
        adminName,
        auditNote: auditNote.trim(),
        details: `Administrator ${adminName} [ID: ${adminId}] manually forced shift clock-out. Reason: "${auditNote.trim()}"`
      };

      const logs = getCollection(KEYS.ATTENDANCE_AUDIT);
      logs.unshift(auditEntry);
      saveCollection(KEYS.ATTENDANCE_AUDIT, logs);

      // 3. Dispatch global force clock-out event for multi-tab sync
      window.dispatchEvent(new CustomEvent('ems_force_clock_out', {
        detail: { employeeId, adminId, adminName, auditNote }
      }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));

      return { attendance: attendance[existingIdx], audit: auditEntry };
    });
  },

  // =========================================================================
  // ⏱️ OVERTIME REQUESTS & APPROVALS
  // =========================================================================

  async getOvertimeRequests() {
    return fetchWithFallback(`${API_BASE}/attendance/overtime`, {
      method: 'GET',
      headers: getAuthHeaders()
    }, async () => {
      let overtimes = getCollection(KEYS.ATTENDANCE_OVERTIME) || [];
      return overtimes;
    });
  },

  async requestOvertime(overtimeData) {
    const enriched = {
      _id: `ot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      ...overtimeData,
      status: overtimeData.isSelfApproved ? 'approved' : 'pending'
    };

    return fetchWithFallback(`${API_BASE}/attendance/overtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(enriched)
    }, async () => {
      let overtimes = getCollection(KEYS.ATTENDANCE_OVERTIME) || [];
      overtimes.unshift(enriched);
      saveCollection(KEYS.ATTENDANCE_OVERTIME, overtimes);

      // Also update attendance collection record for that day
      let attendance = getCollection(KEYS.ATTENDANCE) || [];
      const targetDate = enriched.date || new Date().toISOString().split('T')[0];
      const idx = attendance.findIndex(a => a.date === targetDate && (
        String(a.employeeId) === String(enriched.employeeId) ||
        (a.employeeCode && a.employeeCode === enriched.employeeCode)
      ));
      if (idx >= 0) {
        attendance[idx] = {
          ...attendance[idx],
          overtimeHours: enriched.overtimeHours,
          overtimeSeconds: enriched.overtimeSeconds,
          overtimeStatus: enriched.status,
          overtimeReason: enriched.overtimeReason,
          overtimeTasks: enriched.overtimeTasks,
          overtimeApprovedBy: enriched.isSelfApproved ? (enriched.employeeName || 'Admin') : '',
          overtimeApprovedAt: enriched.isSelfApproved ? new Date().toISOString() : null
        };
        saveCollection(KEYS.ATTENDANCE, attendance);
      }

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE_OVERTIME } }));
      window.dispatchEvent(new CustomEvent('ems_overtime_updated', { detail: enriched }));
      return enriched;
    });
  },

  async updateOvertimeStatus(overtimeId, status, approverName = 'Admin', rejectionReason = '') {
    return fetchWithFallback(`${API_BASE}/attendance/overtime/${overtimeId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status, approverName, rejectionReason })
    }, async () => {
      let overtimes = getCollection(KEYS.ATTENDANCE_OVERTIME) || [];
      const idx = overtimes.findIndex(o => String(o._id || o.id) === String(overtimeId));
      if (idx >= 0) {
        overtimes[idx] = {
          ...overtimes[idx],
          status,
          approverName,
          approvedBy: approverName,
          approvedAt: new Date().toISOString(),
          rejectionReason
        };
        saveCollection(KEYS.ATTENDANCE_OVERTIME, overtimes);
      }

      // Sync to attendance record
      let attendance = getCollection(KEYS.ATTENDANCE) || [];
      const targetOt = idx >= 0 ? overtimes[idx] : null;
      if (targetOt) {
        const attIdx = attendance.findIndex(a => a.date === targetOt.date && (
          String(a.employeeId) === String(targetOt.employeeId) ||
          (a.employeeCode && a.employeeCode === targetOt.employeeCode)
        ));
        if (attIdx >= 0) {
          attendance[attIdx] = {
            ...attendance[attIdx],
            overtimeStatus: status,
            overtimeApprovedBy: approverName,
            overtimeApprovedAt: new Date().toISOString()
          };
          saveCollection(KEYS.ATTENDANCE, attendance);
        }
      }

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE_OVERTIME } }));
      window.dispatchEvent(new CustomEvent('ems_overtime_updated', { detail: { overtimeId, status, approverName } }));
      return { success: true };
    });
  },

  // =========================================================================
  // 🗓️ COMPANY HOLIDAYS
  // =========================================================================

  async getHolidays(year = 2026, search = '') {
    // 1. First ensure full 12-month national festival and gazetted dataset is synced
    try {
      holidaySyncService.autoUpgradeStaleHolidays(year);
    } catch (_) {}

    const query = new URLSearchParams();
    if (year) query.append('year', String(year));
    if (search) query.append('search', search);

    const res = await fetchWithFallback(`${API_BASE}/holidays?${query.toString()}`, { method: 'GET' }, async () => {
      let holidays = getCollection(KEYS.HOLIDAYS) || [];
      if (year) {
        holidays = holidays.filter(h => h.date && h.date.startsWith(String(year)));
      }
      if (search) {
        const q = search.toLowerCase();
        holidays = holidays.filter(h => 
          h.name?.toLowerCase().includes(q) ||
          h.type?.toLowerCase().includes(q) ||
          h.description?.toLowerCase().includes(q)
        );
      }
      return holidays.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    });

    if (Array.isArray(res) && res.length > 0) {
      try {
        const local = getCollection(KEYS.HOLIDAYS) || [];
        const map = new Map();
        local.forEach(item => map.set(item.date + '_' + item.name, item));
        res.forEach(item => map.set(item.date + '_' + item.name, { ...(map.get(item.date + '_' + item.name) || {}), ...item }));
        const merged = Array.from(map.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        saveCollection(KEYS.HOLIDAYS, merged);
      } catch (_) {}
    }

    return Array.isArray(res) && res.length > 0 ? res : (getCollection(KEYS.HOLIDAYS) || []);
  },

  async createHoliday(holidayData) {
    let result = null;
    try {
      const res = await fetch(`${API_BASE}/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(holidayData)
      });
      if (res.ok) {
        const json = await res.json();
        result = json.data || json;
      }
    } catch (_) {}

    const holidays = getCollection(KEYS.HOLIDAYS) || [];
    const newHoliday = result || {
      _id: `hol_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      ...holidayData
    };

    const filtered = holidays.filter(h => h._id !== newHoliday._id && !(h.date === newHoliday.date && h.name === newHoliday.name));
    filtered.push(newHoliday);
    filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    saveCollection(KEYS.HOLIDAYS, filtered);

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.HOLIDAYS } }));
    window.dispatchEvent(new CustomEvent('ems_holidays_updated', { detail: { holiday: newHoliday } }));
    return newHoliday;
  },

  async deleteHoliday(holidayId) {
    return holidaySyncService.cancelOrDeleteHoliday(holidayId);
  },

  async cancelHoliday(holidayId, adminUser) {
    return holidaySyncService.cancelOrDeleteHoliday(holidayId, adminUser);
  },

  async toggleHolidayConfirmation(holidayId, isConfirmed, adminUser) {
    if (!isConfirmed) {
      return holidaySyncService.cancelOrDeleteHoliday(holidayId, adminUser);
    }
    const holidays = getCollection(KEYS.HOLIDAYS) || [];
    const hol = holidays.find(h => h._id === holidayId || h.code === holidayId || h.date === holidayId);
    if (hol) {
      return holidaySyncService.confirmHolidayAsCompanyOff(hol, adminUser);
    }
    return { success: true };
  },

  async bulkConfirmGazetted(year, allHolidays, adminUser) {
    return holidaySyncService.confirmAllSuggestedHolidays(year, adminUser);
  },

  async resetHolidayConfirmations(year) {
    const holidays = getCollection(KEYS.HOLIDAYS) || [];
    const filtered = holidays.filter(h => !h.date || !h.date.startsWith(String(year)));
    saveCollection(KEYS.HOLIDAYS, filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.HOLIDAYS } }));
    window.dispatchEvent(new CustomEvent('ems_holidays_updated'));
    return { success: true };
  },

  // =========================================================================
  // 🏆 EMPLOYEE APPRECIATIONS & AWARDS
  // =========================================================================

  async getAppreciations(filters = {}) {
    const query = new URLSearchParams();
    if (filters.employeeId && filters.employeeId !== 'all') query.append('employeeId', filters.employeeId);
    if (filters.search) query.append('search', filters.search);

    const res = await fetchWithFallback(`${API_BASE}/appreciations?${query.toString()}`, { method: 'GET' }, async () => {
      let appreciations = getCollection(KEYS.APPRECIATIONS) || [];

      if (filters.search) {
        const q = filters.search.toLowerCase();
        appreciations = appreciations.filter(a => 
          a.givenToName?.toLowerCase().includes(q) ||
          a.awardName?.toLowerCase().includes(q) ||
          a.appreciationNote?.toLowerCase().includes(q)
        );
      }
      if (filters.employeeId && filters.employeeId !== 'all') {
        appreciations = appreciations.filter(a => a.givenToId === filters.employeeId || a.givenTo === filters.employeeId);
      }

      return appreciations.sort((a, b) => (b.givenOn || '').localeCompare(a.givenOn || ''));
    });

    if (Array.isArray(res) && !filters.employeeId && !filters.search) {
      try {
        saveCollection(KEYS.APPRECIATIONS, res);
      } catch (_) {}
    }
    return res;
  },

  async createAppreciation(appreciationData) {
    const res = await fetchWithFallback(`${API_BASE}/appreciations`, {
      method: 'POST',
      body: JSON.stringify(appreciationData)
    }, async () => {
      const appreciations = getCollection(KEYS.APPRECIATIONS) || [];
      const newAppreciation = {
        _id: `app_${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...appreciationData
      };
      appreciations.unshift(newAppreciation);
      saveCollection(KEYS.APPRECIATIONS, appreciations);
      return newAppreciation;
    });

    if (res) {
      try {
        const local = getCollection(KEYS.APPRECIATIONS) || [];
        const exists = local.some(a => String(a._id) === String(res._id));
        if (!exists) {
          local.unshift(res);
          saveCollection(KEYS.APPRECIATIONS, local);
        }
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.APPRECIATIONS } }));
      } catch (_) {}
    }
    return res;
  },

  async deleteAppreciation(appreciationId) {
    const res = await fetchWithFallback(`${API_BASE}/appreciations/${appreciationId}`, {
      method: 'DELETE'
    }, async () => {
      let appreciations = getCollection(KEYS.APPRECIATIONS) || [];
      appreciations = appreciations.filter(a => a._id !== appreciationId);
      saveCollection(KEYS.APPRECIATIONS, appreciations);
      return { success: true };
    });

    try {
      let appreciations = getCollection(KEYS.APPRECIATIONS) || [];
      appreciations = appreciations.filter(a => String(a._id) !== String(appreciationId));
      saveCollection(KEYS.APPRECIATIONS, appreciations);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.APPRECIATIONS } }));
    } catch (_) {}

    return res;
  },

  // ─── RESIGNATIONS & EX-EMPLOYEE WORKFLOW ───
  async getResignations() {
    return await fetchWithFallback(`${API_BASE}/resignations`, {
      method: 'GET'
    }, async () => {
      return getCollection(KEYS.RESIGNATIONS) || [];
    });
  },

  async submitResignation(resignationData) {
    const res = await fetchWithFallback(`${API_BASE}/resignations`, {
      method: 'POST',
      body: JSON.stringify(resignationData)
    }, async () => {
      const resignations = getCollection(KEYS.RESIGNATIONS) || [];
      const newRes = {
        id: `res_${Date.now()}`,
        status: 'pending',
        submissionDate: new Date().toISOString().split('T')[0],
        ...resignationData
      };
      resignations.unshift(newRes);
      saveCollection(KEYS.RESIGNATIONS, resignations);
      return newRes;
    });

    try {
      const resignations = getCollection(KEYS.RESIGNATIONS) || [];
      const rec = (res && res.data) ? res.data : res;
      if (rec && rec.id) {
        const idx = resignations.findIndex(r => r.id === rec.id);
        if (idx >= 0) {
          resignations[idx] = rec;
        } else {
          resignations.unshift(rec);
        }
        saveCollection(KEYS.RESIGNATIONS, resignations);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.RESIGNATIONS } }));
      }
    } catch (_) {}

    return res;
  },

  async reviewResignation(resignationId, reviewData) {
    const res = await fetchWithFallback(`${API_BASE}/resignations/${resignationId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(reviewData)
    }, async () => {
      const resignations = getCollection(KEYS.RESIGNATIONS) || [];
      const idx = resignations.findIndex(r => r.id === resignationId);
      if (idx >= 0) {
        resignations[idx] = {
          ...resignations[idx],
          ...reviewData,
          status: reviewData.status || resignations[idx].status,
          reviewedAt: new Date().toISOString()
        };
        saveCollection(KEYS.RESIGNATIONS, resignations);
      }
      return { success: true, data: resignations[idx] };
    });

    try {
      const resignations = getCollection(KEYS.RESIGNATIONS) || [];
      const idx = resignations.findIndex(r => r.id === resignationId);
      if (idx >= 0) {
        resignations[idx] = {
          ...resignations[idx],
          ...reviewData,
          status: reviewData.status || resignations[idx].status,
          isRelieved: reviewData.isRelieved || resignations[idx].isRelieved
        };
        saveCollection(KEYS.RESIGNATIONS, resignations);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.RESIGNATIONS } }));
      }

      // If relieved, update employee status to 'resigned' in local storage cache
      if (reviewData.isRelieved || reviewData.status === 'relieved') {
        const emps = getCollection(KEYS.EMPLOYEES) || [];
        const empIdx = emps.findIndex(e =>
          (reviewData.employeeId && (e._id === reviewData.employeeId || e.id === reviewData.employeeId)) ||
          (reviewData.employeeCode && e.employeeCode === reviewData.employeeCode)
        );
        if (empIdx >= 0) {
          emps[empIdx] = {
            ...emps[empIdx],
            status: 'resigned',
            relievedDate: new Date().toISOString().split('T')[0]
          };
          saveCollection(KEYS.EMPLOYEES, emps);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
        }
      }
    } catch (_) {}

    return res;
  }
};
