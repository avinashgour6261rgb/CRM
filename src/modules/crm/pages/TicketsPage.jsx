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
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { getUserModulePermissions, isHRorAdmin } from '../../../shared/utils/permissionUtils';
import { matchesFilter, matchesDateRange, matchesSearch } from '../../../shared/utils/filterUtils';
import { RaiseTicketModal } from '../../../shared/components/modals/RaiseTicketModal';
import { TicketDetailModal } from '../components/tickets/TicketDetailModal';

export const TicketsPage = () => {
  const { tickets, updateTicketStatus, deleteTicket } = useCRM();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

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

  // KPIs with case-insensitive status matching
  const totalCount = scopedTickets.length;
  const closedCount = scopedTickets.filter(t => matchesFilter(t.status, 'closed')).length;
  const openCount = scopedTickets.filter(t => matchesFilter(t.status, 'open')).length;
  const pendingCount = scopedTickets.filter(t => matchesFilter(t.status, 'pending') || matchesFilter(t.status, 'in_progress')).length;
  const resolvedCount = scopedTickets.filter(t => matchesFilter(t.status, 'resolved')).length;

  const filteredTickets = useMemo(() => {
    return scopedTickets.filter(t => {
      const matchSearch = matchesSearch(t, search, [
        'subject', 'ticketCode', 'category', 'requestedByName', 'assignedToName', 'priority'
      ]);

      let matchesStatus = true;
      if (statusFilter === 'open') {
        matchesStatus = matchesFilter(t.status, 'open');
      } else if (statusFilter === 'closed') {
        matchesStatus = matchesFilter(t.status, 'closed');
      } else if (statusFilter === 'pending') {
        matchesStatus = matchesFilter(t.status, 'pending') || matchesFilter(t.status, 'in_progress');
      } else if (statusFilter === 'resolved') {
        matchesStatus = matchesFilter(t.status, 'resolved');
      }

      const matchDate = matchesDateRange(t.requestedOn || t.createdAt, startDateFilter, endDateFilter);

      return matchSearch && matchesStatus && matchDate;
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

  const canDeleteTicket = (ticket) => {
    if (!currentUser || !ticket) return false;
    if (isPrivileged) return true;
    const uId = String(currentUser._id || '');
    const uCode = String(currentUser.employeeCode || '');
    const uName = (currentUser.name || '').toLowerCase().trim();

    const isRequester =
      (uId && String(ticket.requestedById) === uId) ||
      (uCode && String(ticket.requestedById) === uCode) ||
      (uId && String(ticket.createdBy) === uId) ||
      (uCode && String(ticket.createdBy) === uCode) ||
      (uName && ticket.requestedByName && ticket.requestedByName.toLowerCase().trim() === uName) ||
      (uName && ticket.createdByName && ticket.createdByName.toLowerCase().trim() === uName);

    return isRequester;
  };

  const handleDeleteTicket = async (ticket, e) => {
    if (e) e.stopPropagation();
    if (!canDeleteTicket(ticket)) {
      addToast('You do not have permission to delete this ticket.', 'warning');
      return;
    }

    const ok = await confirm({
      title: 'Delete Support Ticket?',
      message: `Are you sure you want to permanently delete "${ticket.ticketCode}: ${ticket.subject}"? This action cannot be undone.`,
      confirmText: 'Yes, Delete Ticket',
      cancelText: 'Keep Ticket',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await deleteTicket(ticket._id || ticket.ticketCode);
      setSelectedIds(prev => prev.filter(id => id !== ticket._id));
      if (selectedTicket && (selectedTicket._id === ticket._id || selectedTicket.ticketCode === ticket.ticketCode)) {
        setSelectedTicket(null);
      }
    } catch {
      addToast('Failed to delete ticket.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    const deletableTickets = filteredTickets.filter(t => selectedIds.includes(t._id) && canDeleteTicket(t));
    if (deletableTickets.length === 0) {
      addToast('You do not have permission to delete the selected tickets.', 'warning');
      return;
    }

    const ok = await confirm({
      title: `Delete ${deletableTickets.length} Selected Tickets?`,
      message: `Are you sure you want to permanently delete ${deletableTickets.length} selected support ticket(s)? This action cannot be undone.`,
      confirmText: 'Yes, Delete Tickets',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    for (const t of deletableTickets) {
      await deleteTicket(t._id || t.ticketCode);
    }
    setSelectedIds([]);
  };

  return (
    <div className="flex flex-col gap-3.5 min-h-full pb-6">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 px-4 py-3 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <LifeBuoy size={17} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight">
              Helpdesk & Support Tickets
            </h1>
            <p className="mt-0.5 mb-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Track employee issues, IT requests, and resolution workflows.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRaiseModalOpen(true)}
            className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-sky-600 hover:bg-sky-700 text-white border-0 text-xs font-bold cursor-pointer shadow-[0_1px_3px_rgba(2,132,199,0.2)] transition-colors"
          >
            <Plus size={14} />
            <span>Create Ticket</span>
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Compact 5-grid) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
        {/* Total Tickets */}
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Tickets</span>
            <TicketIcon size={14} className="text-blue-500" />
          </div>
          <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400 mt-1 leading-tight">
            {totalCount}
          </div>
        </div>

        {/* Closed Tickets */}
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Closed</span>
            <TicketIcon size={14} className="text-slate-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-600 dark:text-slate-400 mt-1 leading-tight">
            {closedCount}
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Open</span>
            <TicketIcon size={14} className="text-sky-600" />
          </div>
          <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400 mt-1 leading-tight">
            {openCount}
          </div>
        </div>

        {/* Pending Tickets */}
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pending</span>
            <TicketIcon size={14} className="text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-1 leading-tight">
            {pendingCount}
          </div>
        </div>

        {/* Resolved Tickets */}
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Resolved</span>
            <TicketIcon size={14} className="text-emerald-500" />
          </div>
          <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">
            {resolvedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Compact) */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between flex-wrap gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Duration */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Duration:</span>
            <div className="flex items-center gap-1 px-2 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11.5px]">
              <input
                type="date"
                value={startDateFilter}
                onChange={e => setStartDateFilter(e.target.value)}
                className="border-0 bg-transparent outline-none text-[11.5px] text-slate-700 dark:text-slate-200"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                className="border-0 bg-transparent outline-none text-[11.5px] text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium outline-none cursor-pointer"
          >
            <option value="all">All Tickets</option>
            <option value="open">Open Tickets</option>
            <option value="pending">Pending Tickets</option>
            <option value="resolved">Resolved Tickets</option>
            <option value="closed">Closed Tickets</option>
          </select>

          {/* Search Input */}
          <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 w-[200px]">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-0 outline-none text-xs w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1 px-2.5 h-[26px] rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
            >
              <Trash2 size={12} />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </div>
        </div>
      </div>

      {/* Tickets Table (Compact Rows) */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider text-left whitespace-nowrap">
                <th className="px-2.5 py-2 w-9">
                  <input
                    type="checkbox"
                    checked={filteredTickets.length > 0 && selectedIds.length === filteredTickets.length}
                    onChange={handleSelectAll}
                    className="accent-blue-600 cursor-pointer w-[13px] h-[13px]"
                  />
                </th>
                <th className="px-2.5 py-2 w-[90px]">Ticket #</th>
                <th className="px-2.5 py-2">Ticket Subject</th>
                <th className="px-2.5 py-2">Requester Name</th>
                <th className="px-2.5 py-2">Requested On</th>
                <th className="px-2.5 py-2">Priority & Assigned</th>
                <th className="px-2.5 py-2">Status</th>
                <th className="px-2.5 py-2 text-center w-20">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-[30px] text-center text-slate-500 dark:text-slate-400">
                    <div className="text-xs font-medium">No tickets found</div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr
                    key={ticket._id}
                    className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
                      selectedIds.includes(ticket._id)
                        ? 'bg-blue-50/40 dark:bg-blue-950/20'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-2.5 py-[7px] whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ticket._id)}
                        onChange={() => handleSelectOne(ticket._id)}
                        className="accent-blue-600 cursor-pointer w-[13px] h-[13px]"
                      />
                    </td>

                    {/* Ticket # */}
                    <td className="px-2.5 py-[7px] font-bold text-sky-600 dark:text-sky-400 text-[11.5px] whitespace-nowrap">
                      {ticket.ticketCode}
                    </td>

                    {/* Ticket Subject */}
                    <td className="px-2.5 py-[7px] whitespace-nowrap">
                      <div
                        onClick={() => setSelectedTicket(ticket)}
                        className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer text-xs leading-tight"
                      >
                        {ticket.subject}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-[1px]">
                        {ticket.category || 'General'} • {ticket.replies?.length || 0} messages
                      </div>
                    </td>

                    {/* Requester Name */}
                    <td className="px-2.5 py-[7px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={ticket.requestedByAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={ticket.requestedByName}
                          className="w-[22px] h-[22px] rounded-full object-cover"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          {ticket.requestedByName}
                        </span>
                      </div>
                    </td>

                    {/* Requested On */}
                    <td className="px-2.5 py-[7px] text-slate-500 dark:text-slate-400 text-[11.5px] whitespace-nowrap">
                      {ticket.requestedOn}
                    </td>

                    {/* Others (Priority & Assigned) */}
                    <td className="px-2.5 py-[7px] whitespace-nowrap">
                      <div className="flex items-center gap-[5px]">
                        <span className={`px-1.5 py-[1px] rounded text-[10px] font-bold capitalize ${
                          ticket.priority === 'urgent'
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                            : ticket.priority === 'high'
                            ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {ticket.priority}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          • {ticket.assignedToName?.split(' ')[0] || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-2.5 py-[7px] whitespace-nowrap">
                      <span className={`inline-flex items-center gap-[3px] px-[7px] py-0.5 rounded-full text-[10.5px] font-bold capitalize ${
                        ticket.status === 'resolved'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : ticket.status === 'open'
                          ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400'
                          : ticket.status === 'in_progress'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                          : ticket.status === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {ticket.status === 'resolved' && <CheckCircle2 size={11} />}
                        {ticket.status === 'open' && <AlertCircle size={11} />}
                        {ticket.status === 'pending' && <Clock size={11} />}
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-2.5 py-[7px] text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 h-[24px] cursor-pointer text-sky-600 dark:text-sky-400 text-[11px] font-bold hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1"
                          title="View details & discussion"
                        >
                          <Eye size={12} />
                          View
                        </button>
                        {canDeleteTicket(ticket) && (
                          <button
                            onClick={(e) => handleDeleteTicket(ticket, e)}
                            className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded px-1.5 h-[24px] cursor-pointer text-red-600 dark:text-red-400 text-[11px] font-bold hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors inline-flex items-center"
                            title="Delete this ticket"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
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
