/**
 * @file NoticeBoardPage.jsx
 * @description Company-wide Notice Board module matching Screenshot 5 exactly.
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
  FileText
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useToast } from '../../../shared/context/ToastContext';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { AddNoticeModal } from '../../../shared/components/modals/AddNoticeModal';

export const NoticeBoardPage = () => {
  const { notices, deleteNotice } = useCRM();
  const { addToast } = useToast();
  const { confirm, alert } = useConfirm();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredNotices = useMemo(() => {
    return notices.filter(n => {
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        (n.title || '').toLowerCase().includes(q) ||
        (n.description || '').toLowerCase().includes(q) ||
        (n.shortDescription || '').toLowerCase().includes(q) ||
        (n.to || '').toLowerCase().includes(q);

      let matchesDate = true;
      if (startDateFilter && n.date && n.date < startDateFilter) matchesDate = false;
      if (endDateFilter && n.date && n.date > endDateFilter) matchesDate = false;

      return matchesSearch && matchesDate;
    });
  }, [notices, search, startDateFilter, endDateFilter]);

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

  const handleExport = () => {
    if (filteredNotices.length === 0) {
      alert({
        title: 'Export Notices',
        message: 'No notices are available to export for the current filter.',
        variant: 'info'
      });
      return;
    }

    const headers = ['Notice Title,Date,To,Priority,Posted By,Description'];
    const rows = filteredNotices.map(n =>
      `"${(n.title || '').replace(/"/g, '""')}","${n.date || ''}","${n.to || n.targetAudience || 'All Employees'}","${n.priority || 'Normal'}","${n.postedBy || n.createdBy || ''}","${(n.description || n.fullContent || '').replace(/"/g, '""')}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `notice_board_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                {filteredNotices.length} Active Notices
              </span>
            </div>
            <p className="mt-0.5 mb-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Official circulars, company policies & urgent announcements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs font-bold cursor-pointer shadow-[0_1px_3px_rgba(37,99,235,0.2)] transition-colors"
          >
            <Plus size={14} />
            <span>Publish Notice</span>
          </button>
        </div>
      </div>

      {/* Filter and Top Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5 flex-wrap">
          
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
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                className="border-0 bg-transparent outline-none text-[11.5px] text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 min-w-[220px]">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search notice topic, audience..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-0 outline-none text-xs w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <span className="text-[11.5px] text-blue-600 dark:text-blue-400 font-bold">
            {selectedIds.length} notices selected
          </span>
        )}
      </div>

      {/* Notice Board Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider text-left">
                <th className="px-3 py-2 w-9 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filteredNotices.length > 0 && selectedIds.length === filteredNotices.length}
                    onChange={handleSelectAll}
                    className="accent-blue-600 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2 whitespace-nowrap">Notice Title & Content</th>
                <th className="px-3 py-2 w-[120px] whitespace-nowrap">Date</th>
                <th className="px-3 py-2 w-[150px] whitespace-nowrap">Target Audience</th>
                <th className="px-3 py-2 text-center w-[90px] whitespace-nowrap">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-9 text-center text-slate-500 dark:text-slate-400">
                    <div className="text-[13px] font-medium">No notices found</div>
                  </td>
                </tr>
              ) : (
                filteredNotices.map(notice => (
                  <tr
                    key={notice._id}
                    className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
                      selectedIds.includes(notice._id)
                        ? 'bg-blue-50/40 dark:bg-blue-950/20'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-[7px] whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(notice._id)}
                        onChange={() => handleSelectOne(notice._id)}
                        className="accent-blue-600 cursor-pointer"
                      />
                    </td>

                    {/* Notice Subject & Preview */}
                    <td className="px-3 py-[7px]">
                      <div
                        onClick={() => setSelectedNotice(notice)}
                        className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer flex items-center gap-1.5"
                      >
                        {notice.title}
                        {notice.isImportant && (
                          <span className="px-[5px] py-[1px] rounded text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[600px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {notice.description || notice.shortDescription || notice.fullContent}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-[7px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                      {notice.date}
                    </td>

                    {/* To */}
                    <td className="px-3 py-[7px] whitespace-nowrap">
                      <span className="px-[7px] py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                        {notice.to || notice.targetAudience || 'All Employees'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-3 py-[7px] text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedNotice(notice)}
                        className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded px-2 py-[3px] cursor-pointer text-blue-600 dark:text-blue-400 text-[11.5px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                      >
                        View Notice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span>Show</span>
            <select className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11.5px] text-slate-700 dark:text-slate-300 outline-none">
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>entries</span>
          </div>

          <div>
            Showing 1 to {filteredNotices.length} of {notices.length} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled
              className="px-2 py-[3px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[11.5px] cursor-not-allowed"
            >
              Prev
            </button>
            <button
              className="px-2 py-[3px] rounded border border-blue-600 bg-blue-600 text-white text-[11.5px] font-bold cursor-pointer"
            >
              1
            </button>
            <button
              disabled
              className="px-2 py-[3px] rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[11.5px] cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddNoticeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[1000] p-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[560px] p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[11.5px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  {selectedNotice.category || 'Company Notice'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Posted on {selectedNotice.date}
                </span>
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                className="bg-transparent border-0 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer p-0"
              >
                <X size={18} />
              </button>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0 mb-3">
              {selectedNotice.title}
            </h3>

            <div className="p-4 rounded-[10px] bg-slate-50 dark:bg-slate-800/60 text-[13.5px] text-slate-800 dark:text-slate-200 leading-relaxed border border-slate-200 dark:border-slate-700/60 mb-[18px] whitespace-pre-wrap">
              {selectedNotice.description || selectedNotice.fullContent || selectedNotice.shortDescription}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Target: <strong className="text-slate-800 dark:text-slate-200">{selectedNotice.to || 'All Employees'}</strong></span>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Delete Company Notice',
                    message: `Are you sure you want to permanently delete notice "${selectedNotice.title}"? This cannot be undone.`,
                    confirmText: 'Delete Notice',
                    variant: 'danger'
                  });
                  if (ok) {
                    deleteNotice(selectedNotice._id);
                    setSelectedNotice(null);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                <Trash2 size={13} />
                Delete Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
