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

  const getInitialFormData = () => {
    const today = new Date().toISOString().split('T')[0];
    const myId = activeUser?._id || (employees && employees[0]?._id) || '';
    const approvers = (employees || []).filter(e => String(e._id) !== String(myId) && canApproveLeaves(e));
    const best = getBestApprover(approvers) || (employees || []).find(e => String(e._id) !== String(myId) && (e.isAdmin || e.employeeCode === 'ADM-001'));
    return {
      employeeId: myId,
      appliedToId: best?._id || '',
      leaveType: 'Casual Leave',
      startDate: today,
      endDate: today,
      durationType: 'full', // 'full', 'first_half', 'second_half'
      reason: '',
      isPaid: true
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

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

  // Always completely fresh form reset whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
    }
  }, [isOpen, activeUser, employees]);

  const [submitting, setSubmitting] = useState(false);

  const selectedEmp = (employees || []).find(e => String(e._id) === String(formData.employeeId)) || activeUser || employees[0];
  const selectedApprover = potentialApprovers.find(e =>
    (e._id && String(e._id) === String(formData.appliedToId)) ||
    (e.id && String(e.id) === String(formData.appliedToId)) ||
    (e.employeeCode && String(e.employeeCode) === String(formData.appliedToId))
  ) || potentialApprovers[0];

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
        employee: selectedEmp._id,
        employeeId: selectedEmp._id,
        employeeCode: selectedEmp.employeeCode || '',
        employeeEmail: selectedEmp.email || '',
        employeeName: selectedEmp.name,
        employeeAvatar: selectedEmp.avatar || '',
        employeeRole: selectedEmp.role || 'Member',
        appliedToId: selectedApprover?._id || '',
        appliedToCode: selectedApprover?.employeeCode || '',
        appliedToEmail: selectedApprover?.email || '',
        appliedToName: selectedApprover?.name || 'Reviewer',
        appliedToRole: selectedApprover?.role || 'Approver',
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

      setFormData(getInitialFormData());
      onClose();
    } catch (err) {
      console.error(err);
      addToast(err?.message || 'Failed to submit leave request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(getInitialFormData());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Apply For Leave"
      subtitle="Submit a new leave request. Your selected reviewer will receive a notification to accept or deny."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Applicant Employee & Approver Grid (2-Column) */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Employee Applying */}
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              Applying Employee *
            </label>
            {!isPrivileged ? (
              <div className="h-[42px] px-3 rounded-lg bg-slate-100 border border-slate-300 flex items-center gap-2 text-[13px] font-bold text-slate-900">
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
                className="filter-select w-full h-[42px] rounded-lg [color-scheme:light] bg-white text-slate-900"
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id} className="bg-white text-slate-900">
                    {emp.name} ({emp.role}) {emp._id === activeUser?._id ? "— You" : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Send Request To (Approver / Manager) */}
          <div>
            <label className="block text-[13px] font-bold text-blue-800 mb-1.5">
              Send Request To (Select Approver / Manager / HR) *
            </label>
            <select
              value={formData.appliedToId}
              onChange={(e) => setFormData({ ...formData, appliedToId: e.target.value })}
              className="filter-select w-full h-[42px] rounded-lg border border-blue-500 bg-blue-50 [color-scheme:light] text-slate-900"
            >
              {potentialApprovers.length === 0 ? (
                <option value="">No authorized approvers found</option>
              ) : (
                potentialApprovers.map(emp => (
                  <option key={emp._id} value={emp._id} className="bg-white text-slate-900">
                    {emp.name} — {emp.role || 'Reviewer'}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Leave Type */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
            Leave Type *
          </label>
          <select
            value={formData.leaveType}
            onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
            className="filter-select w-full h-10 rounded-lg [color-scheme:light] bg-white text-slate-900"
          >
            <option value="Casual Leave" className="bg-white text-slate-900">Casual Leave (CL)</option>
            <option value="Sick Leave" className="bg-white text-slate-900">Sick Leave (SL)</option>
            <option value="Earned Leave" className="bg-white text-slate-900">Earned Leave (EL)</option>
            <option value="Maternity/Paternity" className="bg-white text-slate-900">Maternity / Paternity Leave</option>
            <option value="Unpaid Leave" className="bg-white text-slate-900">Unpaid Leave</option>
          </select>
        </div>

        {/* Date Selection Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              From Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="filter-input w-full h-10 pl-3 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
              To Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="filter-input w-full h-10 pl-3 rounded-lg"
              required
            />
          </div>
        </div>

        {/* Duration Type (Full Day / Half Day) */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
            Duration Mode
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-[13px] cursor-pointer font-medium">
              <input
                type="radio"
                name="durationType"
                checked={formData.durationType === 'full'}
                onChange={() => setFormData({ ...formData, durationType: 'full' })}
              />
              Full Day(s)
            </label>
            <label className="flex items-center gap-1.5 text-[13px] cursor-pointer font-medium">
              <input
                type="radio"
                name="durationType"
                checked={formData.durationType === 'first_half'}
                onChange={() => setFormData({ ...formData, durationType: 'first_half' })}
              />
              First Half
            </label>
            <label className="flex items-center gap-1.5 text-[13px] cursor-pointer font-medium">
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
        <div className={`border rounded-lg py-2.5 px-3.5 flex justify-between items-center text-[12.5px] ${isBalanceExceeded ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div>
            <span className="text-slate-600 font-medium">Calculated Duration: </span>
            <strong className={`text-[13px] font-bold ${isBalanceExceeded ? 'text-red-600' : 'text-green-600'}`}>
              {isEndBeforeStart ? 'Invalid Date Range' : `${calculatedDays} Day${calculatedDays > 1 ? 's' : ''}`}
            </strong>
          </div>
          {availableBalance !== null && (
            <div className={`text-xs ${isBalanceExceeded ? 'text-red-600' : 'text-green-800'}`}>
              Available Balance: <strong>{availableBalance} Days</strong>
            </div>
          )}
        </div>

        {isBalanceExceeded && (
          <div className="text-[11.5px] text-red-600 bg-red-100 py-1.5 px-2.5 rounded-md">
            ⚠️ Notice: Requested duration ({calculatedDays} days) exceeds available quota ({availableBalance} days).
          </div>
        )}

        {/* Reason Text */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
            Reason for Leave *
          </label>
          <textarea
            rows={3}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Please specify the reason for your leave request..."
            className="w-full py-2.5 px-3 border border-slate-300 rounded-lg text-[13px] outline-none resize-y font-inherit"
            required
          />
        </div>

        {/* Paid / Unpaid toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPaidCheck"
            checked={formData.isPaid}
            onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
          />
          <label htmlFor="isPaidCheck" className="text-[13px] text-slate-700 cursor-pointer font-medium">
            Paid Leave (Leave balance will be deducted upon approval)
          </label>
        </div>

        {/* Modal Buttons */}
        <div className="flex justify-end gap-2.5 mt-3">
          <button type="button" onClick={onClose} className="btn btn-outline py-[9px] px-[18px] rounded-lg">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary py-[9px] px-[22px] rounded-lg font-bold">
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NewLeaveModal;
