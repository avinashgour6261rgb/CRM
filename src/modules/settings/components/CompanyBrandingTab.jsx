import React, { useState, useEffect } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  CheckCircle2,
  FileText,
  Sparkles,
  Clock,
  ArrowRight,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { getCompanySettings, saveCompanySettings, fetchCompanySettingsFromDB } from '../../../shared/services/companySettingsService';
import { useToast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';

export const CompanyBrandingTab = ({ onNavigateTab }) => {
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState(getCompanySettings());
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = React.useRef(false);
  const logoInputRef = React.useRef(null);

  useEffect(() => {
    fetchCompanySettingsFromDB().then(data => {
      if (data && !isDirtyRef.current) setFormData(data);
    });
    const handleUpdate = () => {
      if (!isDirtyRef.current) setFormData(getCompanySettings());
    };
    window.addEventListener('company-settings-updated', handleUpdate);
    return () => window.removeEventListener('company-settings-updated', handleUpdate);
  }, []);

  const handleChange = (field, value) => {
    isDirtyRef.current = true;
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid PNG, JPG, SVG, or WebP image file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxH = 160;
          const maxW = 420;
          let w = img.width;
          let h = img.height;
          const ratio = Math.min(1, maxW / w, maxH / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/png', 0.92);
          handleChange('companyLogo', dataUrl);
          addToast('Company logo loaded! Click "Save Company Settings" to publish across Payslips & Sidebar.', 'info');
        } catch {
          handleChange('companyLogo', String(reader.result || ''));
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const saved = await saveCompanySettings(formData, currentUser);
      isDirtyRef.current = false;
      setFormData(saved);
      setIsSaved(true);
      addToast({
        title: 'Company Settings Saved! 🏢',
        message: `Updated to "${saved.companyName}". Synced to MongoDB and live across all devices.`,
        type: 'success'
      });
    } catch (err) {
      addToast({
        title: 'Failed to Save Company Settings',
        message: err?.message || 'Could not save to database. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 py-3">
      {/* ── Sub Navigation Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 size={16} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 m-0">
              Company Profile & Legal Branding
            </h2>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-400 m-0 mt-0.5">
              Legal entity details, registered address, statutory tax numbers, and payslip letterhead.
            </p>
            {formData.lastUpdatedBy && (
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mt-1 inline-block">
                Last updated by <strong>{formData.lastUpdatedBy}</strong>
              </span>
            )}
          </div>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('shifts')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold cursor-pointer transition-colors shrink-0 shadow-xs"
          >
            <Clock size={13} className="text-blue-500" />
            <span>Switch to Work Shift & Timing Policy</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Form and Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        
        {/* Left Side: Admin Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">

          {/* Company Logo Upload */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              {formData.companyLogo ? (
                <img
                  src={formData.companyLogo}
                  alt="Company Logo"
                  className="h-12 max-w-[120px] object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ImageIcon size={20} />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  Official Company Logo
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Printed on Salary Slips, Appraisal/Promotion Letters, Sidebar &amp; Login screen.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Upload size={13} />
                <span>{formData.companyLogo ? 'Change Logo' : 'Upload Logo'}</span>
              </button>
              {formData.companyLogo && (
                <button
                  type="button"
                  onClick={() => handleChange('companyLogo', '')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold cursor-pointer hover:bg-red-100 transition-colors"
                  title="Remove logo"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Company Legal Name */}
          <div>
            <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Company Legal Name (Printed on Payslips) *
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={formData.companyName}
                onChange={e => handleChange('companyName', e.target.value)}
                placeholder="e.g. Inforag Technology Pvt. Ltd."
                className="w-full h-10 pl-9 pr-3 rounded-lg border-[1.5px] border-slate-300 dark:border-slate-700 text-[13.5px] font-bold text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 focus:border-blue-500 transition-colors shadow-xs"
              />
            </div>
          </div>

          {/* Short Name & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Brand Display Name
              </label>
              <input
                type="text"
                value={formData.shortName}
                onChange={e => handleChange('shortName', e.target.value)}
                placeholder="e.g. Inforag"
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Corporate Tagline / Subtitle
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => handleChange('tagline', e.target.value)}
                placeholder="e.g. Enterprise Management System"
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Corporate Address */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Registered Corporate Address
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="e.g. Enterprise Tech Towers, Sector 24, New Delhi"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Official Email, Phone & Website */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                HR Official Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-2.5 top-[11px] text-slate-500" />
                <input
                  type="email"
                  value={formData.hrEmail || formData.email}
                  onChange={e => handleChange('hrEmail', e.target.value)}
                  placeholder="hr@company.com"
                  className="w-full h-[38px] pl-8 pr-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12.5px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Helpline / Phone
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-2.5 top-[11px] text-slate-500" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-[38px] pl-8 pr-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12.5px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Official Website
              </label>
              <div className="relative">
                <Globe size={15} className="absolute left-2.5 top-[11px] text-slate-500" />
                <input
                  type="text"
                  value={formData.website || ''}
                  onChange={e => handleChange('website', e.target.value)}
                  placeholder="www.company.com"
                  className="w-full h-[38px] pl-8 pr-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12.5px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Corporate Identification & Tax Registration (Printed on Payslips) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Corporate ID (CIN)
              </label>
              <input
                type="text"
                value={formData.cin || ''}
                onChange={e => handleChange('cin', e.target.value)}
                placeholder="e.g. U72200MH2021PTC123456"
                className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={e => handleChange('gstin', e.target.value)}
                placeholder="e.g. 07AAAAA0000A1Z5"
                className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Company PAN
              </label>
              <input
                type="text"
                value={formData.pan || ''}
                onChange={e => handleChange('pan', e.target.value)}
                placeholder="e.g. ABCDE1234F"
                className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* 🏢 Company Foundation Day & Anniversary (Admin Configurable) */}
          <div className="p-3.5 px-4 bg-purple-50 dark:bg-purple-950/40 border-[1.5px] border-purple-200 dark:border-purple-900/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <span>🎉 Company Foundation Day & Anniversary</span>
              </div>
              <div className="text-[11.5px] text-purple-700 dark:text-purple-300 mt-0.5">
                Official establishment date of the organization. Displayed on Dashboard & Events calendar for all employees.
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <input
                type="date"
                value={formData.foundationDate || '2020-04-15'}
                onChange={e => handleChange('foundationDate', e.target.value)}
                className="h-9 px-3 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* 🔐 Login Page Privacy & Company Name Visibility Toggle */}
          <div className="p-3.5 px-4 bg-blue-50 dark:bg-blue-950/30 border-[1.5px] border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-blue-900 dark:text-blue-200">
                🏢 Show Company Name on Login Screen
              </div>
              <div className="text-[11.5px] text-blue-600 dark:text-blue-400 mt-0.5">
                When disabled (default), the sign-in page displays generic &quot;Enterprise Workspace&quot;. Enable this if you want your actual company name shown publicly.
              </div>
            </div>
            <label className="relative inline-block w-11 h-6 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.showCompanyNameOnLogin}
                onChange={e => handleChange('showCompanyNameOnLogin', e.target.checked)}
                className="sr-only"
              />
              <span className={`block w-full h-full rounded-full transition-colors ${
                formData.showCompanyNameOnLogin ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}>
                <span className={`absolute top-[3px] h-[18px] w-[18px] bg-white rounded-full transition-all shadow-sm ${
                  formData.showCompanyNameOnLogin ? 'left-[23px]' : 'left-[3px]'
                }`} />
              </span>
            </label>
          </div>

          {/* Authorized Signatory Info */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              ✍️ Authorized Signatory on Payslips & Appraisal Letters:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Signatory Title</label>
                <input
                  type="text"
                  value={formData.signatoryTitle}
                  onChange={e => handleChange('signatoryTitle', e.target.value)}
                  placeholder="e.g. Authorized HR Directorate"
                  className="w-full h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12.5px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Signatory Name</label>
                <input
                  type="text"
                  value={formData.signatoryName}
                  onChange={e => handleChange('signatoryName', e.target.value)}
                  placeholder="e.g. Sneha Patel"
                  className="w-full h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12.5px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Payslip &amp; Document Footer Note</label>
              <input
                type="text"
                value={formData.footerNote || ''}
                onChange={e => handleChange('footerNote', e.target.value)}
                placeholder="* This is an electronic record and does not require a physical signature."
                className="w-full h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end items-center gap-3 mt-1">
            {isSaved && !isSaving && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ✓ Live synced across all payslips &amp; devices
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[13px] font-bold cursor-pointer shadow-md shadow-blue-600/30 transition-colors"
            >
              <CheckCircle2 size={16} />
              {isSaving ? 'Saving to Server...' : 'Save Company Settings'}
            </button>
          </div>
        </form>

        {/* Right Side: Live Payslip Header Preview */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700 dark:text-slate-300">
            <FileText size={16} className="text-blue-600" />
            <span>Live Payslip Letterhead Preview</span>
          </div>

          <div className="border-2 border-dashed border-blue-300 dark:border-blue-800/80 rounded-xl p-5 bg-white dark:bg-slate-900 shadow-xs">
            {/* Live Header Render */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b-2 border-blue-600 dark:border-blue-500 pb-3 mb-4">
              <div className="flex items-start gap-3">
                {formData.companyLogo && (
                  <img
                    src={formData.companyLogo}
                    alt="Logo"
                    className="h-11 max-w-[90px] object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
                  />
                )}
                <div>
                  <h3 className="text-base font-extrabold text-blue-950 dark:text-blue-200 m-0 uppercase">
                    {formData.companyName || 'YOUR COMPANY NAME'}
                  </h3>
                  {formData.tagline && (
                    <p className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 m-0">
                      {formData.tagline}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-[3px] m-0 leading-snug">
                    {formData.address || 'Registered Office Address'}
                  </p>
                  <p className="text-[10.5px] text-blue-600 dark:text-blue-400 mt-0.5 m-0 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>{formData.hrEmail || formData.email || 'hr@company.com'}</span>
                    {formData.phone && <span>• {formData.phone}</span>}
                    {formData.website && <span>• {formData.website}</span>}
                  </p>
                  {(formData.cin || formData.gstin || formData.pan) && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 m-0 flex flex-wrap gap-x-2">
                      {formData.cin && <span>CIN: <strong>{formData.cin}</strong></span>}
                      {formData.gstin && <span>GSTIN: <strong>{formData.gstin}</strong></span>}
                      {formData.pan && <span>PAN: <strong>{formData.pan}</strong></span>}
                    </p>
                  )}
                </div>
              </div>
              <div className="px-2 py-[3px] rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[10.5px] font-bold whitespace-nowrap self-start">
                SALARY SLIP
              </div>
            </div>

            {/* Dummy Mock Table */}
            <div className="bg-slate-50 dark:bg-slate-800/70 rounded-md border border-slate-200 dark:border-slate-700 p-3 text-[11.5px] flex flex-col gap-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <span>Employee Name: <strong>Rahul Verma</strong></span>
                <span>Designation: <strong>Senior Full Stack Developer</strong></span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-300 dark:border-slate-700 pt-1.5 font-bold text-green-700 dark:text-green-400">
                <span>Net Monthly Take-Home:</span>
                <span>₹83,740 / month</span>
              </div>
            </div>

            {/* Live Signatory Render */}
            <div className="flex justify-between items-end mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-500 dark:text-slate-400">
              <div>
                <span>{formData.footerNote}</span>
              </div>
              <div className="text-center">
                <div className="w-[100px] border-b border-slate-400 dark:border-slate-600 mb-[3px] mx-auto"></div>
                <strong className="text-slate-800 dark:text-slate-200">{formData.signatoryTitle}</strong>
                <div className="text-[9.5px] text-slate-500 dark:text-slate-400">({formData.signatoryName || 'Authorized Signatory'})</div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Sparkles size={16} />
            <span>Changes take effect immediately on all printouts, PDF exports, and emails!</span>
          </div>
        </div>

      </div>
    </div>
  );
};
