import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { ShieldAlert, AlertCircle, Info } from 'lucide-react';
import { getCompanySettings } from '../../../../shared/services/companySettingsService';

const toTimeInput = (timeStr, fallback = '09:30') => {
  if (!timeStr) return fallback;
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr.substring(0, 5);
  const m = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ampm = (m[3] || '').toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }
  return timeStr.substring(0, 5) || fallback;
};

export const MarkAttendanceModal = ({ isOpen, onClose, initialData = null }) => {
  const { employees, markAttendanceRecord, currentUser } = useHR();
  const companySettings = getCompanySettings();
  const defaultInTime = toTimeInput(companySettings.shiftStartTime, '09:30') + ':00';
  const defaultOutTime = toTimeInput(companySettings.shiftEndTime, '18:30') + ':00';

  const isPrivileged = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.role === 'admin' || currentUser?.role === 'hr';
  const adminIdentifier = currentUser?.employeeCode || currentUser?._id || 'ADM-001';

  const [formData, setFormData] = useState({
    employeeId: 'emp_001',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    clockInTime: defaultInTime,
    clockOutTime: defaultOutTime,
    notes: '',
    auditNote: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        employeeId: initialData.employeeId || 'emp_001',
        date: initialData.date || new Date().toISOString().split('T')[0],
        status: initialData.status || 'present',
        clockInTime: initialData.clockInTime || defaultInTime,
        clockOutTime: initialData.clockOutTime || defaultOutTime,
        notes: initialData.notes || '',
        auditNote: ''
      });
    }
  }, [initialData, defaultInTime, defaultOutTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.date > todayStr && ['present', 'late', 'half_day', 'absent'].includes(formData.status)) {
      alert(`Cannot mark attendance as '${formData.status}' for a future date (${formData.date}). Attendance can only be recorded for today or past dates.`);
      return;
    }

    if (isPrivileged && initialData && !formData.auditNote.trim()) {
      alert('Administrator Override Note is required. Please explain why this record is being modified.');
      return;
    }

    await markAttendanceRecord({
      ...formData,
      isAdminOverride: isPrivileged,
      adminId: adminIdentifier,
      adminName: currentUser?.name || 'Administrator',
      auditNote: formData.auditNote.trim() || formData.notes || 'Attendance record updated'
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Admin Shift Adjustment & Attendance Edit" : "Mark / Edit Attendance Record"}
      subtitle="Adjust daily punch logs, presence status, and timestamps with full audit logging."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Admin Audit Trail Notice */}
        {isPrivileged && (
          <div className="flex items-start gap-2.5 py-2.5 px-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert size={18} color="#d97706" className="shrink-0 mt-0.5" />
            <div>
              <strong>Audit Trail Logging Active:</strong> Manual adjustments made by you will be timestamped and permanently logged under Administrator ID <code>#{adminIdentifier}</code> ({currentUser?.name}).
            </div>
          </div>
        )}

        <div>
          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Employee
          </label>
          <select
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            className="filter-select w-full h-10"
          >
            {employees.map(emp => {
              const isSelf = currentUser && (String(emp._id || emp.id) === String(currentUser._id || currentUser.id) || (emp.employeeCode && currentUser.employeeCode && String(emp.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase()) || (emp.email && currentUser.email && emp.email.toLowerCase() === currentUser.email.toLowerCase()));
              return (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.role}) {isSelf ? "— It's You" : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="filter-input w-full h-10 pl-3"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="filter-select w-full h-10"
            >
              <option value="present">✔️ Present</option>
              <option value="late">⚠️ Late</option>
              <option value="half_day">🌟 Half Day</option>
              <option value="absent">❌ Absent</option>
              <option value="on_leave">✈️ On Leave</option>
              <option value="holiday">⭐ Holiday</option>
              <option value="day_off">📅 Day Off</option>
            </select>
          </div>
        </div>

        {['present', 'late', 'half_day'].includes(formData.status) && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Clock-In Time
              </label>
              <input
                type="time"
                value={toTimeInput(formData.clockInTime, toTimeInput(companySettings.shiftStartTime, '09:30'))}
                onChange={(e) => setFormData({ ...formData, clockInTime: `${e.target.value}:00` })}
                className="filter-input w-full h-10 pl-3"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Clock-Out Time
              </label>
              <input
                type="time"
                value={toTimeInput(formData.clockOutTime, toTimeInput(companySettings.shiftEndTime, '18:30'))}
                onChange={(e) => setFormData({ ...formData, clockOutTime: `${e.target.value}:00` })}
                className="filter-input w-full h-10 pl-3"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            General Notes
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Remote work, doctor appointment, half-day approval"
            className="filter-input w-full h-10 pl-3"
          />
        </div>

        {/* Mandatory Admin Override Reason */}
        {isPrivileged && (
          <div>
            <label className="block text-[13px] font-bold text-red-800 dark:text-red-300 mb-1.5">
              Admin Override Explanation / Audit Note <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.auditNote}
              onChange={(e) => setFormData({ ...formData, auditNote: e.target.value })}
              placeholder="Mandatory: Detail why this attendance/shift record was manually created or modified (e.g., Punch system failure, approved off-site client deployment, manual hour adjustment)..."
              className="w-full min-h-[65px] py-2 px-3 rounded-md border border-red-300 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/30 text-xs text-slate-900 dark:text-slate-100 outline-none font-inherit placeholder:text-slate-400 dark:placeholder:text-slate-500"
              required={!!initialData}
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Recorded by Admin #{adminIdentifier} ({currentUser?.name || 'Administrator'}) in compliance audit log.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2.5 mt-3">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {initialData ? "Save & Log Adjustment" : "Save Record"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
