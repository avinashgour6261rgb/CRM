import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Briefcase,
  Phone,
  Building,
  Camera,
  Check,
  Sparkles,
  ShieldCheck,
  Lock,
  Award,
  Key,
  Plus,
  Trash2
} from 'lucide-react';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../context/ToastContext';
import { getRoles, canUserAssignRole, recordPromotion } from '../../services/roleManagementService';
import { ChangePasswordModal } from './ChangePasswordModal';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80'
];

export const EditProfileModal = ({ isOpen, onClose, employee = null }) => {
  const { currentUser: authUser, setCurrentUser: setAuthCurrentUser } = useAuth();
  const { currentUser: hrUser, updateEmployee, employees } = useHR();
  const currentUser = authUser || hrUser;
  const { updateUserProfile } = useCRM();
  const { addToast } = useToast();

  const targetEmp = employee || currentUser;
  const isEditingOther = employee && employee._id !== currentUser?._id;

  const [availableRoles, setAvailableRoles] = useState(getRoles());
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    phone: '',
    dob: '',
    joiningDate: '',
    avatar: '',
    bio: '',
    workingMode: 'Office',
    employeeCode: 'EMP-001',
    customFields: []
  });

  const [submitting, setSubmitting] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);

  // Custom Fields state for dynamic properties
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  // Employee Credential Change Request State (Requires Admin Approval)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestField, setRequestField] = useState('email'); // 'email' | 'name'
  const [requestedValue, setRequestedValue] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Determine Actor Privileges
  const actorRole = (currentUser?.role || '').toLowerCase();
  const isActorAdmin = currentUser?.isAdmin || actorRole.includes('admin') || currentUser?.systemRole === 'admin';
  const isActorHR = actorRole.includes('hr') || actorRole.includes('human resources') || currentUser?.systemRole === 'hr';
  const canEditRole = isActorAdmin || isActorHR;

  const handleSendCredentialRequest = (e) => {
    e.preventDefault();
    if (!requestedValue.trim()) {
      addToast?.('Please enter the requested new value.', 'error');
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const existing = JSON.parse(localStorage.getItem('EMS_PROFILE_UPDATE_REQUESTS') || '[]');
      const newReq = {
        id: `req_${Date.now()}`,
        employeeId: targetEmp?._id || currentUser?._id,
        employeeCode: targetEmp?.employeeCode || currentUser?.employeeCode || 'EMP-001',
        employeeName: targetEmp?.name || currentUser?.name,
        field: requestField,
        currentValue: requestField === 'email' ? (targetEmp?.email || currentUser?.email) : (targetEmp?.name || currentUser?.name),
        requestedValue: requestedValue.trim(),
        reason: requestReason.trim() || 'Official credential update request',
        status: 'pending',
        requestedAt: new Date().toISOString()
      };
      existing.unshift(newReq);
      localStorage.setItem('EMS_PROFILE_UPDATE_REQUESTS', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_profile_requests' } }));
      addToast?.('Credential update request submitted to Admin for approval! 📬', 'success');
      setShowRequestModal(false);
      setRequestedValue('');
      setRequestReason('');
    } catch (err) {
      console.error(err);
      addToast?.('Failed to submit request', 'error');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Sync form data whenever targetEmp or modal open state changes
  useEffect(() => {
    if (targetEmp) {
      setFormData({
        name: targetEmp.name || 'Employee',
        role: targetEmp.role || 'Senior Specialist',
        department: targetEmp.department || 'IT & Software Development',
        email: targetEmp.email || 'employee@company.com',
        phone: targetEmp.phone || '+91 98765 43210',
        dob: targetEmp.dob || '1998-10-15',
        joiningDate: targetEmp.joiningDate || '',
        avatar: targetEmp.avatar || PRESET_AVATARS[0],
        bio: targetEmp.bio || 'Core member contributing across sprint deliveries.',
        workingMode: targetEmp.workingMode || localStorage.getItem('ems_working_mode') || 'Office',
        employeeCode: targetEmp.employeeCode || targetEmp._id || 'EMP-001',
        customFields: targetEmp.customFields || []
      });
      setCustomAvatarUrl(targetEmp.avatar || '');
      setAvailableRoles(getRoles());
    }
  }, [targetEmp, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCustomField = () => {
    if (!newFieldKey.trim()) return;
    const updated = [...(formData.customFields || []), { key: newFieldKey.trim(), value: newFieldValue.trim() }];
    setFormData(prev => ({ ...prev, customFields: updated }));
    setNewFieldKey('');
    setNewFieldValue('');
    setShowAddField(false);
  };

  const handleRemoveCustomField = (index) => {
    const updated = (formData.customFields || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, customFields: updated }));
  };

  const handleCustomFieldChange = (index, val) => {
    const updated = [...(formData.customFields || [])];
    updated[index] = { ...updated[index], value: val };
    setFormData(prev => ({ ...prev, customFields: updated }));
  };

  // Handle local image file upload (Base64)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addToast?.('File size exceeds 2MB limit. Please choose a smaller image.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;
        handleChange('avatar', base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Security Check: HR cannot promote/assign Admin
    if (canEditRole && !isActorAdmin && formData.role.toLowerCase().includes('admin')) {
      addToast('Security Restriction: HR Managers cannot create or assign Admin accounts. Only Super Admin has this privilege.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const isRoleChanged = targetEmp?.role && targetEmp.role !== formData.role;

      if (targetEmp?._id) {
        await updateEmployee(targetEmp._id, formData);
      } else {
        await updateUserProfile(formData);
      }

      // If user is editing their own active profile, sync Auth session immediately
      if (!employee || employee._id === currentUser?._id || targetEmp?.isCurrentUser || targetEmp?._id === authUser?._id) {
        const updatedAuthUser = { ...(authUser || currentUser), ...formData, isCurrentUser: true };
        setAuthCurrentUser?.(updatedAuthUser);
        localStorage.setItem('ems_auth_session', JSON.stringify(updatedAuthUser));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
      }

      // If role was modified by Admin/HR, log into official Promotion history
      if (isRoleChanged && targetEmp) {
        recordPromotion({
          employeeId: targetEmp._id,
          employeeName: formData.name,
          employeeCode: targetEmp.employeeCode || 'EMP',
          employeeAvatar: formData.avatar,
          previousRole: targetEmp.role,
          newRole: formData.role,
          previousDepartment: targetEmp.department,
          newDepartment: formData.department,
          effectiveDate: new Date().toISOString().split('T')[0],
          promotedBy: currentUser?.name || (isActorAdmin ? 'Super Admin' : 'HR Manager'),
          reason: 'Role Updated via Profile Management'
        });
      }

      addToast?.(
        `Profile & designation for ${formData.name} (${formData.role}) updated successfully! 🎉`,
        'success'
      );

      onClose();
    } catch (err) {
      console.error(err);
      addToast?.('Failed to save profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-5 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
              Edit Employee Profile
            </h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 m-0 mt-1">
              Update your photo, designation, and bio — updates immediately across all screens!
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-[18px]">
          {/* Avatar selection */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4">
            <label className="block text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-2.5">
              📸 Profile Picture & Avatar
            </label>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <img
                  src={formData.avatar || PRESET_AVATARS[0]}
                  alt="Selected Avatar"
                  className="w-16 h-16 rounded-[14px] object-cover border-[3px] border-blue-600 shadow-md shadow-blue-600/20"
                />
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                {/* File Upload Button */}
                <div className="flex gap-2 items-center">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[7px] text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Camera size={14} className="text-blue-600 dark:text-blue-400" />
                    Upload from Device
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="bg-transparent border-0 text-blue-600 dark:text-blue-400 text-xs font-semibold cursor-pointer hover:underline"
                  >
                    {showUrlInput ? 'Hide URL' : 'Paste URL'}
                  </button>
                </div>

                {showUrlInput && (
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customAvatarUrl) handleChange('avatar', customAvatarUrl);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Preset Avatars */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Presets:</span>
                  <div className="flex gap-1.5">
                    {PRESET_AVATARS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt={`Avatar ${idx}`}
                        onClick={() => handleChange('avatar', av)}
                        className={`w-[30px] h-[30px] rounded-lg object-cover cursor-pointer transition-all ${
                          formData.avatar === av
                            ? 'border-2 border-blue-600 opacity-100 scale-110'
                            : 'border border-transparent opacity-65 scale-100 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Name & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  Full Name *
                </label>
                {isActorAdmin ? (
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold bg-blue-100 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                    👑 Admin Direct Edit
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRequestField('name');
                      setRequestedValue('');
                      setRequestReason('');
                      setShowRequestModal(true);
                    }}
                    className="bg-transparent border-0 text-blue-600 dark:text-blue-400 text-[11px] font-bold cursor-pointer p-0 hover:underline"
                  >
                    ✏️ Request Change
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                disabled={!isActorAdmin}
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13.5px] outline-none font-semibold ${
                  isActorAdmin
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  Designation / Role *
                </label>
                {canEditRole ? (
                  <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                    isActorAdmin
                      ? 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60'
                      : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60'
                  }`}>
                    {isActorAdmin ? '👑 Admin (Full Access)' : '💼 HR Access'}
                  </span>
                ) : (
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold">
                    🔒 Read-only
                  </span>
                )}
              </div>

              {canEditRole ? (
                <div>
                  <input
                    type="text"
                    list="edit-profile-role-options"
                    required
                    value={formData.role}
                    onChange={e => handleChange('role', e.target.value)}
                    placeholder="e.g. Senior Specialist / Team Leader"
                    className="w-full px-3 py-2 rounded-lg border border-blue-500 bg-white dark:bg-slate-800 text-[13.5px] outline-none font-semibold text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500"
                  />
                  <datalist id="edit-profile-role-options">
                    {(() => {
                      try {
                        const saved = JSON.parse(localStorage.getItem('EMS_CUSTOM_ROLES') || '[]');
                        if (Array.isArray(saved)) {
                          return saved.map(r => <option key={r} value={r}>Custom Company Role</option>);
                        }
                      } catch (e) {}
                      return null;
                    })()}
                    {availableRoles
                      .filter(r => isActorAdmin || !r.id.toLowerCase().includes('admin'))
                      .map(r => (
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
              ) : (
                <input
                  type="text"
                  disabled
                  value={formData.role}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13.5px] bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed"
                />
              )}
            </div>
          </div>

          {/* Department & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={e => handleChange('department', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13.5px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  Email Address *
                </label>
                {isActorAdmin ? (
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold bg-blue-100 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                    👑 Admin Direct Edit
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRequestField('email');
                      setRequestedValue('');
                      setRequestReason('');
                      setShowRequestModal(true);
                    }}
                    className="bg-transparent border-0 text-blue-600 dark:text-blue-400 text-[11px] font-bold cursor-pointer p-0 hover:underline"
                  >
                    ✏️ Request Change
                  </button>
                )}
              </div>
              <input
                type="email"
                disabled={!isActorAdmin}
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13.5px] outline-none font-semibold ${
                  isActorAdmin
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              />
            </div>
          </div>

          {/* Phone Number & Date of Birth (Auto Birthday Events Engine) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13.5px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                🎂 Date of Birth (Auto-creates Birthday Event)
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={e => handleChange('dob', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13.5px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Work Anniversary / Joining Date */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                ⭐ Joining Date (Automatic Work Anniversary Celebration)
              </label>
              {canEditRole ? (
                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
                  👑 Admin/HR Direct Edit
                </span>
              ) : (
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold">
                  🔒 Company Record
                </span>
              )}
            </div>
            <input
              type="date"
              disabled={!canEditRole}
              value={formData.joiningDate || ''}
              onChange={e => handleChange('joiningDate', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13.5px] outline-none font-semibold ${
                canEditRole
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-purple-600'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed'
              }`}
            />
          </div>

          {/* Employee ID / Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                🆔 Employee ID / Code
              </label>
              {!isActorAdmin && (
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold">
                  🔒 Fixed
                </span>
              )}
            </div>
            <input
              type="text"
              disabled={!isActorAdmin}
              value={formData.employeeCode}
              onChange={e => handleChange('employeeCode', e.target.value)}
              placeholder="EMP-001"
              className={`w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13.5px] outline-none font-semibold ${
                isActorAdmin
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-600'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed'
              }`}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              About / Bio
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={e => handleChange('bio', e.target.value)}
              className="w-full p-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none resize-y font-inherit focus:border-blue-600"
            />
          </div>

          {/* Custom Fields & Dynamic Attributes */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 p-3.5 px-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[13px] font-bold text-slate-900 dark:text-slate-100 m-0">
                  ⚙️ Custom Employee Fields & Attributes
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                  Industry-specific fields (e.g. Blood Group, Location, Emergency Contact, License, Skills).
                </p>
              </div>
              {canEditRole && (
                <button
                  type="button"
                  onClick={() => setShowAddField(!showAddField)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-bold cursor-pointer transition-colors ${
                    showAddField
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 border border-slate-300 dark:border-slate-700'
                      : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <Plus size={13} />
                  <span>{showAddField ? 'Cancel' : 'Add Field'}</span>
                </button>
              )}
            </div>

            {/* Add New Field Form */}
            {showAddField && (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 p-2.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg items-center">
                <input
                  type="text"
                  placeholder="Field Name (e.g. Blood Group)"
                  value={newFieldKey}
                  onChange={e => setNewFieldKey(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. O+)"
                  value={newFieldValue}
                  onChange={e => setNewFieldValue(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-md text-xs font-bold cursor-pointer transition-colors"
                >
                  Save Field
                </button>
              </div>
            )}

            {/* Rendered Custom Fields */}
            {(formData.customFields || []).length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                {(formData.customFields || []).map((field, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                        {field.key}
                      </div>
                      {canEditRole ? (
                        <input
                          type="text"
                          value={field.value}
                          onChange={e => handleCustomFieldChange(idx, e.target.value)}
                          className="w-full border-0 border-b border-dashed border-slate-300 dark:border-slate-600 text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 outline-none py-0.5 bg-transparent"
                        />
                      ) : (
                        <div className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">
                          {field.value || '—'}
                        </div>
                      )}
                    </div>
                    {canEditRole && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(idx)}
                        className="border-0 bg-transparent text-slate-400 hover:text-red-500 cursor-pointer p-1 transition-colors"
                        title="Remove field"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11.5px] text-slate-400 italic py-1">
                No custom fields defined yet for this employee.
              </div>
            )}
          </div>

          {/* Account Security & Password Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-[10px] border border-slate-200 dark:border-slate-700/80 p-3 px-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Lock size={16} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                  Account Password & Security
                </div>
                <div className="text-[11.5px] text-slate-500 dark:text-slate-400">
                  {isEditingOther ? 'Admin override: Set a new password for this employee.' : 'Update your login password (current password required).'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChangePassOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold cursor-pointer shadow-xs hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Key size={13} />
              <span>Change Password</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white border-0 py-2.5 px-[22px] rounded-lg text-[13.5px] font-semibold cursor-pointer shadow-sm shadow-sky-600/30 transition-all disabled:opacity-70"
            >
              <Check size={16} />
              {submitting ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 py-2.5 px-[18px] rounded-lg text-[13.5px] font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
        targetUser={targetEmp}
      />

      {/* Official Credential Change Request Modal (Employee -> Admin Approval) */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[1100] p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[14px] w-full max-w-[460px] p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  Request Credential Update
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed m-0 mb-4">
              Official identifiers (Full Name, Work Email) require Super Admin review and approval before updating across system records.
            </p>

            <form onSubmit={handleSendCredentialRequest} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Field to Update
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestField('name')}
                    className={`flex-1 p-2 rounded-md font-bold text-xs cursor-pointer border transition-all ${
                      requestField === 'name'
                        ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Full Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestField('email')}
                    className={`flex-1 p-2 rounded-md font-bold text-xs cursor-pointer border transition-all ${
                      requestField === 'email'
                        ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Work Email
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Value
                </label>
                <div className="p-2 px-2.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[12.5px] text-slate-700 dark:text-slate-300 font-semibold">
                  {requestField === 'email' ? (targetEmp?.email || currentUser?.email) : (targetEmp?.name || currentUser?.name)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Requested New Value *
                </label>
                <input
                  type={requestField === 'email' ? 'email' : 'text'}
                  required
                  placeholder={requestField === 'email' ? 'e.g. new.email@company.com' : 'e.g. Corrected Full Name'}
                  value={requestedValue}
                  onChange={e => setRequestedValue(e.target.value)}
                  className="w-full h-[38px] px-2.5 rounded-md border border-blue-600 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-600 box-border"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Request *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain why this credential should be changed (e.g. Name spelling correction, New email domain)..."
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                  className="w-full p-2 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none resize-none font-inherit box-border focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-3.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-[18px] py-2 rounded-md border-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-sm transition-colors disabled:opacity-70"
                >
                  {isSubmittingRequest ? 'Submitting...' : 'Submit Request to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
