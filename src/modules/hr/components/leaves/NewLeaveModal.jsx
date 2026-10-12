import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { UserCheck, ShieldAlert, Calendar, Clock, AlertCircle } from 'lucide-react';

export const NewLeaveModal = ({ isOpen, onClose }) => {
  const { employees, currentUser, applyLeave } = useHR();

  // Potential approvers must exclude the applying employee
  const currentApplicantId = currentUser?._id || 'emp_001';
  const initialApprovers = employees.filter(e => e._id !== currentApplicantId);
  const defaultApprover = initialApprovers.find(e => 
    (e.role?.toLowerCase().includes('admin') || e.role?.toLowerCase().includes('hr') || e.role?.toLowerCase().includes('manager') || e.role?.toLowerCase().includes('lead'))
  ) || initialApprovers[0];

  const [formData, setFormData] = useState({
    employeeId: currentApplicantId,
    appliedToId: defaultApprover?._id || '',
    leaveType: 'Casual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    durationType: 'full', // 'full', 'first_half', 'second_half'
    reason: '',
    isPaid: true
  });

  const [submitting, setSubmitting] = useState(false);

  const potentialApprovers = employees.filter(e => e._id !== formData.employeeId);
  const selectedEmp = employees.find(e => e._id === formData.employeeId) || currentUser || employees[0];
  const selectedApprover = potentialApprovers.find(e => e._id === formData.appliedToId) || potentialApprovers[0];

  // Real-time dynamic duration calculation
  const start = new Date(formData.startDate);
  const end = new Date(formData.endDate);
  const isEndBeforeStart = end < start;
  const rawDiffDays = isEndBeforeStart ? 0 : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const calculatedDays = formData.durationType === 'full' ? rawDiffDays : 0.5;

  const typeKeyMap = {
    'Casual Leave': 'casual',
    'Sick Leave': 'sick',
    'Earned Leave': 'earned',
    'Maternity/Paternity': 'maternity'
  };
  const balanceKey = typeKeyMap[formData.leaveType];
  const availableBalance = balanceKey && selectedEmp?.leaveBalance ? (selectedEmp.leaveBalance[balanceKey] || 0) : null;
  const isBalanceExceeded = availableBalance !== null && formData.leaveType !== 'Unpaid Leave' && calculatedDays > availableBalance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEndBeforeStart) {
      alert('Error: To Date cannot be earlier than From Date.');
      return;
    }
    if (!formData.reason.trim()) {
      alert('Please provide a reason for leave');
      return;
    }

    try {
      setSubmitting(true);
      
      let durationText = `${calculatedDays} Day${calculatedDays > 1 ? 's' : ''}`;
      if (formData.durationType === 'first_half') durationText = 'Half Day (First Half)';
      else if (formData.durationType === 'second_half') durationText = 'Half Day (Second Half)';

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
        endDate: formData.endDate,
        durationDays: calculatedDays,
        durationText: durationText,
        reason: formData.reason.trim(),
        isPaid: formData.isPaid,
        status: 'pending'
      });

      onClose();
    } catch (err) {
      console.error(err);
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
            <select
              value={formData.employeeId}
              onChange={(e) => {
                const nextEmpId = e.target.value;
                const nextApprovers = employees.filter(emp => emp._id !== nextEmpId);
                const nextApprover = nextApprovers.find(emp => emp._id === formData.appliedToId) || nextApprovers[0];
                setFormData({
                  ...formData,
                  employeeId: nextEmpId,
                  appliedToId: nextApprover?._id || ''
                });
              }}
              className="filter-select"
              style={{ width: '100%', height: '42px', borderRadius: '8px' }}
            >
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.role}) {emp._id === currentUser?._id ? "— You" : ''}
                </option>
              ))}
            </select>
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
              style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1.5px solid #3b82f6', background: '#eff6ff' }}
            >
              {potentialApprovers.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} — {emp.role || 'Reviewer'}
                </option>
              ))}
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
            style={{ width: '100%', height: '40px', borderRadius: '8px' }}
          >
            <option value="Casual Leave">Casual Leave (CL)</option>
            <option value="Sick Leave">Sick Leave (SL)</option>
            <option value="Earned Leave">Earned Leave (EL)</option>
            <option value="Maternity/Paternity">Maternity / Paternity Leave</option>
            <option value="Unpaid Leave">Unpaid Leave</option>
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
