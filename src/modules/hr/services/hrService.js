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
      'x-user-id': u._id || u.employeeCode || '',
      'x-user-role': u.systemRole || (u.isAdmin ? 'admin' : (u.department === 'Human Resources' ? 'hr' : 'team_member'))
    };
  }
  return {};
};

let hrBackendOnline = null;
let lastHrCheckTime = 0;
const HR_CACHE_TTL = 25000;

/**
 * Safe fetch helper that attempts backend API first, falling back to local storage
 */
async function fetchWithFallback(url, options, fallbackFn) {
  const now = Date.now();
  if (hrBackendOnline === false && (now - lastHrCheckTime < HR_CACHE_TTL)) {
    return await fallbackFn();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);

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

    if (res.ok) {
      hrBackendOnline = true;
      lastHrCheckTime = now;
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } else {
      hrBackendOnline = false;
      lastHrCheckTime = now;
    }
  } catch (err) {
    hrBackendOnline = false;
    lastHrCheckTime = now;
  }

  return await fallbackFn();
}

export const hrService = {
  // =========================================================================
  // 👥 EMPLOYEES & WORKFORCE MANAGEMENT
  // =========================================================================
  
  async getEmployees(params = {}) {
    return fetchWithFallback(`${API_BASE}/employees`, { method: 'GET' }, async () => {
      let employees = getCollection(KEYS.EMPLOYEES);
      if (params.department && params.department !== 'all') {
        employees = employees.filter(e => e.department === params.department);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        employees = employees.filter(e =>
          e.name?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.role?.toLowerCase().includes(q) ||
          e.employeeCode?.toLowerCase().includes(q)
        );
      }
      return employees;
    });
  },

  async getCurrentUser() {
    return fetchWithFallback(`${API_BASE}/employees/current`, { method: 'GET' }, async () => {
      try {
        const savedAuth = localStorage.getItem('ems_auth_session');
        if (savedAuth) {
          const authUser = JSON.parse(savedAuth);
          const employees = getCollection(KEYS.EMPLOYEES) || [];
          const matched = employees.find(e => e._id === authUser._id || e.id === authUser._id || e.email?.toLowerCase() === authUser.email?.toLowerCase());
          if (matched) return { ...authUser, ...matched, isCurrentUser: true };
          return authUser;
        }
      } catch (e) {}
      const employees = getCollection(KEYS.EMPLOYEES);
      return employees.find(e => e.isCurrentUser) || employees[0];
    });
  },

  async createEmployee(employeeData) {
    return fetchWithFallback(`${API_BASE}/employees`, {
      method: 'POST',
      body: JSON.stringify(employeeData)
    }, async () => {
      const employees = getCollection(KEYS.EMPLOYEES);

      // Duplicate check in fallback
      const codeToTest = (employeeData.employeeCode || '').trim().toLowerCase();
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
        employeeCode: (employeeData.employeeCode || `EMP-${String(employees.length + 1).padStart(3, '0')}`).toUpperCase(),
        name: employeeData.name,
        email: employeeData.email,
        avatar: employeeData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(employeeData.name)}`,
        role: employeeData.role || 'Team Member',
        department: employeeData.department || 'General',
        status: 'active',
        joiningDate: employeeData.joiningDate || new Date().toISOString().split('T')[0],
        isCurrentUser: false,
        leaveBalance: employeeData.leaveBalance || { casual: 10, sick: 8, earned: 15, maternity: 0 },
        createdAt: new Date().toISOString()
      };

      employees.push(newEmployee);
      saveCollection(KEYS.EMPLOYEES, employees);
      return newEmployee;
    });
  },

  async updateEmployee(employeeId, updateData) {
    return fetchWithFallback(`${API_BASE}/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    }, async () => {
      const employees = getCollection(KEYS.EMPLOYEES);
      const index = employees.findIndex(e => e._id === employeeId || (e.isCurrentUser && updateData.isCurrentUser));
      if (index === -1) {
        // If updating current user specifically
        const currIdx = employees.findIndex(e => e.isCurrentUser);
        if (currIdx !== -1) {
          employees[currIdx] = { ...employees[currIdx], ...updateData, updatedAt: new Date().toISOString() };
          saveCollection(KEYS.EMPLOYEES, employees);
          return employees[currIdx];
        }
        throw new Error('Employee not found');
      }

      employees[index] = { ...employees[index], ...updateData, updatedAt: new Date().toISOString() };
      saveCollection(KEYS.EMPLOYEES, employees);
      return employees[index];
    });
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

      // Strict tenant isolation: regular employees can ONLY view their own leaves
      if (!isPrivileged && authUser) {
        leaves = leaves.filter(l =>
          l.employeeId === authUser._id ||
          l.employee === authUser._id ||
          l.employeeCode === authUser.employeeCode ||
          l.employeeId === authUser.employeeCode ||
          (l.employeeName && authUser.name && l.employeeName.toLowerCase() === authUser.name.toLowerCase())
        );
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
      employeeRole: leaveData.employeeRole || authUser?.role || 'Team Member'
    };
    return fetchWithFallback(`${API_BASE}/leaves`, {
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
  },

  async updateLeaveStatus(leaveId, status, approverName = 'HR Admin', rejectionReason = '') {
    return fetchWithFallback(`${API_BASE}/leaves/${leaveId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, approvedBy: approverName, rejectionReason })
    }, async () => {
      const leaves = getCollection(KEYS.LEAVES);
      const index = leaves.findIndex(l => l._id === leaveId);
      if (index === -1) throw new Error('Leave request not found');

      const targetLeave = leaves[index];
      const prevStatus = targetLeave.status;

      targetLeave.status = status;
      targetLeave.approvedBy = status === 'approved' ? approverName : null;
      targetLeave.rejectedBy = status === 'rejected' ? approverName : null;
      targetLeave.rejectionReason = status === 'rejected' ? (rejectionReason || 'Declined by reviewer') : null;
      targetLeave.actionBy = approverName;
      targetLeave.actionDate = new Date().toISOString();
      targetLeave.actionDateFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      targetLeave.isAcknowledged = false;
      targetLeave.updatedAt = new Date().toISOString();

      leaves[index] = targetLeave;
      saveCollection(KEYS.LEAVES, leaves);

      // Exact mathematical adjustment of employee leave balance
      if (prevStatus !== status) {
        let employees = getCollection(KEYS.EMPLOYEES);
        const empIdx = employees.findIndex(e => e._id === targetLeave.employeeId);
        if (empIdx >= 0) {
          const emp = employees[empIdx];
          const balance = { ...(emp.leaveBalance || { casual: 8, sick: 6, earned: 12, maternity: 0 }) };
          const typeKeyMap = {
            'Casual Leave': 'casual',
            'Sick Leave': 'sick',
            'Earned Leave': 'earned',
            'Maternity/Paternity': 'maternity'
          };
          const key = typeKeyMap[targetLeave.leaveType] || 'casual';
          const days = Number(targetLeave.durationDays) || 1;

          if (status === 'approved' && prevStatus !== 'approved') {
            balance[key] = Math.max(0, (balance[key] || 0) - days);

            // Connect approved leave into Attendance Matrix
            try {
              let attendance = getCollection(KEYS.ATTENDANCE) || [];
              const start = new Date(targetLeave.startDate);
              const end = new Date(targetLeave.endDate || targetLeave.startDate);
              const cur = new Date(start);
              while (cur <= end) {
                const dateStr = cur.toISOString().split('T')[0];
                const existingIdx = attendance.findIndex(a => 
                  a.date === dateStr && (a.employeeId === targetLeave.employeeId || a.employeeCode === emp?.employeeCode)
                );
                const leaveRecord = {
                  _id: existingIdx >= 0 ? attendance[existingIdx]._id : `att_leave_${Date.now()}_${dateStr}`,
                  employeeId: targetLeave.employeeId,
                  employeeCode: emp?.employeeCode || '',
                  employeeName: targetLeave.employeeName || emp?.name || '',
                  date: dateStr,
                  status: 'on_leave',
                  totalWorkingHours: 0,
                  notes: `Approved Leave: ${targetLeave.leaveType || 'Leave'}`
                };
                if (existingIdx >= 0) {
                  attendance[existingIdx] = { ...attendance[existingIdx], ...leaveRecord };
                } else {
                  attendance.push(leaveRecord);
                }
                cur.setDate(cur.getDate() + 1);
              }
              saveCollection(KEYS.ATTENDANCE, attendance);
              window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
            } catch (attErr) {
              console.warn('Error updating attendance for approved leave:', attErr);
            }

            // Create system-wide audit record
            try {
              this.createAttendanceAuditLog({
                type: 'leave_approved',
                date: new Date().toISOString().split('T')[0],
                employeeId: targetLeave.employeeId,
                employeeName: targetLeave.employeeName,
                note: `Leave approved by ${approverName || 'HR/Admin'} from ${targetLeave.startDate} to ${targetLeave.endDate}`
              });
            } catch (auditErr) {}
          } else if (prevStatus === 'approved' && status !== 'approved') {
            balance[key] = (balance[key] || 0) + days;
          }
          emp.leaveBalance = balance;
          employees[empIdx] = emp;
          saveCollection(KEYS.EMPLOYEES, employees);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
        }
      }

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));
      window.dispatchEvent(new CustomEvent('ems_leaves_updated', { detail: { leaveId, status, approverName } }));

      return targetLeave;
    });
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
    return fetchWithFallback(`${API_BASE}/leaves/${leaveId}`, {
      method: 'DELETE'
    }, async () => {
      let leaves = getCollection(KEYS.LEAVES);
      leaves = leaves.filter(l => l._id !== leaveId);
      saveCollection(KEYS.LEAVES, leaves);
      return { success: true };
    });
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

      const finalClockIn = ['present', 'late', 'half_day'].includes(status) ? (effectiveClockIn || '09:15 AM') : null;
      const finalClockOut = ['present', 'late', 'half_day'].includes(status) ? (effectiveClockOut || null) : null;

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
        clockOut: finalClockOut,
        totalWorkingHours: computedHours || (attendanceData.totalWorkingHours ? parseFloat(attendanceData.totalWorkingHours) : 0),
        isLate: isLateCalc,
        lateByMinutes,
        notes: notes || '',
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

  async createAttendanceAuditLog(auditData) {
    const authUser = getAuthUser();
    const enriched = {
      _id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      date: auditData.date || new Date().toISOString().split('T')[0],
      timeFormatted: auditData.timeFormatted || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      actor: auditData.actor || (authUser?.isAdmin ? 'admin' : 'employee'),
      actorId: auditData.actorId || authUser?._id || authUser?.employeeCode || 'unknown',
      actorName: auditData.actorName || authUser?.name || 'User',
      ...auditData
    };

    return fetchWithFallback(`${API_BASE}/attendance/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(enriched)
    }, async () => {
      const logs = getCollection(KEYS.ATTENDANCE_AUDIT);
      logs.unshift(enriched);
      saveCollection(KEYS.ATTENDANCE_AUDIT, logs);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE_AUDIT } }));
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
          clockInTime: '09:30 AM',
          clockIn: '09:30 AM',
          clockOutTime: nowStr,
          clockOut: nowStr,
          totalWorkingHours: 8,
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
  // 🗓️ COMPANY HOLIDAYS
  // =========================================================================

  async getHolidays(year = 2026, search = '') {
    const query = new URLSearchParams();
    if (year) query.append('year', String(year));
    if (search) query.append('search', search);

    return fetchWithFallback(`${API_BASE}/holidays?${query.toString()}`, { method: 'GET' }, async () => {
      let holidays = getCollection(KEYS.HOLIDAYS);
      if (year) {
        holidays = holidays.filter(h => h.date.startsWith(String(year)));
      }
      if (search) {
        const q = search.toLowerCase();
        holidays = holidays.filter(h => 
          h.name.toLowerCase().includes(q) ||
          h.type.toLowerCase().includes(q) ||
          h.description?.toLowerCase().includes(q)
        );
      }
      return holidays.sort((a, b) => a.date.localeCompare(b.date));
    });
  },

  async createHoliday(holidayData) {
    return fetchWithFallback(`${API_BASE}/holidays`, {
      method: 'POST',
      body: JSON.stringify(holidayData)
    }, async () => {
      const holidays = getCollection(KEYS.HOLIDAYS);
      const newHoliday = {
        _id: `hol_${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...holidayData
      };
      holidays.push(newHoliday);
      saveCollection(KEYS.HOLIDAYS, holidays);
      return newHoliday;
    });
  },

  async deleteHoliday(holidayId) {
    return fetchWithFallback(`${API_BASE}/holidays/${holidayId}`, {
      method: 'DELETE'
    }, async () => {
      let holidays = getCollection(KEYS.HOLIDAYS);
      holidays = holidays.filter(h => h._id !== holidayId);
      saveCollection(KEYS.HOLIDAYS, holidays);
      return { success: true };
    });
  },

  // =========================================================================
  // 🏆 EMPLOYEE APPRECIATIONS & AWARDS
  // =========================================================================

  async getAppreciations(filters = {}) {
    const query = new URLSearchParams();
    if (filters.employeeId && filters.employeeId !== 'all') query.append('employeeId', filters.employeeId);
    if (filters.search) query.append('search', filters.search);

    return fetchWithFallback(`${API_BASE}/appreciations?${query.toString()}`, { method: 'GET' }, async () => {
      let appreciations = getCollection(KEYS.APPRECIATIONS);

      if (filters.search) {
        const q = filters.search.toLowerCase();
        appreciations = appreciations.filter(a => 
          a.givenToName?.toLowerCase().includes(q) ||
          a.awardName?.toLowerCase().includes(q) ||
          a.appreciationNote?.toLowerCase().includes(q)
        );
      }
      if (filters.employeeId && filters.employeeId !== 'all') {
        appreciations = appreciations.filter(a => a.givenToId === filters.employeeId);
      }

      return appreciations.sort((a, b) => (b.givenOn || '').localeCompare(a.givenOn || ''));
    });
  },

  async createAppreciation(appreciationData) {
    return fetchWithFallback(`${API_BASE}/appreciations`, {
      method: 'POST',
      body: JSON.stringify(appreciationData)
    }, async () => {
      const appreciations = getCollection(KEYS.APPRECIATIONS);
      const newAppreciation = {
        _id: `app_${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...appreciationData
      };
      appreciations.unshift(newAppreciation);
      saveCollection(KEYS.APPRECIATIONS, appreciations);
      return newAppreciation;
    });
  },

  async deleteAppreciation(appreciationId) {
    return fetchWithFallback(`${API_BASE}/appreciations/${appreciationId}`, {
      method: 'DELETE'
    }, async () => {
      let appreciations = getCollection(KEYS.APPRECIATIONS);
      appreciations = appreciations.filter(a => a._id !== appreciationId);
      saveCollection(KEYS.APPRECIATIONS, appreciations);
      return { success: true };
    });
  }
};
