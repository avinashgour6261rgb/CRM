import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { hrService } from '../services/hrService';
import { useToast } from '../../../shared/context/ToastContext';
import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';

const HRContext = createContext();

export const HRProvider = ({ children }) => {
  const { addToast } = useToast();

  const [employees, setEmployees] = useState(() => getCollection(KEYS.EMPLOYEES) || []);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const s = localStorage.getItem('ems_auth_session');
      if (s) {
        const parsed = JSON.parse(s);
        return parsed?.user || parsed;
      }
    } catch {}
    return null;
  });
  const [leaves, setLeaves] = useState(() => getCollection(KEYS.LEAVES) || []);
  const [attendance, setAttendance] = useState(() => getCollection(KEYS.ATTENDANCE) || []);
  const [holidays, setHolidays] = useState(() => getCollection(KEYS.HOLIDAYS) || []);
  const [appreciations, setAppreciations] = useState(() => getCollection(KEYS.APPRECIATIONS) || []);
  const [auditLogs, setAuditLogs] = useState(() => getCollection(KEYS.ATTENDANCE_AUDIT) || []);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const [loading, setLoading] = useState(false);
  const isFetchingRef = React.useRef(false);
  const debounceTimerRef = React.useRef(null);

  // Load all initial data from MongoDB Atlas / LocalStorage fallback
  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        hrService.getEmployees(),
        hrService.getCurrentUser(),
        hrService.getLeaves({
          employeeId: selectedEmployeeId,
          search: searchQuery,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }),
        hrService.getMonthlyAttendance(selectedMonth, selectedYear, selectedEmployeeId),
        hrService.getHolidays(selectedYear, searchQuery),
        hrService.getAppreciations({ employeeId: selectedEmployeeId, search: searchQuery }),
        hrService.getAttendanceAuditLogs({ employeeId: selectedEmployeeId, month: selectedMonth, year: selectedYear })
      ]);

      const [empsRes, currRes, lvsRes, attsRes, holsRes, appsRes, audsRes] = results;

      const emps = empsRes.status === 'fulfilled' && empsRes.value ? empsRes.value : (getCollection(KEYS.EMPLOYEES) || []);
      const curr = currRes.status === 'fulfilled' ? currRes.value : null;
      const lvs = lvsRes.status === 'fulfilled' && lvsRes.value ? lvsRes.value : (getCollection(KEYS.LEAVES) || []);
      const atts = attsRes.status === 'fulfilled' && attsRes.value ? attsRes.value : (getCollection(KEYS.ATTENDANCE) || []);
      const hols = holsRes.status === 'fulfilled' && holsRes.value ? holsRes.value : (getCollection(KEYS.HOLIDAYS) || []);
      const apps = appsRes.status === 'fulfilled' && appsRes.value ? appsRes.value : (getCollection(KEYS.APPRECIATIONS) || []);
      const auds = audsRes.status === 'fulfilled' && audsRes.value ? audsRes.value : (getCollection(KEYS.ATTENDANCE_AUDIT) || []);

      // Smart Merging: preserve any local leaves created recently or pending sync
      const localLeaves = getCollection(KEYS.LEAVES) || [];
      const serverLeaves = Array.isArray(lvs) ? lvs : [];
      const serverIds = new Set(serverLeaves.map(l => String(l._id || l.id)));

      // Keep any local leaves that were created recently (last 90s) or have temporary IDs (e.g. leave_...)
      const unSyncedLocalLeaves = localLeaves.filter(l => {
        const id = String(l._id || l.id || '');
        if (!id) return false;
        if (serverIds.has(id)) return false; // already on server
        const isLocalTemporary = id.startsWith('leave_');
        const createdAtTime = l.createdAt ? new Date(l.createdAt).getTime() : (l.appliedOn ? new Date(l.appliedOn).getTime() : 0);
        const isRecent = (Date.now() - createdAtTime) < 90000;
        return isLocalTemporary || isRecent;
      });

      const effectiveLeaves = [...unSyncedLocalLeaves, ...serverLeaves];

      setEmployees(emps || []);
      if (curr) setCurrentUser(curr);
      setLeaves(effectiveLeaves);

      // Persist to localStorage
      try {
        localStorage.setItem(KEYS.LEAVES, JSON.stringify(effectiveLeaves));
      } catch (_) {}

      // Background Sync: If there are temporary un-synced local leaves and backend is online, sync them to backend
      if (unSyncedLocalLeaves.length > 0) {
        unSyncedLocalLeaves.forEach(async (unsynced) => {
          if (String(unsynced._id || '').startsWith('leave_')) {
            try {
              const { _id, ...leavePayload } = unsynced;
              const res = await hrService.createLeave(leavePayload);
              if (res && res._id && !String(res._id).startsWith('leave_')) {
                let cur = getCollection(KEYS.LEAVES) || [];
                cur = cur.map(item => String(item._id) === String(_id) ? res : item);
                saveCollection(KEYS.LEAVES, cur);
                window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));
              }
            } catch (syncErr) {
              console.warn('Background sync for leave failed:', syncErr);
            }
          }
        });
      }
      setAttendance(atts || []);
      setHolidays(hols || []);
      setAppreciations(apps || []);
      setAuditLogs(auds || []);
    } catch (err) {
      console.warn('Graceful sync fallback in loadData:', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [selectedEmployeeId, searchQuery, dateRange, selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();

    const scheduleDebouncedLoad = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        loadData();
      }, 500);
    };

    // Listen for storage events across tabs or internal updates
    const handleStorageUpdate = (e) => {
      const hrKeys = ['ems_auth_session', 'hrms_employees', 'ems_employees', 'hrms_leaves', 'ems_leaves', 'hrms_attendance', 'ems_attendance', 'hrms_holidays', 'hrms_appreciations', 'ems_attendance_audit_logs', 'all'];
      if (e.detail?.key && hrKeys.includes(e.detail.key)) {
        scheduleDebouncedLoad();
      }
    };
    const handleNativeStorage = (e) => {
      if (e.key === 'ems_auth_session' || e.key === 'hrms_employees' || e.key === 'hrms_leaves') {
        scheduleDebouncedLoad();
      }
    };
    window.addEventListener('hrms_storage_change', handleStorageUpdate);
    window.addEventListener('storage', handleNativeStorage);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener('hrms_storage_change', handleStorageUpdate);
      window.removeEventListener('storage', handleNativeStorage);
    };
  }, [loadData]);

  // ================= EMPLOYEES =================
  const addEmployee = async (empData) => {
    try {
      const created = await hrService.createEmployee(empData);
      setEmployees(prev => [...prev, created]);
      addToast(`Employee "${created.name}" added to database!`, 'success');
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_employees' } }));
      await loadData();
      return created;
    } catch (err) {
      addToast(err?.message || 'Failed to add employee', 'error');
      throw err;
    }
  };

  const updateEmployee = async (employeeId, updateData) => {
    try {
      const updated = await hrService.updateEmployee(employeeId, updateData);
      
      // Instant React memory sync for current user & all employee lists
      setCurrentUser(prev => {
        if (!prev) return updated;
        if (prev._id === employeeId || prev.isCurrentUser) {
          return { ...prev, ...updated };
        }
        return prev;
      });

      setEmployees(prev => prev.map(e => (e._id === employeeId || (e.isCurrentUser && updated.isCurrentUser) ? { ...e, ...updated } : e)));

      addToast('Profile & employee details updated successfully!', 'success');
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_employees' } }));
      await loadData();
      return updated;
    } catch (err) {
      addToast(err?.message || 'Failed to update employee', 'error');
      throw err;
    }
  };

  const deleteEmployee = async (employeeId) => {
    try {
      if (currentUser && (String(currentUser._id) === String(employeeId) || String(currentUser.id) === String(employeeId))) {
        addToast('You cannot delete your own active administrator account!', 'warning');
        return;
      }

      await hrService.deleteEmployee(employeeId);
      setEmployees(prev => prev.filter(e => e._id !== employeeId && e.id !== employeeId));
      addToast('Employee removed from roster', 'info');
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_employees' } }));
      await loadData();
    } catch (err) {
      addToast(err?.message || 'Failed to delete employee', 'error');
      throw err;
    }
  };

  // ================= LEAVES =================
  const applyLeave = async (leaveData) => {
    try {
      const created = await hrService.createLeave(leaveData);
      // Instant React state update
      setLeaves(prev => [created, ...(prev || [])]);
      const reviewer = leaveData.appliedToName || 'reviewer';
      addToast(`Leave request submitted successfully! Sent to ${reviewer} for review.`, 'success');
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_leaves' } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_employees' } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
      await loadData();
      return created;
    } catch (err) {
      addToast(err?.message || 'Failed to submit leave request', 'error');
      throw err;
    }
  };

  const updateLeaveStatus = async (leaveId, status, rejectionReason = '') => {
    try {
      const approver = currentUser?.name || 'HR Admin';
      const actionDateFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await hrService.updateLeaveStatus(leaveId, status, approver, rejectionReason);

      // Instant React memory update with audit logs
      setLeaves(prev => (prev || []).map(l => {
        if (l._id === leaveId || l.id === leaveId) {
          return {
            ...l,
            status,
            approvedBy: status === 'approved' ? approver : null,
            rejectedBy: status === 'rejected' ? approver : null,
            cancelledBy: status === 'cancelled' ? approver : null,
            actionBy: approver,
            actionDate: new Date().toISOString(),
            actionDateFormatted,
            rejectionReason: status === 'rejected' ? (rejectionReason || 'Declined by reviewer') : null,
            cancellationReason: status === 'cancelled' ? (rejectionReason || 'Cancelled by reviewer') : null,
            isAcknowledged: false,
            updatedAt: new Date().toISOString()
          };
        }
        return l;
      }));

      addToast(
        status === 'approved'
          ? `🎉 Leave request approved successfully!`
          : status === 'cancelled'
          ? `Leave request has been cancelled.`
          : `Leave request has been denied.`,
        status === 'approved' ? 'success' : 'info'
      );
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_leaves' } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_employees' } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
      window.dispatchEvent(new CustomEvent('ems_leaves_updated', { detail: { leaveId, status, approver } }));
      await loadData();
    } catch (err) {
      addToast(err?.message || 'Failed to update leave status', 'error');
    }
  };

  const acknowledgeLeave = async (leaveId) => {
    try {
      try {
        const stored = JSON.parse(localStorage.getItem('ems_acknowledged_leaves') || '[]');
        if (!stored.includes(String(leaveId))) {
          stored.push(String(leaveId));
          localStorage.setItem('ems_acknowledged_leaves', JSON.stringify(stored));
        }
      } catch (_) {}
      setLeaves(prev => (prev || []).map(l => String(l._id) === String(leaveId) ? { ...l, isAcknowledged: true } : l));
      await hrService.acknowledgeLeave(leaveId);
    } catch (e) {
      console.warn('Acknowledge leave error:', e);
    }
  };

  const deleteLeave = async (leaveId) => {
    try {
      await hrService.deleteLeave(leaveId);
      setLeaves(prev => (prev || []).filter(l => String(l._id || l.id) !== String(leaveId)));
      // Update local storage
      const leaves = getCollection(KEYS.LEAVES) || [];
      const remaining = leaves.filter(l => String(l._id || l.id) !== String(leaveId));
      localStorage.setItem(KEYS.LEAVES, JSON.stringify(remaining));
      addToast('Leave request deleted successfully', 'info');
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEAVES } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
      window.dispatchEvent(new CustomEvent('ems_leaves_updated', { detail: { leaveId, status: 'deleted' } }));
      await loadData();
    } catch (err) {
      console.error('Failed to delete leave:', err);
      addToast('Failed to delete leave', 'error');
    }
  };

  // ================= ATTENDANCE & AUDIT =================
  const markAttendanceRecord = async (data) => {
    try {
      await hrService.markAttendance(data);
      addToast('Attendance marked successfully!', 'success');
      await loadData();
    } catch (err) {
      addToast('Failed to record attendance', 'error');
    }
  };

  const adminForceClockOut = async (employeeId, auditNote) => {
    try {
      await hrService.adminForceClockOut(employeeId, auditNote);
      addToast('Employee shift forcefully clocked out with audit note', 'success');
      await loadData();
    } catch (err) {
      addToast(err?.message || 'Failed to force clock out', 'error');
    }
  };

  // ================= HOLIDAYS =================
  const addHoliday = async (data) => {
    try {
      await hrService.createHoliday(data);
      addToast('New holiday added to company calendar!', 'success');
      await loadData();
    } catch (err) {
      addToast('Failed to create holiday', 'error');
    }
  };

  const deleteHoliday = async (holidayId) => {
    try {
      await hrService.deleteHoliday(holidayId);
      addToast('Holiday removed from calendar', 'info');
      await loadData();
    } catch (err) {
      addToast('Failed to delete holiday', 'error');
    }
  };

  // ================= APPRECIATIONS =================
  const addAppreciation = async (data) => {
    try {
      await hrService.createAppreciation(data);
      addToast('Appreciation award presented successfully! 🎉', 'success');
      await loadData();
    } catch (err) {
      addToast('Failed to add appreciation', 'error');
    }
  };

  const deleteAppreciation = async (appreciationId) => {
    try {
      await hrService.deleteAppreciation(appreciationId);
      addToast('Appreciation record removed', 'info');
      await loadData();
    } catch (err) {
      addToast('Failed to delete appreciation', 'error');
    }
  };

  const hrContextValue = useMemo(() => ({
    loading,
    employees,
    currentUser,
    leaves,
    attendance,
    auditLogs,
    holidays,
    appreciations,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    selectedEmployeeId,
    setSelectedEmployeeId,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    loadData,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    applyLeave,
    updateLeaveStatus,
    acknowledgeLeave,
    deleteLeave,
    markAttendanceRecord,
    adminForceClockOut,
    addHoliday,
    deleteHoliday,
    addAppreciation,
    deleteAppreciation
  }), [
    loading, employees, currentUser, leaves, attendance, auditLogs,
    holidays, appreciations, selectedMonth, selectedYear,
    selectedEmployeeId, searchQuery, dateRange, loadData,
    addEmployee, updateEmployee, deleteEmployee, applyLeave,
    updateLeaveStatus, acknowledgeLeave, deleteLeave,
    markAttendanceRecord, adminForceClockOut, addHoliday,
    deleteHoliday, addAppreciation, deleteAppreciation
  ]);

  return (
    <HRContext.Provider value={hrContextValue}>
      {children}
    </HRContext.Provider>
  );
};

export const useHR = () => useContext(HRContext);
