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
  Award
} from 'lucide-react';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../context/ToastContext';
import { getRoles, canUserAssignRole, recordPromotion } from '../../services/roleManagementService';

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
    avatar: '',
    bio: '',
    workingMode: 'Office',
    employeeCode: 'EMP-001'
  });

  const [submitting, setSubmitting] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Determine Actor Privileges
  const actorRole = (currentUser?.role || '').toLowerCase();
  const isActorAdmin = currentUser?.isAdmin || actorRole.includes('admin') || currentUser?.systemRole === 'admin';
  const isActorHR = actorRole.includes('hr') || actorRole.includes('human resources') || currentUser?.systemRole === 'hr';
  const canEditRole = isActorAdmin || isActorHR;

  // Sync form data whenever targetEmp or modal open state changes
  useEffect(() => {
    if (targetEmp) {
      setFormData({
        name: targetEmp.name || 'Employee',
        role: targetEmp.role || 'Senior Specialist',
        department: targetEmp.department || 'Engineering',
        email: targetEmp.email || 'employee@company.com',
        phone: targetEmp.phone || '+91 98765 43210',
        dob: targetEmp.dob || '1998-10-15',
        avatar: targetEmp.avatar || PRESET_AVATARS[0],
        bio: targetEmp.bio || 'Core member contributing across sprint deliveries.',
        workingMode: targetEmp.workingMode || localStorage.getItem('ems_working_mode') || 'Office',
        employeeCode: targetEmp.employeeCode || targetEmp._id || 'EMP-001'
      });
      setCustomAvatarUrl(targetEmp.avatar || '');
      setAvailableRoles(getRoles());
    }
  }, [targetEmp, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      alert('🔒 Security Restriction: HR Managers cannot create or assign Admin accounts. Only Super Admin has this privilege.');
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Edit Employee Profile
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
              Update your photo, designation, and bio — updates immediately across all screens!
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Avatar selection */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>
              📸 Profile Picture & Avatar
            </label>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={formData.avatar || PRESET_AVATARS[0]}
                  alt="Selected Avatar"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '3px solid #2563eb',
                    boxShadow: '0 4px 10px rgba(37,99,235,0.2)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '200px' }}>
                {/* File Upload Button */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#334155',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <Camera size={14} color="#2563eb" />
                    Upload from Device
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {showUrlInput ? 'Hide URL' : 'Paste URL'}
                  </button>
                </div>

                {showUrlInput && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customAvatarUrl) handleChange('avatar', customAvatarUrl);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Preset Avatars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Presets:</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {PRESET_AVATARS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt={`Avatar ${idx}`}
                        onClick={() => handleChange('avatar', av)}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          border: formData.avatar === av ? '2px solid #2563eb' : '1.5px solid transparent',
                          opacity: formData.avatar === av ? 1 : 0.65,
                          transform: formData.avatar === av ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.15s'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Name & Designation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                  Designation / Role *
                </label>
                {canEditRole ? (
                  <span style={{
                    fontSize: '10.5px',
                    color: isActorAdmin ? '#1e40af' : '#047857',
                    fontWeight: '700',
                    backgroundColor: isActorAdmin ? '#dbeafe' : '#dcfce7',
                    padding: '2px 7px',
                    borderRadius: '5px'
                  }}>
                    {isActorAdmin ? '👑 Admin (Full Access)' : '💼 HR Access'}
                  </span>
                ) : (
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600' }}>
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
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #3b82f6',
                      fontSize: '13.5px',
                      outline: 'none',
                      fontWeight: '600'
                    }}
                  />
                  <datalist id="edit-profile-role-options">
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
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    fontWeight: '600'
                  }}
                />
              )}
            </div>
          </div>

          {/* Department & Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={e => handleChange('department', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Phone Number & Date of Birth (Auto Birthday Events Engine) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                🎂 Date of Birth (Auto-creates Birthday Event)
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={e => handleChange('dob', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Working Mode (Office / Remote / Hybrid) & Employee ID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                🏢 Working Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                {['Office', 'Remote', 'Hybrid'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleChange('workingMode', mode)}
                    style={{
                      padding: '7px 4px',
                      borderRadius: '8px',
                      border: formData.workingMode === mode ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: formData.workingMode === mode ? '#eff6ff' : '#ffffff',
                      color: formData.workingMode === mode ? '#1d4ed8' : '#475569',
                      fontWeight: formData.workingMode === mode ? '700' : '500',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                🆔 Employee ID / Code
              </label>
              <input
                type="text"
                value={formData.employeeCode}
                onChange={e => handleChange('employeeCode', e.target.value)}
                placeholder="EMP-001"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  fontWeight: '600'
                }}
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              About / Bio
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={e => handleChange('bio', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingTop: '14px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
              }}
            >
              <Check size={16} />
              {submitting ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
