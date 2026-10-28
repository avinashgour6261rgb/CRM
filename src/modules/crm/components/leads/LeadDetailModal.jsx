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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                {lead.leadCode || `#${lead.idNumber}`}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                color: statusInfo.color,
                backgroundColor: statusInfo.bg
              }}>
                {statusInfo.label}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                color: lead.priority === 'urgent' ? '#dc2626' : '#ea580c',
                backgroundColor: lead.priority === 'urgent' ? '#fee2e2' : '#ffedd5'
              }}>
                {lead.priority?.toUpperCase()} PRIORITY
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '6px 0 0 0' }}>
              {lead.name}
            </h2>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              {lead.companyName || lead.client} • {lead.leadType}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Quick Stage Progression Bar */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px'
          }}>
            <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
              Pipeline Stage Progression:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
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
                  style={{
                    padding: '6px 4px',
                    borderRadius: '6px',
                    border: lead.status === st.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: lead.status === st.id ? '#2563eb' : '#ffffff',
                    color: lead.status === st.id ? '#ffffff' : '#475569',
                    fontSize: '11px',
                    fontWeight: lead.status === st.id ? '700' : '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Details & Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={infoCardStyle}>
              <span style={labelStyle}>Contact Person</span>
              <div style={valueStyle}>{lead.contactPerson || lead.name}</div>
            </div>

            <div style={infoCardStyle}>
              <span style={labelStyle}>Work Email</span>
              <div style={valueStyle}>
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                    {lead.email}
                  </a>
                ) : '—'}
              </div>
            </div>

            <div style={infoCardStyle}>
              <span style={labelStyle}>Phone Number</span>
              <div style={valueStyle}>
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                    {lead.phone}
                  </a>
                ) : '—'}
              </div>
            </div>

            <div style={infoCardStyle}>
              <span style={labelStyle}>Lead Source</span>
              <div style={valueStyle}>{lead.leadSource || 'Website'}</div>
            </div>

            <div style={infoCardStyle}>
              <span style={labelStyle}>Estimated Deal Value</span>
              <div style={{ ...valueStyle, color: '#16a34a', fontWeight: '800', fontSize: '15px' }}>
                {formatCurrency(lead.dealValue)}
              </div>
            </div>

            <div style={infoCardStyle}>
              <span style={labelStyle}>Lead Category</span>
              <div style={valueStyle}>{lead.leadType || 'Enterprise'}</div>
            </div>

            <div style={infoCardStyle}>
              <span style={labelStyle}>Start / Inquiry Date</span>
              <div style={valueStyle}>{lead.startDate || lead.createdDate}</div>
            </div>

            <div style={infoCardStyle}>
              <span style={labelStyle}>Target Close Date</span>
              <div style={valueStyle}>{lead.endDate || '—'}</div>
            </div>
          </div>

          {/* Team Assignment Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            padding: '14px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            {/* Lead Owner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {lead.leadOwnerAvatar ? (
                <img src={lead.leadOwnerAvatar} alt="Owner" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                  {lead.leadOwnerName?.charAt(0) || 'O'}
                </div>
              )}
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', display: 'block' }}>Lead Owner</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{lead.leadOwnerName || 'Unassigned'}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>{lead.leadOwnerRole || 'Senior'}</span>
              </div>
            </div>

            {/* Created By */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {lead.createdByAvatar ? (
                <img src={lead.createdByAvatar} alt="Creator" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                  {lead.createdByName?.charAt(0) || 'A'}
                </div>
              )}
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', display: 'block' }}>Created By</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{lead.createdByName || 'Team Member'}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>on {lead.createdDate || '09-12-2026'}</span>
              </div>
            </div>
          </div>

          {/* Description & Notes */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px'
          }}>
            <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
              Requirements & Notes:
            </span>
            <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
              {lead.notes || 'No specific notes recorded for this lead yet.'}
            </p>
          </div>

          {/* Action Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9'
          }}>
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
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
              Delete Lead
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  onClose();
                  onEdit(lead);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
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
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(22,163,74,0.3)'
                  }}
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

const infoCardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #f1f5f9',
  borderRadius: '8px',
  padding: '10px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '3px'
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#64748b',
  textTransform: 'uppercase'
};

const valueStyle = {
  fontSize: '13.5px',
  fontWeight: '600',
  color: '#0f172a'
};
