/**
 * @file LeadsPage.jsx
 * @description Modern, responsive Leads & Lead Contacts Management section for Enterprise CRM.
 * Features KPI Overview, Multi-Criteria Filters, Table & Kanban Pipeline Views, Import/Export, and Modals.
 */

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  SlidersHorizontal,
  Table as TableIcon,
  Kanban as KanbanIcon,
  Calendar,
  Layers,
  User,
  Building,
  CheckCircle2,
  Trash2,
  X,
  Sparkles,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useHR } from '../../hr/context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { confirmDialog } from '../../../shared/context/ConfirmContext';
import { getUserModulePermissions, isHRorAdmin } from '../../../shared/utils/permissionUtils';

// Components
import { LeadsKPIOverview } from '../components/leads/LeadsKPIOverview';
import { LeadsTable } from '../components/leads/LeadsTable';
import { LeadsKanban } from '../components/leads/LeadsKanban';
import { AddLeadModal } from '../components/leads/AddLeadModal';
import { EditLeadModal } from '../components/leads/EditLeadModal';
import { LeadDetailModal } from '../components/leads/LeadDetailModal';
import { ImportLeadsModal } from '../components/leads/ImportLeadsModal';

export const LeadsPage = () => {
  const { leads, updateLeadStatus, deleteLead } = useCRM();
  const { employees, currentUser: hrUser } = useHR();
  const { currentUser: authUser } = useAuth();
  const currentUser = authUser || hrUser;
  const { addToast } = useToast();

  const isPrivileged = useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const perms = useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  const canViewAllLeads = isPrivileged || perms?.viewAllLeads;

  // View mode
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Selection state for batch actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);

  // Scoped leads based on Admin / HR privilege and viewAllLeads permission
  const scopedLeads = useMemo(() => {
    if (canViewAllLeads) return leads;
    if (!currentUser) return leads;
    const uId = String(currentUser._id || '');
    const uCode = String(currentUser.employeeCode || '');
    const uName = (currentUser.name || '').toLowerCase().trim();

    return leads.filter(lead => {
      const lOwnerId = String(lead.leadOwnerId || '');
      const lCreatedId = String(lead.createdById || '');
      const lAssignedId = String(lead.assignedToId || '');
      const lOwnerName = (lead.leadOwnerName || lead.owner || '').toLowerCase().trim();
      const lCreatedName = (lead.createdByName || '').toLowerCase().trim();

      const isOwner = (uId && lOwnerId === uId) || (uCode && lOwnerId === uCode) || (uName && lOwnerName === uName);
      const isCreator = (uId && lCreatedId === uId) || (uName && lCreatedName === uName);
      const isAssignee = (uId && lAssignedId === uId) || (uCode && lAssignedId === uCode);

      return isOwner || isCreator || isAssignee;
    });
  }, [leads, canViewAllLeads, currentUser]);

  // Unique clients list for filter dropdown
  const uniqueClients = useMemo(() => {
    const clients = new Set();
    scopedLeads.forEach(l => {
      if (l.companyName) clients.add(l.companyName);
      if (l.client) clients.add(l.client);
    });
    return Array.from(clients).sort();
  }, [scopedLeads]);

  // Unique lead types for filter dropdown
  const uniqueTypes = useMemo(() => {
    const types = new Set(['Enterprise', 'Inbound Web', 'Outbound Sales', 'Referral Partner', 'Strategic Deal', 'Consulting']);
    scopedLeads.forEach(l => {
      if (l.leadType) types.add(l.leadType);
    });
    return Array.from(types);
  }, [scopedLeads]);

  // Filtered Leads calculation
  const filteredLeads = useMemo(() => {
    return scopedLeads.filter(lead => {
      // Search across name, company, email, phone, code, contact person
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          (lead.name && lead.name.toLowerCase().includes(q)) ||
          (lead.contactPerson && lead.contactPerson.toLowerCase().includes(q)) ||
          (lead.companyName && lead.companyName.toLowerCase().includes(q)) ||
          (lead.client && lead.client.toLowerCase().includes(q)) ||
          (lead.email && lead.email.toLowerCase().includes(q)) ||
          (lead.phone && lead.phone.toLowerCase().includes(q)) ||
          (lead.leadCode && lead.leadCode.toLowerCase().includes(q)) ||
          (lead.leadOwnerName && lead.leadOwnerName.toLowerCase().includes(q));

        if (!matchSearch) return false;
      }

      // Lead Type
      if (typeFilter !== 'all' && lead.leadType !== typeFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false;
      }

      // Owner
      if (ownerFilter !== 'all' && lead.leadOwnerId !== ownerFilter) {
        return false;
      }

      // Priority
      if (priorityFilter !== 'all' && lead.priority !== priorityFilter) {
        return false;
      }

      // Client
      if (clientFilter !== 'all' && lead.companyName !== clientFilter && lead.client !== clientFilter) {
        return false;
      }

      // Date Range
      if (startDateFilter && lead.startDate && lead.startDate < startDateFilter) {
        return false;
      }
      if (endDateFilter && lead.endDate && lead.endDate > endDateFilter) {
        return false;
      }

      return true;
    });
  }, [scopedLeads, searchQuery, typeFilter, statusFilter, ownerFilter, priorityFilter, clientFilter, startDateFilter, endDateFilter]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l._id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setOwnerFilter('all');
    setPriorityFilter('all');
    setClientFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    ownerFilter !== 'all' ||
    priorityFilter !== 'all' ||
    clientFilter !== 'all' ||
    startDateFilter !== '' ||
    endDateFilter !== '';

  // Batch actions
  const handleBatchDelete = async () => {
    const ok = await confirmDialog({
      title: 'Delete Selected Leads',
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected lead(s)? This action cannot be reversed.`,
      confirmText: `Delete ${selectedIds.length} Lead(s)`,
      variant: 'danger'
    });
    if (ok) {
      selectedIds.forEach(id => deleteLead(id));
      const count = selectedIds.length;
      setSelectedIds([]);
      addToast(`Deleted ${count} leads`, 'info');
    }
  };

  const handleBatchConvert = () => {
    selectedIds.forEach(id => updateLeadStatus(id, 'converted'));
    setSelectedIds([]);
    addToast(`Marked ${selectedIds.length} leads as Converted!`, 'success');
  };

  // Export CSV Functionality
  const handleExportCSV = (exportOnlySelected = false) => {
    const listToExport = exportOnlySelected
      ? leads.filter(l => selectedIds.includes(l._id))
      : filteredLeads;

    if (listToExport.length === 0) {
      addToast('No leads available to export', 'error');
      return;
    }

    const headers = [
      'Lead Code',
      'Lead Name',
      'Contact Person',
      'Company Name',
      'Client',
      'Email',
      'Phone',
      'Lead Type',
      'Lead Owner',
      'Created By',
      'Status',
      'Priority',
      'Deal Value ($)',
      'Lead Source',
      'Start Date',
      'End Date',
      'Created Date',
      'Notes'
    ];

    const rows = listToExport.map(l => [
      `"${l.leadCode || ''}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.contactPerson || '').replace(/"/g, '""')}"`,
      `"${(l.companyName || '').replace(/"/g, '""')}"`,
      `"${(l.client || '').replace(/"/g, '""')}"`,
      `"${l.email || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.leadType || ''}"`,
      `"${l.leadOwnerName || ''}"`,
      `"${l.createdByName || ''}"`,
      `"${l.status || ''}"`,
      `"${l.priority || ''}"`,
      `"${l.dealValue || 0}"`,
      `"${(l.leadSource || '').replace(/"/g, '""')}"`,
      `"${l.startDate || ''}"`,
      `"${l.endDate || ''}"`,
      `"${l.createdDate || ''}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast(`Exported ${listToExport.length} leads to CSV`, 'success');
  };

  return (
    <div className="flex flex-col gap-3 pb-8">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-[#151e32] p-3 px-4 rounded-[10px] border border-slate-200 dark:border-[#243049] shadow-xs min-h-[68px] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Building size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100">Lead Contacts & Deals</h1>
              <span className="text-[10.5px] py-px px-1.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-bold">
                {filteredLeads.length} Leads
              </span>
            </div>
            <p className="m-0 mt-px text-[11.5px] text-slate-500 dark:text-slate-400">
              Manage prospective sales leads, pipeline stages, deals value & owners
            </p>
          </div>
        </div>

        {/* View Switcher: Table vs Kanban */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-[7px] p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 py-1 px-2.5 rounded-[5px] border-none text-[11.5px] font-bold cursor-pointer transition-all ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <TableIcon size={13} />
            Table
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1 py-1 px-2.5 rounded-[5px] border-none text-[11.5px] font-bold cursor-pointer transition-all ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <KanbanIcon size={13} />
            Pipeline Kanban
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <LeadsKPIOverview leads={scopedLeads} />

      {/* Main Filter & Action Bar */}
      <div className="bg-white dark:bg-[#151e32] rounded-[10px] border border-slate-200 dark:border-[#243049] p-2 px-3 shadow-xs flex flex-col gap-2.5">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          
          {/* Left Action Buttons: + Add Lead Contact, Import, Export */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-[5px] px-3 h-[30px] bg-sky-600 hover:bg-sky-700 text-white border-none rounded-md text-xs font-bold cursor-pointer shadow-sm transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Lead
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-[5px] px-3 h-[30px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Upload size={13} className="text-sky-600" />
              Import
            </button>

            <button
              onClick={() => handleExportCSV(false)}
              className="flex items-center gap-[5px] px-3 h-[30px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Download size={13} className="text-sky-600" />
              Export CSV
            </button>
          </div>

          {/* Right Filters Bar: Duration, Type, Search Input, Filter Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Duration / Date Range Selector */}
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Duration:</span>
              <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded-md px-2 h-[30px] bg-slate-50 dark:bg-slate-800">
                <Calendar size={13} className="text-slate-400" />
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="border-none bg-transparent text-[11.5px] text-slate-700 dark:text-slate-200 outline-none cursor-pointer max-w-[105px]"
                  title="Start Date"
                />
                <span className="text-[11px] text-slate-400">To</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="border-none bg-transparent text-[11.5px] text-slate-700 dark:text-slate-200 outline-none cursor-pointer max-w-[105px]"
                  title="End Date"
                />
              </div>
            </div>

            {/* Type Filter dropdown */}
            <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer font-semibold"
              >
                <option value="all">All</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Live Search Input */}
            <div className="relative min-w-[220px] flex items-center">
              <Search
                size={14}
                className="absolute left-2.5 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Start typing to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-[7px] pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none focus:border-sky-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 bg-transparent border-none text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 flex"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filters Toggle Button */}
            <button
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              className={`flex items-center gap-[5px] py-[7px] px-3 rounded-lg border text-[12.5px] font-semibold cursor-pointer transition-all ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-sky-600 dark:text-sky-400 border-blue-200 dark:border-blue-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Filter size={13} />
              Filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters Row */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 items-end bg-slate-50/80 dark:bg-slate-800/50 p-3 px-3.5 rounded-[10px]">
            {/* Status Filter */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Lead Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="new">New Inquiry</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="negotiation">In Negotiation</option>
                <option value="converted">Converted (Won Deal)</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {/* Lead Owner Filter */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Lead Owner
              </label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                disabled={!canViewAllLeads}
                className={`w-full py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-200 ${
                  !canViewAllLeads ? 'bg-slate-100 dark:bg-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-800 cursor-pointer'
                }`}
              >
                {canViewAllLeads ? (
                  <>
                    <option value="all">All Lead Owners</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                    ))}
                  </>
                ) : (
                  <option value="all">{currentUser?.name || 'My Leads'} (Assigned)</option>
                )}
              </select>
            </div>

            {/* Client Filter */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Client / Company
              </label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Clients</option>
                {uniqueClients.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div>
              <button
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className={`w-full py-1.5 px-3 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  hasActiveFilters ? 'text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                <RefreshCw size={12} />
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3 px-5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 text-white py-0.5 px-2 rounded-md text-xs font-bold">
              {selectedIds.length} Selected
            </div>
            <span className="text-[13px] text-slate-300">
              Perform bulk operations across selected lead contacts
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchConvert}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white border-none rounded-md text-[12.5px] font-semibold cursor-pointer transition-colors"
            >
              <CheckCircle2 size={14} />
              Mark Converted
            </button>

            <button
              onClick={() => handleExportCSV(true)}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-white border-none rounded-md text-[12.5px] font-semibold cursor-pointer transition-colors"
            >
              <Download size={14} />
              Export Selected
            </button>

            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white border-none rounded-md text-[12.5px] font-semibold cursor-pointer transition-colors"
            >
              <Trash2 size={14} />
              Delete Selected
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="bg-transparent border-none text-slate-400 hover:text-white cursor-pointer py-1 px-2 text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main View: Table or Kanban */}
      {viewMode === 'table' ? (
        <LeadsTable
          leads={filteredLeads}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          onViewLead={(lead) => setViewingLead(lead)}
          onEditLead={(lead) => setEditingLead(lead)}
        />
      ) : (
        <LeadsKanban
          leads={filteredLeads}
          onViewLead={(lead) => setViewingLead(lead)}
          onEditLead={(lead) => setEditingLead(lead)}
        />
      )}

      {/* Modals */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {editingLead && (
        <EditLeadModal
          isOpen={!!editingLead}
          lead={editingLead}
          onClose={() => setEditingLead(null)}
        />
      )}

      {viewingLead && (
        <LeadDetailModal
          isOpen={!!viewingLead}
          lead={viewingLead}
          onClose={() => setViewingLead(null)}
          onEdit={(lead) => {
            setViewingLead(null);
            setEditingLead(lead);
          }}
        />
      )}

      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
export default LeadsPage;
