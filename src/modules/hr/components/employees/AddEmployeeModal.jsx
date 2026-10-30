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
import { KEYS } from '../../../../shared/services/storageService';
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
    'IT & Software Development',
    'Digital Marketing',
    'UI/UX & Creative Design',
    'Content & SEO',
    'Sales & Client Servicing',
    'Human Resources',
    'Finance & Accounts',
    'Operations & Customer Support',
    'Management & Administration'
  ];

  const DEFAULT_ROLES = [
    // IT & Software Development
    'Full Stack Developer',
    'Frontend Developer (React)',
    'Backend Developer (Node/Python)',
    'Mobile App Developer (Flutter/React Native)',
    'UI/UX Product Designer',
    'QA Automation & Testing Engineer',
    'DevOps & Cloud Engineer',
    'Technical Lead / Project Manager',
    'System Architect & Tech Consultant',

    // Digital Marketing & Growth
    'Digital Marketing Specialist',
    'Digital Marketing Lead / Manager',
    'SEO Specialist (On-Page/Off-Page)',
    'Social Media Strategist (SMM)',
    'PPC & Performance Marketer (Google/Meta Ads)',
    'Content Writer & Copywriter',
    'Graphic Designer & Brand Creator',
    'Video Editor & Motion Designer',
    'Lead Generation Specialist',
    'Client Servicing & Account Manager',

    // Human Resources & Management
    'HR Specialist & Talent Recruiter',
    'HR Operations Manager',
    'Accountant / Finance Executive',
    'Operations & IT Support Executive',
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
    department: 'IT & Software Development',
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

      // Auto-post welcome greeting to #general channel
      try {
        const rawConvs = localStorage.getItem(KEYS.CONVERSATIONS);
        if (rawConvs) {
          const convs = JSON.parse(rawConvs);
          const genIdx = convs.findIndex(c => c.id === 'channel_general' || c.channelName === '#general');
          if (genIdx !== -1) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            convs[genIdx].messages.push({
              id: `msg_welcome_${Date.now()}`,
              conversationId: convs[genIdx].id,
              senderId: 'ADM-001',
              senderName: 'Inforag Onboarding Bot',
              senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              senderRole: 'System Bot',
              text: `🎉 Welcome our new team member ${formData.name}! Joining as ${formData.role || 'Associate'} in ${formData.department || 'IT & Software Development'}. Say hello and welcome them to the team! 👋`,
              attachments: [],
              timestamp: timeStr,
              createdAt: Date.now(),
              readBy: ['ADM-001']
            });
            convs[genIdx].lastMessage = `Welcome ${formData.name} to the team!`;
            convs[genIdx].lastMessageTime = timeStr;
            localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs));
            window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));
          }
        }
      } catch (e) {
        console.warn('Welcome message dispatch notice:', e);
      }

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
        department: 'IT & Software Development',
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-h-[76vh] overflow-y-auto pr-1">
        
        {/* Row 1: Full Name & Employee ID */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Aditi Rao"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="filter-input w-full h-10 pl-3"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-[12.5px] font-semibold ${isCodeDuplicate ? 'text-red-600' : 'text-slate-700'}`}>
                Employee ID *
              </label>
              <button
                type="button"
                onClick={handleAutoGenerate}
                className="bg-transparent border-0 text-blue-600 text-[11px] font-semibold cursor-pointer p-0"
                title="Generate next available employee ID"
              >
                ⚡ Generate ID
              </button>
            </div>
            <input
              type="text"
              value={formData.employeeCode}
              onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
              className={`filter-input w-full h-10 pl-3 font-semibold ${isCodeDuplicate ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
              required
            />
            {isCodeDuplicate ? (
              <div className="text-[11px] text-red-600 mt-1 font-medium">
                ⚠️ Already assigned to <strong>{duplicateEmployee.name}</strong>
              </div>
            ) : null}
          </div>
        </div>

        {/* Row 2: Work Email & Login Password */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-[12.5px] font-semibold mb-1.5 ${isEmailDuplicate ? 'text-red-600' : 'text-slate-700'}`}>
              Work Email (Login ID) *
            </label>
            <input
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`filter-input w-full h-10 pl-3 ${isEmailDuplicate ? 'border-red-500 bg-red-50 dark:bg-red-950/40' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'}`}
              required
            />
            {isEmailDuplicate && (
              <div className="text-[11px] text-red-600 mt-1 font-medium">
                ⚠️ Email already registered with <strong>{duplicateEmail.name}</strong>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12.5px] font-semibold text-slate-700">
                Login Password *
              </label>
              <button
                type="button"
                onClick={handleAutoPassword}
                className="bg-transparent border-0 text-blue-600 text-[11px] font-semibold cursor-pointer p-0"
              >
                🔄 Generate Pass
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Assign login password"
                className="filter-input w-full h-10 pl-3 pr-9 font-semibold"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-[11px] bg-transparent border-0 cursor-pointer text-slate-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Phone Number & Gender */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="filter-input w-full h-10 pl-3"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="filter-select w-full h-10"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-Binary">Non-Binary</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Row 4: Date of Birth (DOB) & Company Joining Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12.5px] font-semibold text-slate-700 m-0">
                🎂 Date of Birth (DOB) *
              </label>
              <span className="text-[10px] text-blue-600 font-semibold">30d Birthday Alert</span>
            </div>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="filter-input w-full h-10 pl-3"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12.5px] font-semibold text-slate-700 m-0">
                💼 Company Joining Date *
              </label>
              <span className="text-[10px] text-green-600 font-semibold">Work Milestone</span>
            </div>
            <input
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              className="filter-input w-full h-10 pl-3"
              required
            />
          </div>
        </div>

        {/* Row 5: Emergency Contact Details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Emergency Contact Person
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Meena (Father/Spouse)"
              value={formData.emergencyContactName}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
              className="filter-input w-full h-10 pl-3"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              placeholder="+91 98765 00000"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
              className="filter-input w-full h-10 pl-3"
            />
          </div>
        </div>
        {/* Row 6: Role / Designation & System Access Role */}
        <div className="grid grid-cols-[1.4fr_1.6fr] gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12.5px] font-semibold text-slate-700 m-0">
                Role / Designation *
              </label>
              <button
                type="button"
                onClick={() => setShowNewRoleInput(!showNewRoleInput)}
                className="bg-transparent border-0 text-blue-600 text-[11px] font-bold cursor-pointer p-0 flex items-center gap-1"
                title="Add a custom role or designation"
              >
                <Plus size={12} /> {showNewRoleInput ? 'Cancel' : '+ New Role'}
              </button>
            </div>

            {showNewRoleInput ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="e.g. Civil Engineer, Telecaller, Branch Manager"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  className="flex-1 h-10 px-2.5 rounded-lg border-2 border-blue-600 text-[12.5px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none"
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
                  className="px-3 rounded-lg bg-blue-600 text-white border-0 text-[11.5px] font-bold cursor-pointer hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  list="role-options-list"
                  placeholder="Select or type designation (e.g. Full Stack Developer)"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="filter-input w-full h-10 pl-3"
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
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              System Authority Level *
            </label>
            <select
              value={formData.systemRole}
              onChange={(e) => handleSystemRoleChange(e.target.value)}
              className="filter-select w-full h-10 font-bold text-blue-600"
            >
              <option value="team_member">👤 Team Member (Personal Workspace & Own Data)</option>
              <option value="team_leader">🚀 Team Leader (Team Management & Sprint Delegation)</option>
              <option value="hr">💼 HR Manager (Workforce, Leaves & Attendance)</option>
              <option value="admin">👑 Administrator (Full Master Control)</option>
            </select>
          </div>
        </div>

        {/* Row 4: Dynamic Department, Work Mode & Status */}
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12.5px] font-semibold text-slate-700 m-0">
                Department *
              </label>
              <button
                type="button"
                onClick={() => setShowNewDeptInput(!showNewDeptInput)}
                className="bg-transparent border-0 text-blue-600 text-[11px] font-bold cursor-pointer p-0 flex items-center gap-1"
                title="Add a custom department for your company"
              >
                <Plus size={12} /> {showNewDeptInput ? 'Cancel' : 'New Dept'}
              </button>
            </div>

            {showNewDeptInput ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="e.g. Logistics, Hospital, Retail"
                  value={newDeptInput}
                  onChange={(e) => setNewDeptInput(e.target.value)}
                  className="flex-1 h-10 px-2.5 rounded-lg border-2 border-blue-600 text-[12.5px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none"
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
                  className="px-2.5 rounded-lg bg-blue-600 text-white border-0 text-[11.5px] font-bold cursor-pointer hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="filter-select w-full h-10"
              >
                {customDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Work Mode
            </label>
            <select
              value={formData.workMode || 'Office'}
              onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
              className="filter-select w-full h-10"
            >
              <option value="Office">🏢 Office</option>
              <option value="Remote">🏡 Remote</option>
              <option value="Hybrid">🔄 Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Status
            </label>
            <select
              value={formData.status || 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="filter-select w-full h-10"
            >
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="contract">Contract</option>
            </select>
          </div>
        </div>

        {/* ── 🛡️ GRANULAR ACCESS CONTROL TOGGLES (User Requirement) ── */}
        <div className="bg-slate-50 border border-blue-200 rounded-xl p-3.5 mt-1">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} color="#2563eb" />
              <span className="text-[13px] font-extrabold text-slate-800">
                Granular Module Permissions & Access Rights
              </span>
            </div>
            <span className="text-[11px] text-blue-600 font-bold">
              {Object.values(formData.permissions || {}).filter(Boolean).length} / {GRANULAR_PERMISSIONS_LIST.length} Granted
            </span>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
            {GRANULAR_PERMISSIONS_LIST.map((perm) => {
              const isChecked = !!formData.permissions?.[perm.key];
              return (
                <div
                  key={perm.key}
                  onClick={() => handlePermissionToggle(perm.key)}
                  className={`flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer select-none transition-all duration-150 border ${isChecked ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                  title={perm.desc}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{perm.icon}</span>
                    <span className={`text-[11.5px] font-bold ${isChecked ? 'text-blue-700' : 'text-slate-700'}`}>
                      {perm.label}
                    </span>
                  </div>

                  <div className={`w-8 h-[18px] rounded-full relative transition-colors duration-200 shrink-0 ${isChecked ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-[left] duration-200 shadow-sm ${isChecked ? 'left-4' : 'left-0.5'}`} />
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
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 flex flex-col gap-3.5">
              {/* Top Bar: Title & Monthly / Annual Mode Switcher */}
              <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <div>
                    <span className="text-[13.5px] font-extrabold text-slate-900">
                      Salary & Compensation Package
                    </span>
                    <div className="text-[11px] text-slate-500">
                      Enter actual agreed salary in Monthly or Annual Package format
                    </div>
                  </div>
                </div>

                {/* Salary Basis Selector */}
                <div className="flex bg-slate-200 rounded-lg p-[3px] gap-0.5">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, salaryBasis: 'monthly' }))}
                    className={`py-1 px-3 rounded-md border-0 text-[11.5px] font-bold cursor-pointer transition-all duration-150 ${formData.salaryBasis !== 'annual' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-600'}`}
                  >
                    Monthly (₹/month)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, salaryBasis: 'annual' }))}
                    className={`py-1 px-3 rounded-md border-0 text-[11.5px] font-bold cursor-pointer transition-all duration-150 ${formData.salaryBasis === 'annual' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-600'}`}
                  >
                    Annual Package (₹/year)
                  </button>
                </div>
              </div>

              {/* Salary Inputs (Manual Input, No forced 35000) */}
              <div className="grid grid-cols-[1.4fr_1.4fr] gap-3 items-start">
                {formData.salaryBasis === 'annual' ? (
                  <div>
                    <label className="text-xs text-slate-800 block mb-1 font-bold">
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
                      className="filter-input w-full h-[42px] pl-3 font-bold text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                      required
                    />
                    <div className="text-[11px] text-slate-500 mt-1">
                      Type manual annual package amount
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-slate-800 block mb-1 font-bold">
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
                      className="filter-input w-full h-[42px] pl-3 font-bold text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                      required
                    />
                    <div className="text-[11px] text-slate-500 mt-1">
                      Type manual monthly salary amount
                    </div>
                  </div>
                )}

                {/* Counterpart Auto Display */}
                <div>
                  <label className="text-xs text-slate-800 block mb-1 font-bold">
                    {formData.salaryBasis === 'annual' ? 'Monthly Equivalent (Auto)' : 'Annual Package / CTC (Auto)'}
                  </label>
                  <div className="h-[42px] flex items-center px-3 rounded-lg bg-slate-100 border border-slate-300 font-bold text-sm text-slate-900">
                    {formData.salaryBasis === 'annual'
                      ? (currentGross > 0 ? `₹${currentGross.toLocaleString()} / month` : '₹0 / month')
                      : (annualAmount > 0 ? `₹${annualAmount.toLocaleString()} / year` : '₹0 / year')}
                  </div>
                  <div className="text-[11px] text-blue-600 mt-1 font-semibold">
                    Calculated automatically from {formData.salaryBasis === 'annual' ? 'Annual Package' : 'Monthly Salary'}
                  </div>
                </div>
              </div>

              {/* 🌟 Agreed Package Overview Card */}
              <div className="bg-green-50 border border-green-300 rounded-xl p-3 px-4 flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-[38px] h-[38px] rounded-full bg-green-100 flex items-center justify-center text-lg">
                    💵
                  </div>
                  <div>
                    <div className="text-[11px] text-green-800 font-bold uppercase tracking-wider">
                      Total Agreed Compensation
                    </div>
                    <div className="text-base font-extrabold text-green-950">
                      {currentGross > 0 ? `₹${currentGross.toLocaleString()} / month` : '₹0 / month'}
                      <span className="text-[13px] font-semibold text-green-700 ml-2">
                        ({lpaText})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="py-1.5 px-3 rounded-lg bg-green-100 border border-green-200 text-right">
                  <div className="text-[10.5px] text-green-800 font-semibold">In-Hand (Net Pay)</div>
                  <div className="text-[15px] font-extrabold text-green-700">
                    ₹{breakdown.netSalary.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* ⚙️ Optional Admin Deductions Feature (Direct calculation by default) */}
              <div className="border-t border-dashed border-slate-300 pt-2.5 flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.enableDeductions === true}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      enableDeductions: e.target.checked
                    }))}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    ⚙️ Enable Statutory Deductions Breakdown (PF, PT, TDS) — Optional for Admin
                  </span>
                </label>

                {formData.enableDeductions ? (
                  <div className="bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.includePF === true}
                          onChange={(e) => setFormData(prev => ({ ...prev, includePF: e.target.checked }))}
                        />
                        <span>Include PF / EPF (12% of Basic capped at ₹1,800)</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2 text-[11.5px]">
                      <div>
                        <span className="text-slate-500">Basic (50%):</span>
                        <div className="font-bold text-slate-900">₹{breakdown.basic.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">HRA (20%):</span>
                        <div className="font-bold text-slate-900">₹{breakdown.hra.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Allowances:</span>
                        <div className="font-bold text-slate-900">₹{breakdown.allowances.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">PF Deduction:</span>
                        <div className="font-bold text-red-700">-₹{breakdown.pf.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">PT:</span>
                        <div className="font-bold text-red-700">-₹{breakdown.pt}</div>
                      </div>
                      <div className="border-l border-dashed border-slate-300 pl-2">
                        <span className="text-green-800 font-bold">In-Hand (Net):</span>
                        <div className="font-extrabold text-green-700 text-[13px]">₹{breakdown.netSalary.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic">
                    💡 Direct Payment Mode: 100% of the entered amount is paid directly without deductions.
                  </div>
                )}
              </div>

              {/* Banking & Identity Details (For Realistic Payslip Generation) */}
              <div className="border-t border-dashed border-slate-300 pt-2.5 flex flex-col gap-2">
                <span className="text-[11.5px] font-bold text-slate-700">
                  🏦 Bank Account & Payment Details (Optional for Payslips):
                </span>
                <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr] gap-2">
                  <input
                    type="text"
                    placeholder="Bank Name (e.g. HDFC Bank)"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                    className="h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 text-[11.5px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="A/C Number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 text-[11.5px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={formData.ifsc}
                    onChange={(e) => setFormData(prev => ({ ...prev, ifsc: e.target.value }))}
                    className="h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 text-[11.5px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="PAN Number"
                    value={formData.pan}
                    onChange={(e) => setFormData(prev => ({ ...prev, pan: e.target.value }))}
                    className="h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 text-[11.5px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Row 6: Initial Leave Quota */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 px-3.5">
          <span className="text-xs font-bold text-slate-900 block mb-1.5">
            📅 Annual Leave Balance Allotment (Days):
          </span>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Casual Leave (CL)</label>
              <input
                type="number"
                min="0"
                value={formData.leaveBalance.casual}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBalance: { ...formData.leaveBalance, casual: Number(e.target.value) }
                })}
                className="filter-input w-full h-9 pl-2.5 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Sick Leave (SL)</label>
              <input
                type="number"
                min="0"
                value={formData.leaveBalance.sick}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBalance: { ...formData.leaveBalance, sick: Number(e.target.value) }
                })}
                className="filter-input w-full h-9 pl-2.5 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1 font-semibold">Earned Leave (EL)</label>
              <input
                type="number"
                min="0"
                value={formData.leaveBalance.earned}
                onChange={(e) => setFormData({
                  ...formData,
                  leaveBalance: { ...formData.leaveBalance, earned: Number(e.target.value) }
                })}
                className="filter-input w-full h-9 pl-2.5 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 mt-1.5">
          <button type="button" onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            className={`btn btn-primary ${isCodeDuplicate || isEmailDuplicate ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            disabled={isSubmitting || isCodeDuplicate || isEmailDuplicate}
          >
            {isSubmitting ? 'Registering...' : 'Register Employee & Generate Credentials'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default AddEmployeeModal;
