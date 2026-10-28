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
      new: { label: 'New Inquiry', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
      active: { label: 'Active', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
      in_progress: { label: 'In Progress', color: '#8b5cf6', bg: '#ede9fe', border: '#ddd6fe' },
      negotiation: { label: 'In Negotiation', color: '#c026d3', bg: '#fae8ff', border: '#f5d0fe' },
      converted: { label: 'Converted (Won)', color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
      lost: { label: 'Lost', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' }
    };
    return map[status] || { label: status, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
  };

  const getPriorityBadge = (priority) => {
    const map = {
      urgent: { label: 'Urgent', color: '#dc2626', bg: '#fee2e2' },
      high: { label: 'High', color: '#ea580c', bg: '#ffedd5' },
      medium: { label: 'Medium', color: '#0284c7', bg: '#e0f2fe' },
      low: { label: 'Low', color: '#64748b', bg: '#f1f5f9' }
    };
    return map[priority] || { label: priority, color: '#64748b', bg: '#f1f5f9' };
  };

  return (
    <div className="table-card" style={{
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      <div className="table-responsive" style={{ overflowX: 'auto', maxHeight: '680px' }}>
        <table className="crm-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap'
            }}>
              <th style={{ width: '36px', padding: '8px 10px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={sortedLeads.length > 0 && selectedIds.length === sortedLeads.length}
                  onChange={onSelectAll}
                  style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                />
              </th>
              <th style={{ width: '50px', padding: '8px 10px', cursor: 'pointer' }} onClick={() => handleSort('idNumber')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  Id <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ minWidth: '180px', padding: '8px 10px', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  Contact Name <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ minWidth: '160px', padding: '8px 10px' }}>Email</th>
              <th style={{ minWidth: '120px', padding: '8px 10px' }}>Phone Number</th>
              <th style={{ minWidth: '150px', padding: '8px 10px' }}>Lead Owner</th>
              <th style={{ minWidth: '150px', padding: '8px 10px' }}>Added By</th>
              <th style={{ minWidth: '120px', padding: '8px 10px', cursor: 'pointer' }} onClick={() => handleSort('status')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  Status <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ width: '80px', padding: '8px 10px' }}>Priority</th>
              <th style={{ width: '100px', padding: '8px 10px', cursor: 'pointer' }} onClick={() => handleSort('createdAt')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  Created <ArrowUpDown size={11} />
                </div>
              </th>
              <th style={{ width: '50px', padding: '8px 10px', textAlign: 'center' }}>Action</th>
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
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(lead._id)}
                        style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                      />
                    </td>

                    {/* Numeric Id */}
                    <td style={{ padding: '7px 10px', color: '#64748b', fontWeight: '700', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {lead.idNumber || lead.leadCode?.replace('LEAD-', '') || '—'}
                    </td>

                    {/* Contact Name & Company */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                          onClick={() => onViewLead(lead)}
                          style={{
                            fontWeight: '700',
                            color: '#0f172a',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            lineHeight: '1.2'
                          }}
                          className="hover-underline"
                        >
                          {lead.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '1px' }}>
                          {lead.companyName && (
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                              {lead.companyName}
                            </span>
                          )}
                          {lead.leadType && (
                            <span style={{
                              fontSize: '9.5px',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              fontWeight: '600'
                            }}>
                              {lead.leadType}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      {lead.email ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <a
                            href={`mailto:${lead.email}`}
                            style={{ color: '#2563eb', textDecoration: 'none', fontSize: '11.5px' }}
                            title="Send email"
                          >
                            {lead.email}
                          </a>
                          <button
                            onClick={() => handleCopy(lead.email, `email_${lead._id}`)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#94a3b8',
                              padding: '1px',
                              display: 'flex'
                            }}
                            title="Copy email"
                          >
                            {copiedField === `email_${lead._id}` ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>

                    {/* Phone Number */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      {lead.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <a
                            href={`tel:${lead.phone}`}
                            style={{ color: '#334155', textDecoration: 'none', fontSize: '11.5px', fontWeight: '500' }}
                          >
                            {lead.phone}
                          </a>
                          <button
                            onClick={() => handleCopy(lead.phone, `phone_${lead._id}`)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#94a3b8',
                              padding: '1px',
                              display: 'flex'
                            }}
                            title="Copy phone"
                          >
                            {copiedField === `phone_${lead._id}` ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>

                    {/* Lead Owner (Avatar + Name + Role) */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {lead.leadOwnerAvatar ? (
                          <img
                            src={lead.leadOwnerAvatar}
                            alt={lead.leadOwnerName}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '700'
                          }}>
                            {lead.leadOwnerName?.charAt(0) || 'O'}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#1e293b', lineHeight: '1.2' }}>
                            {lead.leadOwnerName || 'Unassigned'}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {lead.leadOwnerRole || 'Senior'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Added By / Created By */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {lead.createdByAvatar ? (
                          <img
                            src={lead.createdByAvatar}
                            alt={lead.createdByName}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '700'
                          }}>
                            {lead.createdByName?.charAt(0) || 'A'}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#1e293b', lineHeight: '1.2' }}>
                            {lead.createdByName || 'Team Member'}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {lead.createdByRole || 'Senior'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status with Quick Toggle Dropdown */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          color: statusBadge.color,
                          backgroundColor: statusBadge.bg,
                          border: `1px solid ${statusBadge.border}`,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
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
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: priorityBadge.color,
                        backgroundColor: priorityBadge.bg,
                        padding: '2px 5px',
                        borderRadius: '3px',
                        display: 'inline-block'
                      }}>
                        {priorityBadge.label}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {lead.createdDate || lead.createdAt?.split('T')[0] || '09-12-2026'}
                    </td>

                    {/* Actions Menu */}
                    <td style={{ padding: '7px 10px', textAlign: 'center', position: 'relative', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : lead._id);
                        }}
                        style={{
                          background: isMenuOpen ? '#e2e8f0' : 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#64748b',
                          margin: '0 auto'
                        }}
                        title="Actions"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          style={{
                            position: 'absolute',
                            right: '16px',
                            top: '40px',
                            width: '180px',
                            backgroundColor: '#ffffff',
                            borderRadius: '10px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
                            border: '1px solid #e2e8f0',
                            padding: '6px',
                            zIndex: 100,
                            textAlign: 'left'
                          }}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onViewLead(lead);
                            }}
                            style={actionItemStyle}
                          >
                            <Eye size={14} color="#2563eb" />
                            <span>View Details</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onEditLead(lead);
                            }}
                            style={actionItemStyle}
                          >
                            <Edit2 size={14} color="#0284c7" />
                            <span>Edit Lead</span>
                          </button>

                          {lead.status !== 'converted' && (
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                updateLeadStatus(lead._id, 'converted');
                              }}
                              style={{ ...actionItemStyle, color: '#16a34a' }}
                            >
                              <CheckCircle2 size={14} color="#16a34a" />
                              <span>Convert to Won</span>
                            </button>
                          )}

                          <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />

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
                            style={{ ...actionItemStyle, color: '#dc2626' }}
                          >
                            <Trash2 size={14} color="#dc2626" />
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
                <td colSpan="11" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>No Leads Found</div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
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

const actionItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '8px 10px',
  border: 'none',
  background: 'transparent',
  fontSize: '12.5px',
  fontWeight: '500',
  color: '#334155',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background 0.12s'
};
