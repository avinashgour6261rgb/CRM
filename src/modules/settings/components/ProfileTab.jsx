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
    <form onSubmit={handleSave} className="flex flex-col gap-6 py-6">
      
      {/* ── Profile Picture Upload Area (Matching Screenshot 6 & 9) ── */}
      <div>
        <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Profile Picture <span className="text-slate-400 text-xs">ⓘ</span>
        </label>
        
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-[100px] h-[100px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center overflow-hidden relative">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-slate-500">
                <div className="text-2xl">📄</div>
                <div className="text-[11px] font-bold">PNG...</div>
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[13px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Camera size={16} className="text-blue-600" />
            Upload New Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* ── Row 1: Name, Email, Password (Matching Screenshot 9) ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        {/* Your Name */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Your Name *
          </label>
          <div className="flex gap-1.5">
            <select
              value={formData.salutation}
              onChange={e => handleChange('salutation', e.target.value)}
              className="w-[75px] px-2 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
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
              className="flex-1 px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Your Email */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Your Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={e => handleChange('email', e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Your Password */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Your Password
          </label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Must have at least 8 characters"
              value={formData.password}
              onChange={e => handleChange('password', e.target.value)}
              className="w-full py-[9px] pl-3 pr-[70px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="bg-transparent border-0 cursor-pointer text-slate-500 hover:text-slate-700 p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="bg-transparent border-0 cursor-pointer text-blue-600 hover:text-blue-700 p-0.5"
                title="Generate Random Password"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Leave blank to keep the current password.
          </span>
        </div>

        {/* Designation / Company Role */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
              Designation / Role *
            </label>
            {canEditRole ? (
              <span className={`text-[10.5px] font-bold px-[7px] py-0.5 rounded ${
                isActorAdmin ? 'text-blue-800 bg-blue-100' : 'text-emerald-700 bg-emerald-100'
              }`}>
                {isActorAdmin ? '👑 Admin (Full Access)' : '💼 HR Access'}
              </span>
            ) : (
              <span className="text-[10.5px] text-slate-500 font-semibold">
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
                className="w-full px-3 py-[9px] rounded-lg border-[1.5px] border-blue-500 dark:border-blue-600 text-[13px] outline-none font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-600 transition-colors"
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
              className="w-full px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold"
            />
          )}
        </div>
      </div>

      {/* ── Row 2: Radio options & Country (Matching Screenshot 6 & 9) ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        {/* Receive email notifications? */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-2.5">
            Receive email notifications?
          </label>
          <div className="flex gap-6 items-center">
            <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="emailNotifications"
                value="enable"
                checked={formData.emailNotifications === 'enable'}
                onChange={() => handleChange('emailNotifications', 'enable')}
                className="accent-sky-600"
              />
              Enable
            </label>
            <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="emailNotifications"
                value="disable"
                checked={formData.emailNotifications === 'disable'}
                onChange={() => handleChange('emailNotifications', 'disable')}
                className="accent-sky-600"
              />
              Disable
            </label>
          </div>
        </div>

        {/* Enable Google Calendar */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-2.5">
            Enable Google Calendar
          </label>
          <div className="flex gap-6 items-center">
            <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="googleCalendar"
                value="yes"
                checked={formData.googleCalendar === 'yes'}
                onChange={() => handleChange('googleCalendar', 'yes')}
                className="accent-sky-600"
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="googleCalendar"
                value="no"
                checked={formData.googleCalendar === 'no'}
                onChange={() => handleChange('googleCalendar', 'no')}
                className="accent-sky-600"
              />
              No
            </label>
          </div>
        </div>

        {/* Country */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Country
          </label>
          <select
            value={formData.country}
            onChange={e => {
              const selected = COUNTRIES.find(c => c.name === e.target.value);
              handleChange('country', e.target.value);
              if (selected) handleChange('countryCode', selected.dial);
            }}
            className="w-full px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        {/* Mobile */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Mobile
          </label>
          <div className="flex gap-1.5">
            <div className="flex items-center gap-1 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
              <span>{selectedCountryObj.flag}</span>
              <span>{formData.countryCode}</span>
            </div>
            <input
              type="tel"
              placeholder="e.g. 1234567890"
              value={formData.mobile}
              onChange={e => handleChange('mobile', e.target.value)}
              className="flex-1 px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Change Language */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Change Language
          </label>
          <select
            value={formData.language}
            onChange={e => handleChange('language', e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
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
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Gender
          </label>
          <select
            value={formData.gender}
            onChange={e => handleChange('gender', e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* ── Row 4: DOB, Slack Member ID, Marital Status ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        {/* Date of Birth */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            🎂 Date of Birth (Auto-generates Calendar Birthday Event)
          </label>
          <input
            type="date"
            value={formData.dob}
            onChange={e => handleChange('dob', e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* City / Base Location */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            City / Base Location
          </label>
          <input
            type="text"
            placeholder="e.g. Indore, Madhya Pradesh"
            value={formData.city}
            onChange={e => handleChange('city', e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border-[1.5px] border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Marital Status */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Marital Status
          </label>
          <select
            value={formData.maritalStatus}
            onChange={e => handleChange('maritalStatus', e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition-colors"
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
        <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Your Address
        </label>
        <textarea
          rows={3}
          placeholder="e.g. 102, Scheme 54, Vijay Nagar, Indore, Madhya Pradesh 452010"
          value={formData.address}
          onChange={e => handleChange('address', e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] font-sans outline-none resize-y bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-colors"
        />
      </div>

      {/* ── Row 6: About ── */}
      <div>
        <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          About
        </label>
        <textarea
          rows={3}
          value={formData.about}
          onChange={e => handleChange('about', e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] font-sans outline-none resize-y bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-colors"
        />
      </div>

      {/* ── Save Action Button (Matching Screenshot 6 & 9) ── */}
      <div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white border-0 text-[13.5px] font-bold cursor-pointer shadow-md shadow-sky-600/35 disabled:opacity-50 transition-colors"
        >
          <Check size={16} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

    </form>
  );
};
