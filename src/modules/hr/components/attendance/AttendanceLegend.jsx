import React from 'react';

export const AttendanceLegend = () => {
  const items = [
    { icon: '✔️', label: 'Present', badgeClass: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/60 border-green-200 dark:border-green-800' },
    { icon: '🌟', label: 'Half Day', badgeClass: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800' },
    { icon: '⚠️', label: 'Late', badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' },
    { icon: '❌', label: 'Absent', badgeClass: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 border-red-200 dark:border-red-800' },
    { icon: '✈️', label: 'On Leave', badgeClass: 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800' },
    { icon: '⭐', label: 'Holiday', badgeClass: 'text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-950/60 border-yellow-200 dark:border-yellow-800' },
    { icon: '📅', label: 'Day Off', badgeClass: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
    { icon: '—', label: 'Not Marked', badgeClass: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 px-4 mb-4 flex items-center gap-3.5 flex-wrap text-xs text-slate-600 dark:text-slate-300 shadow-xs">
      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
        <span>Status Legend:</span>
      </span>
      <div className="flex items-center gap-3 flex-wrap">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${item.badgeClass}`}
          >
            <span className="text-[13px]">{item.icon}</span>
            <span className="font-semibold">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
