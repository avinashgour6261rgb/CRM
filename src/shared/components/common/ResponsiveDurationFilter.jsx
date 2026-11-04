import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X, Check } from 'lucide-react';

/**
 * ResponsiveDurationFilter
 * A modern, responsive duration selector with business period presets
 * (All Time, Today, Yesterday, This Week, This Month, Last Month, This Quarter, This Year, Custom Range).
 * Smoothly collapses on mobile, prevents overflow, and supports instant 1-click filtering.
 */
export const ResponsiveDurationFilter = ({
  startDate = '',
  endDate = '',
  onChange = () => {},
  onClear = () => {},
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('all');
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Keep internal custom inputs in sync with incoming props
  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
    if (!startDate && !endDate) {
      setActivePreset('all');
    }
  }, [startDate, endDate]);

  const formatDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const PRESETS = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_quarter', label: 'This Quarter' },
    { id: 'this_year', label: 'This Year' },
    { id: 'custom', label: 'Custom Date Range' }
  ];

  const handleSelectPreset = (presetId) => {
    setActivePreset(presetId);
    const now = new Date();

    if (presetId === 'all') {
      onChange('', '', 'all');
      setIsOpen(false);
      return;
    }

    if (presetId === 'today') {
      const today = formatDateStr(now);
      onChange(today, today, 'today');
      setIsOpen(false);
      return;
    }

    if (presetId === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDateStr(y);
      onChange(yStr, yStr, 'yesterday');
      setIsOpen(false);
      return;
    }

    if (presetId === 'this_week') {
      const currentDay = now.getDay();
      const diffToMon = (currentDay === 0 ? -6 : 1) - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMon);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      onChange(formatDateStr(monday), formatDateStr(sunday), 'this_week');
      setIsOpen(false);
      return;
    }

    if (presetId === 'this_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onChange(formatDateStr(first), formatDateStr(last), 'this_month');
      setIsOpen(false);
      return;
    }

    if (presetId === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      onChange(formatDateStr(first), formatDateStr(last), 'last_month');
      setIsOpen(false);
      return;
    }

    if (presetId === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const first = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const last = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      onChange(formatDateStr(first), formatDateStr(last), 'this_quarter');
      setIsOpen(false);
      return;
    }

    if (presetId === 'this_year') {
      const first = new Date(now.getFullYear(), 0, 1);
      const last = new Date(now.getFullYear(), 11, 31);
      onChange(formatDateStr(first), formatDateStr(last), 'this_year');
      setIsOpen(false);
      return;
    }

    // For custom, keep open so user can pick start & end dates
  };

  const handleApplyCustom = () => {
    if (!customStart && !customEnd) {
      handleSelectPreset('all');
      return;
    }
    onChange(customStart, customEnd || customStart, 'custom');
    setActivePreset('custom');
    setIsOpen(false);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    setActivePreset('all');
    setCustomStart('');
    setCustomEnd('');
    onClear();
    onChange('', '', 'all');
    setIsOpen(false);
  };

  const hasFilterActive = Boolean(startDate || endDate);

  // Label display logic
  let labelText = 'All Time';
  const foundPreset = PRESETS.find(p => p.id === activePreset);
  if (foundPreset && activePreset !== 'custom' && activePreset !== 'all') {
    labelText = foundPreset.label;
  } else if (hasFilterActive) {
    if (startDate && endDate && startDate === endDate) {
      labelText = startDate;
    } else if (startDate && endDate) {
      labelText = `${startDate} ~ ${endDate}`;
    } else if (startDate) {
      labelText = `From ${startDate}`;
    } else if (endDate) {
      labelText = `Until ${endDate}`;
    }
  }

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 h-[30px] px-2.5 rounded-md border text-xs font-semibold cursor-pointer select-none transition-all ${
          hasFilterActive
            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-2xs'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
        }`}
        title="Filter by period or date range"
      >
        <Calendar size={13} className={hasFilterActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden xs:inline">
          Duration:
        </span>
        <span className="font-bold truncate max-w-[120px] sm:max-w-[160px]">
          {labelText}
        </span>
        {hasFilterActive ? (
          <button
            type="button"
            onClick={handleClearAll}
            className="w-4 h-4 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-200/50 dark:hover:bg-blue-900/60 p-0 ml-0.5"
            title="Reset duration filter"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        ) : (
          <ChevronDown size={12} className={`text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-[34px] left-0 sm:left-auto right-auto sm:right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xl z-[150] w-[275px] max-w-[calc(100vw-32px)] flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Select Duration Period
            </span>
            {hasFilterActive && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer p-0"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Quick Presets Grid */}
          <div className="grid grid-cols-2 gap-1">
            {PRESETS.map((p) => {
              const isSelected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`py-1.5 px-2 rounded-md text-[11px] text-left font-semibold transition-all flex items-center justify-between cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{p.label}</span>
                  {isSelected && <Check size={11} className="text-blue-600 dark:text-blue-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Inputs */}
          {activePreset === 'custom' && (
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full h-[28px] px-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full h-[28px] px-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 h-[26px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  className="px-3 h-[26px] rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Apply Range
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

