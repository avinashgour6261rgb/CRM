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
  const handleBatchDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected leads?`)) {
      selectedIds.forEach(id => deleteLead(id));
      setSelectedIds([]);
      addToast(`Deleted ${selectedIds.length} leads`, 'info');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '30px' }}>
      
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
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Building size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Lead Contacts & Deals</h1>
              <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: '700' }}>
                {filteredLeads.length} Leads
              </span>
            </div>
            <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Manage prospective sales leads, pipeline stages, deals value & owners
            </p>
          </div>
        </div>

        {/* View Switcher: Table vs Kanban */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f1f5f9',
          borderRadius: '7px',
          padding: '2px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '5px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
              color: viewMode === 'table' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <TableIcon size={13} />
            Table
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '5px',
              border: 'none',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: viewMode === 'kanban' ? '#ffffff' : 'transparent',
              color: viewMode === 'kanban' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'kanban' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <KanbanIcon size={13} />
            Pipeline Kanban
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <LeadsKPIOverview leads={scopedLeads} />

      {/* Main Filter & Action Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '8px 12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Top Control Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          
          {/* Left Action Buttons: + Add Lead Contact, Import, Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(2, 132, 199, 0.2)'
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Lead
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Upload size={13} color="#0284c7" />
              Import
            </button>

            <button
              onClick={() => handleExportCSV(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Download size={13} color="#0284c7" />
              Export CSV
            </button>
          </div>

          {/* Right Filters Bar: Duration, Type, Search Input, Filter Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            
            {/* Duration / Date Range Selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#64748b',
              fontWeight: '500'
            }}>
              <span>Duration:</span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '0 8px',
                height: '30px',
                backgroundColor: '#f8fafc'
              }}>
                <Calendar size={13} color="#94a3b8" />
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '11.5px',
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '105px'
                  }}
                  title="Start Date"
                />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>To</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '11.5px',
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '105px'
                  }}
                  title="End Date"
                />
              </div>
            </div>

            {/* Type Filter dropdown */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              color: '#64748b',
              fontWeight: '500'
            }}>
              <span>Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                <option value="all">All</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Live Search Input */}
            <div style={{
              position: 'relative',
              minWidth: '220px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  color: '#94a3b8',
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                placeholder="Start typing to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0284c7';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.backgroundColor = '#f8fafc';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex'
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filters Toggle Button */}
            <button
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                backgroundColor: showAdvancedFilters || hasActiveFilters ? '#eff6ff' : '#f8fafc',
                color: showAdvancedFilters || hasActiveFilters ? '#0284c7' : '#64748b',
                border: `1px solid ${showAdvancedFilters || hasActiveFilters ? '#bfdbfe' : '#e2e8f0'}`,
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Filter size={13} />
              Filters
              {hasActiveFilters && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#0284c7'
                }} />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters Row */}
        {showAdvancedFilters && (
          <div style={{
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
            alignItems: 'flex-end',
            backgroundColor: '#fafafa',
            padding: '12px 14px',
            borderRadius: '10px'
          }}>
            {/* Status Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Lead Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  backgroundColor: '#ffffff'
                }}
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
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Lead Owner
              </label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                disabled={!canViewAllLeads}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  backgroundColor: !canViewAllLeads ? '#f1f5f9' : '#ffffff',
                  cursor: !canViewAllLeads ? 'not-allowed' : 'pointer'
                }}
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
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Client / Company
              </label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="all">All Clients</option>
                {uniqueClients.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  backgroundColor: '#ffffff'
                }}
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
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: hasActiveFilters ? '#dc2626' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
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
        <div style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
          animation: 'slideDown 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              {selectedIds.length} Selected
            </div>
            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
              Perform bulk operations across selected lead contacts
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleBatchConvert}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={14} />
              Mark Converted
            </button>

            <button
              onClick={() => handleExportCSV(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Download size={14} />
              Export Selected
            </button>

            <button
              onClick={handleBatchDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
              Delete Selected
            </button>

            <button
              onClick={() => setSelectedIds([])}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '12px'
              }}
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
