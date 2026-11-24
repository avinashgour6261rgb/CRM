/**
 * @file TicketsPage.jsx
 * @description Helpdesk & Support Tickets module matching Screenshot 2 exactly.
 */

import React, { useState, useMemo, useEffect } from 'react';
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
import { getUserModulePermissions, isHRorAdmin, canViewAllTickets as checkCanViewAllTickets, canDeleteTicket as checkCanDeleteTicket, canExportData } from '../../../shared/utils/permissionUtils';
import { matchesFilter, matchesDateRange, matchesSearch } from '../../../shared/utils/filterUtils';
import { Pagination } from '../../../shared/components/common/Pagination';
import { RaiseTicketModal } from '../../../shared/components/modals/RaiseTicketModal';
import { TicketDetailModal } from '../components/tickets/TicketDetailModal';
import { ResponsiveDurationFilter } from '../../../shared/components/common/ResponsiveDurationFilter';
import { getLocalDateString } from '../../../shared/utils/timerUtils';
import { exportToCSV } from '../../../shared/utils/exportUtils';

export const TicketsPage = () => {
  const { tickets, updateTicketStatus, deleteTicket } = useCRM();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const perms = useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  const canViewAllTickets = useMemo(() => checkCanViewAllTickets(currentUser), [currentUser]);
  const canExport = useMemo(() => canExportData(currentUser, 'tickets'), [currentUser]);

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, startDateFilter, endDateFilter]);

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Scoped tickets based on Admin / HR privilege and viewAllTickets permission
  const scopedTickets = useMemo(() => {
    if (canViewAllTickets) return tickets || [];
    if (!currentUser) return tickets || [];
    const uId = String(currentUser._id || currentUser.id || '').toLowerCase().trim();
    const uCode = String(currentUser.employeeCode || '').toLowerCase().trim();
    const uName = (currentUser.name || '').toLowerCase().trim();

    return (tickets || []).filter(t => {
      const reqId = String(t.requestedById || t.createdBy || '').toLowerCase().trim();
      const assId = String(t.assignedToId || t.assignedTo || '').toLowerCase().trim();
      const reqCode = String(t.requestedByCode || t.createdByCode || '').toLowerCase().trim();
      const assCode = String(t.assignedToCode || '').toLowerCase().trim();
      const reqName = String(t.requestedByName || t.requestedBy || t.createdByName || '').toLowerCase().trim();
      const assName = String(t.assignedToName || '').toLowerCase().trim();

      const isRequester = (uId && reqId === uId) ||
        (uCode && (reqId === uCode || reqCode === uCode)) ||
        (uName && reqName && (reqName === uName || reqName.includes(uName) || uName.includes(reqName)));

      const isAssignee = (uId && assId === uId) ||
        (uCode && (assId === uCode || assCode === uCode)) ||
        (uName && assName && (assName === uName || assName.includes(uName) || uName.includes(assName)));

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

  const totalEntries = filteredTickets.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + pageSize);

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
      addToast('No tickets available to export.', 'info');
      return;
    }

    const headers = ['Ticket #', 'Ticket Subject', 'Requester Name', 'Requested On', 'Category', 'Priority', 'Assigned To', 'Status'];
    const rows = filteredTickets.map(t => [
      t.ticketCode || '',
      t.subject || '',
      t.requestedByName || '',
      t.requestedOn || '',
      t.category || '',
      t.priority || '',
      t.assignedToName || '',
      t.status || ''
    ]);

    exportToCSV(`support_tickets_${getLocalDateString()}`, headers, rows);
    addToast('Tickets exported successfully to CSV!', 'success');
  };

  const canDeleteTicket = (ticket) => {
    return checkCanDeleteTicket(currentUser, ticket);
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

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end mt-1 sm:mt-0">
          <button
            onClick={() => setIsRaiseModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-[5px] px-3 h-[32px] rounded-md bg-sky-600 hover:bg-sky-700 text-white border-0 text-xs font-bold cursor-pointer shadow-[0_1px_3px_rgba(2,132,199,0.2)] transition-colors"
          >
            <Plus size={14} />
            <span>Create Ticket</span>
          </button>

          {canExport && (
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-[5px] px-3 h-[32px] rounded-md bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row (Compact 5-grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {/* Total Tickets */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`rounded-[10px] border px-3.5 py-2.5 cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Tickets</span>
            <TicketIcon size={14} className="text-blue-500" />
          </div>
          <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400 mt-1 leading-tight">
            {totalCount}
          </div>
        </div>

        {/* Closed Tickets */}
        <div
          onClick={() => setStatusFilter('closed')}
          className={`rounded-[10px] border px-3.5 py-2.5 cursor-pointer transition-all ${
            statusFilter === 'closed'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Closed</span>
            <TicketIcon size={14} className="text-slate-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-600 dark:text-slate-400 mt-1 leading-tight">
            {closedCount}
          </div>
        </div>

        {/* Open Tickets */}
        <div
          onClick={() => setStatusFilter('open')}
          className={`rounded-[10px] border px-3.5 py-2.5 cursor-pointer transition-all ${
            statusFilter === 'open'
              ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Open</span>
            <TicketIcon size={14} className="text-sky-600" />
          </div>
          <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400 mt-1 leading-tight">
            {openCount}
          </div>
        </div>

        {/* Pending Tickets */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`rounded-[10px] border px-3.5 py-2.5 cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pending</span>
            <TicketIcon size={14} className="text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-1 leading-tight">
            {pendingCount}
          </div>
        </div>

        {/* Resolved Tickets */}
        <div
          onClick={() => setStatusFilter('resolved')}
          className={`col-span-2 sm:col-span-1 rounded-[10px] border px-3.5 py-2.5 cursor-pointer transition-all ${
            statusFilter === 'resolved'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Resolved</span>
            <TicketIcon size={14} className="text-emerald-500" />
          </div>
          <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">
            {resolvedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Compact & Responsive) */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 flex-wrap flex-1 w-full">
          
          {/* Duration Selector with Presets */}
          <ResponsiveDurationFilter
            startDate={startDateFilter}
            endDate={endDateFilter}
            onChange={(s, e) => {
              setStartDateFilter(s);
              setEndDateFilter(e);
            }}
            onClear={() => {
              setStartDateFilter('');
              setEndDateFilter('');
            }}
          />

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-2 h-[32px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium outline-none cursor-pointer"
          >
            <option value="all">All Tickets</option>
            <option value="open">Open Tickets</option>
            <option value="pending">Pending Tickets</option>
            <option value="resolved">Resolved Tickets</option>
            <option value="closed">Closed Tickets</option>
          </select>

          {/* Search Input */}
          <div className="flex items-center gap-1.5 px-2.5 h-[32px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex-1 sm:flex-initial w-full sm:w-[220px]">
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
          <table className="w-full min-w-[780px] border-collapse">
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
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-[30px] text-center text-slate-500 dark:text-slate-400">
                    <div className="text-xs font-medium">No tickets found</div>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket, tIdx) => (
                  <tr
                    key={ticket._id ? `${ticket._id}_${tIdx}` : (ticket.id ? `${ticket.id}_${tIdx}` : `ticket_${tIdx}`)}
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
                        className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer text-xs leading-tight hover:underline"
                      >
                        {ticket.subject}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-[2px] flex items-center gap-1.5 flex-wrap">
                        <span>{ticket.category || 'General'}</span>
                        <span>•</span>
                        <span>{ticket.replies?.length || 0} msgs</span>
                        {(() => {
                          const p = String(ticket.priority || 'medium').toLowerCase();
                          const slaHours = p === 'urgent' ? 12 : p === 'high' ? 24 : p === 'medium' ? 48 : 72;
                          const createdAtMs = ticket.createdAt ? new Date(ticket.createdAt).getTime() : ticket.requestedOn ? new Date(ticket.requestedOn).getTime() : Date.now() - 3600000;
                          const deadlineMs = createdAtMs + slaHours * 3600000;
                          const nowMs = Date.now();
                          const isClosed = ticket.status === 'resolved' || ticket.status === 'closed';

                          if (isClosed) {
                            return <span className="text-[9px] px-1 py-px rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">✅ SLA Met</span>;
                          }
                          if (nowMs > deadlineMs) {
                            const breached = Math.round((nowMs - deadlineMs) / 3600000) || 1;
                            return <span className="text-[9px] px-1 py-px rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 animate-pulse">⚠️ SLA Overdue (+{breached}h)</span>;
                          }
                          const left = Math.round((deadlineMs - nowMs) / 3600000) || 1;
                          return <span className="text-[9px] px-1 py-px rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">⏱️ SLA: {left}h left</span>;
                        })()}
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
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex items-center gap-[3px] px-[7px] py-0.5 rounded-full text-[10.5px] font-bold capitalize w-fit ${
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
                        {(ticket.status === 'resolved' && (ticket.resolvedBy || ticket.lastActionBy)) && (
                          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]" title={ticket.resolvedBy || ticket.lastActionBy}>
                            by {ticket.resolvedBy || ticket.lastActionBy}
                          </span>
                        )}
                        {(ticket.status === 'closed' && (ticket.closedBy || ticket.lastActionBy)) && (
                          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]" title={ticket.closedBy || ticket.lastActionBy}>
                            by {ticket.closedBy || ticket.lastActionBy}
                          </span>
                        )}
                      </div>
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
        {/* Universal Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalEntries={totalEntries}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Modals */}
      <RaiseTicketModal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
      />

      {selectedTicket && (
        <TicketDetailModal
          ticket={tickets.find(t => (t._id && selectedTicket._id && String(t._id) === String(selectedTicket._id)) || (t.ticketCode && selectedTicket.ticketCode && t.ticketCode === selectedTicket.ticketCode)) || selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
};
