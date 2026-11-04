import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

/**
 * Universal Reusable Pagination Component
 * 
 * @param {number} currentPage - Active 1-based page number
 * @param {number} totalPages - Total calculated pages
 * @param {number} pageSize - Entries per page
 * @param {number} totalEntries - Total records matching current filter
 * @param {function} onPageChange - Callback when page changes (newPage: number) => void
 * @param {function} onPageSizeChange - Optional callback when page size changes (newSize: number) => void
 * @param {number[]} pageSizeOptions - Options for page size dropdown (default: [10, 25, 50, 100])
 * @param {boolean} showPageSizeSelect - Whether to display items-per-page selector (default: true)
 * @param {string} className - Optional container styling classes
 */
export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  totalEntries = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelect = true,
  className = ''
}) => {
  if (totalEntries === 0) return null;

  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);

  // Generate page numbers with smart ellipsis (e.g. 1 ... 4 5 6 ... 12)
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (validCurrentPage > 3) {
      pages.push('ellipsis-start');
    }

    const start = Math.max(2, validCurrentPage - 1);
    const end = Math.min(totalPages - 1, validCurrentPage + 1);

    for (let i = start; i <= end; i++) {
      if (i > 1 && i < totalPages) {
        pages.push(i);
      }
    }

    if (validCurrentPage < totalPages - 2) {
      pages.push('ellipsis-end');
    }
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 select-none ${className}`}>
      {/* ── Left: Entries Counter & Optional Page Size ── */}
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="font-semibold text-slate-900 dark:text-slate-100">{totalEntries > 0 ? startIndex + 1 : 0}</strong> to{' '}
          <strong className="font-semibold text-slate-900 dark:text-slate-100">{endIndex}</strong> of{' '}
          <strong className="font-semibold text-slate-900 dark:text-slate-100">{totalEntries}</strong> entries
        </span>

        {showPageSizeSelect && onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
            <label htmlFor="pagination-page-size" className="text-slate-500 dark:text-slate-400">
              Per page:
            </label>
            <select
              id="pagination-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Right: Navigation Controls ── */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={validCurrentPage === 1}
          title="First Page"
          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(validCurrentPage - 1)}
          disabled={validCurrentPage === 1}
          title="Previous Page"
          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === 'ellipsis-start' || p === 'ellipsis-end') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-slate-400 dark:text-slate-500 font-semibold"
                >
                  …
                </span>
              );
            }

            const isActive = validCurrentPage === p;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-2 rounded text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(validCurrentPage + 1)}
          disabled={validCurrentPage === totalPages}
          title="Next Page"
          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={validCurrentPage === totalPages}
          title="Last Page"
          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

