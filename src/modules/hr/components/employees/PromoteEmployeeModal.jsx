import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Printer,
  FileText,
  Building2,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { getRoles, canUserAssignRole, recordPromotion } from '../../../../shared/services/roleManagementService';
import { getCompanySettings } from '../../../../shared/services/companySettingsService';

export const PromoteEmployeeModal = ({ isOpen, onClose, employee }) => {
  const { employees, updateEmployee, currentUser } = useHR();
  const { addToast } = useToast();

  const [availableRoles, setAvailableRoles] = useState(getRoles());
  const [selectedRole, setSelectedRole] = useState('');
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Merit-based Performance & Leadership');
  const [remarks, setRemarks] = useState('');
  const [showLetterPreview, setShowLetterPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyInfo = getCompanySettings();

  // Actor status
  const isActorAdmin = currentUser?.isAdmin || currentUser?.role?.toLowerCase().includes('admin') || currentUser?.systemRole === 'admin';

  useEffect(() => {
    if (employee) {
      setSelectedRole(employee.role || '');
      setSelectedDepartment(employee.department || 'Engineering');
      setCustomRoleTitle('');
    }
    setAvailableRoles(getRoles());
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const targetRoleTitle = customRoleTitle.trim() || selectedRole || employee.role;

  const handlePromote = async (e) => {
    e.preventDefault();
    if (!targetRoleTitle) return;

    // Security boundary check: HR cannot create Admin
    if (targetRoleTitle.toLowerCase().includes('admin') && !isActorAdmin) {
      addToast('Security Violation: Only Super Admin can assign Admin privileges!', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Update Employee Record in Context & Storage
      await updateEmployee(employee._id, {
        role: targetRoleTitle,
        department: selectedDepartment
      });

      // 2. Record in Promotion History
      recordPromotion({
        employeeId: employee._id,
        employeeName: employee.name,
        employeeCode: employee.employeeCode,
        employeeAvatar: employee.avatar,
        previousRole: employee.role,
        newRole: targetRoleTitle,
        previousDepartment: employee.department,
        newDepartment: selectedDepartment,
        effectiveDate,
        promotedBy: currentUser?.name || 'Super Admin',
        reason,
        remarks
      });

      addToast({
        title: 'Designation / Post Updated! 🎖️',
        message: `${employee.name} promoted to "${targetRoleTitle}" (${selectedDepartment}).`,
        type: 'success'
      });

      onClose();
    } catch (err) {
      addToast(err?.message || 'Failed to update employee role', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintLetter = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Designation Change & Promotion Engine
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                Upgrade employee post (Junior ➔ Senior, Executive ➔ Lead) with official promotion letters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Employee Header Card */}
        <div style={{
          padding: '14px 24px',
          backgroundColor: '#eff6ff',
          borderBottom: '1px solid #dbeafe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={employee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={employee.name}
              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6' }}
            />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e3a8a' }}>{employee.name}</div>
              <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                Current Role: <strong>{employee.role}</strong> • {employee.employeeCode}
              </div>
            </div>
          </div>
          <span style={{
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            fontSize: '11px',
            fontWeight: '700'
          }}>
            {employee.department}
          </span>
        </div>

        {!showLetterPreview ? (
          /* Form Body */
          <form onSubmit={handlePromote} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Live Role Transition Visualizer */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  Current Designation
                </span>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155' }}>
                  {employee.role}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb' }}>
                <ArrowRight size={22} />
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>
                  Promoted / New Designation
                </span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>
                  {targetRoleTitle || 'Select New Role'}
                </div>
              </div>
            </div>

            {/* Select Role Preset or Custom Input */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Choose From Preset Roles
                </label>
                <select
                  value={selectedRole}
                  onChange={e => {
                    setSelectedRole(e.target.value);
                    setCustomRoleTitle('');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="">-- Choose Role Preset --</option>
                  <optgroup label="System Roles">
                    <option value="Super Admin" disabled={!isActorAdmin}>
                      Super Admin {!isActorAdmin ? '🔒 (Super Admin Only)' : ''}
                    </option>
                    <option value="HR Business Partner">HR Business Partner</option>
                    <option value="Team Leader / Project Lead">Team Leader / Project Lead</option>
                    <option value="Senior Full Stack Developer">Senior Full Stack Developer</option>
                    <option value="Lead UI/UX Designer">Lead UI/UX Designer</option>
                    <option value="Digital Marketing Strategic">Digital Marketing Strategic</option>
                    <option value="Junior Associate Developer">Junior Associate Developer</option>
                    <option value="Junior Graphic Designer">Junior Graphic Designer</option>
                  </optgroup>
                  <optgroup label="Custom Roles">
                    {availableRoles.filter(r => !r.isSystem).map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Or Type Custom Designation / Post
                </label>
                <input
                  type="text"
                  placeholder="e.g. Principal Architect / Vice President"
                  value={customRoleTitle}
                  onChange={e => setCustomRoleTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #3b82f6',
                    fontSize: '13px',
                    outline: 'none',
                    fontWeight: '600'
                  }}
                />
              </div>
            </div>

            {/* Department & Effective Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Assigned Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product Design">Product Design</option>
                  <option value="Marketing & Growth">Marketing & Growth</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Infrastructure">Infrastructure & Cloud</option>
                  <option value="Finance & Operations">Finance & Operations</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Effective Promotion Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
            </div>

            {/* Promotion Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Promotion Reason & Criteria
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="Merit-based Performance & Leadership">Merit-based Performance & Leadership</option>
                <option value="Annual Performance Review & Seniority">Annual Performance Review & Seniority</option>
                <option value="Probation to Permanent Senior Elevation">Probation to Permanent Senior Elevation</option>
                <option value="Department Reorganization & Squad Lead">Department Reorganization & Squad Lead</option>
              </select>
            </div>

            {/* Remarks / Citations */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Management Citation / Recommendation Notes
              </label>
              <textarea
                placeholder="e.g. Promoted to Senior Lead based on exemplary technical delivery, sprint leadership, and mentorship of junior engineers."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            {/* Security Notice */}
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11.5px',
              color: '#92400e'
            }}>
              <ShieldCheck size={16} />
              <span>
                <strong>RBAC Policy:</strong> Super Admin can assign all roles. HR can promote to Team Leads, Seniors & Custom Roles, but cannot create Super Admins.
              </span>
            </div>

            {/* Bottom Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '16px'
            }}>
              <button
                type="button"
                onClick={() => setShowLetterPreview(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <FileText size={16} />
                Preview Promotion Letter
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  {isSubmitting ? 'Promoting...' : 'Confirm Promotion'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Official Promotion Letter Preview */
          <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              border: '2px solid #2563eb',
              borderRadius: '12px',
              padding: '24px 30px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid #2563eb',
                paddingBottom: '14px',
                marginBottom: '18px'
              }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a8a', margin: 0, textTransform: 'uppercase' }}>
                    {companyInfo.companyName}
                  </h2>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                    {companyInfo.address} • {companyInfo.hrEmail || companyInfo.email}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Date: {new Date().toLocaleDateString()}</span>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb' }}>Ref: PROM/{employee.employeeCode}/{new Date().getFullYear()}</div>
                </div>
              </div>

              {/* Salutation */}
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>
                Dear {employee.name},
              </p>

              <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                On behalf of the Management and Human Resources of <strong>{companyInfo.companyName}</strong>, we are thrilled to formally congratulate you on your promotion to the position of:
              </p>

              {/* Position Highlight Box */}
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                margin: '16px 0'
              }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>
                  New Official Designation
                </span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a8a', marginTop: '2px' }}>
                  {targetRoleTitle}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Department: {selectedDepartment} • Effective Date: {effectiveDate}
                </div>
              </div>

              <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                {remarks || 'This elevation reflects your consistent dedication, problem-solving capability, and the high standards of leadership you bring to our organization.'}
              </p>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e2e8f0', marginTop: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{companyInfo.signatoryTitle}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{companyInfo.companyName}</div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  fontSize: '11px',
                  fontWeight: '700'
                }}>
                  ✅ Formally Ratified & Registered
                </div>
              </div>
            </div>

            {/* Letter Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLetterPreview(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ← Back to Config
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrintLetter}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={15} /> Print Promotion Letter
                </button>
                <button
                  type="button"
                  onClick={handlePromote}
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle2 size={15} /> Confirm & Apply Promotion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
