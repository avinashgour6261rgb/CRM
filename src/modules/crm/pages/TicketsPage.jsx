/**
 * @file TicketsPage.jsx
 * @description Helpdesk & Support Tickets module matching Screenshot 2 exactly.
 */

import React, { useState, useMemo } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Download,
  MoreVertical,
  Trash2,
  Eye,
  MessageSquare,
  Sparkles,
  Ticket as TicketIcon
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { getUserModulePermissions, isHRorAdmin } from '../../../shared/utils/permissionUtils';
import { RaiseTicketModal } from '../../../shared/components/modals/RaiseTicketModal';
import { TicketDetailModal } from '../components/tickets/TicketDetailModal';

export const TicketsPage = () => {
  const { tickets, updateTicketStatus, deleteTicket } = useCRM();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const isPrivileged = useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const perms = useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  const canViewAllTickets = isPrivileged || perms?.viewAllTickets;

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Scoped tickets based on Admin / HR privilege and viewAllTickets permission
  const scopedTickets = useMemo(() => {
    if (canViewAllTickets) return tickets;
    if (!currentUser) return tickets;
    const uId = String(currentUser._id || '');
    const uCode = String(currentUser.employeeCode || '');
    const uName = (currentUser.name || '').toLowerCase().trim();

    return tickets.filter(t => {
      const isRequester = (uId && String(t.requestedById) === uId) ||
        (uCode && String(t.requestedById) === uCode) ||
        (uName && t.requestedByName && t.requestedByName.toLowerCase().trim() === uName);
      const isAssignee = (uId && String(t.assignedToId) === uId) ||
        (uCode && String(t.assignedToId) === uCode) ||
        (uName && t.assignedToName && t.assignedToName.toLowerCase().trim() === uName);
      return isRequester || isAssignee;
    });
  }, [tickets, canViewAllTickets, currentUser]);

  // KPIs
  const totalCount = scopedTickets.length;
  const closedCount = scopedTickets.filter(t => t.status === 'closed').length;
  const openCount = scopedTickets.filter(t => t.status === 'open').length;
  const pendingCount = scopedTickets.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const resolvedCount = scopedTickets.filter(t => t.status === 'resolved').length;

  const filteredTickets = useMemo(() => {
    return scopedTickets.filter(t => {
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.ticketCode || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.requestedByName || '').toLowerCase().includes(q);

      let matchesStatus = true;
      if (statusFilter === 'open') matchesStatus = t.status === 'open';
      else if (statusFilter === 'closed') matchesStatus = t.status === 'closed';
      else if (statusFilter === 'pending') matchesStatus = t.status === 'pending' || t.status === 'in_progress';
      else if (statusFilter === 'resolved') matchesStatus = t.status === 'resolved';

      let matchesDate = true;
      if (startDateFilter && t.requestedOn && t.requestedOn < startDateFilter) matchesDate = false;
      if (endDateFilter && t.requestedOn && t.requestedOn > endDateFilter) matchesDate = false;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [scopedTickets, search, statusFilter, startDateFilter, endDateFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredTickets.map(item => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (filteredTickets.length === 0) {
      alert('No tickets available to export');
      return;
    }

    const headers = ['Ticket #,Ticket Subject,Requester Name,Requested On,Category,Priority,Assigned To,Status'];
    const rows = filteredTickets.map(t =>
      `"${t.ticketCode}","${(t.subject || '').replace(/"/g, '""')}","${t.requestedByName || ''}","${t.requestedOn || ''}","${t.category || ''}","${t.priority || ''}","${t.assignedToName || ''}","${t.status}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `support_tickets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Tickets exported successfully to CSV!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '100%', paddingBottom: '24px' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        minHeight: '68px',
        boxSizing: 'border-box',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#f0f9ff',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <LifeBuoy size={17} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>
              Helpdesk & Support Tickets
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Track employee issues, IT requests, and resolution workflows.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsRaiseModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(2,132,199,0.2)'
            }}
          >
            <Plus size={14} />
            <span>Create Ticket</span>
          </button>

          <button
            onClick={handleExport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 11px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#2563eb',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Compact 5-grid) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px'
      }}>
        {/* Total Tickets */}
        <div style={kpiBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Total Tickets</span>
            <TicketIcon size={14} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7', marginTop: '4px', lineHeight: '1.1' }}>
            {totalCount}
          </div>
        </div>

        {/* Closed Tickets */}
        <div style={kpiBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Closed</span>
            <TicketIcon size={14} color="#64748b" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#64748b', marginTop: '4px', lineHeight: '1.1' }}>
            {closedCount}
          </div>
        </div>

        {/* Open Tickets */}
        <div style={kpiBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Open</span>
            <TicketIcon size={14} color="#0284c7" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7', marginTop: '4px', lineHeight: '1.1' }}>
            {openCount}
          </div>
        </div>

        {/* Pending Tickets */}
        <div style={kpiBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Pending</span>
            <TicketIcon size={14} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706', marginTop: '4px', lineHeight: '1.1' }}>
            {pendingCount}
          </div>
        </div>

        {/* Resolved Tickets */}
        <div style={kpiBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Resolved</span>
            <TicketIcon size={14} color="#10b981" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a', marginTop: '4px', lineHeight: '1.1' }}>
            {resolvedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Compact) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Duration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <span style={{ fontWeight: '600' }}>Duration:</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 8px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: '11.5px'
            }}>
              <input
                type="date"
                value={startDateFilter}
                onChange={e => setStartDateFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11.5px', color: '#334155' }}
              />
              <span>-</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11.5px', color: '#334155' }}
              />
            </div>
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '0 8px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#0f172a',
              fontWeight: '500',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Tickets</option>
            <option value="open">Open Tickets</option>
            <option value="pending">Pending Tickets</option>
            <option value="resolved">Resolved Tickets</option>
            <option value="closed">Closed Tickets</option>
          </select>

          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 10px',
            height: '30px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            width: '200px'
          }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                backgroundColor: 'transparent',
                color: '#0f172a'
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
          Showing {filteredTickets.length} of {tickets.length} tickets
        </div>
      </div>

      {/* Tickets Table (Compact Rows) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                color: '#64748b',
                fontWeight: '700',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textAlign: 'left',
                whiteSpace: 'nowrap'
              }}>
                <th style={{ padding: '8px 10px', width: '36px' }}>
                  <input
                    type="checkbox"
                    checked={filteredTickets.length > 0 && selectedIds.length === filteredTickets.length}
                    onChange={handleSelectAll}
                    style={{ accentColor: '#2563eb', cursor: 'pointer', width: '13px', height: '13px' }}
                  />
                </th>
                <th style={{ padding: '8px 10px', width: '90px' }}>Ticket #</th>
                <th style={{ padding: '8px 10px' }}>Ticket Subject</th>
                <th style={{ padding: '8px 10px' }}>Requester Name</th>
                <th style={{ padding: '8px 10px' }}>Requested On</th>
                <th style={{ padding: '8px 10px' }}>Priority & Assigned</th>
                <th style={{ padding: '8px 10px' }}>Status</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '80px' }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>No tickets found</div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr
                    key={ticket._id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: selectedIds.includes(ticket._id) ? 'rgba(37,99,235,0.04)' : '#ffffff',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedIds.includes(ticket._id) ? 'rgba(37,99,235,0.04)' : '#ffffff'}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ticket._id)}
                        onChange={() => handleSelectOne(ticket._id)}
                        style={{ accentColor: '#2563eb', cursor: 'pointer', width: '13px', height: '13px' }}
                      />
                    </td>

                    {/* Ticket # */}
                    <td style={{ padding: '7px 10px', fontWeight: '700', color: '#0284c7', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {ticket.ticketCode}
                    </td>

                    {/* Ticket Subject */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <div
                        onClick={() => setSelectedTicket(ticket)}
                        style={{ fontWeight: '700', color: '#0f172a', cursor: 'pointer', fontSize: '12px', lineHeight: '1.2' }}
                      >
                        {ticket.subject}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                        {ticket.category || 'General'} • {ticket.replies?.length || 0} messages
                      </div>
                    </td>

                    {/* Requester Name */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <img
                          src={ticket.requestedByAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={ticket.requestedByName}
                          style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '12px' }}>
                          {ticket.requestedByName}
                        </span>
                      </div>
                    </td>

                    {/* Requested On */}
                    <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {ticket.requestedOn}
                    </td>

                    {/* Others (Priority & Assigned) */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          fontWeight: '700',
                          backgroundColor: ticket.priority === 'urgent' ? '#fee2e2' : ticket.priority === 'high' ? '#ffedd5' : '#f1f5f9',
                          color: ticket.priority === 'urgent' ? '#b91c1c' : ticket.priority === 'high' ? '#c2410c' : '#475569',
                          textTransform: 'capitalize'
                        }}>
                          {ticket.priority}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          • {ticket.assignedToName?.split(' ')[0] || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        backgroundColor:
                          ticket.status === 'resolved' ? '#dcfce7' :
                          ticket.status === 'open' ? '#e0f2fe' :
                          ticket.status === 'in_progress' ? '#ede9fe' :
                          ticket.status === 'pending' ? '#fef3c7' : '#f1f5f9',
                        color:
                          ticket.status === 'resolved' ? '#15803d' :
                          ticket.status === 'open' ? '#0369a1' :
                          ticket.status === 'in_progress' ? '#6d28d9' :
                          ticket.status === 'pending' ? '#b45309' : '#475569',
                        textTransform: 'capitalize'
                      }}>
                        {ticket.status === 'resolved' && <CheckCircle2 size={11} />}
                        {ticket.status === 'open' && <AlertCircle size={11} />}
                        {ticket.status === 'pending' && <Clock size={11} />}
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          cursor: 'pointer',
                          color: '#0284c7',
                          fontSize: '11px',
                          fontWeight: '700',
                          height: '22px'
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <RaiseTicketModal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
      />

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
};

const kpiBoxStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  padding: '10px 14px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
};
