/**
 * @file LeadsKanban.jsx
 * @description Pipeline Kanban board for visual sales pipeline tracking with stages and quick actions.
 */

import React from 'react';
import {
  Sparkles,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Plus,
  Eye,
  Edit2,
  DollarSign,
  User
} from 'lucide-react';
import { useCRM } from '../../../../shared/context/CRMContext';

const STAGES = [
  { id: 'new', title: 'New Inquiries', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  { id: 'active', title: 'Active Contact', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  { id: 'in_progress', title: 'In Progress / Demo', color: '#8b5cf6', bg: '#ede9fe', border: '#ddd6fe' },
  { id: 'negotiation', title: 'In Negotiation', color: '#c026d3', bg: '#fae8ff', border: '#f5d0fe' },
  { id: 'converted', title: 'Won Deals (Converted)', color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
  { id: 'lost', title: 'Lost / Dropped', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' }
];

export const LeadsKanban = ({
  leads = [],
  onViewLead,
  onEditLead,
  onAddNewLead
}) => {
  const { updateLeadStatus } = useCRM();

  const formatCurrency = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)} K`;
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 overflow-x-auto pb-4 items-start">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter(l => l.status === stage.id);
        const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0);

        return (
          <div
            key={stage.id}
            className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-3 min-w-[280px] shadow-xs"
          >
            {/* Stage Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 m-0">
                  {stage.title}
                </h3>
                <span
                  className="text-[11px] font-bold py-px px-1.5 rounded-full border dark:bg-slate-800 dark:border-slate-700"
                  style={{
                    backgroundColor: stage.bg,
                    color: stage.color,
                    borderColor: stage.border
                  }}
                >
                  {stageLeads.length}
                </span>
              </div>

              <span className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400">
                {formatCurrency(stageValue)}
              </span>
            </div>

            {/* Stage Cards */}
            <div className="flex flex-col gap-2.5 min-h-[120px]">
              {stageLeads.length > 0 ? (
                stageLeads.map((lead) => (
                  <div
                    key={lead._id}
                    onClick={() => onViewLead(lead)}
                    className="bg-white dark:bg-slate-800 rounded-[10px] border border-slate-200 dark:border-slate-700 p-3.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col gap-2 transition-all"
                  >
                    {/* Top Row: Lead Code & Priority */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 py-0.5 px-1.5 rounded">
                        {lead.leadCode || `#${lead.idNumber}`}
                      </span>
                      <span className={`text-[10px] font-bold py-0.5 px-1.5 rounded uppercase ${
                        lead.priority === 'urgent'
                          ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300'
                          : lead.priority === 'high'
                          ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {lead.priority}
                      </span>
                    </div>

                    {/* Name & Company */}
                    <div>
                      <div className="font-bold text-[13.5px] text-slate-900 dark:text-slate-100">
                        {lead.name}
                      </div>
                      <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-px">
                        {lead.companyName || lead.client}
                      </div>
                    </div>

                    {/* Deal Value */}
                    {lead.dealValue > 0 && (
                      <div className="text-[12.5px] font-extrabold text-green-600 dark:text-green-400">
                        {formatCurrency(lead.dealValue)}
                      </div>
                    )}

                    {/* Footer: Owner Avatar & Quick Move Dropdown */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                      <div className="flex items-center gap-1.5">
                        {lead.leadOwnerAvatar ? (
                          <img
                            src={lead.leadOwnerAvatar}
                            alt={lead.leadOwnerName}
                            className="w-[22px] h-[22px] rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-[22px] h-[22px] rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] flex items-center justify-center font-bold">
                            {lead.leadOwnerName?.charAt(0) || 'O'}
                          </div>
                        )}
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {lead.leadOwnerName?.split(' ')[0] || 'Owner'}
                        </span>
                      </div>

                      {/* Quick Move Selector */}
                      <select
                        value={lead.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateLeadStatus(lead._id, e.target.value)}
                        className="text-[10.5px] font-semibold py-0.5 px-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="new">Move: New</option>
                        <option value="active">Move: Active</option>
                        <option value="in_progress">Move: In Progress</option>
                        <option value="negotiation">Move: Negotiation</option>
                        <option value="converted">Move: Won</option>
                        <option value="lost">Move: Lost</option>
                      </select>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 px-3 text-center text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                  No leads in this stage
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
