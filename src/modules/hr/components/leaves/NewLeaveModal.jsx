import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { canApproveLeaves, isAdmin } from '../../../../shared/utils/permissionUtils';
import { UserCheck, ShieldAlert, Calendar, Clock, AlertCircle } from 'lucide-react';

export const NewLeaveModal = ({ isOpen, onClose }) => {
  const { employees, currentUser: hrUser, applyLeave } = useHR();
  const { currentUser: authUser } = useAuth();
  const { addToast } = useToast();

  // 1. Resolve Active Logged In Employee from Auth or Storage
  const activeUser = useMemo(() => {
    if (authUser && (authUser._id || authUser.employeeCode || authUser.email)) return authUser;
    if (hrUser && (hrUser._id || hrUser.employeeCode || hrUser.email)) return hrUser;
    try {
      const s = localStorage.getItem('ems_auth_session');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && (parsed._id || parsed.employeeCode || parsed.email)) return parsed.user || parsed;
      }
    } catch (_) {}
    return employees?.[0] || null;
  }, [authUser, hrUser, employees]);

  // Only Master Administrator can apply on behalf of other employees; regular employees apply for themselves
  const isPrivileged = useMemo(() => {
    if (!activeUser) return false;
    return activeUser.employeeCode === 'ADM-001' ||
      activeUser.isSuperAdmin ||
      activeUser.isAdmin ||
      activeUser.systemRole === 'admin' ||
      (activeUser.role || '').toLowerCase() === 'admin' ||
      (activeUser.role || '').toLowerCase() === 'administrator';
  }, [activeUser]);

  const currentApplicantId = activeUser?._id || (employees && employees[0]?._id) || '';

  // Helper to pick the best authority approver (Admin or HR Manager)
  const getBestApprover = (list) => {
    if (!list || list.length === 0) return null;
    return list.find(e => 
      e.employeeCode === 'ADM-001' || e.isSuperAdmin || e.isAdmin || (e.role || '').toLowerCase().includes('admin')
    ) || list.find(e => 
      (e.role || '').toLowerCase().includes('hr manager') || e.systemRole === 'hr'
    ) || list[0];
  };

  const [formData, setFormData] = useState({
    employeeId: currentApplicantId,
    appliedToId: '',
    leaveType: 'Casual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    durationType: 'full', // 'full', 'first_half', 'second_half'
    reason: '',
    isPaid: true
  });

  // 2. Strict Approvers Filter: ONLY employees with actual leave approval authority
  const potentialApprovers = useMemo(() => {
    const applicantId = formData.employeeId || activeUser?._id;
    const applicantCode = activeUser?.employeeCode;

    let approvers = (employees || []).filter(e => {
      // Applicant cannot approve their own leave
      if (String(e._id) === String(applicantId)) return false;
      if (applicantCode && e.employeeCode && e.employeeCode === applicantCode) return false;
      // Must have actual permission to approve leaves (Admin, HR Manager, or granted approveLeaves)
      return canApproveLeaves(e);
    });

    // Safety Fallback: Ensure at least Administrator or HR Manager is available
    if (approvers.length === 0) {
      approvers = (employees || []).filter(e => {
        if (String(e._id) === String(applicantId)) return false;
        return e.isAdmin || e.isSuperAdmin || e.employeeCode === 'ADM-001' || e.email === 'admin@inforag.com' || (e.role || '').toLowerCase().includes('admin') || (e.role || '').toLowerCase().includes('hr manager');
      });
    }

    return approvers;
  }, [employees, formData.employeeId, activeUser]);

  // Always auto-fill current logged in applicant & valid approver when modal opens
  useEffect(() => {
    if (isOpen && activeUser?._id) {
      const myId = activeUser._id;
      const approvers = (employees || []).filter(e => String(e._id) !== String(myId) && canApproveLeaves(e));
      const best = getBestApprover(approvers) || (employees || []).find(e => String(e._id) !== String(myId) && (e.isAdmin || e.employeeCode === 'ADM-001'));

      setFormData(prev => ({
        ...prev,
        employeeId: myId,
        appliedToId: best?._id || ''
      }));
    }
  }, [isOpen, activeUser, employees]);

  const [submitting, setSubmitting] = useState(false);

  const selectedEmp = (employees || []).find(e => e._id === formData.employeeId) || activeUser || employees[0];
  const selectedApprover = potentialApprovers.find(e => e._id === formData.appliedToId) || potentialApprovers[0];

  // Robust calendar-based date calculation
  const getDurationDays = () => {
    if (formData.durationType !== 'full') return 0.5;
    if (!formData.startDate || !formData.endDate) return 0;
    const [sy, sm, sd] = formData.startDate.split('-').map(Number);
    const [ey, em, ed] = formData.endDate.split('-').map(Number);
    const s = new Date(sy, sm - 1, sd);
    const e = new Date(ey, em - 1, ed);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
    return diff < 0 ? -1 : diff + 1;
  };

  const rawDiff = getDurationDays();
  const isEndBeforeStart = rawDiff < 0;
  const calculatedDays = isEndBeforeStart ? 0 : rawDiff;

  const typeKeyMap = {
    'Casual Leave': 'casual',
    'Sick Leave': 'sick',
    'Earned Leave': 'earned',
    'Maternity/Paternity': 'maternity'
  };
  const balanceKey = typeKeyMap[formData.leaveType];
  const availableBalance = balanceKey && selectedEmp?.leaveBalance ? (selectedEmp.leaveBalance[balanceKey] || 0) : null;
  const isBalanceExceeded = availableBalance !== null && formData.leaveType !== 'Unpaid Leave' && formData.isPaid && calculatedDays > availableBalance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEndBeforeStart) {
      addToast('To Date cannot be earlier than From Date.', 'error');
      return;
    }
    if (calculatedDays <= 0) {
      addToast('Invalid duration. Leave duration must be at least 0.5 days.', 'error');
      return;
    }
    if (!formData.reason.trim()) {
      addToast('Please provide a valid reason for leave.', 'error');
      return;
    }
    // Strict approver validation: must exist and have permission to approve leaves
    if (!selectedApprover || !selectedApprover._id) {
      addToast('Please select a valid reviewer who has permission to approve leaves.', 'error');
      return;
    }
    // Strict self-approval prevention: applicant cannot approve own leave
    if (selectedEmp._id === selectedApprover._id || formData.employeeId === formData.appliedToId) {
      addToast('Security restriction: You cannot assign yourself as the leave approver. Please select a manager or HR.', 'error');
      return;
    }
    // Quota / Balance verification
    if (isBalanceExceeded && formData.isPaid && formData.leaveType !== 'Unpaid Leave') {
      addToast(`Cannot apply: Requested ${calculatedDays} day(s) exceeds your available ${formData.leaveType} balance (${availableBalance} days). Please select Unpaid Leave or adjust dates.`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      
      let durationText = `${calculatedDays} Day${calculatedDays > 1 ? 's' : ''}`;
      if (formData.durationType === 'first_half') durationText = 'Half Day (First Half)';
      else if (formData.durationType === 'second_half') durationText = 'Half Day (Second Half)';

      const finalEndDate = formData.durationType !== 'full' ? formData.startDate : formData.endDate;

      await applyLeave({
        employeeId: selectedEmp._id,
        employeeName: selectedEmp.name,
        employeeAvatar: selectedEmp.avatar || '',
        employeeRole: selectedEmp.role || 'Member',
        appliedToId: selectedApprover?._id || '',
        appliedToName: selectedApprover?.name || 'HR Admin',
        appliedToRole: selectedApprover?.role || 'Administrator',
        appliedToAvatar: selectedApprover?.avatar || '',
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: finalEndDate,
        durationDays: calculatedDays,
        durationText: durationText,
        reason: formData.reason.trim(),
        isPaid: formData.isPaid,
        status: 'pending'
      });

      onClose();
    } catch (err) {
      console.error(err);
      addToast(err?.message || 'Failed to submit leave request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply For Leave"
      subtitle="Submit a new leave request. Your selected reviewer will receive a notification to accept or deny."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Applicant Employee & Approver Grid (2-Column) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Employee Applying */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Applying Employee *
            </label>
            {!isPrivileged ? (
              <div style={{
                height: '42px',
                padding: '0 12px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#0f172a'
              }}>
                <span>👤 {selectedEmp?.name || activeUser?.name || 'You'} ({selectedEmp?.role || activeUser?.role || 'Member'})</span>
              </div>
            ) : (
              <select
                value={formData.employeeId}
                onChange={(e) => {
                  const nextEmpId = e.target.value;
                  const nextApprovers = (employees || []).filter(emp => emp._id !== nextEmpId && canApproveLeaves(emp));
                  const nextApprover = nextApprovers.find(emp => emp._id === formData.appliedToId) || getBestApprover(nextApprovers) || nextApprovers[0];
                  setFormData({
                    ...formData,
                    employeeId: nextEmpId,
                    appliedToId: nextApprover?._id || ''
                  });
                }}
                className="filter-select"
                style={{ width: '100%', height: '42px', borderRadius: '8px', colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                    {emp.name} ({emp.role}) {emp._id === activeUser?._id ? "— You" : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Send Request To (Approver / Manager) */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e40af', marginBottom: '6px' }}>
              Send Request To (Approver / HR) *
            </label>
            <select
              value={formData.appliedToId}
              onChange={(e) => setFormData({ ...formData, appliedToId: e.target.value })}
              className="filter-select"
              style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1.5px solid #3b82f6', background: '#eff6ff', colorScheme: 'light', color: '#0f172a' }}
            >
              {potentialApprovers.length === 0 ? (
                <option value="">No authorized approvers found</option>
              ) : (
                potentialApprovers.map(emp => (
                  <option key={emp._id} value={emp._id} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                    {emp.name} — {emp.role || 'Reviewer'}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Leave Type */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
            Leave Type *
          </label>
          <select
            value={formData.leaveType}
            onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
            className="filter-select"
            style={{ width: '100%', height: '40px', borderRadius: '8px', colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            <option value="Casual Leave" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Casual Leave (CL)</option>
            <option value="Sick Leave" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Sick Leave (SL)</option>
            <option value="Earned Leave" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Earned Leave (EL)</option>
            <option value="Maternity/Paternity" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Maternity / Paternity Leave</option>
            <option value="Unpaid Leave" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Unpaid Leave</option>
          </select>
        </div>

        {/* Date Selection Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              From Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px', borderRadius: '8px' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              To Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px', borderRadius: '8px' }}
              required
            />
          </div>
        </div>

        {/* Duration Type (Full Day / Half Day) */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
            Duration Mode
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
              <input
                type="radio"
                name="durationType"
                checked={formData.durationType === 'full'}
                onChange={() => setFormData({ ...formData, durationType: 'full' })}
              />
              Full Day(s)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
              <input
                type="radio"
                name="durationType"
                checked={formData.durationType === 'first_half'}
                onChange={() => setFormData({ ...formData, durationType: 'first_half' })}
              />
              First Half
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
              <input
                type="radio"
                name="durationType"
                checked={formData.durationType === 'second_half'}
                onChange={() => setFormData({ ...formData, durationType: 'second_half' })}
              />
              Second Half
            </label>
          </div>
        </div>

        {/* Live Calculation Preview Strip */}
        <div style={{
          background: isBalanceExceeded ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${isBalanceExceeded ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '8px',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12.5px'
        }}>
          <div>
            <span style={{ color: '#475569', fontWeight: '500' }}>Calculated Duration: </span>
            <strong style={{ color: isBalanceExceeded ? '#dc2626' : '#16a34a', fontSize: '13px' }}>
              {isEndBeforeStart ? 'Invalid Date Range' : `${calculatedDays} Day${calculatedDays > 1 ? 's' : ''}`}
            </strong>
          </div>
          {availableBalance !== null && (
            <div style={{ fontSize: '12px', color: isBalanceExceeded ? '#dc2626' : '#166534' }}>
              Available Balance: <strong>{availableBalance} Days</strong>
            </div>
          )}
        </div>

        {isBalanceExceeded && (
          <div style={{ fontSize: '11.5px', color: '#dc2626', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px' }}>
            ⚠️ Notice: Requested duration ({calculatedDays} days) exceeds available quota ({availableBalance} days).
          </div>
        )}

        {/* Reason Text */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
            Reason for Leave *
          </label>
          <textarea
            rows={3}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Please specify the reason for your leave request..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            required
          />
        </div>

        {/* Paid / Unpaid toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="isPaidCheck"
            checked={formData.isPaid}
            onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
          />
          <label htmlFor="isPaidCheck" style={{ fontSize: '13px', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
            Paid Leave (Leave balance will be deducted upon approval)
          </label>
        </div>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '9px 18px', borderRadius: '8px' }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '9px 22px', borderRadius: '8px', fontWeight: '700' }}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NewLeaveModal;
