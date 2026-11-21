/**
 * @file LeadDetailModal.jsx
 * @description Comprehensive lead detail drawer/modal with contact information, stage changer, and owner assignment.
 */

import React, { useState } from 'react';
import {
  X,
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  FileText,
  UserCheck,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Rocket,
  Send,
  MessageCircle
} from 'lucide-react';
import { useCRM } from '../../../../shared/context/CRMContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useWork } from '../../../work/context/WorkContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { getLocalDateString } from '../../../../shared/utils/timerUtils';
import { confirmDialog } from '../../../../shared/context/ConfirmContext';

export const LeadDetailModal = ({ lead, isOpen, onClose, onEdit }) => {
  const { updateLeadStatus, updateLead, deleteLead } = useCRM();
  const { currentUser } = useAuth();
  const { createProject } = useWork() || {};
  const { addToast } = useToast();

  const [newActivityText, setNewActivityText] = useState('');
  const [newActivityType, setNewActivityType] = useState('call'); // 'call' | 'meeting' | 'email' | 'note'
  const [nextFollowUpDate, setNextFollowUpDate] = useState(lead?.nextFollowUpDate || '');
  const [nextStage, setNextStage] = useState(lead?.status || 'new');
  const [showFollowUpScheduler, setShowFollowUpScheduler] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Keep follow-up date and stage in sync if lead changes
  React.useEffect(() => {
    if (lead) {
      setNextFollowUpDate(lead.nextFollowUpDate || '');
      setNextStage(lead.status || 'new');
    }
  }, [lead?._id, lead?.nextFollowUpDate, lead?.status]);

  if (!isOpen || !lead) return null;

  const handleAddActivity = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newActivityText.trim()) return;
    try {
      const isStageChanged = nextStage && nextStage !== lead.status;
      const isFollowUpChanged = nextFollowUpDate && nextFollowUpDate !== lead.nextFollowUpDate;

      const newAct = {
        id: `act_${Date.now()}`,
        type: newActivityType,
        text: newActivityText.trim(),
        author: currentUser?.name || 'Team Member',
        authorAvatar: currentUser?.avatar || '',
        date: new Date().toISOString(),
        nextFollowUpSet: nextFollowUpDate || null,
        stageChangedTo: isStageChanged ? nextStage : null
      };

      const currentActs = Array.isArray(lead.activities) ? lead.activities : [];
      const updatePayload = {
        activities: [newAct, ...currentActs]
      };

      if (nextFollowUpDate !== undefined) {
        updatePayload.nextFollowUpDate = nextFollowUpDate;
      }
      if (isStageChanged) {
        updatePayload.status = nextStage;
      }

      await updateLead(lead._id, updatePayload);
      setNewActivityText('');
      addToast('Activity & follow-up saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to log activity', 'error');
    }
  };

  const setRelativeFollowUp = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNextFollowUpDate(getLocalDateString(d));
    setShowFollowUpScheduler(true);
  };

  const handleConvertToProject = async () => {
    if (isConverting) return;
    setIsConverting(true);
    try {
      const projectName = lead.companyName || lead.client || lead.name || 'New Client Project';
      if (typeof createProject === 'function') {
        await createProject({
          name: projectName,
          client: lead.companyName || lead.client || lead.name,
          clientEmail: lead.email || '',
          clientPhone: lead.phone || '',
          budget: lead.dealValue || 0,
          currency: lead.currency || 'INR',
          status: 'in_progress',
          startDate: getLocalDateString(),
          deadline: lead.endDate || getLocalDateString(new Date(Date.now() + 30 * 86400000)),
          progress: 0,
          assignedToIds: [lead.leadOwnerId || currentUser?._id || 'emp_001'],
          description: `Project converted from CRM Lead ${lead.leadCode || lead.name}.\n\nLead Notes: ${lead.notes || 'None'}`
        });
      }

      await updateLeadStatus(lead._id, 'converted');
      addToast(`🎉 Lead converted to active project "${projectName}"!`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Could not convert lead to project', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const normalizeLeadStatus = (status) => {
    if (!status) return 'new';
    const s = String(status).toLowerCase().trim();
    if (s === 'contacted') return 'active';
    if (s === 'qualified') return 'in_progress';
    if (s === 'proposal') return 'negotiation';
    if (s === 'won') return 'converted';
    return s;
  };

  const formatCurrency = (amount, currency = 'INR') => {
    const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'AED' ? 'AED ' : '₹';
    return `${sym}${(Number(amount) || 0).toLocaleString(currency === 'USD' ? 'en-US' : 'en-IN')}`;
  };

  const getStatusInfo = (status) => {
    const s = normalizeLeadStatus(status);
    const map = {
      new: { label: 'New Inquiry', color: '#0284c7', bg: '#e0f2fe' },
      active: { label: 'Active Contact', color: '#d97706', bg: '#fef3c7' },
      in_progress: { label: 'In Progress / Demo', color: '#8b5cf6', bg: '#ede9fe' },
      negotiation: { label: 'In Negotiation', color: '#c026d3', bg: '#fae8ff' },
      converted: { label: 'Converted (Won)', color: '#16a34a', bg: '#dcfce7' },
      lost: { label: 'Lost / Dropped', color: '#64748b', bg: '#f1f5f9' }
    };
    return map[s] || { label: status, color: '#64748b', bg: '#f8fafc' };
  };

  const statusInfo = getStatusInfo(lead.status);

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[680px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 py-0.5 px-2 rounded-md">
                {lead.leadCode || `#${lead.idNumber}`}
              </span>
              <span className={`text-[11px] font-bold py-0.5 px-2 rounded-md ${
                lead.status === 'converted' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
                lead.status === 'lost' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
              }`}>
                {statusInfo.label}
              </span>
              <span className={`text-[11px] font-bold py-0.5 px-2 rounded-md ${
                lead.priority === 'urgent'
                  ? 'text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300'
                  : 'text-orange-700 bg-orange-100 dark:bg-orange-950 dark:text-orange-300'
              }`}>
                {lead.priority?.toUpperCase()} PRIORITY
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 m-0 mt-1.5">
              {lead.name}
            </h2>
            <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
              {lead.companyName || lead.client} • {lead.leadType}
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
          
          {/* Quick Stage Progression Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-3.5">
            <span className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">
              Pipeline Stage Progression:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { id: 'new', label: '1. New' },
                { id: 'active', label: '2. Active' },
                { id: 'in_progress', label: '3. Progress' },
                { id: 'negotiation', label: '4. Negotiation' },
                { id: 'converted', label: '5. Won' },
                { id: 'lost', label: '6. Lost' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => updateLeadStatus(lead._id, st.id)}
                  className={`py-1.5 px-1 rounded-md text-[11px] cursor-pointer transition-all ${
                    lead.status === st.id
                      ? 'border-2 border-blue-600 bg-blue-600 text-white font-bold'
                      : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Details & Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Contact Person</span>
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{lead.contactPerson || lead.name}</div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Work Email</span>
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                    {lead.email}
                  </a>
                ) : '—'}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Phone & WhatsApp Outreach</span>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {lead.phone ? (
                    <a href={`tel:${lead.phone}`} className="text-slate-900 dark:text-slate-100 hover:underline">
                      {lead.phone}
                    </a>
                  ) : '—'}
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${lead.phone}`}
                      className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-800 text-xs font-bold no-underline hover:scale-105 transition-transform flex items-center gap-1"
                      title="Direct Phone Call"
                    >
                      <Phone size={11} />
                      <span>Call</span>
                    </a>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold no-underline hover:scale-105 transition-transform flex items-center gap-1"
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle size={11} />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Lead Source</span>
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{lead.leadSource || 'Website'}</div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Estimated Deal Value</span>
              <div className="text-[15px] font-extrabold text-green-600 dark:text-green-400">
                {formatCurrency(lead.dealValue, lead.currency)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Lead Category</span>
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{lead.leadType || 'Enterprise'}</div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Start / Inquiry Date</span>
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{lead.startDate || lead.createdDate}</div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Target Close Date</span>
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{lead.endDate || '—'}</div>
            </div>

            {/* Next Follow-Up Reminder Card */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Next Follow-Up Reminder</span>
                {lead.nextFollowUpDate && (() => {
                  const todayStr = getLocalDateString();
                  const isOverdue = lead.nextFollowUpDate < todayStr && lead.status !== 'converted' && lead.status !== 'lost';
                  const isDueToday = lead.nextFollowUpDate === todayStr && lead.status !== 'converted' && lead.status !== 'lost';
                  return (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isOverdue
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : isDueToday
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                    }`}>
                      {isOverdue ? '⚠️ Overdue' : isDueToday ? '🔔 Due Today' : '📅 Scheduled'}
                    </span>
                  );
                })()}
              </div>
              <div className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {lead.nextFollowUpDate || 'No follow-up reminder set yet (Edit lead to schedule).'}
              </div>
            </div>
          </div>

          {/* Team Assignment Banner */}
          <div className="grid grid-cols-2 gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Lead Owner */}
            <div className="flex items-center gap-2.5">
              {lead.leadOwnerAvatar ? (
                <img src={lead.leadOwnerAvatar} alt="Owner" className="w-[38px] h-[38px] rounded-full object-cover" />
              ) : (
                <div className="w-[38px] h-[38px] rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold">
                  {lead.leadOwnerName?.charAt(0) || 'O'}
                </div>
              )}
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">Lead Owner</span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{lead.leadOwnerName || 'Unassigned'}</span>
                <span className="text-[11px] text-slate-400 block">{lead.leadOwnerRole || 'Senior'}</span>
              </div>
            </div>

            {/* Created By */}
            <div className="flex items-center gap-2.5">
              {lead.createdByAvatar ? (
                <img src={lead.createdByAvatar} alt="Creator" className="w-[38px] h-[38px] rounded-full object-cover" />
              ) : (
                <div className="w-[38px] h-[38px] rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold">
                  {lead.createdByName?.charAt(0) || 'A'}
                </div>
              )}
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">Created By</span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{lead.createdByName || 'Team Member'}</span>
                <span className="text-[11px] text-slate-400 block">on {lead.createdDate || '09-12-2026'}</span>
              </div>
            </div>
          </div>

          {/* Description & Notes */}
          <div className="bg-white dark:bg-slate-800/80 rounded-[10px] border border-slate-200 dark:border-slate-700 p-3.5">
            <span className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase">
              Requirements & Notes:
            </span>
            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed m-0">
              {lead.notes || 'No specific notes recorded for this lead yet.'}
            </p>
          </div>

          {/* Activity Notes & Follow-Up Log */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
              <Clock size={13.5} className="text-blue-500" />
              <span>Activity & Outreach Timeline ({Array.isArray(lead.activities) ? lead.activities.length : 0})</span>
            </span>

            {/* Add Activity Form */}
            <form onSubmit={handleAddActivity} className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={newActivityType}
                  onChange={e => setNewActivityType(e.target.value)}
                  className="py-2 px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none shrink-0"
                >
                  <option value="call">📞 Phone Call</option>
                  <option value="meeting">🤝 Client Meeting</option>
                  <option value="email">✉️ Email Outreach</option>
                  <option value="note">📝 Discussion Note</option>
                </select>
                <input
                  type="text"
                  placeholder="Log discussion notes, next actions, or call summary..."
                  value={newActivityText}
                  onChange={e => setNewActivityText(e.target.value)}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={!newActivityText.trim()}
                  className={`py-2 px-3.5 rounded-lg border-0 text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 ${
                    newActivityText.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={12} />
                  <span>Log Activity</span>
                </button>
              </div>

              {/* Integrated Next Follow-Up & Stage Progression Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1.5 px-0.5 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Next Follow-Up:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRelativeFollowUp(0)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                        nextFollowUpDate === getLocalDateString()
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeFollowUp(1)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                        nextFollowUpDate === getLocalDateString(new Date(Date.now() + 86400000))
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      +1d Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeFollowUp(3)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                        nextFollowUpDate === getLocalDateString(new Date(Date.now() + 3 * 86400000))
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeFollowUp(7)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                        nextFollowUpDate === getLocalDateString(new Date(Date.now() + 7 * 86400000))
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      +1 Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeFollowUp(14)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors ${
                        nextFollowUpDate === getLocalDateString(new Date(Date.now() + 14 * 86400000))
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      +2 Weeks
                    </button>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={e => setNextFollowUpDate(e.target.value)}
                      className="py-0.5 px-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 font-semibold outline-none"
                    />
                    {nextFollowUpDate && (
                      <button
                        type="button"
                        onClick={() => setNextFollowUpDate('')}
                        className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Clear scheduled date"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Move Stage:</span>
                  <select
                    value={nextStage}
                    onChange={e => setNextStage(e.target.value)}
                    className="py-0.5 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="new">1. New Inquiry</option>
                    <option value="active">2. Active Contact</option>
                    <option value="in_progress">3. In Progress / Demo</option>
                    <option value="negotiation">4. In Negotiation</option>
                    <option value="converted">5. Converted (Won)</option>
                    <option value="lost">6. Lost / Dropped</option>
                  </select>
                </div>
              </div>
            </form>

            {/* Activity History List */}
            <div className="max-h-48 overflow-y-auto flex flex-col gap-2 mt-1">
              {!Array.isArray(lead.activities) || lead.activities.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  No outreach activities logged yet. Record calls, meetings, or notes above.
                </div>
              ) : (
                lead.activities.map((act, actIdx) => (
                  <div
                    key={act.id || actIdx}
                    className="p-2.5 px-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-sm mt-0.5 shrink-0">
                        {act.type === 'call' ? '📞' : act.type === 'meeting' ? '🤝' : act.type === 'email' ? '✉️' : '📝'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap break-words">
                          {act.text}
                        </div>
                        {(act.nextFollowUpSet || act.stageChangedTo) && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {act.nextFollowUpSet && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded">
                                📅 Next: {act.nextFollowUpSet}
                              </span>
                            )}
                            {act.stageChangedTo && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded">
                                🚀 Stage: {act.stageChangedTo}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1">
                          By <strong className="text-slate-600 dark:text-slate-300">{act.author}</strong> • {new Date(act.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2.5">
            <button
              onClick={async () => {
                const ok = await confirmDialog({
                  title: 'Delete Lead',
                  message: `Are you sure you want to permanently delete lead "${lead.name}"? This cannot be undone.`,
                  confirmText: 'Delete Lead',
                  variant: 'danger'
                });
                if (ok) {
                  deleteLead(lead._id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg border-none bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 hover:bg-red-200 text-[12.5px] font-semibold cursor-pointer transition-colors"
            >
              <Trash2 size={14} />
              Delete Lead
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  onClose();
                  onEdit(lead);
                }}
                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <Edit2 size={14} />
                Edit Lead
              </button>

              {/* 🚀 1-Click Convert Lead to Project */}
              <button
                type="button"
                onClick={handleConvertToProject}
                disabled={isConverting}
                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[13px] font-bold cursor-pointer transition-all shadow-xs"
                title="Convert this lead into a client project in Work Projects"
              >
                <Rocket size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>{isConverting ? 'Converting...' : 'Convert to Project'}</span>
              </button>

              {lead.status !== 'converted' && (
                <button
                  onClick={() => {
                    updateLeadStatus(lead._id, 'converted');
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 py-2 px-[18px] rounded-lg border-none bg-green-600 hover:bg-green-700 text-white text-[13px] font-bold cursor-pointer shadow-md transition-colors"
                >
                  <CheckCircle2 size={15} />
                  Convert to Won Deal
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
