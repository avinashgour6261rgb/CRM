import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { ShieldAlert, AlertCircle, Info } from 'lucide-react';

const toTimeInput = (timeStr, fallback = '09:15') => {
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

  const isPrivileged = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.role === 'admin' || currentUser?.role === 'hr';
  const adminIdentifier = currentUser?.employeeCode || currentUser?._id || 'ADM-001';

  const [formData, setFormData] = useState({
    employeeId: 'emp_001',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    clockInTime: '09:15:00',
    clockOutTime: '18:30:00',
    notes: '',
    auditNote: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        employeeId: initialData.employeeId || 'emp_001',
        date: initialData.date || new Date().toISOString().split('T')[0],
        status: initialData.status || 'present',
        clockInTime: initialData.clockInTime || '09:15:00',
        clockOutTime: initialData.clockOutTime || '18:30:00',
        notes: initialData.notes || '',
        auditNote: ''
      });
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Admin Audit Trail Notice */}
        {isPrivileged && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '10px 14px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#92400e'
          }}>
            <ShieldAlert size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Audit Trail Logging Active:</strong> Manual adjustments made by you will be timestamped and permanently logged under Administrator ID <code>#{adminIdentifier}</code> ({currentUser?.name}).
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Employee
          </label>
          <select
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            className="filter-select"
            style={{ width: '100%', height: '40px' }}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="filter-select"
              style={{ width: '100%', height: '40px' }}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Clock-In Time
              </label>
              <input
                type="time"
                value={toTimeInput(formData.clockInTime, '09:15')}
                onChange={(e) => setFormData({ ...formData, clockInTime: `${e.target.value}:00` })}
                className="filter-input"
                style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Clock-Out Time
              </label>
              <input
                type="time"
                value={toTimeInput(formData.clockOutTime, '18:30')}
                onChange={(e) => setFormData({ ...formData, clockOutTime: `${e.target.value}:00` })}
                className="filter-input"
                style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
              />
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            General Notes
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Remote work, doctor appointment, half-day approval"
            className="filter-input"
            style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
          />
        </div>

        {/* Mandatory Admin Override Reason */}
        {isPrivileged && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#991b1b', marginBottom: '6px' }}>
              Admin Override Explanation / Audit Note <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={formData.auditNote}
              onChange={(e) => setFormData({ ...formData, auditNote: e.target.value })}
              placeholder="Mandatory: Detail why this attendance/shift record was manually created or modified (e.g., Punch system failure, approved off-site client deployment, manual hour adjustment)..."
              style={{
                width: '100%',
                minHeight: '65px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #fca5a5',
                backgroundColor: '#fff5f5',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              required={!!initialData}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Recorded by Admin #{adminIdentifier} ({currentUser?.name || 'Administrator'}) in compliance audit log.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
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
