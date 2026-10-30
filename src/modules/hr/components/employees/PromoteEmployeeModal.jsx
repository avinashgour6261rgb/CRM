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

  // Primary Admin Lockout Guard
  const isTargetPrimaryAdmin = employee?.employeeCode === 'ADM-001' ||
    employee?.isSuperAdmin ||
    employee?.email === 'admin@inforag.com' ||
    (employee?.isAdmin && (employee?.role || '').toLowerCase() === 'admin');

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

    // Security boundary: Protect Primary Admin from demotion / lockout
    if (isTargetPrimaryAdmin && !targetRoleTitle.toLowerCase().includes('admin')) {
      addToast('🔒 Security Protection: Primary Administrator (ADM-001) cannot be demoted to a non-admin role. This prevents system lockouts.', 'error');
      return;
    }

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
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-[4px] flex items-center justify-center z-[9999] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[680px] max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="py-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-[15px] font-extrabold text-slate-900 m-0">
                Designation Change & Promotion Engine
              </h3>
              <p className="m-0 text-[11.5px] text-slate-500">
                Upgrade employee post (Junior ➔ Senior, Executive ➔ Lead) with official promotion letters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-slate-500 cursor-pointer p-1 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Employee Header Card */}
        <div className="py-3.5 px-6 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={employee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={employee.name}
              className="w-[42px] h-[42px] rounded-full object-cover border-2 border-blue-500"
            />
            <div>
              <div className="text-sm font-extrabold text-blue-900">{employee.name}</div>
              <div className="text-xs text-blue-600">
                Current Role: <strong>{employee.role}</strong> • {employee.employeeCode}
              </div>
            </div>
          </div>
          <span className="py-1 px-2.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
            {employee.department}
          </span>
        </div>

        {!showLetterPreview ? (
          /* Form Body */
          <form onSubmit={handlePromote} className="p-6 flex flex-col gap-[18px]">
            
            {isTargetPrimaryAdmin && (
              <div className="p-3 px-4 rounded-lg bg-blue-50 border border-blue-300 flex items-center gap-2.5">
                <Lock size={18} color="#1d4ed8" />
                <div className="text-[12.5px] text-blue-800 font-semibold">
                  <strong>🔒 Primary Administrator Protected:</strong> This account ({employee.employeeCode}) is the root system administrator. Administrative authority cannot be revoked or demoted to prevent complete lockout from the EMS workspace.
                </div>
              </div>
            )}

            {/* Live Role Transition Visualizer */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Current Designation
                </span>
                <div className="text-[15px] font-bold text-slate-700">
                  {employee.role}
                </div>
              </div>

              <div className="flex items-center gap-2 text-blue-600">
                <ArrowRight size={22} />
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-green-600 uppercase">
                  Promoted / New Designation
                </span>
                <div className="text-base font-extrabold text-green-600">
                  {targetRoleTitle || 'Select New Role'}
                </div>
              </div>
            </div>

            {/* Select Role Preset or Custom Input */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                  Choose From Preset Roles
                </label>
                <select
                  value={selectedRole}
                  onChange={e => {
                    setSelectedRole(e.target.value);
                    setCustomRoleTitle('');
                  }}
                  className="w-full py-[9px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                  Or Type Custom Designation / Post
                </label>
                <input
                  type="text"
                  placeholder="e.g. Principal Architect / Vice President"
                  value={customRoleTitle}
                  onChange={e => setCustomRoleTitle(e.target.value)}
                  className="w-full py-[9px] px-3 rounded-lg border border-blue-500 text-[13px] outline-none font-semibold"
                />
              </div>
            </div>

            {/* Department & Effective Date */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                  Assigned Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value)}
                  className="w-full py-[9px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                  Effective Promotion Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full py-[9px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Promotion Reason */}
            <div>
              <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                Promotion Reason & Criteria
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full py-[9px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Merit-based Performance & Leadership">Merit-based Performance & Leadership</option>
                <option value="Annual Performance Review & Seniority">Annual Performance Review & Seniority</option>
                <option value="Probation to Permanent Senior Elevation">Probation to Permanent Senior Elevation</option>
                <option value="Department Reorganization & Squad Lead">Department Reorganization & Squad Lead</option>
              </select>
            </div>

            {/* Remarks / Citations */}
            <div>
              <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                Management Citation / Recommendation Notes
              </label>
              <textarea
                placeholder="e.g. Promoted to Senior Lead based on exemplary technical delivery, sprint leadership, and mentorship of junior engineers."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={2}
                className="w-full py-[9px] px-3 rounded-lg border border-slate-300 text-[13px] outline-none resize-none"
              />
            </div>

            {/* Security Notice */}
            <div className="py-2.5 px-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-[11.5px] text-amber-800">
              <ShieldCheck size={16} />
              <span>
                <strong>RBAC Policy:</strong> Super Admin can assign all roles. HR can promote to Team Leads, Seniors & Custom Roles, but cannot create Super Admins.
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowLetterPreview(true)}
                className="inline-flex items-center gap-1.5 py-[9px] px-3.5 rounded-lg bg-slate-100 text-blue-600 border border-blue-200 text-[12.5px] font-bold cursor-pointer hover:bg-slate-200"
              >
                <FileText size={16} />
                Preview Promotion Letter
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-[9px] px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 py-[9px] px-5 rounded-lg border-0 bg-green-600 text-white text-[13px] font-bold cursor-pointer shadow-[0_2px_6px_rgba(22,163,74,0.3)] hover:bg-green-700"
                >
                  <CheckCircle2 size={16} />
                  {isSubmitting ? 'Promoting...' : 'Confirm Promotion'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Official Promotion Letter Preview */
          <div className="py-7 px-9 flex flex-col gap-4">
            <div className="border-2 border-blue-600 dark:border-blue-500 rounded-xl py-6 px-[30px] bg-white dark:bg-slate-900 shadow-sm">
              {/* Header */}
              <div className="flex justify-between border-b-2 border-blue-600 pb-3.5 mb-[18px]">
                <div>
                  <h2 className="text-lg font-extrabold text-blue-900 m-0 uppercase">
                    {companyInfo.companyName}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5 m-0">
                    {companyInfo.address} • {companyInfo.hrEmail || companyInfo.email}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString()}</span>
                  <div className="text-xs font-bold text-blue-600">Ref: PROM/{employee.employeeCode}/{new Date().getFullYear()}</div>
                </div>
              </div>

              {/* Salutation */}
              <p className="text-[13px] font-bold text-slate-900 mb-2.5 m-0">
                Dear {employee.name},
              </p>

              <p className="text-[12.5px] text-slate-700 leading-relaxed mb-3 m-0">
                On behalf of the Management and Human Resources of <strong>{companyInfo.companyName}</strong>, we are thrilled to formally congratulate you on your promotion to the position of:
              </p>

              {/* Position Highlight Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center my-4">
                <span className="text-[11px] font-bold text-blue-600 uppercase">
                  New Official Designation
                </span>
                <div className="text-lg font-extrabold text-blue-900 mt-0.5">
                  {targetRoleTitle}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Department: {selectedDepartment} • Effective Date: {effectiveDate}
                </div>
              </div>

              <p className="text-[12.5px] text-slate-700 leading-relaxed mb-3 m-0">
                {remarks || 'This elevation reflects your consistent dedication, problem-solving capability, and the high standards of leadership you bring to our organization.'}
              </p>

              {/* Signatures */}
              <div className="flex justify-between items-end pt-5 border-t border-slate-200 mt-4">
                <div>
                  <div className="text-xs font-bold text-slate-900">{companyInfo.signatoryTitle}</div>
                  <div className="text-[11px] text-slate-500">{companyInfo.companyName}</div>
                </div>
                <div className="py-1 px-2.5 rounded bg-green-100 text-green-700 text-[11px] font-bold">
                  ✅ Formally Ratified & Registered
                </div>
              </div>
            </div>

            {/* Letter Actions */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowLetterPreview(false)}
                className="py-2 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                ← Back to Config
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintLetter}
                  className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-[12.5px] font-semibold cursor-pointer hover:bg-blue-100"
                >
                  <Printer size={15} /> Print Promotion Letter
                </button>
                <button
                  type="button"
                  onClick={handlePromote}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 py-2 px-[18px] rounded-lg border-0 bg-green-600 text-white text-[12.5px] font-bold cursor-pointer hover:bg-green-700"
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
