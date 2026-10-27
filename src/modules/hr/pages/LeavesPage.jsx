import React, { useState, useMemo } from 'react';
import {
  Plus,
  Download,
  Filter,
  Search,
  List,
  Calendar as CalendarIcon,
  User,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Palmtree,
  FileSpreadsheet,
  AlertCircle,
  Check,
  X,
  Trash2
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { DateRangePicker } from '../components/common/DateRangePicker';
import { NewLeaveModal } from '../components/leaves/NewLeaveModal';
import { LeaveDetailModal } from '../components/leaves/LeaveDetailModal';
import { RejectLeaveModal } from '../../../shared/components/modals/RejectLeaveModal';
import { CancelLeaveModal } from '../../../shared/components/modals/CancelLeaveModal';
import { canApproveLeaves, isHRorAdmin, isAdmin, getUserModulePermissions, canCancelLeave, canReviewLeave, isLeaveApplicant, isLeaveDesignatedApprover } from '../../../shared/utils/permissionUtils';

export const LeavesPage = () => {
  const { currentUser: authUser } = useAuth();
  const {
    leaves,
    employees,
    currentUser: hrUser,
    searchQuery,
    setSearchQuery,
    updateLeaveStatus,
    acknowledgeLeave,
    deleteLeave
  } = useHR();
  const currentUser = authUser || hrUser;

  const [isNewLeaveOpen, setIsNewLeaveOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectingLeave, setRejectingLeave] = useState(null);
  const [cancellingLeave, setCancellingLeave] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar', 'card'
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Dynamic Today reference for active leaves
  const todayStr = new Date().toISOString().split('T')[0];

  // Dynamic calculation for Current Month Leaves Calendar
  const currentMonthCalendar = useMemo(() => {
    const now = new Date();
    const monthTitle = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInCurrentMonth }, (_, i) => {
      const dayNum = i + 1;
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      return { dayNum, dayStr };
    });
    return { monthTitle, days };
  }, []);

  const perms = useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  const isPrivileged = isHRorAdmin(currentUser) || canApproveLeaves(currentUser) || perms?.viewAllLeaves;

  // Scoped leaves strictly based on user role (Tenant isolation)
  const scopedLeaves = useMemo(() => {
    if (isPrivileged) return leaves;
    return leaves.filter(l =>
      (l.employeeId && currentUser?._id && String(l.employeeId) === String(currentUser._id)) ||
      (l.employee && currentUser?._id && String(l.employee) === String(currentUser._id)) ||
      (l.employeeCode && currentUser?.employeeCode && String(l.employeeCode) === String(currentUser.employeeCode)) ||
      (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
      isLeaveDesignatedApprover(l, currentUser)
    );
  }, [leaves, currentUser, isPrivileged]);

  // 1. Exact mathematical calculations: Leaves taken, balance, pending, approved, rejected
  const approvedLeaves = scopedLeaves.filter(l => l.status === 'approved');
  const pendingLeaves = scopedLeaves.filter(l => l.status === 'pending');
  const rejectedLeaves = scopedLeaves.filter(l => l.status === 'rejected');

  // Real-time unacknowledged decisions for the current logged-in employee
  const myRecentDecisions = useMemo(() => {
    let ackList = [];
    try {
      ackList = JSON.parse(localStorage.getItem('ems_acknowledged_leaves') || '[]');
    } catch (_) {}
    const ackSet = new Set(ackList.map(String));

    return scopedLeaves.filter(l => {
      if (l.status !== 'approved' && l.status !== 'rejected') return false;
      if (l.isAcknowledged || ackSet.has(String(l._id))) return false;
      const isApplicant = (l.employeeId && currentUser?._id && String(l.employeeId) === String(currentUser._id)) ||
        (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
      return isApplicant;
    });
  }, [scopedLeaves, currentUser]);

  const totalDaysTaken = approvedLeaves.reduce((acc, curr) => acc + (Number(curr.durationDays) || 1), 0);

  // Employees currently on leave today (exact date range check)
  const employeesCurrentlyOnLeave = (isPrivileged ? leaves : scopedLeaves).filter(l =>
    l.status === 'approved' && l.startDate <= todayStr && l.endDate >= todayStr
  );

  // Selected Employee / Current user leave balance
  const activeEmployeeObj = (isPrivileged && filterEmployee !== 'all')
    ? employees.find(e => e._id === filterEmployee)
    : ((employees || []).find(e =>
        (currentUser?._id && String(e._id) === String(currentUser._id)) ||
        (currentUser?.employeeCode && String(e.employeeCode) === String(currentUser.employeeCode)) ||
        (currentUser?.email && e.email?.toLowerCase() === currentUser.email.toLowerCase())
      ) || currentUser || employees[0]);

  const activeBalance = activeEmployeeObj?.leaveBalance || { casual: 8, sick: 6, earned: 12, maternity: 0 };
  const totalBalanceDays = Object.values(activeBalance).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return scopedLeaves.filter(leave => {
      if (isPrivileged && filterEmployee !== 'all' && leave.employeeId !== filterEmployee) return false;
      if (filterType !== 'all' && leave.leaveType !== filterType) return false;
      if (filterStatus !== 'all' && leave.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = leave.employeeName?.toLowerCase().includes(q);
        const matchRole = leave.employeeRole?.toLowerCase().includes(q);
        const matchType = leave.leaveType?.toLowerCase().includes(q);
        const matchReason = leave.reason?.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchType && !matchReason) return false;
      }
      return true;
    });
  }, [scopedLeaves, isPrivileged, filterEmployee, filterType, filterStatus, searchQuery]);

  // Pagination
  const totalEntries = filteredLeaves.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLeaves = filteredLeaves.slice(startIndex, startIndex + pageSize);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLeaves.length === 0) {
      alert('No leave records to export');
      return;
    }
    const headers = ['ID', 'Employee Name', 'Role', 'Leave Type', 'Start Date', 'End Date', 'Duration', 'Status', 'Paid', 'Reason'];
    const rows = filteredLeaves.map(l => [
      l._id,
      `"${l.employeeName}"`,
      `"${l.employeeRole}"`,
      `"${l.leaveType}"`,
      l.startDate,
      l.endDate,
      `"${l.durationText}"`,
      l.status,
      l.isPaid ? 'Yes' : 'No',
      `"${(l.reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Leaves_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(paginatedLeaves.map(l => l._id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rId => rId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
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
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Palmtree size={17} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>
              Leave Management & Approvals
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Apply for leaves, track approval workflows, and view leave balances.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsNewLeaveOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(5,150,105,0.2)'
            }}
            title="Apply for a new leave"
          >
            <Plus size={13} />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* ── 🔔 REAL-TIME LEAVE STATUS DECISION NOTIFICATION BADGE / CARD ── */}
      {myRecentDecisions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
          {myRecentDecisions.map(dec => (
            <div
              key={dec._id}
              style={{
                backgroundColor: dec.status === 'approved' ? '#ecfdf5' : '#fff1f2',
                border: `1.5px solid ${dec.status === 'approved' ? '#6ee7b7' : '#fca5a5'}`,
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: dec.status === 'approved' ? '0 4px 14px rgba(16, 185, 129, 0.12)' : '0 4px 14px rgba(239, 68, 68, 0.12)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: dec.status === 'approved' ? '#10b981' : '#ef4444',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {dec.status === 'approved' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: dec.status === 'approved' ? '#065f46' : '#991b1b' }}>
                    {dec.status === 'approved' ? '🎉 Your Leave Request Has Been Approved!' : '⚠️ Your Leave Request Has Been Declined'}
                  </div>
                  <div style={{ fontSize: '12px', color: dec.status === 'approved' ? '#047857' : '#b91c1c', marginTop: '3px' }}>
                    <strong>{dec.leaveType} ({dec.durationText})</strong> • 📅 {dec.startDate} to {dec.endDate}
                    <span style={{ margin: '0 6px', opacity: 0.6 }}>•</span>
                    <span>
                      {dec.status === 'approved'
                        ? `Approved by ${dec.approvedBy || dec.actionBy || 'Admin'}${dec.actionDateFormatted ? ` on ${dec.actionDateFormatted}` : ''}`
                        : `Reviewed by ${dec.rejectedBy || dec.actionBy || 'Admin'}${dec.actionDateFormatted ? ` on ${dec.actionDateFormatted}` : ''}${dec.rejectionReason ? ` — Reason: "${dec.rejectionReason}"` : ''}`}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => acknowledgeLeave(dec._id)}
                style={{
                  backgroundColor: dec.status === 'approved' ? '#059669' : '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                ✓ Acknowledge & Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top Summary KPI Cards (Leaves Taken, Currently on Leave, Leave Balance, Pending, Approved, Rejected) */}
      <div className="kpi-grid-6">
        {/* 1. Leaves Taken */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Leaves Taken</span>
            <div className="kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Palmtree size={18} />
            </div>
          </div>
          <div className="kpi-value">{totalDaysTaken} <span style={{ fontSize: '15px', fontWeight: '500', color: '#64748b' }}>Days</span></div>
          <div className="kpi-subtext" style={{ color: '#64748b' }}>
            <span>Across all departments</span>
          </div>
        </div>

        {/* 2. Currently on Leave */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="kpi-header">
            <span className="kpi-title">On Leave Today</span>
            <div className="kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <User size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#0284c7' }}>{employeesCurrentlyOnLeave.length}</div>
          <div className="kpi-subtext" style={{ color: '#0284c7' }}>
            <span>{employeesCurrentlyOnLeave.length > 0 ? employeesCurrentlyOnLeave.map(e => e.employeeName).join(', ') : '0 employees on leave today'}</span>
          </div>
        </div>

        {/* 3. Leave Balance */}
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #f8fafc, #ffffff)' }}>
          <div className="kpi-header">
            <span className="kpi-title">Your Leave Balance</span>
            <div className="kpi-icon-wrap" style={{ background: '#f1f5f9', color: '#334155' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#2563eb' }}>
            {totalBalanceDays} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Days Left</span>
          </div>
          <div className="kpi-subtext" style={{ fontSize: '11px', color: '#475569' }}>
            <span>CL: {activeBalance.casual} • SL: {activeBalance.sick} • EL: {activeBalance.earned}</span>
          </div>
        </div>

        {/* 4. Pending Leaves */}
        <div
          onClick={() => setFilterStatus('pending')}
          className="kpi-card"
          style={{ cursor: 'pointer', borderLeft: filterStatus === 'pending' ? '4px solid #d97706' : undefined }}
        >
          <div className="kpi-header">
            <span className="kpi-title">Pending Leaves</span>
            <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#d97706' }}>{pendingLeaves.length}</div>
          <div className="kpi-subtext" style={{ color: '#d97706' }}>
            <span>Awaiting HR approval</span>
          </div>
        </div>

        {/* 5. Approved Leaves */}
        <div
          onClick={() => setFilterStatus('approved')}
          className="kpi-card"
          style={{ cursor: 'pointer', borderLeft: filterStatus === 'approved' ? '4px solid #16a34a' : undefined }}
        >
          <div className="kpi-header">
            <span className="kpi-title">Approved Leaves</span>
            <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#16a34a' }}>{approvedLeaves.length}</div>
          <div className="kpi-subtext" style={{ color: '#16a34a' }}>
            <span>Sanctioned & logged</span>
          </div>
        </div>

        {/* 6. Rejected Leaves */}
        <div
          onClick={() => setFilterStatus('rejected')}
          className="kpi-card"
          style={{ cursor: 'pointer', borderLeft: filterStatus === 'rejected' ? '4px solid #dc2626' : undefined }}
        >
          <div className="kpi-header">
            <span className="kpi-title">Rejected Leaves</span>
            <div className="kpi-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <XCircle size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#dc2626' }}>{rejectedLeaves.length}</div>
          <div className="kpi-subtext" style={{ color: '#dc2626' }}>
            <span>Declined applications</span>
          </div>
        </div>
      </div>

      {/* Currently On Leave Active Pill Widget */}
      {employeesCurrentlyOnLeave.length > 0 && (
        <div className="currently-on-leave-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🏖️</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0369a1' }}>
                Employees Currently On Leave (Today):
              </div>
              <div style={{ fontSize: '12px', color: '#0284c7' }}>
                {employeesCurrentlyOnLeave.map(l => `${l.employeeName} (${l.leaveType} until ${l.endDate})`).join(' • ')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {employeesCurrentlyOnLeave.map(l => (
              <div key={l._id} className="employee-avatar" title={`${l.employeeName} - ${l.leaveType}`}>
                {l.employeeAvatar ? <img src={l.employeeAvatar} alt={l.employeeName} /> : l.employeeName.charAt(0)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar & Filters (Matches Screenshot 1) */}
      <div className="action-bar-card">
        <div className="filter-left-group">
          {/* Duration Date Range */}
          <div className="filter-item">
            <span style={{ fontWeight: '500', color: '#64748b' }}>Duration</span>
            <DateRangePicker />
          </div>

          {/* Search Input */}
          <div className="filter-input-wrap">
            <Search size={15} className="filter-input-icon" />
            <input
              type="text"
              className="filter-input"
              placeholder="Search employee, reason, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ minWidth: '240px' }}
            />
          </div>

          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`btn ${showFilterDrawer ? 'btn-primary' : 'btn-outline'}`}
            style={{ height: '36px', padding: '0 12px' }}
          >
            <Filter size={15} />
            <span>Filters</span>
          </button>
        </div>

        <div className="filter-right-group">
          {/* New Leave Button */}
          <button
            onClick={() => setIsNewLeaveOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>New Leave</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="btn btn-outline"
          >
            <Download size={15} />
            <span>Export</span>
          </button>

          {/* View Switchers */}
          <div className="view-switch-group">
            <button
              onClick={() => setViewMode('list')}
              className={`view-switch-btn ${viewMode === 'list' ? 'active' : ''}`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`view-switch-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              title="Calendar Schedule"
            >
              <CalendarIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`view-switch-btn ${viewMode === 'card' ? 'active' : ''}`}
              title="Card Grid"
            >
              <User size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilterDrawer && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Employee
            </label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Leave Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Earned Leave">Earned Leave</option>
              <option value="Maternity/Paternity">Maternity/Paternity</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <button
            onClick={() => {
              setFilterEmployee('all');
              setFilterType('all');
              setFilterStatus('all');
              setSearchQuery('');
            }}
            className="btn btn-outline"
            style={{ alignSelf: 'flex-end', height: '36px' }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Main Leave History Table (Matching Screenshot 1) */}
      {viewMode === 'list' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="crm-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.length === paginatedLeaves.length && paginatedLeaves.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Employee</th>
                  <th>Leave Dates</th>
                  <th>Duration</th>
                  <th>Leave Status</th>
                  <th>Leave Type</th>
                  <th>Reviewer / Approver</th>
                  <th>Paid</th>
                  <th>Reason</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeaves.length > 0 ? (
                  paginatedLeaves.map((leave) => (
                    <tr
                      key={leave._id}
                      onClick={() => setSelectedLeave(leave)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(leave._id)}
                          onChange={() => handleSelectRow(leave._id)}
                        />
                      </td>

                      {/* Employee Cell */}
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar">
                            {leave.employeeAvatar ? (
                              <img src={leave.employeeAvatar} alt={leave.employeeName} />
                            ) : (
                              leave.employeeName?.charAt(0) || 'E'
                            )}
                          </div>
                          <div className="employee-name-group">
                            <span className="employee-name">
                              {leave.employeeName}
                              {(leave.employeeName === currentUser?.name || leave.employeeId === currentUser?._id) && (
                                <span className="its-you-pill">It's You</span>
                              )}
                            </span>
                            <span className="employee-role">{leave.employeeRole}</span>
                          </div>
                        </div>
                      </td>

                      {/* Leave Dates */}
                      <td style={{ fontWeight: '600', color: '#1e293b' }}>
                        {leave.startDate}
                        {leave.endDate !== leave.startDate && ` to ${leave.endDate}`}
                      </td>

                      {/* Duration */}
                      <td>
                        <span style={{
                          fontSize: '12px',
                          color: '#475569',
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '600'
                        }}>
                          {leave.durationText}
                        </span>
                      </td>

                      {/* Leave Status */}
                      <td>
                        <span className={`badge badge-${leave.status}`}>
                          {leave.status === 'approved' ? '✓ Approved' : (leave.status === 'rejected' ? '✕ Denied' : '⏳ Pending')}
                        </span>
                      </td>

                      {/* Leave Type */}
                      <td style={{ fontWeight: '500', color: '#334155' }}>
                        {leave.leaveType}
                      </td>

                      {/* Reviewer / Approver & Audit Trail */}
                      <td>
                        <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: '600' }}>
                          {leave.appliedToName || leave.approvedBy || leave.rejectedBy || leave.actionBy || 'HR Admin'}
                        </div>
                        {leave.status === 'approved' && (
                          <span style={{ fontSize: '11px', color: '#16a34a', display: 'block', marginTop: '2px' }}>
                            ✓ Approved by {leave.approvedBy || leave.actionBy || 'Admin'}
                            {leave.actionDateFormatted && <span style={{ color: '#64748b' }}> • {leave.actionDateFormatted}</span>}
                          </span>
                        )}
                        {leave.status === 'rejected' && (
                          <div style={{ marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', color: '#dc2626', display: 'block' }}>
                              ✕ Denied by {leave.rejectedBy || leave.actionBy || 'Admin'}
                              {leave.actionDateFormatted && <span style={{ color: '#64748b' }}> • {leave.actionDateFormatted}</span>}
                            </span>
                            {leave.rejectionReason && (
                              <span style={{ fontSize: '10.5px', color: '#991b1b', display: 'block', fontStyle: 'italic' }}>
                                "{leave.rejectionReason}"
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Paid */}
                      <td>
                        <span style={{
                          fontWeight: '600',
                          fontSize: '12px',
                          color: leave.isPaid ? '#16a34a' : '#64748b'
                        }}>
                          {leave.isPaid ? 'Yes' : 'No'}
                        </span>
                      </td>

                      {/* Reason */}
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: '12.5px' }} title={leave.reason}>
                        {leave.reason || '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {(() => {
                            const isApplicant = isLeaveApplicant(leave, currentUser);
                            const canReview = canReviewLeave(leave, currentUser);
                            const canCancel = canCancelLeave(leave, currentUser);

                            if (leave.status === 'pending' && canReview) {
                              return (
                                <div style={{ display: 'inline-flex', gap: '4px' }}>
                                  <button
                                    onClick={() => updateLeaveStatus(leave._id, 'approved')}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #bbf7d0',
                                      fontSize: '11.5px',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                    title="Accept / Approve Leave"
                                  >
                                    <Check size={13} /> Accept
                                  </button>
                                  <button
                                    onClick={() => setRejectingLeave(leave)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: '#fee2e2',
                                      color: '#dc2626',
                                      border: '1px solid #fecaca',
                                      fontSize: '11.5px',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                    title="Deny / Reject Leave"
                                  >
                                    <X size={13} /> Deny
                                  </button>
                                </div>
                              );
                            }

                            if (leave.status === 'pending' && isApplicant) {
                              return (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    color: '#d97706',
                                    background: '#fef3c7',
                                    border: '1px solid #fde68a',
                                    padding: '2px 7px',
                                    borderRadius: '5px',
                                    fontWeight: '700'
                                  }}>
                                    ⏳ Awaiting Review
                                  </span>
                                  <button
                                    onClick={() => setCancellingLeave(leave)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '3px 7px',
                                      borderRadius: '5px',
                                      background: '#fee2e2',
                                      color: '#dc2626',
                                      border: '1px solid #fecaca',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                    title="Cancel Leave Request"
                                  >
                                    <Trash2 size={12} /> Cancel
                                  </button>
                                </div>
                              );
                            }

                            if (leave.status === 'approved' && canCancel) {
                              return (
                                <button
                                  onClick={() => setCancellingLeave(leave)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                  title="Cancel / Revoke Approved Leave"
                                >
                                  <XCircle size={12} /> Cancel Leave
                                </button>
                              );
                            }

                            return null;
                          })()}
                          <button
                            onClick={() => setSelectedLeave(leave)}
                            className="btn-icon-only"
                            style={{ width: '28px', height: '28px' }}
                            title="View Full Details"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9">
                      <div className="table-empty-state">
                        <FileSpreadsheet className="table-empty-icon" />
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#1e293b' }}>
                          No leave applications found
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                          Click on "+ New Leave" button above to submit a leave request.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer (Matching Screenshot 1) */}
          <div className="table-pagination-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="filter-select"
                style={{ height: '30px', padding: '0 24px 0 8px', fontSize: '12px' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            <div>
              Showing {totalEntries > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, totalEntries)} of {totalEntries} entries
            </div>

            <div className="pagination-controls">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="page-btn"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`page-btn ${currentPage === p ? 'active' : ''}`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages || totalEntries === 0}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="page-btn"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Grid View */}
      {viewMode === 'card' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', alignItems: 'start', marginBottom: '24px' }}>
          {filteredLeaves.map(leave => (
            <div
              key={leave._id}
              onClick={() => setSelectedLeave(leave)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '18px',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div className="employee-cell">
                  <div className="employee-avatar">
                    {leave.employeeAvatar ? <img src={leave.employeeAvatar} alt={leave.employeeName} /> : leave.employeeName.charAt(0)}
                  </div>
                  <div className="employee-name-group">
                    <span className="employee-name">{leave.employeeName}</span>
                    <span className="employee-role">{leave.employeeRole}</span>
                  </div>
                </div>
                <span className={`badge badge-${leave.status}`}>{leave.status}</span>
              </div>

              <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '6px' }}>
                {leave.leaveType} ({leave.durationText})
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '10px' }}>
                📅 {leave.startDate} to {leave.endDate}
              </div>
              <p style={{ fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
                "{leave.reason}"
              </p>

              {(() => {
                const isApplicant = isLeaveApplicant(leave, currentUser);
                const canReview = canReviewLeave(leave, currentUser);
                const canCancel = canCancelLeave(leave, currentUser);

                if (leave.status === 'pending' && canReview) {
                  return (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setRejectingLeave(leave)}
                        className="btn btn-outline"
                        style={{ height: '28px', padding: '0 10px', fontSize: '11.5px', color: '#ef4444' }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => updateLeaveStatus(leave._id, 'approved')}
                        className="btn btn-primary"
                        style={{ height: '28px', padding: '0 12px', fontSize: '11.5px', background: '#16a34a', borderColor: '#16a34a' }}
                      >
                        Approve
                      </button>
                    </div>
                  );
                }

                if (leave.status === 'pending' && isApplicant) {
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <span style={{ fontSize: '11px', color: '#d97706', fontWeight: '700' }}>
                        ⏳ Pending Approval
                      </span>
                      <button
                        onClick={() => setCancellingLeave(leave)}
                        className="btn btn-outline"
                        style={{ height: '26px', padding: '0 10px', fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5', background: '#fff5f5' }}
                      >
                        Cancel Request
                      </button>
                    </div>
                  );
                }

                if (leave.status === 'approved') {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: '600' }}>
                        ✓ Approved by {leave.approvedBy || leave.actionBy || 'Admin'}{leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}
                      </div>
                      {canCancel && (
                        <button
                          onClick={() => setCancellingLeave(leave)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                          title="Cancel this approved leave"
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      )}
                    </div>
                  );
                }

                if (leave.status === 'rejected') {
                  return (
                    <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '11.5px', color: '#dc2626' }}>
                      <div style={{ fontWeight: '600' }}>✕ Denied by {leave.rejectedBy || leave.actionBy || 'Admin'}{leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}</div>
                      {leave.rejectionReason && <div style={{ color: '#991b1b', fontStyle: 'italic', marginTop: '2px', fontSize: '11px' }}>"{leave.rejectionReason}"</div>}
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Calendar Schedule View */}
      {viewMode === 'calendar' && (
        <div className="table-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>{currentMonthCalendar.monthTitle} Leaves Calendar</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '12px', paddingBottom: '8px' }}>
                {day}
              </div>
            ))}
            {currentMonthCalendar.days.map(({ dayNum, dayStr }) => {
              const dayLeaves = leaves.filter(l => l.startDate <= dayStr && l.endDate >= dayStr);
              return (
                <div
                  key={dayNum}
                  style={{
                    minHeight: '80px',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    padding: '6px',
                    background: dayLeaves.length > 0 ? '#eff6ff' : '#ffffff'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>{dayNum}</div>
                  {dayLeaves.map(dl => (
                    <div
                      key={dl._id}
                      onClick={() => setSelectedLeave(dl)}
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '600',
                        color: dl.status === 'approved' ? '#0369a1' : '#b45309',
                        background: dl.status === 'approved' ? '#e0f2fe' : '#fef3c7',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        marginTop: '4px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={`${dl.employeeName} - ${dl.leaveType} (${dl.status})`}
                    >
                      {dl.employeeName} ({dl.leaveType})
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <NewLeaveModal
        isOpen={isNewLeaveOpen}
        onClose={() => setIsNewLeaveOpen(false)}
      />

      <LeaveDetailModal
        leave={selectedLeave}
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
      />

      <RejectLeaveModal
        isOpen={!!rejectingLeave}
        leave={rejectingLeave}
        onClose={() => setRejectingLeave(null)}
        onConfirm={(reason) => {
          if (rejectingLeave?._id) {
            updateLeaveStatus(rejectingLeave._id, 'rejected', reason);
          }
        }}
      />

      <CancelLeaveModal
        isOpen={!!cancellingLeave}
        leave={cancellingLeave}
        isApplicant={(cancellingLeave?.employeeId && currentUser?._id && cancellingLeave.employeeId === currentUser._id) ||
          (cancellingLeave?.employeeName && currentUser?.name && cancellingLeave.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())}
        onClose={() => setCancellingLeave(null)}
        onConfirm={async (reason) => {
          if (cancellingLeave?._id) {
            await updateLeaveStatus(cancellingLeave._id, 'cancelled', reason);
          }
        }}
      />
    </div>
  );
};
