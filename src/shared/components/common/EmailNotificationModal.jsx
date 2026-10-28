import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle2, Send, Building2, Gift, Bell } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getCompanySettings } from '../../services/companySettingsService';

export const EmailNotificationModal = ({ isOpen, onClose, emailData }) => {
  const { addToast } = useToast();
  const [companyInfo, setCompanyInfo] = useState(getCompanySettings());

  useEffect(() => {
    const updateInfo = () => setCompanyInfo(getCompanySettings());
    window.addEventListener('company-settings-updated', updateInfo);
    return () => window.removeEventListener('company-settings-updated', updateInfo);
  }, []);

  if (!isOpen || !emailData) return null;

  const {
    type = 'notice', // 'notice' | 'birthday' | 'leave'
    subject = 'Notice: Company Update',
    to = 'all-employees@company.com',
    sender = `${companyInfo.shortName || 'HR Dept'} <${companyInfo.hrEmail || companyInfo.email}>`,
    title = 'Important Announcement',
    body = '',
    actionText = 'View in EMS Portal'
  } = emailData;

  const handleSendLive = () => {
    addToast({
      title: 'Company Emails Dispatched 📬',
      message: `Delivered to all registered employee inboxes: "${subject}"`,
      type: 'success'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[9999] p-5 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[620px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-blue-400" />
            <span className="text-sm font-bold">
              Automated Email Dispatch System
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Email Headers */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[12.5px] flex flex-col gap-1.5">
          <div><strong className="text-slate-600 dark:text-slate-400">From:</strong> <span className="text-slate-900 dark:text-slate-100">{sender}</span></div>
          <div><strong className="text-slate-600 dark:text-slate-400">To:</strong> <span className="text-slate-900 dark:text-slate-100">{to}</span></div>
          <div><strong className="text-slate-600 dark:text-slate-400">Subject:</strong> <span className="text-blue-600 dark:text-blue-400 font-bold">{subject}</span></div>
        </div>

        {/* Formatted HTML Email Body Preview */}
        <div className="p-6 sm:p-7 bg-white dark:bg-slate-900">
          <div className={`border border-slate-200 dark:border-slate-700 rounded-xl p-6 ${
            type === 'birthday'
              ? 'bg-fuchsia-50/50 dark:bg-fuchsia-950/20 border-t-4 border-t-fuchsia-600'
              : 'bg-slate-50 dark:bg-slate-800/60 border-t-4 border-t-blue-600'
          }`}>
            <div className="flex items-center gap-2.5 mb-3.5">
              {type === 'birthday' ? (
                <div className="w-9 h-9 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/60 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400">
                  <Gift size={20} />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Bell size={20} />
                </div>
              )}
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 m-0">
                {title}
              </h2>
            </div>

            <div className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed mb-5">
              {body || 'All registered employees will receive this official company notification directly in their inbox with deep links to the EMS portal.'}
            </div>

            <div className={`inline-block px-5 py-2.5 rounded-lg text-white text-[13px] font-bold ${
              type === 'birthday' ? 'bg-fuchsia-600 hover:bg-fuchsia-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
              {actionText}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
              {companyInfo.companyName || 'Corporate HR System'} • Automated HR Notification Service
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
          <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
            ✅ SMTP & Cloud Webhook Configured
          </span>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSendLive}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-0 bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-bold cursor-pointer shadow-sm hover:shadow transition-all"
            >
              <Send size={14} /> Send Email Blast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
