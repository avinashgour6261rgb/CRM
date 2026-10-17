import React, { useState, useEffect } from 'react';
import {
  Upload,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Camera,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useHR } from '../../hr/context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useCRM } from '../../../shared/context/CRMContext';
import { useToast } from '../../../shared/context/ToastContext';
import { getRoles, canUserAssignRole, recordPromotion } from '../../../shared/services/roleManagementService';

const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' }
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', flag: '🇦🇪' }
];

export const ProfileTab = () => {
  const { currentUser: authUser, setCurrentUser: setAuthCurrentUser } = useAuth();
  const { currentUser: hrUser, updateEmployee } = useHR();
  const currentUser = authUser || hrUser;
  const { userSettings, updateUserSettings } = useCRM();
  const { addToast } = useToast();

  const [availableRoles, setAvailableRoles] = useState(getRoles());
  const [formData, setFormData] = useState({
    salutation: userSettings?.salutation || '---',
    name: currentUser?.name || 'User',
    email: currentUser?.email || 'user@company.com',
    role: currentUser?.role || 'Senior Specialist',
    password: '',
    emailNotifications: userSettings?.emailNotifications || 'enable',
    googleCalendar: userSettings?.googleCalendar || 'yes',
    country: userSettings?.country || 'India',
    countryCode: userSettings?.countryCode || '+91',
    mobile: userSettings?.mobile || '9876543210',
    language: userSettings?.language || 'English',
    gender: userSettings?.gender || 'Male',
    dob: currentUser?.dob || userSettings?.dob || '1998-10-15',
    city: userSettings?.city || 'Indore, MP',
    maritalStatus: userSettings?.maritalStatus || 'Single',
    address: userSettings?.address || 'Vijay Nagar, Indore, Madhya Pradesh 452010, India',
    about: userSettings?.about || 'Passionate team member contributing to enterprise success.',
    avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const actorRole = (currentUser?.role || '').toLowerCase();
  const isActorAdmin = currentUser?.isAdmin || actorRole.includes('admin') || currentUser?.systemRole === 'admin';
  const isActorHR = actorRole.includes('hr') || actorRole.includes('human resources') || currentUser?.systemRole === 'hr';
  const canEditRole = isActorAdmin || isActorHR;

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name || prev.name,
        email: currentUser.email || prev.email,
        role: currentUser.role || prev.role,
        dob: currentUser.dob || prev.dob,
        avatar: currentUser.avatar || prev.avatar
      }));
      setAvailableRoles(getRoles());
    }
  }, [currentUser]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addToast('Image size should be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('avatar', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleChange('password', result);
    setShowPassword(true);
    addToast('Strong password generated!', 'info');
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Security boundary: HR cannot promote to Admin
    if (canEditRole && !isActorAdmin && formData.role?.toLowerCase().includes('admin')) {
      addToast('🔒 Security Notice: Only Super Admin can assign Admin privileges. HR cannot assign Admin role.', 'error');
      return;
    }

    setSaving(true);
    try {
      const isRoleChanged = currentUser?.role && currentUser.role !== formData.role;

      // 1. Update Core Employee Profile (avatar, name, email, role, dob sync everywhere)
      if (currentUser?._id) {
        let safeRole = formData.role;
        const isPrimaryAdmin = currentUser.employeeCode === 'ADM-001' ||
          currentUser.isSuperAdmin ||
          currentUser.email === 'admin@inforag.com' ||
          currentUser.isAdmin ||
          (currentUser.role || '').toLowerCase() === 'admin';

        if (isPrimaryAdmin) {
          // Primary Admin status can NEVER be stripped via profile settings
          if (!safeRole || safeRole.toLowerCase() === 'team member') {
            safeRole = 'Administrator';
          }
        }

        await updateEmployee(currentUser._id, {
          name: formData.name,
          email: formData.email,
          role: safeRole,
          dob: formData.dob,
          avatar: formData.avatar,
          phone: `${formData.countryCode} ${formData.mobile}`,
          ...(isPrimaryAdmin ? { isAdmin: true, isSuperAdmin: true, systemRole: 'admin' } : {})
        });

        // Sync AuthContext and session immediately
        const updatedAuth = {
          ...(authUser || currentUser),
          ...formData,
          role: safeRole,
          phone: `${formData.countryCode} ${formData.mobile}`,
          ...(isPrimaryAdmin ? { isAdmin: true, isSuperAdmin: true, systemRole: 'admin' } : {}),
          isCurrentUser: true
        };
        setAuthCurrentUser?.(updatedAuth);
        localStorage.setItem('ems_auth_session', JSON.stringify(updatedAuth));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'hrms_employees' } }));
      }

      // If role changed, record in Promotion History
      if (isRoleChanged && currentUser) {
        recordPromotion({
          employeeId: currentUser._id,
          employeeName: formData.name,
          employeeCode: currentUser.employeeCode || 'EMP',
          employeeAvatar: formData.avatar,
          previousRole: currentUser.role,
          newRole: formData.role,
          previousDepartment: currentUser.department,
          newDepartment: currentUser.department,
          effectiveDate: new Date().toISOString().split('T')[0],
          promotedBy: currentUser.name || (isActorAdmin ? 'Super Admin' : 'HR Manager'),
          reason: 'Role Updated via Profile Settings'
        });
      }

      // 2. Update Extended User Settings
      await updateUserSettings({
        salutation: formData.salutation,
        emailNotifications: formData.emailNotifications,
        googleCalendar: formData.googleCalendar,
        country: formData.country,
        countryCode: formData.countryCode,
        mobile: formData.mobile,
        language: formData.language,
        gender: formData.gender,
        dob: formData.dob,
        city: formData.city,
        maritalStatus: formData.maritalStatus,
        address: formData.address,
        about: formData.about
      });

      addToast('Profile and Role settings saved successfully! 🎖️', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save profile settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedCountryObj = COUNTRIES.find(c => c.name === formData.country) || COUNTRIES[0];
  const selectedLangObj = LANGUAGES.find(l => l.name === formData.language) || LANGUAGES[0];

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0' }}>
      
      {/* ── Profile Picture Upload Area (Matching Screenshot 6 & 9) ── */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
          Profile Picture <span style={{ color: '#94a3b8', fontSize: '12px' }}>ⓘ</span>
        </label>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '12px',
            border: '2px dashed #cbd5e1',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '24px' }}>📄</div>
                <div style={{ fontSize: '11px', fontWeight: '700' }}>PNG...</div>
              </div>
            )}
          </div>

          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            fontWeight: '600',
            color: '#334155',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <Camera size={16} color="#2563eb" />
            Upload New Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* ── Row 1: Name, Email, Password (Matching Screenshot 9) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Your Name */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Your Name *
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <select
              value={formData.salutation}
              onChange={e => handleChange('salutation', e.target.value)}
              style={{
                width: '75px',
                padding: '9px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                outline: 'none'
              }}
            >
              <option value="---">---</option>
              <option value="Mr.">Mr.</option>
              <option value="Ms.">Ms.</option>
              <option value="Mrs.">Mrs.</option>
              <option value="Dr.">Dr.</option>
            </select>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Your Email */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Your Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={e => handleChange('email', e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Your Password */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Your Password
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Must have at least 8 characters"
              value={formData.password}
              onChange={e => handleChange('password', e.target.value)}
              style={{
                width: '100%',
                padding: '9px 70px 9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <div style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={generateRandomPassword}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '2px' }}
                title="Generate Random Password"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
            Leave blank to keep the current password.
          </span>
        </div>

        {/* Designation / Company Role */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
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
                list="settings-profile-roles"
                required
                value={formData.role}
                onChange={e => handleChange('role', e.target.value)}
                placeholder="e.g. Senior Software Engineer / Team Leader"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #3b82f6',
                  fontSize: '13px',
                  outline: 'none',
                  fontWeight: '600',
                  backgroundColor: '#ffffff'
                }}
              />
              <datalist id="settings-profile-roles">
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
                fontSize: '13px',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                fontWeight: '600'
              }}
            />
          )}
        </div>
      </div>

      {/* ── Row 2: Radio options & Country (Matching Screenshot 6 & 9) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Receive email notifications? */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '10px' }}>
            Receive email notifications?
          </label>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
              <input
                type="radio"
                name="emailNotifications"
                value="enable"
                checked={formData.emailNotifications === 'enable'}
                onChange={() => handleChange('emailNotifications', 'enable')}
                style={{ accentColor: '#0284c7' }}
              />
              Enable
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
              <input
                type="radio"
                name="emailNotifications"
                value="disable"
                checked={formData.emailNotifications === 'disable'}
                onChange={() => handleChange('emailNotifications', 'disable')}
                style={{ accentColor: '#0284c7' }}
              />
              Disable
            </label>
          </div>
        </div>

        {/* Enable Google Calendar */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '10px' }}>
            Enable Google Calendar
          </label>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
              <input
                type="radio"
                name="googleCalendar"
                value="yes"
                checked={formData.googleCalendar === 'yes'}
                onChange={() => handleChange('googleCalendar', 'yes')}
                style={{ accentColor: '#0284c7' }}
              />
              Yes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
              <input
                type="radio"
                name="googleCalendar"
                value="no"
                checked={formData.googleCalendar === 'no'}
                onChange={() => handleChange('googleCalendar', 'no')}
                style={{ accentColor: '#0284c7' }}
              />
              No
            </label>
          </div>
        </div>

        {/* Country */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Country
          </label>
          <select
            value={formData.country}
            onChange={e => {
              const selected = COUNTRIES.find(c => c.name === e.target.value);
              handleChange('country', e.target.value);
              if (selected) handleChange('countryCode', selected.dial);
            }}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.name}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Row 3: Mobile, Language, Gender (Matching Screenshot 6 & 9) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Mobile */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Mobile
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 8px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              <span>{selectedCountryObj.flag}</span>
              <span>{formData.countryCode}</span>
            </div>
            <input
              type="tel"
              placeholder="e.g. 1234567890"
              value={formData.mobile}
              onChange={e => handleChange('mobile', e.target.value)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Change Language */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Change Language
          </label>
          <select
            value={formData.language}
            onChange={e => handleChange('language', e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.name}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Gender */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={e => handleChange('gender', e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* ── Row 4: DOB, Slack Member ID, Marital Status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Date of Birth */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            🎂 Date of Birth (Auto-generates Calendar Birthday Event)
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
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* City / Base Location */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            City / Base Location
          </label>
          <input
            type="text"
            placeholder="e.g. Indore, Madhya Pradesh"
            value={formData.city}
            onChange={e => handleChange('city', e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          />
        </div>

        {/* Marital Status */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Marital Status
          </label>
          <select
            value={formData.maritalStatus}
            onChange={e => handleChange('maritalStatus', e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Divorced">Divorced</option>
          </select>
        </div>
      </div>

      {/* ── Row 5: Your Address ── */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
          Your Address
        </label>
        <textarea
          rows={3}
          placeholder="e.g. 102, Scheme 54, Vijay Nagar, Indore, Madhya Pradesh 452010"
          value={formData.address}
          onChange={e => handleChange('address', e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            fontFamily: 'inherit',
            outline: 'none',
            resize: 'vertical'
          }}
        />
      </div>

      {/* ── Row 6: About ── */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
          About
        </label>
        <textarea
          rows={3}
          value={formData.about}
          onChange={e => handleChange('about', e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            fontFamily: 'inherit',
            outline: 'none',
            resize: 'vertical'
          }}
        />
      </div>

      {/* ── Save Action Button (Matching Screenshot 6 & 9) ── */}
      <div>
        <button
          type="submit"
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 24px',
            borderRadius: '8px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)'
          }}
        >
          <Check size={16} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

    </form>
  );
};
