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
  Trash2,
  FileText
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { DateRangePicker } from '../components/common/DateRangePicker';
import { NewLeaveModal } from '../components/leaves/NewLeaveModal';
import { LeaveDetailModal } from '../components/leaves/LeaveDetailModal';
import { RejectLeaveModal } from '../../../shared/components/modals/RejectLeaveModal';
import { CancelLeaveModal } from '../../../shared/components/modals/CancelLeaveModal';
import { ResignationsListPanel } from '../components/resignations/ResignationsListPanel';
import { canApproveLeaves, isHRorAdmin, isAdmin, getUserModulePermissions, canCancelLeave, canReviewLeave, isLeaveApplicant, isLeaveDesignatedApprover } from '../../../shared/utils/permissionUtils';
import { matchesFilter, matchesSearch } from '../../../shared/utils/filterUtils';

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
    deleteLeave,
    resignations
  } = useHR();
  const currentUser = authUser || hrUser;

  const [pageTab, setPageTab] = useState('leaves'); // 'leaves' | 'resignations'
  const pendingResignationsCount = (resignations || []).filter(r => r.status === 'pending').length;

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
      if (isPrivileged && filterEmployee !== 'all') {
        const matchEmp =
          matchesFilter(leave.employeeId, filterEmployee) ||
          matchesFilter(leave.employee, filterEmployee) ||
          matchesFilter(leave.employeeCode, filterEmployee) ||
          matchesFilter(leave.employeeName, filterEmployee);
        if (!matchEmp) return false;
      }
      if (filterType !== 'all') {
        if (!matchesFilter(leave.leaveType, filterType)) return false;
      }
      if (filterStatus !== 'all') {
        if (!matchesFilter(leave.status, filterStatus)) return false;
      }
      if (searchQuery && searchQuery.trim()) {
        if (!matchesSearch(leave, searchQuery, ['employeeName', 'employeeRole', 'leaveType', 'reason', 'employeeCode'])) {
          return false;
        }
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
    <div className="flex flex-col gap-3.5 min-h-full pb-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Palmtree size={17} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight">
              Leave Management & Approvals
            </h1>
            <p className="m-0 mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
              Apply for leaves, track approval workflows, and view leave balances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewLeaveOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-emerald-600 text-white border-none text-xs font-bold cursor-pointer shadow-sm hover:bg-emerald-700 transition-colors"
            title="Apply for a new leave"
          >
            <Plus size={13} />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher: Leaves & Time-off vs Resignations & Offboarding */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setPageTab('leaves')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            pageTab === 'leaves'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Palmtree size={14} />
          <span>Leaves & Time-Off</span>
        </button>

        <button
          type="button"
          onClick={() => setPageTab('resignations')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            pageTab === 'resignations'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FileText size={14} />
          <span>Resignations & Offboarding</span>
          {pendingResignationsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black">
              {pendingResignationsCount}
            </span>
          )}
        </button>
      </div>

      {pageTab === 'resignations' ? (
        <ResignationsListPanel />
      ) : (
        <>
          {/* ── 🔔 REAL-TIME LEAVE STATUS DECISION NOTIFICATION BADGE / CARD ── */}
      {myRecentDecisions.length > 0 && (
        <div className="flex flex-col gap-2.5 mb-[18px]">
          {myRecentDecisions.map(dec => (
            <div
              key={dec._id}
              className={`rounded-[10px] p-[14px_18px] flex items-center justify-between flex-wrap gap-3 border-[1.5px] ${dec.status === 'approved' ? 'bg-emerald-50 border-emerald-300 shadow-[0_4px_14px_rgba(16,185,129,0.12)]' : 'bg-rose-50 border-red-300 shadow-[0_4px_14px_rgba(239,68,68,0.12)]'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-[38px] h-[38px] rounded-[10px] text-white flex items-center justify-center shrink-0 ${dec.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`}
                >
                  {dec.status === 'approved' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
                </div>
                <div>
                  <div className={`text-sm font-extrabold ${dec.status === 'approved' ? 'text-emerald-900' : 'text-red-900'}`}>
                    {dec.status === 'approved' ? '🎉 Your Leave Request Has Been Approved!' : '⚠️ Your Leave Request Has Been Declined'}
                  </div>
                  <div className={`text-xs mt-0.5 ${dec.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                    <strong>{dec.leaveType} ({dec.durationText})</strong> • 📅 {dec.startDate} to {dec.endDate}
                    <span className="mx-1.5 opacity-60">•</span>
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
                className={`text-white border-none py-[7px] px-4 rounded-lg text-xs font-bold cursor-pointer shadow-sm hover:opacity-95 transition-opacity ${dec.status === 'approved' ? 'bg-emerald-600' : 'bg-red-600'}`}
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
            <div className="kpi-icon-wrap bg-blue-50 text-blue-600">
              <Palmtree size={18} />
            </div>
          </div>
          <div className="kpi-value">{totalDaysTaken} <span className="text-[15px] font-medium text-slate-500">Days</span></div>
          <div className="kpi-subtext text-slate-500">
            <span>Across all departments</span>
          </div>
        </div>

        {/* 2. Currently on Leave */}
        <div className="kpi-card border-l-4 border-sky-600">
          <div className="kpi-header">
            <span className="kpi-title">On Leave Today</span>
            <div className="kpi-icon-wrap bg-sky-100 text-sky-600">
              <User size={18} />
            </div>
          </div>
          <div className="kpi-value text-sky-600">{employeesCurrentlyOnLeave.length}</div>
          <div className="kpi-subtext text-sky-600">
            <span>{employeesCurrentlyOnLeave.length > 0 ? employeesCurrentlyOnLeave.map(e => e.employeeName).join(', ') : '0 employees on leave today'}</span>
          </div>
        </div>

        {/* 3. Leave Balance */}
        <div className="kpi-card bg-gradient-to-br from-slate-50 to-white">
          <div className="kpi-header">
            <span className="kpi-title">Your Leave Balance</span>
            <div className="kpi-icon-wrap bg-slate-100 text-slate-700">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value text-blue-600">
            {totalBalanceDays} <span className="text-sm font-semibold text-slate-500">Days Left</span>
          </div>
          <div className="kpi-subtext text-[11px] text-slate-600">
            <span>CL: {activeBalance.casual} • SL: {activeBalance.sick} • EL: {activeBalance.earned}</span>
          </div>
        </div>

        {/* 4. Pending Leaves */}
        <div
          onClick={() => setFilterStatus('pending')}
          className={`kpi-card cursor-pointer ${filterStatus === 'pending' ? 'border-l-4 border-amber-600' : ''}`}
        >
          <div className="kpi-header">
            <span className="kpi-title">Pending Leaves</span>
            <div className="kpi-icon-wrap bg-amber-100 text-amber-600">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value text-amber-600">{pendingLeaves.length}</div>
          <div className="kpi-subtext text-amber-600">
            <span>Awaiting HR approval</span>
          </div>
        </div>

        {/* 5. Approved Leaves */}
        <div
          onClick={() => setFilterStatus('approved')}
          className={`kpi-card cursor-pointer ${filterStatus === 'approved' ? 'border-l-4 border-green-600' : ''}`}
        >
          <div className="kpi-header">
            <span className="kpi-title">Approved Leaves</span>
            <div className="kpi-icon-wrap bg-green-100 text-green-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-value text-green-600">{approvedLeaves.length}</div>
          <div className="kpi-subtext text-green-600">
            <span>Sanctioned & logged</span>
          </div>
        </div>

        {/* 6. Rejected Leaves */}
        <div
          onClick={() => setFilterStatus('rejected')}
          className={`kpi-card cursor-pointer ${filterStatus === 'rejected' ? 'border-l-4 border-red-600' : ''}`}
        >
          <div className="kpi-header">
            <span className="kpi-title">Rejected Leaves</span>
            <div className="kpi-icon-wrap bg-red-100 text-red-600">
              <XCircle size={18} />
            </div>
          </div>
          <div className="kpi-value text-red-600">{rejectedLeaves.length}</div>
          <div className="kpi-subtext text-red-600">
            <span>Declined applications</span>
          </div>
        </div>
      </div>

      {/* Currently On Leave Active Pill Widget */}
      {employeesCurrentlyOnLeave.length > 0 && (
        <div className="currently-on-leave-card">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏖️</span>
            <div>
              <div className="font-bold text-[13.5px] text-sky-700">
                Employees Currently On Leave (Today):
              </div>
              <div className="text-xs text-sky-600">
                {employeesCurrentlyOnLeave.map(l => `${l.employeeName} (${l.leaveType} until ${l.endDate})`).join(' • ')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <span className="font-medium text-slate-500">Duration</span>
            <DateRangePicker />
          </div>

          {/* Search Input */}
          <div className="filter-input-wrap">
            <Search size={15} className="filter-input-icon" />
            <input
              type="text"
              className="filter-input min-w-[240px]"
              placeholder="Search employee, reason, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`btn ${showFilterDrawer ? 'btn-primary' : 'btn-outline'} h-9 px-3`}
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 px-5 mb-5 flex gap-4 items-center flex-wrap shadow-sm">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Employee
            </label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="filter-select dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Leave Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
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
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
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
            className="btn btn-outline self-end h-9"
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
                  <th className="w-10">
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
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeaves.length > 0 ? (
                  paginatedLeaves.map((leave) => (
                    <tr
                      key={leave._id}
                      onClick={() => setSelectedLeave(leave)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
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
                      <td className="font-semibold text-slate-800">
                        {leave.startDate}
                        {leave.endDate !== leave.startDate && ` to ${leave.endDate}`}
                      </td>

                      {/* Duration */}
                      <td>
                        <span className="text-xs text-slate-600 bg-slate-100 py-[3px] px-2 rounded-md font-semibold">
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
                      <td className="font-medium text-slate-700">
                        {leave.leaveType}
                      </td>

                      {/* Reviewer / Approver & Audit Trail */}
                      <td>
                        <div className="text-[12.5px] text-slate-900 font-semibold">
                          {leave.appliedToName || leave.approvedBy || leave.rejectedBy || leave.actionBy || 'HR Admin'}
                        </div>
                        {leave.status === 'approved' && (
                          <span className="text-[11px] text-green-600 block mt-0.5">
                            ✓ Approved by {leave.approvedBy || leave.actionBy || 'Admin'}
                            {leave.actionDateFormatted && <span className="text-slate-500"> • {leave.actionDateFormatted}</span>}
                          </span>
                        )}
                        {leave.status === 'rejected' && (
                          <div className="mt-0.5">
                            <span className="text-[11px] text-red-600 block">
                              ✕ Denied by {leave.rejectedBy || leave.actionBy || 'Admin'}
                              {leave.actionDateFormatted && <span className="text-slate-500"> • {leave.actionDateFormatted}</span>}
                            </span>
                            {leave.rejectionReason && (
                              <span className="text-[10.5px] text-red-800 block italic">
                                "{leave.rejectionReason}"
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Paid */}
                      <td>
                        <span className={`font-semibold text-xs ${leave.isPaid ? 'text-green-600' : 'text-slate-500'}`}>
                          {leave.isPaid ? 'Yes' : 'No'}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-slate-500 text-[12.5px]" title={leave.reason}>
                        {leave.reason || '—'}
                      </td>

                      {/* Actions */}
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          {(() => {
                            const isApplicant = isLeaveApplicant(leave, currentUser);
                            const canReview = canReviewLeave(leave, currentUser);
                            const canCancel = canCancelLeave(leave, currentUser);

                            if (leave.status === 'pending' && canReview) {
                              return (
                                <div className="inline-flex gap-1">
                                  <button
                                    onClick={() => updateLeaveStatus(leave._id, 'approved')}
                                    className="inline-flex items-center gap-0.5 py-1 px-2 rounded-md bg-green-100 text-green-700 border border-green-200 text-[11.5px] font-bold cursor-pointer hover:bg-green-200 transition-colors"
                                    title="Accept / Approve Leave"
                                  >
                                    <Check size={13} /> Accept
                                  </button>
                                  <button
                                    onClick={() => setRejectingLeave(leave)}
                                    className="inline-flex items-center gap-0.5 py-1 px-2 rounded-md bg-red-100 text-red-600 border border-red-200 text-[11.5px] font-bold cursor-pointer hover:bg-red-200 transition-colors"
                                    title="Deny / Reject Leave"
                                  >
                                    <X size={13} /> Deny
                                  </button>
                                </div>
                              );
                            }

                            if (leave.status === 'pending' && isApplicant) {
                              return (
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="text-[11px] text-amber-600 bg-amber-100 border border-amber-200 py-0.5 px-[7px] rounded-[5px] font-bold">
                                    ⏳ Awaiting Review
                                  </span>
                                  <button
                                    onClick={() => setCancellingLeave(leave)}
                                    className="inline-flex items-center gap-0.5 py-[3px] px-[7px] rounded-[5px] bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold cursor-pointer hover:bg-red-200 transition-colors"
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
                                  className="inline-flex items-center gap-0.5 py-1 px-2 rounded-md bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold cursor-pointer hover:bg-red-200 transition-colors"
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
                            className="btn-icon-only w-7 h-7"
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
                        <div className="font-semibold text-[15px] text-slate-800">
                          No leave applications found
                        </div>
                        <p className="text-[13px] text-slate-500 mt-1">
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
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="filter-select h-[30px] pr-6 pl-2 text-xs"
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 items-start mb-6">
          {filteredLeaves.map(leave => (
            <div
              key={leave._id}
              onClick={() => setSelectedLeave(leave)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-[18px] shadow-sm cursor-pointer transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-3">
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

              <div className="text-[13px] text-slate-700 dark:text-slate-200 font-semibold mb-1.5">{leave.leaveType} ({leave.durationText})</div>
              <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-2.5">📅 {leave.startDate} to {leave.endDate}</div>
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2 px-2.5 rounded-md">"{leave.reason}"</p>

              {(() => {
                const isApplicant = isLeaveApplicant(leave, currentUser);
                const canReview = canReviewLeave(leave, currentUser);
                const canCancel = canCancelLeave(leave, currentUser);

                if (leave.status === 'pending' && canReview) {
                  return (
                    <div className="flex justify-end gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setRejectingLeave(leave)}
                        className="btn btn-outline h-7 px-2.5 text-[11.5px] text-red-500 border-red-200 hover:bg-red-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => updateLeaveStatus(leave._id, 'approved')}
                        className="btn btn-primary h-7 px-3 text-[11.5px] bg-green-600 border-green-600 hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </div>
                  );
                }

                if (leave.status === 'pending' && isApplicant) {
                  return (
                    <div className="flex justify-between items-center mt-3 border-t border-slate-100 pt-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-amber-600 font-bold">
                        ⏳ Pending Approval
                      </span>
                      <button
                        onClick={() => setCancellingLeave(leave)}
                        className="btn btn-outline h-[26px] px-2.5 text-[11px] text-red-600 border-red-300 bg-red-50 hover:bg-red-100"
                      >
                        Cancel Request
                      </button>
                    </div>
                  );
                }

                if (leave.status === 'approved') {
                  return (
                    <div className="flex items-center justify-between mt-3 border-t border-slate-100 pt-2" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[11.5px] text-green-600 font-semibold">
                        ✓ Approved by {leave.approvedBy || leave.actionBy || 'Admin'}{leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}
                      </div>
                      {canCancel && (
                        <button
                          onClick={() => setCancellingLeave(leave)}
                          className="inline-flex items-center gap-0.5 py-[3px] px-2 rounded-[5px] bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold cursor-pointer hover:bg-red-200 transition-colors"
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
                    <div className="mt-3 border-t border-slate-100 pt-2 text-[11.5px] text-red-600">
                      <div className="font-semibold">✕ Denied by {leave.rejectedBy || leave.actionBy || 'Admin'}{leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}</div>
                      {leave.rejectionReason && <div className="text-red-800 italic mt-0.5 text-[11px]">"{leave.rejectionReason}"</div>}
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
        <div className="table-card p-6">
          <h3 className="text-base font-bold mb-4">{currentMonthCalendar.monthTitle} Leaves Calendar</h3>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center font-semibold text-slate-500 text-xs pb-2">{day}</div>
            ))}
            {currentMonthCalendar.days.map(({ dayNum, dayStr }) => {
              const dayLeaves = leaves.filter(l => l.startDate <= dayStr && l.endDate >= dayStr);
              return (
                <div
                  key={dayNum}
                  className={`min-h-[80px] border border-slate-100 dark:border-slate-800 rounded-lg p-1.5 ${dayLeaves.length > 0 ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-white dark:bg-slate-900'}`}
                >
                  <div className="text-[11px] font-bold text-slate-500">{dayNum}</div>
                  {dayLeaves.map(dl => (
                    <div
                      key={dl._id}
                      onClick={() => setSelectedLeave(dl)}
                      className={`text-[10.5px] font-semibold py-0.5 px-1 rounded mt-1 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis ${dl.status === 'approved' ? 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60' : 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60'}`}
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
      </>
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
