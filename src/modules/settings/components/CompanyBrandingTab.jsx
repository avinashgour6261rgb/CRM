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
      title: 'Company & Shift Settings Saved! 🏢⏰',
      message: `Updated to "${formData.companyName}" • Standard Shift: ${formData.shiftStartTime || '10:00 AM'} - ${formData.shiftEndTime || '07:00 PM'} (${formData.standardWorkHours || 9}h). Week Timelogs & documents updated immediately.`,
      type: 'success'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '16px 0' }}>
      {/* Header Description */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
          Company, Shift & Payslip Settings (Admin Control)
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Customize company legal name, corporate address, working hours & shift timings (10:00 AM - 07:00 PM), and authorized signatories.
        </p>
      </div>

      {/* Form and Live Preview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Left Side: Admin Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Company Legal Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Company Legal Name (Printed on Payslips) *
            </label>
            <div style={{ position: 'relative' }}>
              <Building2 size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                value={formData.companyName}
                onChange={e => handleChange('companyName', e.target.value)}
                placeholder="e.g. INFORAG TECHNOLOGY PVT. LTD."
                required
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* Short Name & Tagline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Brand Display Name
              </label>
              <input
                type="text"
                value={formData.shortName}
                onChange={e => handleChange('shortName', e.target.value)}
                placeholder="e.g. Inforag Technology"
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Corporate Tagline / Subtitle
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => handleChange('tagline', e.target.value)}
                placeholder="e.g. Enterprise Solutions"
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Corporate Address */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Registered Corporate Address
            </label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="e.g. Enterprise Tech Towers, Sector 24, New Delhi"
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Official Email & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                HR Official Email (From Address)
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="email"
                  value={formData.hrEmail || formData.email}
                  onChange={e => handleChange('hrEmail', e.target.value)}
                  placeholder="hr@inforagtechnology.com"
                  style={{
                    width: '100%',
                    height: '38px',
                    paddingLeft: '32px',
                    paddingRight: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Helpline / Phone
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{
                    width: '100%',
                    height: '38px',
                    paddingLeft: '32px',
                    paddingRight: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Authorized Signatory Info */}
          <div style={{
            padding: '14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
              ✍️ Authorized Signatory on Payslips & Appraisal Letters:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Signatory Title</label>
                <input
                  type="text"
                  value={formData.signatoryTitle}
                  onChange={e => handleChange('signatoryTitle', e.target.value)}
                  placeholder="e.g. Authorized HR Directorate"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Signatory Name</label>
                <input
                  type="text"
                  value={formData.signatoryName}
                  onChange={e => handleChange('signatoryName', e.target.value)}
                  placeholder="e.g. Sneha Patel"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>
            </div>
          </div>

          {/* ⏱️ Admin Configurable Shift Timing & Working Hours */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f0f9ff',
            border: '1.5px solid #bae6fd',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="#0284c7" /> Official Shift Timings & Working Hours (Admin Control)
              </span>
              <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '12px' }}>
                Active: {formData.standardWorkHours || 9}h Shift
              </span>
            </div>

            <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
              Set standard working hours and official shift timings. The Dashboard Week Timelogs, attendance calculations, and daily task duration comparison automatically adapt to this configuration.
            </p>

            {/* Quick Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Quick Presets:</span>
              {[
                { label: '10:00 AM – 07:00 PM (9h Standard)', hours: 9, start: '10:00 AM', end: '07:00 PM' },
                { label: '09:30 AM – 06:30 PM (9h Corporate)', hours: 9, start: '09:30 AM', end: '06:30 PM' },
                { label: '09:00 AM – 06:00 PM (9h Early)', hours: 9, start: '09:00 AM', end: '06:00 PM' },
                { label: '09:00 AM – 05:00 PM (8h Shift)', hours: 8, start: '09:00 AM', end: '05:00 PM' }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      standardWorkHours: preset.hours,
                      shiftStartTime: preset.start,
                      shiftEndTime: preset.end
                    }));
                    setIsSaved(false);
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: (formData.shiftStartTime === preset.start && formData.shiftEndTime === preset.end)
                      ? '1px solid #0284c7'
                      : '1px solid #cbd5e1',
                    backgroundColor: (formData.shiftStartTime === preset.start && formData.shiftEndTime === preset.end)
                      ? '#e0f2fe'
                      : '#ffffff',
                    color: (formData.shiftStartTime === preset.start && formData.shiftEndTime === preset.end)
                      ? '#0284c7'
                      : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Standard Daily Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="16"
                  value={formData.standardWorkHours ?? 9}
                  onChange={e => handleChange('standardWorkHours', parseFloat(e.target.value) || 9)}
                  placeholder="e.g. 9"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Shift Start Time
                </label>
                <input
                  type="text"
                  value={formData.shiftStartTime || '10:00 AM'}
                  onChange={e => handleChange('shiftStartTime', e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  Shift End Time
                </label>
                <input
                  type="text"
                  value={formData.shiftEndTime || '07:00 PM'}
                  onChange={e => handleChange('shiftEndTime', e.target.value)}
                  placeholder="e.g. 07:00 PM"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Working Days Schedule
              </label>
              <input
                type="text"
                value={formData.workDaysDescription || 'Mon - Sat (Sunday Off)'}
                onChange={e => handleChange('workDaysDescription', e.target.value)}
                placeholder="e.g. Mon - Sat (Sunday Off)"
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={16} />
              Save Company & Shift Settings
            </button>
          </div>
        </form>

        {/* Right Side: Live Payslip Header Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>
            <FileText size={16} color="#2563eb" />
            <span>Live Payslip Header Preview</span>
          </div>

          <div style={{
            border: '2px dashed #93c5fd',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}>
            {/* Live Header Render */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #2563eb',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e3a8a', margin: 0 }}>
                  {formData.companyName || 'YOUR COMPANY NAME'}
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '3px 0 0 0', lineHeight: '1.4' }}>
                  {formData.address}
                </p>
                <p style={{ fontSize: '11px', color: '#2563eb', margin: '2px 0 0 0' }}>
                  {formData.hrEmail || formData.email} • {formData.phone}
                </p>
              </div>
              <div style={{
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                fontSize: '10.5px',
                fontWeight: '700',
                whiteSpace: 'nowrap'
              }}>
                SAMPLE PAYSLIP
              </div>
            </div>

            {/* Dummy Mock Table */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              padding: '12px',
              fontSize: '11.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              color: '#475569'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Employee Name: <strong>Rahul Verma</strong></span>
                <span>Designation: <strong>Senior Full Stack Developer</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: '700', color: '#15803d' }}>
                <span>Net Monthly Take-Home:</span>
                <span>₹83,740 / month</span>
              </div>
            </div>

            {/* Live Signatory Render */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: '20px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
              fontSize: '10.5px',
              color: '#64748b'
            }}>
              <div>
                <span>{formData.footerNote}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '100px', borderBottom: '1px solid #94a3b8', marginBottom: '3px' }}></div>
                <strong style={{ color: '#1e293b' }}>{formData.signatoryTitle}</strong>
                <div style={{ fontSize: '9.5px', color: '#64748b' }}>({formData.signatoryName})</div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            fontSize: '12px',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={16} />
            <span>Changes take effect immediately on all printouts, PDF exports, and emails!</span>
          </div>
        </div>

      </div>
    </div>
  );
};
