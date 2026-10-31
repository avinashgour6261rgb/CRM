/**
 * @file NoticeDetailModal.jsx
 * @description Modal showing full content of a company announcement / HR notice.
 */

import React from 'react';
import {
  X,
  Bell,
  Calendar,
  User,
  Tag,
  AlertTriangle
} from 'lucide-react';

export const NoticeDetailModal = ({ notice, onClose }) => {
  if (!notice) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-bold ${
                notice.isImportant 
                  ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' 
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
              }`}>
                {notice.isImportant ? '🔥 High Priority' : '📢 Notice'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {notice.category}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white m-0 leading-snug">
              {notice.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          {/* Metadata bar */}
          <div className="flex items-center justify-between p-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[12.5px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <User size={14} /> Posted By: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{notice.postedBy}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} /> {notice.date}
            </div>
          </div>

          {/* Full Content */}
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-[18px]">
            {notice.fullContent || notice.shortDescription}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="bg-sky-600 hover:bg-sky-700 text-white border-none px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors shadow-sm"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
