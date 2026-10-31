import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { useHR } from '../../context/HRContext';

export const DateRangePicker = () => {
  const { dateRange, setDateRange } = useHR();
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = (e) => {
    e.stopPropagation();
    setDateRange({ startDate: '', endDate: '' });
  };

  const hasValue = dateRange.startDate || dateRange.endDate;

  const displayLabel = hasValue
    ? `${dateRange.startDate || 'Start'} to ${dateRange.endDate || 'End'}`
    : 'Start Date To End Date';

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 h-9 px-3 rounded-lg text-[13px] cursor-pointer select-none min-w-[220px] justify-between border ${
          hasValue
            ? 'bg-blue-50 border-blue-300 text-blue-800'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar size={15} color={hasValue ? '#2563eb' : '#94a3b8'} />
          <span className={hasValue ? 'font-semibold' : 'font-normal'}>{displayLabel}</span>
        </div>
        {hasValue && (
          <button
            onClick={handleClear}
            className="bg-transparent border-0 text-blue-500 cursor-pointer flex p-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-[42px] left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-50 w-[280px] flex flex-col gap-3 animate-[fadeIn_0.15s_ease]">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full h-[34px] px-2 border border-slate-300 rounded-md text-[13px] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full h-[34px] px-2 border border-slate-300 rounded-md text-[13px] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 mt-1.5">
            <button
              onClick={() => {
                setDateRange({ startDate: '', endDate: '' });
                setIsOpen(false);
              }}
              className="btn btn-outline h-[30px] px-2.5 text-xs"
            >
              Reset
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="btn btn-primary h-[30px] px-3 text-xs"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
