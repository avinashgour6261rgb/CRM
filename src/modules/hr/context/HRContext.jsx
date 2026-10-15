import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { hrService } from '../services/hrService';
import { useToast } from '../../../shared/context/ToastContext';

const HRContext = createContext();

export const HRProvider = ({ children }) => {
  const { addToast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [appreciations, setAppreciations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const [loading, setLoading] = useState(true);

  // Load all initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [emps, curr, lvs, atts, hols, apps, auds] = await Promise.all([
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

      setEmployees(emps || []);
      setCurrentUser(curr);
      setLeaves(lvs || []);
      setAttendance(atts || []);
      setHolidays(hols || []);
      setAppreciations(apps || []);
      setAuditLogs(auds || []);
    } catch (err) {
      console.error('Error loading HRMS data:', err);
      addToast('Failed to sync HRMS data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, searchQuery, dateRange, selectedMonth, selectedYear, addToast]);

  useEffect(() => {
    loadData();

    // Listen for storage events across tabs or internal updates
    const handleStorageUpdate = () => loadData();
    window.addEventListener('hrms_storage_change', handleStorageUpdate);
    return () => window.removeEventListener('hrms_storage_change', handleStorageUpdate);
  }, [loadData]);

  // ================= EMPLOYEES =================
  const addEmployee = async (empData) => {
    try {
      const created = await hrService.createEmployee(empData);
      setEmployees(prev => [...prev, created]);
      addToast(`Employee "${created.name}" added to database!`, 'success');
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
      await hrService.deleteEmployee(employeeId);
      setEmployees(prev => prev.filter(e => e._id !== employeeId));
      addToast('Employee removed from roster', 'info');
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_employees' } }));
      await loadData();
    } catch (err) {
      addToast('Failed to delete employee', 'error');
      throw err;
    }
  };

  // ================= LEAVES =================
  const applyLeave = async (leaveData) => {
    try {
      const created = await hrService.createLeave(leaveData);
      // Instant React state update
      setLeaves(prev => [created, ...(prev || [])]);
      addToast('Leave request submitted successfully! HR will review.', 'success');
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_leaves' } }));
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
        if (l._id === leaveId) {
          return {
            ...l,
            status,
            approvedBy: status === 'approved' ? approver : null,
            rejectedBy: status === 'rejected' ? approver : null,
            actionBy: approver,
            actionDate: new Date().toISOString(),
            actionDateFormatted,
            rejectionReason: status === 'rejected' ? (rejectionReason || 'Declined by reviewer') : null,
            isAcknowledged: false,
            updatedAt: new Date().toISOString()
          };
        }
        return l;
      }));

      addToast(
        status === 'approved'
          ? `🎉 Leave request approved successfully!`
          : `Leave request has been denied.`,
        status === 'approved' ? 'success' : 'info'
      );
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_leaves' } }));
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
      setLeaves(prev => (prev || []).filter(l => l._id !== leaveId));
      addToast('Leave request removed', 'info');
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_leaves' } }));
      await loadData();
    } catch (err) {
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

  return (
    <HRContext.Provider value={{
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
    }}>
      {children}
    </HRContext.Provider>
  );
};

export const useHR = () => useContext(HRContext);
