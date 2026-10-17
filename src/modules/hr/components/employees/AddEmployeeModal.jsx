import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import {
  User,
  Mail,
  Briefcase,
  Building,
  Calendar,
  Clock,
  Sparkles,
  ShieldAlert,
  Check,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2
} from 'lucide-react';
import { getRoles } from '../../../../shared/services/roleManagementService';
import {
  ROLES,
  GRANULAR_PERMISSIONS_LIST,
  DEFAULT_MODULE_PERMISSIONS,
  canUserGrantPermissions
} from '../../../../shared/utils/permissionUtils';
import { useToast } from '../../../../shared/context/ToastContext';

export const AddEmployeeModal = ({ isOpen, onClose }) => {
  const { addEmployee, employees, currentUser } = useHR();
  const { addToast } = useToast();
  const [availableRoles, setAvailableRoles] = useState(getRoles());
  const [showPassword, setShowPassword] = useState(false);

  const canGrantAccess = canUserGrantPermissions(currentUser);

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

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = 'Emp@';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const DEFAULT_DEPARTMENTS = [
    'Management & Administration',
    'Human Resources',
    'Finance & Accounts',
    'Sales & Marketing',
    'Customer Support & Operations',
    'IT & Technology',
    'Product & Design',
    'Operations & Logistics',
    'Legal & Compliance'
  ];

  const DEFAULT_ROLES = [
    'Full Stack Developer',
    'Senior Software Engineer',
    'Frontend Developer (React)',
    'Backend Developer (Node/Python)',
    'DevOps & Cloud Engineer',
    'QA Automation Engineer',
    'UI/UX Product Designer',
    'Technical Project Manager',
    'System Architect',
    'HR Specialist & Recruiter',
    'Operations & IT Support',
    'Accountant / Finance Executive',
    'Sales & Business Development Lead',
    'Digital Marketing Specialist',
    'Customer Support Specialist',
    'General Manager'
  ];

  const [customDepartments, setCustomDepartments] = useState(() => {
    try {
      const saved = localStorage.getItem('EMS_CUSTOM_DEPARTMENTS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_DEPARTMENTS;
  });

  const [showNewDeptInput, setShowNewDeptInput] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState('');

  const [customRoles, setCustomRoles] = useState(() => {
    try {
      const saved = localStorage.getItem('EMS_CUSTOM_ROLES');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_ROLES;
  });

  const [showNewRoleInput, setShowNewRoleInput] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    employeeCode: '',
    email: '',
    password: 'emp123',
    role: '',
    systemRole: 'team_member',
    department: 'Engineering',
    workMode: 'Office',
    status: 'active',
    joiningDate: '2024-01-01',
    dob: '1998-05-15',
    phone: '',
    gender: 'Male',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    permissions: { ...(DEFAULT_MODULE_PERMISSIONS.team_member || {}) },
    leaveBalance: {
      casual: 10,
      sick: 8,
      earned: 15,
      maternity: 0
    },
    salaryBasis: 'monthly', // 'monthly' | 'annual'
    startingSalary: '',     // Clean manual input (no hardcoded 35000)
    annualCTC: '',          // Clean manual input (no hardcoded 420000)
    enableDeductions: false,// Default: direct agreed salary without confusing deductions
    includePF: false,
    bankName: '',
    accountNumber: '',
    ifsc: '',
    pan: '',
    upiId: '',
    avatar: '',
    customFields: []
  });

  const computeSalaryBreakdown = (grossVal, enableDeductions = false, isPf = false) => {
    const gross = Math.max(0, Number(grossVal) || 0);
    const annualCTC = gross * 12;

    if (!enableDeductions) {
      // Direct clean salary: exactly what is paid without confusing deductions
      return {
        monthlyGross: gross,
        annualCTC,
        basic: gross,
        hra: 0,
        allowances: 0,
        bonus: 0,
        pf: 0,
        pt: 0,
        tds: 0,
        totalDeductions: 0,
        netSalary: gross,
        isDirectSalary: true
      };
    }

    // Advanced statutory deductions (only if Admin explicitly enables it)
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(basic * 0.4);
    const allowances = Math.max(0, gross - basic - hra);
    const pf = isPf ? Math.min(1800, Math.round(basic * 0.12)) : 0;
    const pt = gross > 15000 ? 200 : 0;
    const tds = gross > 50000 ? Math.round((gross - 50000) * 0.05) : 0;
    const totalDeductions = pf + pt + tds;
    const netSalary = Math.max(0, gross - totalDeductions);
    return {
      monthlyGross: gross,
      annualCTC,
      basic,
      hra,
      allowances,
      bonus: 0,
      pf,
      pt,
      tds,
      totalDeductions,
      netSalary,
      isDirectSalary: false
    };
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default unique code & password when modal opens
  useEffect(() => {
    if (isOpen) {
      const code = getNextAvailableCode();
      setFormData(prev => ({
        ...prev,
        employeeCode: prev.employeeCode || code,
        password: prev.password || generateRandomPassword()
      }));
    }
  }, [isOpen, employees]);

  // Handle system role change and set default permissions
  const handleSystemRoleChange = (newRole) => {
    const defaultPerms = DEFAULT_MODULE_PERMISSIONS[newRole] || DEFAULT_MODULE_PERMISSIONS.team_member;
    setFormData(prev => ({
      ...prev,
      systemRole: newRole,
      permissions: { ...defaultPerms }
    }));
  };

  const handlePermissionToggle = (key) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions?.[key]
      }
    }));
  };

  // Add a new department dynamically
  const handleAddDepartment = () => {
    const trimmed = newDeptInput.trim();
    if (!trimmed) return;
    if (!customDepartments.includes(trimmed)) {
      const updated = [...customDepartments, trimmed];
      setCustomDepartments(updated);
      try {
        localStorage.setItem('EMS_CUSTOM_DEPARTMENTS', JSON.stringify(updated));
      } catch (e) {}
    }
    setFormData(prev => ({ ...prev, department: trimmed }));
    setNewDeptInput('');
    setShowNewDeptInput(false);
    addToast(`New department "${trimmed}" added!`, 'success');
  };

  // Dynamic Role / Designation Handler
  const handleAddRole = () => {
    const trimmed = newRoleInput.trim();
    if (!trimmed) return;
    if (!customRoles.includes(trimmed)) {
      const updated = [...customRoles, trimmed];
      setCustomRoles(updated);
      try {
        localStorage.setItem('EMS_CUSTOM_ROLES', JSON.stringify(updated));
      } catch (e) {}
    }
    setFormData(prev => ({ ...prev, role: trimmed }));
    setNewRoleInput('');
    setShowNewRoleInput(false);
    addToast(`New role/designation "${trimmed}" selected!`, 'success');
  };

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

  const handleAutoGenerate = () => {
    setFormData(prev => ({
      ...prev,
      employeeCode: getNextAvailableCode()
    }));
  };

  const handleAutoPassword = () => {
    const newPass = generateRandomPassword();
    setFormData(prev => ({ ...prev, password: newPass }));
    addToast(`Generated password: ${newPass}`, 'info');
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

    // Role Security Boundary: Non-admins cannot create Admins
    const isActorAdmin = currentUser?.isAdmin || currentUser?.systemRole === 'admin';
    if (!isActorAdmin && (formData.systemRole === 'admin' || formData.role.toLowerCase().includes('admin'))) {
      alert('🔒 Security Rule: Only Super Admin can register or grant Admin accounts.');
      return;
    }

    try {
      setIsSubmitting(true);
      const empCode = formData.employeeCode.trim().toUpperCase();
      const currentGross = formData.salaryBasis === 'annual'
        ? (formData.annualCTC !== '' ? Math.round(Number(formData.annualCTC) / 12) : 0)
        : (formData.startingSalary !== '' ? Number(formData.startingSalary) : 0);

      const salaryDetails = computeSalaryBreakdown(
        currentGross,
        formData.enableDeductions === true,
        formData.includePF === true
      );

      try {
        const savedMap = JSON.parse(localStorage.getItem('EMS_SALARY_MAP') || '{}');
        savedMap[empCode] = salaryDetails;
        localStorage.setItem('EMS_SALARY_MAP', JSON.stringify(savedMap));
      } catch (e) {}

      const created = await addEmployee({
        ...formData,
        employeeCode: empCode,
        dob: formData.dob || '',
        phone: formData.phone || '',
        gender: formData.gender || 'Male',
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        address: formData.address || '',
        emergencyContact: {
          name: formData.emergencyContactName || '',
          phone: formData.emergencyContactPhone || ''
        },
        startingSalary: salaryDetails.monthlyGross,
        salary: salaryDetails,
        bankDetails: {
          bankName: formData.bankName || '',
          accountNumber: formData.accountNumber || '',
          ifsc: formData.ifsc || '',
          pan: formData.pan || '',
          upiId: formData.upiId || ''
        },
        password: formData.password || 'emp123',
        systemRole: formData.systemRole,
        isAdmin: formData.systemRole === 'admin',
        isSuperAdmin: formData.systemRole === 'admin',
        permissions: formData.permissions,
        avatar: formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name)}`
      });

      addToast({
        title: '🎉 Employee Registered Successfully!',
        message: `Credentials: Login: ${formData.email} | ID: ${empCode} | Password: ${formData.password}`,
        type: 'success'
      });

      // Reset form
      setFormData({
        name: '',
        employeeCode: '',
        email: '',
        password: 'emp123',
        role: '',
        systemRole: 'team_member',
        department: 'Engineering',
        joiningDate: '2024-01-01',
        dob: '1998-05-15',
        phone: '',
        gender: 'Male',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        permissions: { ...(DEFAULT_MODULE_PERMISSIONS.team_member || {}) },
        leaveBalance: { casual: 10, sick: 8, earned: 15, maternity: 0 },
        salaryBasis: 'monthly',
        startingSalary: '',
        annualCTC: '',
        enableDeductions: false,
        includePF: false,
        bankName: '',
        accountNumber: '',
        ifsc: '',
        pan: '',
        upiId: '',
        avatar: '',
        customFields: []
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
      subtitle="Register team member, generate login ID/password, and configure granular access permissions."
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '76vh', overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* Row 1: Full Name & Employee ID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Full Name *
            </label>
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
                  padding: 0
                }}
                title="Generate next available employee ID"
              >
                ⚡ Generate ID
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
            ) : null}
          </div>
        </div>

        {/* Row 2: Work Email & Login Password */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: isEmailDuplicate ? '#dc2626' : '#334155', marginBottom: '6px' }}>
              Work Email (Login ID) *
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>
                Login Password *
              </label>
              <button
                type="button"
                onClick={handleAutoPassword}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                🔄 Generate Pass
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Assign login password"
                className="filter-input"
                style={{ width: '100%', height: '40px', paddingLeft: '12px', paddingRight: '36px', fontWeight: '600' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '11px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Phone Number & Gender */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="filter-select"
              style={{ width: '100%', height: '40px', colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-Binary">Non-Binary</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Row 4: Date of Birth (DOB) & Company Joining Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', margin: 0 }}>
                🎂 Date of Birth (DOB) *
              </label>
              <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: '600' }}>30d Birthday Alert</span>
            </div>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px', colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
              required
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', margin: 0 }}>
                💼 Company Joining Date *
              </label>
              <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600' }}>Work Milestone</span>
            </div>
            <input
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px', colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
              required
            />
          </div>
        </div>

        {/* Row 5: Emergency Contact Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Emergency Contact Person
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Meena (Father/Spouse)"
              value={formData.emergencyContactName}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              placeholder="+91 98765 00000"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
            />
          </div>
        </div>

        {/* Row 6: Role / Designation & System Access Role */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', margin: 0 }}>
                Role / Designation *
              </label>
              <button
                type="button"
                onClick={() => setShowNewRoleInput(!showNewRoleInput)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Add a custom role or designation"
              >
                <Plus size={12} /> {showNewRoleInput ? 'Cancel' : '+ New Role'}
              </button>
            </div>

            {showNewRoleInput ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="e.g. Civil Engineer, Telecaller, Branch Manager"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  style={{
                    flex: 1,
                    height: '40px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #2563eb',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff'
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRole();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  style={{
                    padding: '0 12px',
                    borderRadius: '8px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  list="role-options-list"
                  placeholder="Select or type designation (e.g. Full Stack Developer)"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="filter-input"
                  style={{ width: '100%', height: '40px', paddingLeft: '12px', colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
                  required
                />
                <datalist id="role-options-list">
                  {customRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  {availableRoles.map(r => (
                    <option key={r.id} value={r.name}>{r.category}</option>
                  ))}
                </datalist>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              System Authority Level *
            </label>
            <select
              value={formData.systemRole}
              onChange={(e) => handleSystemRoleChange(e.target.value)}
              className="filter-select"
              style={{ width: '100%', height: '40px', fontWeight: '700', color: '#2563eb', colorScheme: 'light', backgroundColor: '#ffffff' }}
            >
              <option value="team_member" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>👤 Team Member (Personal Workspace & Own Data)</option>
              <option value="team_leader" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>🚀 Team Leader (Team Management & Sprint Delegation)</option>
              <option value="hr" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>💼 HR Manager (Workforce, Leaves & Attendance)</option>
              <option value="admin" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>👑 Administrator (Full Master Control)</option>
            </select>
          </div>
        </div>

        {/* Row 4: Dynamic Department, Work Mode & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', margin: 0 }}>
                Department *
              </label>
              <button
                type="button"
                onClick={() => setShowNewDeptInput(!showNewDeptInput)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Add a custom department for your company"
              >
                <Plus size={12} /> {showNewDeptInput ? 'Cancel' : 'New Dept'}
              </button>
            </div>

            {showNewDeptInput ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="e.g. Logistics, Hospital, Retail"
                  value={newDeptInput}
                  onChange={(e) => setNewDeptInput(e.target.value)}
                  style={{
                    flex: 1,
                    height: '40px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #2563eb',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff'
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDepartment();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddDepartment}
                  style={{
                    padding: '0 10px',
                    borderRadius: '8px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="filter-select"
                style={{ width: '100%', height: '40px', colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
              >
                {customDepartments.map(d => (
                  <option key={d} value={d} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>{d}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Work Mode
            </label>
            <select
              value={formData.workMode || 'Office'}
              onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
              className="filter-select"
              style={{ width: '100%', height: '40px', colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              <option value="Office" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>🏢 Office</option>
              <option value="Remote" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>🏡 Remote</option>
              <option value="Hybrid" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>🔄 Hybrid</option>
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
              style={{ width: '100%', height: '40px', colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              <option value="active" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Active</option>
              <option value="probation" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Probation</option>
              <option value="contract" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Contract</option>
            </select>
          </div>
        </div>

        {/* ── 🛡️ GRANULAR ACCESS CONTROL TOGGLES (User Requirement) ── */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1.5px solid #bfdbfe',
          borderRadius: '12px',
          padding: '14px',
          marginTop: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#2563eb" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                Granular Module Permissions & Access Rights
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700' }}>
              {Object.values(formData.permissions || {}).filter(Boolean).length} / {GRANULAR_PERMISSIONS_LIST.length} Granted
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {GRANULAR_PERMISSIONS_LIST.map((perm) => {
              const isChecked = !!formData.permissions?.[perm.key];
              return (
                <div
                  key={perm.key}
                  onClick={() => handlePermissionToggle(perm.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isChecked ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                    backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title={perm.desc}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>{perm.icon}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: '700', color: isChecked ? '#1d4ed8' : '#334155' }}>
                      {perm.label}
                    </span>
                  </div>

                  <div style={{
                    width: '32px',
                    height: '18px',
                    borderRadius: '10px',
                    backgroundColor: isChecked ? '#2563eb' : '#cbd5e1',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      position: 'absolute',
                      top: '2px',
                      left: isChecked ? '16px' : '2px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 5: Compensation, Salary Structure & Banking Details */}
        {(() => {
          const currentGross = formData.salaryBasis === 'annual'
            ? (formData.annualCTC !== '' ? Math.round(Number(formData.annualCTC) / 12) : 0)
            : (formData.startingSalary !== '' ? Number(formData.startingSalary) : 0);

          const breakdown = computeSalaryBreakdown(
            currentGross,
            formData.enableDeductions === true,
            formData.includePF === true
          );

          const annualAmount = currentGross * 12;
          const lpaText = annualAmount >= 100000
            ? `₹${(annualAmount / 100000).toFixed(2)} LPA Package`
            : `₹${annualAmount.toLocaleString()} / yr Package`;

          return (
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Top Bar: Title & Monthly / Annual Mode Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>💰</span>
                  <div>
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                      Salary & Compensation Package
                    </span>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Enter actual agreed salary in Monthly or Annual Package format
                    </div>
                  </div>
                </div>

                {/* Salary Basis Selector */}
                <div style={{
                  display: 'flex',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '8px',
                  padding: '3px',
                  gap: '2px'
                }}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, salaryBasis: 'monthly' }))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: formData.salaryBasis !== 'annual' ? '#2563eb' : 'transparent',
                      color: formData.salaryBasis !== 'annual' ? '#ffffff' : '#475569',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Monthly (₹/month)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, salaryBasis: 'annual' }))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: formData.salaryBasis === 'annual' ? '#2563eb' : 'transparent',
                      color: formData.salaryBasis === 'annual' ? '#ffffff' : '#475569',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Annual Package (₹/year)
                  </button>
                </div>
              </div>

              {/* Salary Inputs (Manual Input, No forced 35000) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr', gap: '12px', alignItems: 'flex-start' }}>
                {formData.salaryBasis === 'annual' ? (
                  <div>
                    <label style={{ fontSize: '12px', color: '#1e293b', display: 'block', marginBottom: '5px', fontWeight: '700' }}>
                      Annual Package / CTC (₹) *
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      placeholder="e.g. 360000 (Enter manual amount)"
                      value={formData.annualCTC}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        const num = valStr === '' ? '' : Number(valStr);
                        setFormData(prev => ({
                          ...prev,
                          annualCTC: valStr,
                          startingSalary: num !== '' ? Math.round(num / 12) : ''
                        }));
                      }}
                      className="filter-input"
                      style={{ width: '100%', height: '42px', paddingLeft: '12px', fontWeight: '700', fontSize: '14px', color: '#0f172a', backgroundColor: '#ffffff' }}
                      required
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Type manual annual package amount
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: '12px', color: '#1e293b', display: 'block', marginBottom: '5px', fontWeight: '700' }}>
                      Monthly Salary (₹) *
                    </label>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      placeholder="e.g. 30000 (Enter manual amount)"
                      value={formData.startingSalary}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        const num = valStr === '' ? '' : Number(valStr);
                        setFormData(prev => ({
                          ...prev,
                          startingSalary: valStr,
                          annualCTC: num !== '' ? num * 12 : ''
                        }));
                      }}
                      className="filter-input"
                      style={{ width: '100%', height: '42px', paddingLeft: '12px', fontWeight: '700', fontSize: '14px', color: '#0f172a', backgroundColor: '#ffffff' }}
                      required
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Type manual monthly salary amount
                    </div>
                  </div>
                )}

                {/* Counterpart Auto Display */}
                <div>
                  <label style={{ fontSize: '12px', color: '#1e293b', display: 'block', marginBottom: '5px', fontWeight: '700' }}>
                    {formData.salaryBasis === 'annual' ? 'Monthly Equivalent (Auto)' : 'Annual Package / CTC (Auto)'}
                  </label>
                  <div style={{
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    fontWeight: '700',
                    fontSize: '14px',
                    color: '#0f172a'
                  }}>
                    {formData.salaryBasis === 'annual'
                      ? (currentGross > 0 ? `₹${currentGross.toLocaleString()} / month` : '₹0 / month')
                      : (annualAmount > 0 ? `₹${annualAmount.toLocaleString()} / year` : '₹0 / year')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', fontWeight: '600' }}>
                    Calculated automatically from {formData.salaryBasis === 'annual' ? 'Annual Package' : 'Monthly Salary'}
                  </div>
                </div>
              </div>

              {/* 🌟 Agreed Package Overview Card */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    💵
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Agreed Compensation
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#14532d' }}>
                      {currentGross > 0 ? `₹${currentGross.toLocaleString()} / month` : '₹0 / month'}
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#15803d', marginLeft: '8px' }}>
                        ({lpaText})
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  textAlign: 'right'
                }}>
                  <div style={{ fontSize: '10.5px', color: '#166534', fontWeight: '600' }}>In-Hand (Net Pay)</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#15803d' }}>
                    ₹{breakdown.netSalary.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* ⚙️ Optional Admin Deductions Feature (Direct calculation by default) */}
              <div style={{
                borderTop: '1px dashed #cbd5e1',
                paddingTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableDeductions === true}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      enableDeductions: e.target.checked
                    }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    ⚙️ Enable Statutory Deductions Breakdown (PF, PT, TDS) — Optional for Admin
                  </span>
                </label>

                {formData.enableDeductions ? (
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.includePF === true}
                          onChange={(e) => setFormData(prev => ({ ...prev, includePF: e.target.checked }))}
                        />
                        <span>Include PF / EPF (12% of Basic capped at ₹1,800)</span>
                      </label>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                      gap: '8px',
                      fontSize: '11.5px'
                    }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Basic (50%):</span>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>₹{breakdown.basic.toLocaleString()}</div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>HRA (20%):</span>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>₹{breakdown.hra.toLocaleString()}</div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Allowances:</span>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>₹{breakdown.allowances.toLocaleString()}</div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>PF Deduction:</span>
                        <div style={{ fontWeight: '700', color: '#b91c1c' }}>-₹{breakdown.pf.toLocaleString()}</div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>PT:</span>
                        <div style={{ fontWeight: '700', color: '#b91c1c' }}>-₹{breakdown.pt}</div>
                      </div>
                      <div style={{ borderLeft: '1.5px dashed #cbd5e1', paddingLeft: '8px' }}>
                        <span style={{ color: '#166534', fontWeight: '700' }}>In-Hand (Net):</span>
                        <div style={{ fontWeight: '800', color: '#15803d', fontSize: '13px' }}>₹{breakdown.netSalary.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                    💡 Direct Payment Mode: 100% of the entered amount is paid directly without deductions.
                  </div>
                )}
              </div>

              {/* Banking & Identity Details (For Realistic Payslip Generation) */}
              <div style={{
                borderTop: '1px dashed #cbd5e1',
                paddingTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>
                  🏦 Bank Account & Payment Details (Optional for Payslips):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Bank Name (e.g. HDFC Bank)"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                    style={{ height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', backgroundColor: '#ffffff', color: '#0f172a' }}
                  />
                  <input
                    type="text"
                    placeholder="A/C Number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    style={{ height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', backgroundColor: '#ffffff', color: '#0f172a' }}
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={formData.ifsc}
                    onChange={(e) => setFormData(prev => ({ ...prev, ifsc: e.target.value }))}
                    style={{ height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', backgroundColor: '#ffffff', color: '#0f172a' }}
                  />
                  <input
                    type="text"
                    placeholder="PAN Number"
                    value={formData.pan}
                    onChange={(e) => setFormData(prev => ({ ...prev, pan: e.target.value }))}
                    style={{ height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', backgroundColor: '#ffffff', color: '#0f172a' }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Row 6: Initial Leave Quota */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '12px 14px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
            📅 Annual Leave Balance Allotment (Days):
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Casual Leave (CL)</label>
              <input
                type="number"
                min="0"
                value={formData.leaveBalance.casual}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBalance: { ...formData.leaveBalance, casual: Number(e.target.value) }
                })}
                className="filter-input"
                style={{ width: '100%', height: '36px', paddingLeft: '10px', fontWeight: '700' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Sick Leave (SL)</label>
              <input
                type="number"
                min="0"
                value={formData.leaveBalance.sick}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBalance: { ...formData.leaveBalance, sick: Number(e.target.value) }
                })}
                className="filter-input"
                style={{ width: '100%', height: '36px', paddingLeft: '10px', fontWeight: '700' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Earned Leave (EL)</label>
              <input
                type="number"
                min="0"
                value={formData.leaveBalance.earned}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBalance: { ...formData.leaveBalance, earned: Number(e.target.value) }
                })}
                className="filter-input"
                style={{ width: '100%', height: '36px', paddingLeft: '10px', fontWeight: '700' }}
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
            {isSubmitting ? 'Registering...' : 'Register Employee & Generate Credentials'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default AddEmployeeModal;
