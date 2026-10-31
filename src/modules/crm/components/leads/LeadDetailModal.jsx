/**
 * @file LeadDetailModal.jsx
 * @description Comprehensive lead detail drawer/modal with contact information, stage changer, and owner assignment.
 */

import React from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { useCRM } from '../../../../shared/context/CRMContext';
import { confirmDialog } from '../../../../shared/context/ConfirmContext';

export const LeadDetailModal = ({ lead, isOpen, onClose, onEdit }) => {
  const { updateLeadStatus, deleteLead } = useCRM();

  if (!isOpen || !lead) return null;

  const formatCurrency = (amount) => {
    return `₹${(Number(amount) || 0).toLocaleString('en-IN')}`;
  };

  const getStatusInfo = (status) => {
    const map = {
      new: { label: 'New Inquiry', color: '#0284c7', bg: '#e0f2fe' },
      active: { label: 'Active Contact', color: '#d97706', bg: '#fef3c7' },
      in_progress: { label: 'In Progress / Demo', color: '#8b5cf6', bg: '#ede9fe' },
      negotiation: { label: 'In Negotiation', color: '#c026d3', bg: '#fae8ff' },
      converted: { label: 'Converted (Won)', color: '#16a34a', bg: '#dcfce7' },
      lost: { label: 'Lost / Dropped', color: '#64748b', bg: '#f1f5f9' }
    };
    return map[status] || { label: status, color: '#64748b', bg: '#f8fafc' };
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
        <div className="p-6 flex flex-col gap-5">
          
          {/* Quick Stage Progression Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
            <span className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">
              Pipeline Stage Progression:
            </span>
            <div className="grid grid-cols-6 gap-1.5">
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
          <div className="grid grid-cols-2 gap-3.5">
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
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Phone Number</span>
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="text-slate-900 dark:text-slate-100 hover:underline">
                    {lead.phone}
                  </a>
                ) : '—'}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Lead Source</span>
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{lead.leadSource || 'Website'}</div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-lg p-2.5 px-3.5 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Estimated Deal Value</span>
              <div className="text-[15px] font-extrabold text-green-600 dark:text-green-400">
                {formatCurrency(lead.dealValue)}
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

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
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

            <div className="flex gap-2">
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
