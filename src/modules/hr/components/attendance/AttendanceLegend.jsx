import React from 'react';

export const AttendanceLegend = () => {
  const items = [
    { icon: '✔️', label: 'Present', badgeClass: 'text-green-700 bg-green-100 border-green-200' },
    { icon: '🌟', label: 'Half Day', badgeClass: 'text-purple-700 bg-purple-100 border-purple-200' },
    { icon: '⚠️', label: 'Late', badgeClass: 'text-amber-700 bg-amber-100 border-amber-200' },
    { icon: '❌', label: 'Absent', badgeClass: 'text-red-700 bg-red-100 border-red-200' },
    { icon: '✈️', label: 'On Leave', badgeClass: 'text-sky-700 bg-sky-100 border-sky-200' },
    { icon: '⭐', label: 'Holiday', badgeClass: 'text-yellow-800 bg-yellow-100 border-yellow-200' },
    { icon: '📅', label: 'Day Off', badgeClass: 'text-slate-600 bg-slate-100 border-slate-200' },
    { icon: '—', label: 'Not Marked', badgeClass: 'text-slate-500 bg-slate-50 border-slate-200' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-2.5 px-4 mb-4 flex items-center gap-3.5 flex-wrap text-xs text-slate-600 shadow-xs">
      <span className="font-bold text-slate-900 flex items-center gap-1">
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
