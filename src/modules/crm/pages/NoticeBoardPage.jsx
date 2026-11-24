/**
 * @file NoticeBoardPage.jsx
 * @description Company-wide Notice Board module with Expiry Tracking,
 * Active vs Expired Tabs, Employee Acknowledgment and HR Compliance Read Receipts.
 */

import React, { useState, useMemo } from 'react';
import {
  BellRing,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Clock,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useToast } from '../../../shared/context/ToastContext';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { canPostNotices, canDeleteNotice, isHRorAdmin, canExportData } from '../../../shared/utils/permissionUtils';
import { matchesDateRange, matchesSearch } from '../../../shared/utils/filterUtils';
import { AddNoticeModal } from '../../../shared/components/modals/AddNoticeModal';
import { NoticeDetailModal } from '../../../shared/components/modals/NoticeDetailModal';
import { ResponsiveDurationFilter } from '../../../shared/components/common/ResponsiveDurationFilter';
import { getLocalDateString } from '../../../shared/utils/timerUtils';
import { exportToCSV } from '../../../shared/utils/exportUtils';

export const NoticeBoardPage = () => {
  const { notices, deleteNotice, acknowledgeNotice } = useCRM();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { currentUser } = useAuth();
  const canExport = useMemo(() => canExportData(currentUser, 'notices'), [currentUser]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [statusTab, setStatusTab] = useState('active'); // 'active' | 'expired' | 'all'

  // Filters
  const [search, setSearch] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  const isPrivileged = isHRorAdmin(currentUser);
  const userDept = (currentUser?.department || '').toLowerCase().trim();
  const userRole = (currentUser?.role || '').toLowerCase().trim();
  const userName = (currentUser?.name || '').toLowerCase().trim();
  const userId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || '');
  const userCode = String(currentUser?.employeeCode || '').toUpperCase();
  const todayStr = getLocalDateString();

  const isNoticeExpired = (n) => Boolean(n.expiryDate && n.expiryDate < todayStr);

  // 1. Audience & Privacy scoping for non-admin team members
  const scopedNotices = useMemo(() => {
    return (notices || []).filter(n => {
      if (!isPrivileged) {
        const target = (n.to || n.targetAudience || 'all').toLowerCase().trim();
        const isAuthor =
          (n.postedById && String(n.postedById) === userId) ||
          (n.createdBy && String(n.createdBy) === userId) ||
          (n.postedBy && n.postedBy.toLowerCase().trim() === userName);

        const isTargetedToMe =
          target === 'all' ||
          target === 'all employees' ||
          target === '' ||
          (userDept && target.includes(userDept)) ||
          (userRole && target.includes(userRole));

        if (!isAuthor && !isTargetedToMe) return false;
      }
      return true;
    });
  }, [notices, isPrivileged, userDept, userRole, userName, userId]);

  // Counts for tabs & KPIs
  const activeCount = useMemo(() => scopedNotices.filter(n => !isNoticeExpired(n)).length, [scopedNotices, todayStr]);
  const expiredCount = useMemo(() => scopedNotices.filter(n => isNoticeExpired(n)).length, [scopedNotices, todayStr]);
  const allCount = scopedNotices.length;
  const urgentCount = useMemo(() => scopedNotices.filter(n => !isNoticeExpired(n) && (n.isImportant || n.priority === 'urgent')).length, [scopedNotices, todayStr]);
  const unreadCount = useMemo(() => scopedNotices.filter(n =>
    !isNoticeExpired(n) &&
    !(Array.isArray(n.acknowledgedBy) && (n.acknowledgedBy.includes(userId) || (userCode && n.acknowledgedBy.includes(userCode))))
  ).length, [scopedNotices, todayStr, userId, userCode]);

  // 2. Tab + Search + Date range filtering
  const filteredNotices = useMemo(() => {
    return scopedNotices.filter(n => {
      // Expiry tab
      if (statusTab === 'active' && isNoticeExpired(n)) return false;
      if (statusTab === 'expired' && !isNoticeExpired(n)) return false;

      // Search filter
      const matchSearch = matchesSearch(n, search, [
        'title', 'description', 'shortDescription', 'to', 'targetAudience', 'priority', 'postedBy', 'createdBy'
      ]);

      // Date range filter
      const matchDate = matchesDateRange(n.date || n.createdAt, startDateFilter, endDateFilter);

      return matchSearch && matchDate;
    });
  }, [scopedNotices, statusTab, search, startDateFilter, endDateFilter, todayStr]);

  // Sort pinned/urgent notices to the top, then by date descending
  const sortedNotices = useMemo(() => {
    return [...filteredNotices].sort((a, b) => {
      const aUrgent = a.isImportant || a.priority === 'urgent' || a.pinned ? 1 : 0;
      const bUrgent = b.isImportant || b.priority === 'urgent' || b.pinned ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
    });
  }, [filteredNotices]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredNotices.map(item => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteOne = async (notice, e) => {
    if (e) e.stopPropagation();
    if (!canDeleteNotice(currentUser, notice)) {
      addToast('You do not have permission to delete this notice.', 'warning');
      return;
    }
    const ok = await confirm({
      title: 'Delete Company Notice',
      message: `Are you sure you want to permanently delete notice "${notice.title}"? This cannot be undone.`,
      confirmText: 'Delete Notice',
      variant: 'danger'
    });
    if (ok) {
      await deleteNotice(notice._id || notice.id);
      setSelectedIds(prev => prev.filter(id => id !== (notice._id || notice.id)));
      if (selectedNotice && (selectedNotice._id === notice._id || selectedNotice.id === notice.id)) {
        setSelectedNotice(null);
      }
      addToast('Notice removed successfully', 'info');
    }
  };

  const handleBulkDelete = async () => {
    const deletableIds = selectedIds.filter(id => {
      const n = (notices || []).find(item => item._id === id || item.id === id);
      return n ? canDeleteNotice(currentUser, n) : isPrivileged;
    });

    if (deletableIds.length === 0) {
      addToast('You do not have permission to delete the selected notices.', 'warning');
      return;
    }

    const ok = await confirm({
      title: `Delete ${deletableIds.length} Selected Notices`,
      message: `Are you sure you want to permanently delete ${deletableIds.length} selected company notice(s)? This cannot be undone.`,
      confirmText: 'Delete All',
      variant: 'danger'
    });
    if (ok) {
      for (const id of deletableIds) {
        await deleteNotice(id);
      }
      setSelectedIds([]);
      addToast(`${deletableIds.length} notice(s) removed successfully`, 'info');
    }
  };

  const handleExport = () => {
    if (filteredNotices.length === 0) {
      addToast('No notices are available to export for the current filter.', 'info');
      return;
    }

    const headers = ['Notice Title', 'Date', 'Expiry Date', 'To', 'Priority', 'Posted By', 'Status', 'Description'];
    const rows = filteredNotices.map(n => [
      n.title || '',
      n.date || '',
      n.expiryDate || 'N/A',
      n.to || n.targetAudience || 'All Employees',
      n.priority || 'Normal',
      n.postedBy || n.createdBy || '',
      isNoticeExpired(n) ? 'Expired' : 'Active',
      n.description || n.fullContent || ''
    ]);

    exportToCSV(`notice_board_${getLocalDateString()}`, headers, rows);
    addToast('Notices exported successfully to CSV!', 'success');
  };

  return (
    <div className="flex flex-col gap-3">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 px-4 py-3 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <BellRing size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Company Notice Board</h1>
              <span className="text-[10.5px] px-1.5 py-[1px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {activeCount} Active • {expiredCount} Expired
              </span>
            </div>
            <p className="mt-0.5 mb-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Official circulars, company policies, compliance directives & announcements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {canExport && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex-1 sm:flex-initial justify-center"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          )}
          {canPostNotices(currentUser) && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs font-bold cursor-pointer shadow-[0_1px_3px_rgba(37,99,235,0.2)] transition-colors flex-1 sm:flex-initial justify-center"
            >
              <Plus size={14} />
              <span>Publish Notice</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          onClick={() => setStatusTab('active')}
          className={`p-3 rounded-[10px] border cursor-pointer transition-all ${
            statusTab === 'active'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Active Circulars</span>
            <BellRing size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {activeCount}
          </div>
        </div>

        <div
          onClick={() => setStatusTab('active')}
          className="p-3 rounded-[10px] border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>High Priority</span>
            <Flame size={14} className="text-red-500" />
          </div>
          <div className="text-xl font-extrabold text-red-600 dark:text-red-400">
            {urgentCount}
          </div>
        </div>

        <div
          onClick={() => setStatusTab('expired')}
          className={`p-3 rounded-[10px] border cursor-pointer transition-all ${
            statusTab === 'expired'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Expired Archive</span>
            <Clock size={14} className="text-rose-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-700 dark:text-slate-300">
            {expiredCount}
          </div>
        </div>

        <div className="p-3 rounded-[10px] border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Unread by You</span>
            <AlertCircle size={14} className={unreadCount > 0 ? 'text-amber-500' : 'text-emerald-500'} />
          </div>
          <div className={`text-xl font-extrabold ${unreadCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {unreadCount === 0 ? 'All Read ✓' : unreadCount}
          </div>
        </div>
      </div>

      {/* Tabs and Filter Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-2.5 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setStatusTab('active')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              statusTab === 'active'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BellRing size={13} />
            <span>Active Notices</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-extrabold ${
              statusTab === 'active' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('expired')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              statusTab === 'expired'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={13} />
            <span>Expired / Archived</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-extrabold ${
              statusTab === 'expired' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {expiredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              statusTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText size={13} />
            <span>All Circulars</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-extrabold ${
              statusTab === 'all' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {allCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
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

          {/* Search Input */}
          <div className="flex items-center gap-1.5 px-2.5 h-[32px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 w-full sm:w-auto min-w-0 sm:min-w-[200px] flex-1">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search notice topic, audience..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-0 outline-none text-xs w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1 px-2.5 h-[30px] rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 cursor-pointer transition-colors"
            >
              <Trash2 size={13} />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice Board Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider text-left">
                <th className="px-3 py-2.5 w-9 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filteredNotices.length > 0 && selectedIds.length === filteredNotices.length}
                    onChange={handleSelectAll}
                    className="accent-blue-600 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2.5 whitespace-nowrap">Notice Title & Content</th>
                <th className="px-3 py-2.5 w-[140px] whitespace-nowrap">Published & Expiry</th>
                <th className="px-3 py-2.5 w-[140px] whitespace-nowrap">Target Audience</th>
                <th className="px-3 py-2.5 text-center w-[160px] whitespace-nowrap">Read Status & Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedNotices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-9 text-center text-slate-500 dark:text-slate-400">
                    <div className="text-[13px] font-medium">
                      {statusTab === 'expired' ? 'No expired notices in archive' : 'No active notices found'}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedNotices.map((notice, nIdx) => {
                  const expired = isNoticeExpired(notice);
                  const hasAck = Array.isArray(notice.acknowledgedBy) &&
                    (notice.acknowledgedBy.includes(userId) || (userCode && notice.acknowledgedBy.includes(userCode)));

                  return (
                    <tr
                      key={notice._id ? `${notice._id}_${nIdx}` : (notice.id ? `${notice.id}_${nIdx}` : `notice_${nIdx}`)}
                      className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
                        selectedIds.includes(notice._id)
                          ? 'bg-blue-50/40 dark:bg-blue-950/20'
                          : expired
                          ? 'bg-slate-50/40 dark:bg-slate-900/40 opacity-80'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(notice._id)}
                          onChange={() => handleSelectOne(notice._id)}
                          className="accent-blue-600 cursor-pointer"
                        />
                      </td>

                      {/* Notice Subject & Preview */}
                      <td className="px-3 py-2.5">
                        <div
                          onClick={() => setSelectedNotice(notice)}
                          className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer flex items-center gap-1.5 hover:underline flex-wrap"
                        >
                          <span>{notice.title}</span>

                          {expired && (
                            <span className="px-[5px] py-[1px] rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                              EXPIRED
                            </span>
                          )}

                          {(notice.isImportant || notice.priority === 'urgent') && (
                            <span className="px-[5px] py-[1px] rounded text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center gap-0.5">
                              <Flame size={10} />
                              <span>URGENT</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[500px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {notice.description || notice.shortDescription || notice.fullContent}
                        </div>
                      </td>

                      {/* Date & Expiry */}
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {notice.date}
                        </div>
                        {notice.expiryDate && (
                          <div className={`text-[10.5px] mt-0.5 ${
                            expired ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'
                          }`}>
                            {expired ? `⌛ Expired ${notice.expiryDate}` : `Expires: ${notice.expiryDate}`}
                          </div>
                        )}
                      </td>

                      {/* To */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="px-[7px] py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                          {notice.to || notice.targetAudience || 'All Employees'}
                        </span>
                      </td>

                      {/* Action & Acknowledgment */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSelectedNotice(notice)}
                            className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded px-2 py-[3px] cursor-pointer text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                          >
                            View
                          </button>

                          {/* Acknowledge Button / Badge */}
                          {hasAck ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-200 dark:border-emerald-800" title="You read & acknowledged this notice">
                              <CheckCircle2 size={11} />
                              <span>Read</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof acknowledgeNotice === 'function') {
                                  acknowledgeNotice(notice._id || notice.id);
                                  addToast('Notice marked as acknowledged! ✅', 'success');
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-[2.5px] cursor-pointer text-[10.5px] font-bold border-0 shadow-xs transition-colors flex items-center gap-1"
                              title="Mark as Acknowledged / Read"
                            >
                              <CheckCircle2 size={11} />
                              <span>Acknowledge</span>
                            </button>
                          )}

                          {/* Read Count for HR / Admin */}
                          {isPrivileged && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold" title="Total employees who acknowledged">
                              ({notice.acknowledgedBy?.length || 0} read)
                            </span>
                          )}

                          {/* Delete Button for Admin / HR / Notice Creator */}
                          {canDeleteNotice(currentUser, notice) && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteOne(notice, e)}
                              className="border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-rose-600 dark:text-rose-400 rounded px-1.5 py-[3px] cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors flex items-center"
                              title="Delete this notice"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Notice Modal */}
      <AddNoticeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Notice Detail & Compliance Modal */}
      {selectedNotice && (
        <NoticeDetailModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}
    </div>
  );
};
