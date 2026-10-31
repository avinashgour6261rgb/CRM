/**
 * @file LeadsTable.jsx
 * @description Clean, responsive table component for Leads Management matching the CRM design & screenshot.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  User,
  ExternalLink,
  Copy,
  Check,
  Flame,
  Clock,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { useCRM } from '../../../../shared/context/CRMContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { useConfirm } from '../../../../shared/context/ConfirmContext';

export const LeadsTable = ({
  leads = [],
  selectedIds = [],
  onSelectAll,
  onSelectRow,
  onViewLead,
  onEditLead
}) => {
  const { updateLeadStatus, deleteLead } = useCRM();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [sortField, setSortField] = useState('idNumber');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = (text, fieldKey) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    addToast(`Copied "${text}" to clipboard`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (status) => {
    const map = {
      new: { label: 'New Inquiry', className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800' },
      active: { label: 'Active', className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
      in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' },
      negotiation: { label: 'In Negotiation', className: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-800' },
      converted: { label: 'Converted (Won)', className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' },
      lost: { label: 'Lost', className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' }
    };
    return map[status] || { label: status, className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' };
  };

  const getPriorityBadge = (priority) => {
    const map = {
      urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
      medium: { label: 'Medium', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
      low: { label: 'Low', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
    };
    return map[priority] || { label: priority, className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div className="overflow-x-auto max-h-[680px]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
              <th className="w-9 py-2 px-2.5 text-center">
                <input
                  type="checkbox"
                  checked={sortedLeads.length > 0 && selectedIds.length === sortedLeads.length}
                  onChange={onSelectAll}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              <th className="w-[50px] py-2 px-2.5 cursor-pointer" onClick={() => handleSort('idNumber')}>
                <div className="flex items-center gap-1">
                  Id <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="min-w-[180px] py-2 px-2.5 cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  Contact Name <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="min-w-[160px] py-2 px-2.5">Email</th>
              <th className="min-w-[120px] py-2 px-2.5">Phone Number</th>
              <th className="min-w-[150px] py-2 px-2.5">Lead Owner</th>
              <th className="min-w-[150px] py-2 px-2.5">Added By</th>
              <th className="min-w-[120px] py-2 px-2.5 cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">
                  Status <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="w-20 py-2 px-2.5">Priority</th>
              <th className="w-[100px] py-2 px-2.5 cursor-pointer" onClick={() => handleSort('createdAt')}>
                <div className="flex items-center gap-1">
                  Created <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="w-[50px] py-2 px-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedLeads.length > 0 ? (
              sortedLeads.map((lead) => {
                const isSelected = selectedIds.includes(lead._id);
                const statusBadge = getStatusBadge(lead.status);
                const priorityBadge = getPriorityBadge(lead.priority);
                const isMenuOpen = activeMenuId === lead._id;

                return (
                  <tr
                    key={lead._id}
                    className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-900/30'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-[7px] px-2.5 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(lead._id)}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Numeric Id */}
                    <td className="py-[7px] px-2.5 text-slate-500 dark:text-slate-400 font-bold text-[11.5px] whitespace-nowrap">
                      {lead.idNumber || lead.leadCode?.replace('LEAD-', '') || '—'}
                    </td>

                    {/* Contact Name & Company */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div
                          onClick={() => onViewLead(lead)}
                          className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer text-xs flex items-center gap-1 leading-tight hover:underline"
                        >
                          {lead.name}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                          {lead.companyName && (
                            <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                              {lead.companyName}
                            </span>
                          )}
                          {lead.leadType && (
                            <span className="text-[9.5px] py-px px-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                              {lead.leadType}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      {lead.email ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-blue-600 dark:text-blue-400 no-underline text-[11.5px] hover:underline"
                            title="Send email"
                          >
                            {lead.email}
                          </a>
                          <button
                            onClick={() => handleCopy(lead.email, `email_${lead._id}`)}
                            className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 p-0.5 flex"
                            title="Copy email"
                          >
                            {copiedField === `email_${lead._id}` ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Phone Number */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      {lead.phone ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-slate-700 dark:text-slate-300 no-underline text-[11.5px] font-medium hover:underline"
                          >
                            {lead.phone}
                          </a>
                          <button
                            onClick={() => handleCopy(lead.phone, `phone_${lead._id}`)}
                            className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 p-0.5 flex"
                            title="Copy phone"
                          >
                            {copiedField === `phone_${lead._id}` ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Lead Owner (Avatar + Name + Role) */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {lead.leadOwnerAvatar ? (
                          <img
                            src={lead.leadOwnerAvatar}
                            alt={lead.leadOwnerName}
                            className="w-[22px] h-[22px] rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-[22px] h-[22px] rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                            {lead.leadOwnerName?.charAt(0) || 'O'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                            {lead.leadOwnerName || 'Unassigned'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {lead.leadOwnerRole || 'Senior'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Added By / Created By */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {lead.createdByAvatar ? (
                          <img
                            src={lead.createdByAvatar}
                            alt={lead.createdByName}
                            className="w-[22px] h-[22px] rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-[22px] h-[22px] rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                            {lead.createdByName?.charAt(0) || 'A'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                            {lead.createdByName || 'Team Member'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {lead.createdByRole || 'Senior'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status with Quick Toggle Dropdown */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                        className={`text-[10.5px] font-bold py-0.5 px-1.5 rounded cursor-pointer outline-none border ${statusBadge.className}`}
                      >
                        <option value="new">New Inquiry</option>
                        <option value="active">Active</option>
                        <option value="in_progress">In Progress</option>
                        <option value="negotiation">In Negotiation</option>
                        <option value="converted">Converted (Won)</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold py-0.5 px-[5px] rounded inline-block ${priorityBadge.className}`}>
                        {priorityBadge.label}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-[7px] px-2.5 text-slate-500 dark:text-slate-400 text-[11.5px] whitespace-nowrap">
                      {lead.createdDate || lead.createdAt?.split('T')[0] || '09-12-2026'}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-[7px] px-2.5 text-center relative whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : lead._id);
                        }}
                        className={`border-none rounded w-6 h-6 flex items-center justify-center cursor-pointer text-slate-500 mx-auto transition-colors ${
                          isMenuOpen ? 'bg-slate-200 dark:bg-slate-700' : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Actions"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          className="absolute right-4 top-10 w-[180px] bg-white dark:bg-slate-800 rounded-[10px] shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-[100] text-left"
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onViewLead(lead);
                            }}
                            className={actionItemClass}
                          >
                            <Eye size={14} className="text-blue-600" />
                            <span>View Details</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onEditLead(lead);
                            }}
                            className={actionItemClass}
                          >
                            <Edit2 size={14} className="text-sky-600" />
                            <span>Edit Lead</span>
                          </button>

                          {lead.status !== 'converted' && (
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                updateLeadStatus(lead._id, 'converted');
                              }}
                              className={`${actionItemClass} text-green-600 dark:text-green-400`}
                            >
                              <CheckCircle2 size={14} className="text-green-600" />
                              <span>Convert to Won</span>
                            </button>
                          )}

                          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                          <button
                            onClick={async () => {
                              setActiveMenuId(null);
                              const ok = await confirm({
                                title: 'Delete Lead',
                                message: `Are you sure you want to delete lead "${lead.name}"? This action cannot be undone.`,
                                confirmText: 'Delete Lead',
                                variant: 'danger'
                              });
                              if (ok) {
                                deleteLead(lead._id);
                              }
                            }}
                            className={`${actionItemClass} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30`}
                          >
                            <Trash2 size={14} className="text-red-600" />
                            <span>Delete Lead</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="11" className="py-12 px-6 text-center text-slate-500 dark:text-slate-400">
                  <div className="text-3xl mb-2">📂</div>
                  <div className="font-bold text-[15px] text-slate-900 dark:text-slate-100">No Leads Found</div>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                    Try adjusting your filters or click "+ Add Lead" to create a new prospect.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const actionItemClass = "flex items-center gap-2 w-full py-2 px-2.5 border-none bg-transparent text-[12.5px] font-medium text-slate-700 dark:text-slate-200 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors";
