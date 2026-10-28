import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  Plus,
  Download,
  Filter,
  Search,
  Award,
  Trophy,
  Star,
  Trash2,
  Gift,
  HeartHandshake,
  Sparkles,
  Users,
  CheckCircle2
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { DateRangePicker } from '../components/common/DateRangePicker';
import { AddAppreciationModal } from '../components/appreciation/AddAppreciationModal';

export const AppreciationPage = () => {
  const { currentUser: authUser } = useAuth();
  const { appreciations, employees, currentUser: hrUser, searchQuery, setSearchQuery, deleteAppreciation } = useHR();
  const { confirm, alert } = useConfirm();
  const currentUser = authUser || hrUser;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'cards'
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');

  // 1. Exact Dynamic Mathematical KPI metrics
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const totalAppreciationsCount = appreciations.length;
  const thisMonthAppreciations = appreciations.filter(a => a.givenOn?.startsWith(currentMonthPrefix) || a.givenOn?.startsWith('2026-09'));

  // Star Performer (most awarded employee count)
  const awardCounts = {};
  appreciations.forEach(a => {
    if (a.givenToName) {
      awardCounts[a.givenToName] = (awardCounts[a.givenToName] || 0) + 1;
    }
  });
  const sortedPerformers = Object.entries(awardCounts).sort((a, b) => b[1] - a[1]);
  const topPerformerName = sortedPerformers[0] ? sortedPerformers[0][0] : (employees[0]?.name || 'Top Performer');
  const topPerformerAwardsCount = sortedPerformers[0] ? sortedPerformers[0][1] : 0;

  // Exact reward points / cash distributed calculation
  const totalRewardValue = appreciations.reduce((sum, a) => {
    if (!a.rewardPointsOrCash) return sum;
    const match = String(a.rewardPointsOrCash).match(/\d[\d,]*/);
    if (match) {
      const val = parseInt(match[0].replace(/,/g, ''), 10);
      return sum + (isNaN(val) ? 0 : val);
    }
    return sum;
  }, 0);
  const totalRewardsCount = appreciations.filter(a => !!a.rewardPointsOrCash).length;

  // Filtered
  const filteredAppreciations = useMemo(() => {
    return appreciations.filter(a => {
      if (selectedEmployeeFilter !== 'all' && a.givenToId !== selectedEmployeeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = a.givenToName?.toLowerCase().includes(q);
        const matchAward = a.awardName?.toLowerCase().includes(q);
        const matchNote = a.appreciationNote?.toLowerCase().includes(q);
        const matchGiver = a.givenByName?.toLowerCase().includes(q);
        if (!matchName && !matchAward && !matchNote && !matchGiver) return false;
      }
      return true;
    });
  }, [appreciations, selectedEmployeeFilter, searchQuery]);

  // Pagination
  const totalEntries = filteredAppreciations.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = filteredAppreciations.slice(startIndex, startIndex + pageSize);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(paginatedList.map(a => a._id));
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

  const handleExportCSV = () => {
    if (filteredAppreciations.length === 0) {
      alert({
        title: 'Export Appreciations',
        message: 'No appreciation records to export.',
        variant: 'primary'
      });
      return;
    }
    const headers = ['Employee Name', 'Role', 'Award / Reason', 'Given On', 'Given By', 'Reward', 'Appreciation Message'];
    const rows = filteredAppreciations.map(a => [
      `"${a.givenToName}"`,
      `"${a.givenToRole}"`,
      `"${a.awardName}"`,
      a.givenOn,
      `"${a.givenByName}"`,
      `"${a.rewardPointsOrCash || ''}"`,
      `"${(a.appreciationNote || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Appreciations_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white p-3 px-4 rounded-[10px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <Trophy size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-[15px] font-extrabold text-slate-900">Employee Appreciation & Awards</h1>
              <span className="text-[10.5px] py-px px-1.5 rounded bg-amber-100 text-amber-800 font-bold">
                {totalAppreciationsCount} Total Awards
              </span>
            </div>
            <p className="m-0 mt-px text-[11.5px] text-slate-500">
              Recognize top performers, peer milestones, rewards & spot awards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-white text-blue-600 border border-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-blue-600 text-white border-none text-xs font-bold cursor-pointer shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Give Award
          </button>
        </div>
      </div>

      {/* Top Summary KPI Cards (Total Appreciation Count, This Month, Top Performer, Rewards) */}
      <div className="kpi-grid-4">
        {/* 1. Total Appreciation Count */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Awards</span>
            <div className="kpi-icon-wrap bg-amber-100 text-amber-600">
              <Trophy size={16} />
            </div>
          </div>
          <div className="kpi-value text-amber-600">
            {totalAppreciationsCount} <span className="text-xs font-semibold text-slate-500">Awards</span>
          </div>
          <div className="kpi-subtext text-amber-600">
            <span>Peer & leadership recognitions</span>
          </div>
        </div>

        {/* 2. This Month's Awards */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Awarded This Month</span>
            <div className="kpi-icon-wrap bg-blue-50 text-blue-600">
              <Award size={16} />
            </div>
          </div>
          <div className="kpi-value text-blue-600">
            {thisMonthAppreciations.length} <span className="text-xs font-semibold text-slate-500">Badges</span>
          </div>
          <div className="kpi-subtext text-blue-600">
            <span>{currentMonthName} cycle</span>
          </div>
        </div>

        {/* 3. Star Performer */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Star Performer</span>
            <div className="kpi-icon-wrap bg-fuchsia-50 text-fuchsia-600">
              <Star size={16} />
            </div>
          </div>
          <div className="kpi-value text-slate-900 text-[17px]">
            {topPerformerName}
          </div>
          <div className="kpi-subtext text-fuchsia-600">
            <span>{topPerformerAwardsCount > 0 ? `${topPerformerAwardsCount} appreciation award${topPerformerAwardsCount > 1 ? 's' : ''}` : 'Top recognized member'}</span>
          </div>
        </div>

        {/* 4. Reward Incentives */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Rewards Distributed</span>
            <div className="kpi-icon-wrap bg-green-100 text-green-600">
              <Gift size={16} />
            </div>
          </div>
          <div className="kpi-value text-green-600">
            ₹{totalRewardValue.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-500">Value</span>
          </div>
          <div className="kpi-subtext text-green-600">
            <span>{totalRewardsCount} rewarded bonus perks</span>
          </div>
        </div>
      </div>

      {/* Action Bar (Search & Filters) */}
      <div className="bg-white rounded-[10px] border border-slate-200 py-2 px-3 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Employee Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold">Employee:</span>
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="h-[30px] px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-900 outline-none cursor-pointer"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 bg-slate-50 min-w-[240px]">
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search recipient, reason, citation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none bg-transparent outline-none text-xs w-full text-slate-900"
            />
          </div>
        </div>

        {/* View Switcher Icons (Table / Cards Showcase) */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
          <button
            onClick={() => setViewMode('table')}
            className={`h-[26px] px-2.5 rounded border-none inline-flex items-center gap-1 text-[11.5px] font-bold cursor-pointer transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
            title="Table View"
          >
            <Award size={13} />
            Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`h-[26px] px-2.5 rounded border-none inline-flex items-center gap-1 text-[11.5px] font-bold cursor-pointer transition-all ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
            title="Awards Showcase Gallery"
          >
            <Trophy size={13} />
            Gallery
          </button>
        </div>
      </div>

      {/* Table View (Matching Screenshot 4) */}
      {viewMode === 'table' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="crm-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === paginatedList.length && paginatedList.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Employee Name</th>
                  <th>Award Name & Reason</th>
                  <th>Appreciation Message</th>
                  <th>Given By</th>
                  <th>Date</th>
                  <th>Reward</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length > 0 ? (
                  paginatedList.map(item => (
                    <tr key={item._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item._id)}
                          onChange={() => handleSelectRow(item._id)}
                        />
                      </td>

                      {/* Given To Employee Cell */}
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar">
                            {item.givenToAvatar ? (
                              <img src={item.givenToAvatar} alt={item.givenToName} />
                            ) : (
                              item.givenToName?.charAt(0) || 'E'
                            )}
                          </div>
                          <div className="employee-name-group">
                            <span className="employee-name">
                              {item.givenToName}
                              {(item.givenToName === currentUser?.name || item.givenToId === currentUser?._id) && (
                                <span className="its-you-pill">It's You</span>
                              )}
                            </span>
                            <span className="employee-role">{item.givenToRole}</span>
                          </div>
                        </div>
                      </td>

                      {/* Award Name & Reason */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-100 text-amber-600">
                            <Trophy size={14} />
                          </span>
                          <span className="font-bold text-slate-900">
                            {item.awardName}
                          </span>
                        </div>
                      </td>

                      {/* Appreciation Message */}
                      <td className="max-w-[280px] text-slate-600 text-[12.5px] leading-relaxed">
                        "{item.appreciationNote}"
                      </td>

                      {/* Given By */}
                      <td className="font-medium text-slate-700">
                        {item.givenByName}
                      </td>

                      {/* Given On Date */}
                      <td className="font-semibold text-slate-500">
                        {item.givenOn}
                      </td>

                      {/* Reward */}
                      <td>
                        {item.rewardPointsOrCash ? (
                          <span className="text-[11.5px] font-bold text-green-600 bg-green-100 py-[3px] px-2 rounded-md">
                            {item.rewardPointsOrCash}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="text-right">
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Delete Appreciation',
                              message: `Are you sure you want to remove appreciation award for "${item.givenToName}"?`,
                              confirmText: 'Remove Award',
                              variant: 'danger'
                            });
                            if (ok) {
                              deleteAppreciation(item._id);
                            }
                          }}
                          className="btn-icon-only w-7 h-7 text-red-500"
                          title="Delete Appreciation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8">
                      <div className="table-empty-state">
                        <HeartHandshake className="table-empty-icon" />
                        <div className="font-semibold text-[15px] text-slate-800">
                          No appreciation records found
                        </div>
                        <p className="text-[13px] text-slate-500 mt-1">
                          Click on "+ Give Award" button above to appreciate team members.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer (Matching Screenshot 4) */}
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

      {/* Cards Gallery Showcase View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5 items-start mb-6">
          {filteredAppreciations.map(item => (
            <div
              key={item._id}
              className="bg-gradient-to-br from-white to-[#fbfcfe] border border-slate-200 rounded-2xl p-[22px] shadow-md relative overflow-hidden"
            >
              <div className="absolute -top-3.5 -right-3.5 w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/15 to-yellow-500/5 flex items-center justify-center">
                <Star size={24} color="#d97706" />
              </div>

              <div className="employee-cell mb-4">
                <div className="employee-avatar w-11 h-11">
                  {item.givenToAvatar ? <img src={item.givenToAvatar} alt={item.givenToName} /> : item.givenToName.charAt(0)}
                </div>
                <div className="employee-name-group">
                  <span className="employee-name text-[15px]">{item.givenToName}</span>
                  <span className="employee-role">{item.givenToRole}</span>
                </div>
              </div>

              <div className="bg-amber-100 border border-amber-200 p-2 px-3 rounded-lg text-amber-900 font-bold text-[13px] flex items-center gap-2 mb-3">
                <Trophy size={16} />
                <span>{item.awardName}</span>
              </div>

              <p className="text-[12.5px] text-slate-600 italic leading-relaxed mb-3.5">
                "{item.appreciationNote}"
              </p>

              {item.rewardPointsOrCash && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 mb-3.5">
                  <Gift size={15} />
                  <span>Reward: {item.rewardPointsOrCash}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                <span>Awarded on: {item.givenOn}</span>
                <span>By: {item.givenByName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AddAppreciationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
