import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { User, Mail, Briefcase, Building, Calendar, Clock, Sparkles, ShieldAlert, Check } from 'lucide-react';
import { getRoles, canUserAssignRole } from '../../../../shared/services/roleManagementService';

export const AddEmployeeModal = ({ isOpen, onClose }) => {
  const { addEmployee, employees, currentUser } = useHR();
  const [availableRoles, setAvailableRoles] = useState(getRoles());

  // Smart calculation of next available employee code
  const getNextAvailableCode = () => {
    const existingCodes = (employees || []).map(e => e.employeeCode || e.employeeId || '');
    let maxNum = 0;
    existingCodes.forEach(code => {
      const match = String(code).match(/\d+/g);
      if (match) {
        const num = parseInt(match[match.length - 1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const candidate = maxNum > 0 ? maxNum + 1 : (employees?.length || 0) + 1;
    let nextCode = `EMP-${String(candidate).padStart(3, '0')}`;
    
    // Ensure uniqueness
    let counter = candidate;
    while (existingCodes.some(c => c.toLowerCase() === nextCode.toLowerCase())) {
      counter++;
      nextCode = `EMP-${String(counter).padStart(3, '0')}`;
    }
    return nextCode;
  };

  const [formData, setFormData] = useState({
    name: '',
    employeeCode: '',
    email: '',
    role: '',
    department: 'Engineering',
    workMode: 'Office',
    status: 'active',
    joiningDate: new Date().toISOString().split('T')[0],
    leaveBalance: {
      casual: 10,
      sick: 8,
      earned: 15,
      maternity: 0
    },
    startingSalary: 35000,
    bankName: '',
    accountNumber: '',
    upiId: '',
    avatar: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default unique code when modal opens or employees change
  React.useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        employeeCode: prev.employeeCode || getNextAvailableCode()
      }));
    }
  }, [isOpen, employees]);

  // Check for duplicate code in real-time
  const duplicateEmployee = (employees || []).find(e => 
    e.employeeCode?.toLowerCase() === formData.employeeCode?.trim().toLowerCase() ||
    e._id === formData.employeeCode?.trim() ||
    e.employeeId?.toLowerCase() === formData.employeeCode?.trim().toLowerCase()
  );

  const duplicateEmail = (employees || []).find(e =>
    e.email?.toLowerCase() === formData.email?.trim().toLowerCase()
  );

  const isCodeDuplicate = !!duplicateEmployee;
  const isEmailDuplicate = !!duplicateEmail;

  const departments = [
    'Engineering',
    'Product Design',
    'Marketing & Growth',
    'Human Resources',
    'Infrastructure & DevOps',
    'Finance & Operations',
    'Sales & Accounts'
  ];

  const handleAutoGenerate = () => {
    setFormData(prev => ({
      ...prev,
      employeeCode: getNextAvailableCode()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role) {
      alert('Please fill in Name, Email, and Role');
      return;
    }

    if (isCodeDuplicate) {
      alert(`Employee ID "${formData.employeeCode}" is already taken by ${duplicateEmployee.name}. Please enter a unique ID.`);
      return;
    }

    if (isEmailDuplicate) {
      alert(`Email "${formData.email}" is already registered with ${duplicateEmail.name}.`);
      return;
    }

    // Role Security Boundary: HR cannot create Admins
    const userRole = (currentUser?.role || '').toLowerCase();
    const isHR = userRole.includes('hr') || userRole.includes('human resources');
    const isActorAdmin = userRole.includes('admin') || !isHR;

    if (!isActorAdmin && formData.role.toLowerCase().includes('admin')) {
      alert('🔒 Security Rule: HR Managers cannot create or assign Admin accounts. Only Super Admin has this privilege.');
      return;
    }

    try {
      setIsSubmitting(true);
      const empCode = formData.employeeCode.trim().toUpperCase();
      const gross = formData.startingSalary || 35000;
      const basic = Math.round(gross * 0.5);
      const hra = Math.round(basic * 0.4);
      const allowances = Math.max(0, gross - basic - hra);
      const pf = Math.round(basic * 0.08);
      const pt = 200;
      const tds = gross > 50000 ? Math.round(gross * 0.05) : 0;

      try {
        const savedMap = JSON.parse(localStorage.getItem('EMS_SALARY_MAP') || '{}');
        savedMap[empCode] = { basic, hra, allowances, bonus: 0, pf, pt, tds };
        localStorage.setItem('EMS_SALARY_MAP', JSON.stringify(savedMap));
      } catch (e) {}

      await addEmployee({
        ...formData,
        employeeCode: empCode,
        avatar: formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name)}`
      });
      // Reset form
      setFormData({
        name: '',
        employeeCode: '',
        email: '',
        role: '',
        department: 'Engineering',
        joiningDate: new Date().toISOString().split('T')[0],
        leaveBalance: { casual: 10, sick: 8, earned: 15, maternity: 0 },
        startingSalary: 35000,
        avatar: ''
      });
      onClose();
    } catch (err) {
      console.error('Error adding employee:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Employee"
      subtitle="Register new team member. They will instantly appear across HR, Leaves, and Attendance."
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '74vh', overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* Row 1: Full Name & Employee ID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g. Aditi Rao"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="filter-input"
                style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
                required
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: isCodeDuplicate ? '#dc2626' : '#334155' }}>
                Employee ID *
              </label>
              <button
                type="button"
                onClick={handleAutoGenerate}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
                title="Auto-generate next free ID"
              >
                ⚡ Auto-ID
              </button>
            </div>
            <input
              type="text"
              value={formData.employeeCode}
              onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
              className="filter-input"
              style={{
                width: '100%',
                height: '40px',
                paddingLeft: '12px',
                background: isCodeDuplicate ? '#fef2f2' : '#f8fafc',
                border: isCodeDuplicate ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                fontWeight: '600',
                color: isCodeDuplicate ? '#dc2626' : '#0f172a'
              }}
              required
            />
            {isCodeDuplicate ? (
              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: '500' }}>
                ⚠️ Already assigned to <strong>{duplicateEmployee.name}</strong>
              </div>
            ) : formData.employeeCode ? (
              <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px', fontWeight: '500' }}>
                ✓ Employee ID is available
              </div>
            ) : null}
          </div>
        </div>

        {/* Row 2: Work Email & Role */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: isEmailDuplicate ? '#dc2626' : '#334155', marginBottom: '6px' }}>
              Work Email *
            </label>
            <input
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="filter-input"
              style={{
                width: '100%',
                height: '40px',
                paddingLeft: '12px',
                border: isEmailDuplicate ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                background: isEmailDuplicate ? '#fef2f2' : '#ffffff'
              }}
              required
            />
            {isEmailDuplicate && (
              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: '500' }}>
                ⚠️ Email already registered with <strong>{duplicateEmail.name}</strong>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Role / Designation *
            </label>
            <input
              type="text"
              list="role-options-list"
              placeholder="e.g. Senior Software Engineer"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
              required
            />
            <datalist id="role-options-list">
              {availableRoles.map(r => (
                <option key={r.id} value={r.name}>
                  {r.category} ({r.isSystem ? 'System Role' : 'Custom Role'})
                </option>
              ))}
              <option value="Senior Software Engineer">Core Workforce</option>
              <option value="Junior Associate Engineer">Entry Level</option>
              <option value="Team Leader">Project Leadership</option>
              <option value="HR Business Partner">Human Resources</option>
            </datalist>
          </div>
        </div>

        {/* Row 3: Department, Work Mode & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="filter-select"
              style={{ width: '100%', height: '40px' }}
            >
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Work Mode
            </label>
            <select
              value={formData.workMode || 'Office'}
              onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
              className="filter-select"
              style={{ width: '100%', height: '40px' }}
            >
              <option value="Office">🏢 Office</option>
              <option value="Remote">🏡 Remote</option>
              <option value="Hybrid">🔄 Hybrid</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Status
            </label>
            <select
              value={formData.status || 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="filter-select"
              style={{ width: '100%', height: '40px' }}
            >
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="contract">Contract</option>
            </select>
          </div>
        </div>

        {/* Row 4: Joining Date */}
        <div>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Joining Date
          </label>
          <input
            type="date"
            value={formData.joiningDate}
            onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
            className="filter-input"
            style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
          />
        </div>

        {/* Row 5: Initial Joining Salary Package */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
          padding: '14px',
          marginTop: '2px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#166534' }}>
              💰 Compensation & Salary (₹):
            </span>
            <span style={{ fontSize: '11px', color: '#15803d', fontWeight: '600' }}>
              Annual CTC: ₹{((formData.startingSalary || 35000) * 12).toLocaleString()} / yr
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#166534', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Monthly Starting Salary (Gross) *
              </label>
              <input
                type="number"
                step="500"
                min="5000"
                placeholder="e.g. 35000"
                value={formData.startingSalary || 35000}
                onChange={(e) => setFormData({ ...formData, startingSalary: Number(e.target.value) })}
                className="filter-input"
                style={{ width: '100%', height: '38px', paddingLeft: '10px', fontWeight: '700', color: '#0f172a' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#166534', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Basic Pay (Auto 50%)
              </label>
              <input
                type="text"
                disabled
                value={`₹${Math.round((formData.startingSalary || 35000) * 0.5).toLocaleString()} / mo`}
                className="filter-input"
                style={{ width: '100%', height: '38px', paddingLeft: '10px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: '600' }}
              />
            </div>
          </div>
        </div>

        {/* Row 6: Initial Leave Quota Setup (Fully visible and never overlapping) */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '14px',
          marginTop: '2px'
        }}>
          <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
            📅 Annual Leave Balance Allotment (Days):
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Casual Leave (CL)</label>
              <input
                type="number"
                min="0"
                value={formData.leaveBalance.casual}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBalance: { ...formData.leaveBalance, casual: Number(e.target.value) }
                })}
                className="filter-input"
                style={{ width: '100%', height: '38px', paddingLeft: '10px', fontWeight: '700' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Sick Leave (SL)</label>
              <input
                type="number"
                min="0"
                value={formData.leaveBalance.sick}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBalance: { ...formData.leaveBalance, sick: Number(e.target.value) }
                })}
                className="filter-input"
                style={{ width: '100%', height: '38px', paddingLeft: '10px', fontWeight: '700' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Earned Leave (EL)</label>
              <input
                type="number"
                min="0"
                value={formData.leaveBalance.earned}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBalance: { ...formData.leaveBalance, earned: Number(e.target.value) }
                })}
                className="filter-input"
                style={{ width: '100%', height: '38px', paddingLeft: '10px', fontWeight: '700' }}
              />
            </div>
          </div>
        </div>

        {/* Row 7: Optional Payment & Bank Details */}
        <div style={{
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: '10px',
          padding: '12px 14px',
          marginTop: '2px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '8px' }}>
            💳 Bank & Payment Details (Optional):
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Bank Name</label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank"
                value={formData.bankName || ''}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="filter-input"
                style={{ width: '100%', height: '34px', paddingLeft: '8px', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Account Number</label>
              <input
                type="text"
                placeholder="e.g. 5010049281..."
                value={formData.accountNumber || ''}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="filter-input"
                style={{ width: '100%', height: '34px', paddingLeft: '8px', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginBottom: '3px' }}>UPI ID</label>
              <input
                type="text"
                placeholder="e.g. name@upi"
                value={formData.upiId || ''}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="filter-input"
                style={{ width: '100%', height: '34px', paddingLeft: '8px', fontSize: '12px' }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button type="button" onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || isCodeDuplicate || isEmailDuplicate}
            style={{
              opacity: isCodeDuplicate || isEmailDuplicate ? 0.6 : 1,
              cursor: isCodeDuplicate || isEmailDuplicate ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Saving Employee...' : 'Register Employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
