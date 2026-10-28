import React, { useState, useEffect } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Printer,
  Sparkles,
  Edit3,
  Clock
} from 'lucide-react';
import { getCompanySettings, saveCompanySettings } from '../../../shared/services/companySettingsService';
import { useToast } from '../../../shared/context/ToastContext';

export const CompanyBrandingTab = () => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState(getCompanySettings());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setFormData(getCompanySettings());
    window.addEventListener('company-settings-updated', handleUpdate);
    return () => window.removeEventListener('company-settings-updated', handleUpdate);
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveCompanySettings(formData);
    setIsSaved(true);
    addToast({
      title: 'Company Settings Saved! 🏢',
      message: `Updated to "${formData.companyName}". Settings and document branding updated immediately.`,
      type: 'success'
    });
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header Description */}
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 mb-1">
          Company & Payslip Settings (Admin Control)
        </h2>
        <p className="text-[13px] text-slate-500 m-0">
          Customize company legal name, corporate address, branding logos, and authorized signatories for official documents.
        </p>
      </div>

      {/* Form and Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        
        {/* Left Side: Admin Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          {/* Company Legal Name */}
          <div>
            <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
              Company Legal Name (Printed on Payslips) *
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={formData.companyName}
                onChange={e => handleChange('companyName', e.target.value)}
                placeholder="e.g. My Company Pvt. Ltd. (Optional — Leave blank for default workspace)"
                className="w-full h-10 pl-9 pr-3 rounded-lg border-[1.5px] border-slate-300 text-[13.5px] font-bold text-slate-900 outline-none bg-white focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Short Name & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Brand Display Name
              </label>
              <input
                type="text"
                value={formData.shortName}
                onChange={e => handleChange('shortName', e.target.value)}
                placeholder="e.g. My Company (Optional)"
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 text-[13px] outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Corporate Tagline / Subtitle
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => handleChange('tagline', e.target.value)}
                placeholder="e.g. Enterprise Solutions"
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 text-[13px] outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Corporate Address */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Registered Corporate Address
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="e.g. Enterprise Tech Towers, Sector 24, New Delhi"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-[13px] outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Official Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                HR Official Email (From Address)
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-2.5 top-[11px] text-slate-500" />
                <input
                  type="email"
                  value={formData.hrEmail || formData.email}
                  onChange={e => handleChange('hrEmail', e.target.value)}
                  placeholder="hr@inforagtechnology.com"
                  className="w-full h-[38px] pl-8 pr-2.5 rounded-lg border border-slate-300 text-[12.5px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Helpline / Phone
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-2.5 top-[11px] text-slate-500" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-[38px] pl-8 pr-2.5 rounded-lg border border-slate-300 text-[12.5px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Corporate Identification & Tax Registration (Printed on Payslips) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Corporate ID (CIN)
              </label>
              <input
                type="text"
                value={formData.cin || ''}
                onChange={e => handleChange('cin', e.target.value)}
                placeholder="e.g. U72200MH2021PTC123456"
                className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={e => handleChange('gstin', e.target.value)}
                placeholder="e.g. 07AAAAA0000A1Z5"
                className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Company PAN
              </label>
              <input
                type="text"
                value={formData.pan || ''}
                onChange={e => handleChange('pan', e.target.value)}
                placeholder="e.g. ABCDE1234F"
                className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* ⏱️ Work Shift Timings & Working Hours Configuration (Admin/HR Setting) */}
          <div className="p-4 bg-slate-50 border-[1.5px] border-slate-200 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <div>
                <div className="text-[13px] font-bold text-slate-900">
                  Work Shift Timing & Hours Configuration
                </div>
                <div className="text-[11.5px] text-slate-500">
                  Define company default work shift hours. Applied to Calendar, Attendance, and Employee shift trackers.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shift Start Time
                </label>
                <input
                  type="text"
                  value={formData.shiftStartTime || '10:00 AM'}
                  onChange={e => handleChange('shiftStartTime', e.target.value)}
                  placeholder="e.g. 10:00 AM or 09:30 AM"
                  className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 text-[12.5px] font-semibold outline-none bg-white focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shift End Time
                </label>
                <input
                  type="text"
                  value={formData.shiftEndTime || '07:00 PM'}
                  onChange={e => handleChange('shiftEndTime', e.target.value)}
                  placeholder="e.g. 07:00 PM or 06:30 PM"
                  className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 text-[12.5px] font-semibold outline-none bg-white focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standard Hours / Day
                </label>
                <input
                  type="number"
                  min="4"
                  max="14"
                  value={formData.standardWorkHours || 9}
                  onChange={e => handleChange('standardWorkHours', Number(e.target.value) || 9)}
                  placeholder="9"
                  className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 text-[12.5px] font-semibold outline-none bg-white focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* 🔐 Login Page Privacy & Company Name Visibility Toggle */}
          <div className="p-3.5 px-4 bg-blue-50 border-[1.5px] border-blue-200 rounded-xl flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-blue-900">
                🏢 Show Company Name on Login Screen
              </div>
              <div className="text-[11.5px] text-blue-600 mt-0.5">
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
                formData.showCompanyNameOnLogin ? 'bg-blue-600' : 'bg-slate-300'
              }`}>
                <span className={`absolute top-[3px] h-[18px] w-[18px] bg-white rounded-full transition-all shadow-sm ${
                  formData.showCompanyNameOnLogin ? 'left-[23px]' : 'left-[3px]'
                }`} />
              </span>
            </label>
          </div>

          {/* Authorized Signatory Info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-800">
              ✍️ Authorized Signatory on Payslips & Appraisal Letters:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Signatory Title</label>
                <input
                  type="text"
                  value={formData.signatoryTitle}
                  onChange={e => handleChange('signatoryTitle', e.target.value)}
                  placeholder="e.g. Authorized HR Directorate"
                  className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-[12.5px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Signatory Name</label>
                <input
                  type="text"
                  value={formData.signatoryName}
                  onChange={e => handleChange('signatoryName', e.target.value)}
                  placeholder="e.g. Sneha Patel"
                  className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-[12.5px] outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2.5 mt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border-0 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold cursor-pointer shadow-md shadow-blue-600/30 transition-colors"
            >
              <CheckCircle2 size={16} />
              Save Company Settings
            </button>
          </div>
        </form>

        {/* Right Side: Live Payslip Header Preview */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
            <FileText size={16} className="text-blue-600" />
            <span>Live Payslip Header Preview</span>
          </div>

          <div className="border-2 border-dashed border-blue-300 rounded-xl p-5 bg-white shadow-xs">
            {/* Live Header Render */}
            <div className="flex justify-between items-start border-b-2 border-blue-600 pb-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-blue-950 m-0">
                  {formData.companyName || 'YOUR COMPANY NAME'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-[3px] m-0 leading-snug">
                  {formData.address}
                </p>
                <p className="text-[11px] text-blue-600 mt-0.5 m-0">
                  {formData.hrEmail || formData.email} • {formData.phone}
                </p>
              </div>
              <div className="px-2 py-[3px] rounded bg-blue-100 text-blue-800 text-[10.5px] font-bold whitespace-nowrap">
                SAMPLE PAYSLIP
              </div>
            </div>

            {/* Dummy Mock Table */}
            <div className="bg-slate-50 rounded-md border border-slate-200 p-3 text-[11.5px] flex flex-col gap-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Employee Name: <strong>Rahul Verma</strong></span>
                <span>Designation: <strong>Senior Full Stack Developer</strong></span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-300 pt-1.5 font-bold text-green-700">
                <span>Net Monthly Take-Home:</span>
                <span>₹83,740 / month</span>
              </div>
            </div>

            {/* Live Signatory Render */}
            <div className="flex justify-between items-end mt-5 pt-3 border-t border-slate-200 text-[10.5px] text-slate-500">
              <div>
                <span>{formData.footerNote}</span>
              </div>
              <div className="text-center">
                <div className="w-[100px] border-b border-slate-400 mb-[3px] mx-auto"></div>
                <strong className="text-slate-800">{formData.signatoryTitle}</strong>
                <div className="text-[9.5px] text-slate-500">({formData.signatoryName})</div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <Sparkles size={16} />
            <span>Changes take effect immediately on all printouts, PDF exports, and emails!</span>
          </div>
        </div>

      </div>
    </div>
  );
};
