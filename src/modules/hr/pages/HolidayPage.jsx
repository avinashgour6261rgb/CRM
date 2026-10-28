import React, { useState } from 'react';
import {
  ChevronRight,
  Search,
  Plus,
  Calendar as CalendarIcon,
  CalendarCheck,
  Clock,
  CheckCircle2,
  Sparkles,
  Download,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useToast } from '../../../shared/context/ToastContext';
import { HolidayCalendar } from '../components/holidays/HolidayCalendar';
import { AddHolidayModal } from '../components/holidays/AddHolidayModal';
import { isHRorAdmin } from '../../../shared/utils/permissionUtils';

export const HolidayPage = () => {
  const { addToast } = useToast();
  const { holidays, searchQuery, setSearchQuery, currentUser } = useHR();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Access Control: Admin & HR permission check
  const canManageHolidays = isHRorAdmin(currentUser);

  // Dynamic today's date
  const todayStr = new Date().toISOString().split('T')[0];

  const cleanHolidays = (holidays || []).filter(h => !(h.date === '2026-10-15' && (h.name?.toLowerCase().includes('foundation') || h.title?.toLowerCase().includes('foundation'))));
  const totalHolidaysCount = cleanHolidays.length;
  const upcomingHolidays = cleanHolidays.filter(h => h.date >= todayStr);
  const completedHolidays = cleanHolidays.filter(h => h.date < todayStr);
  
  // Q4 Festive Season (Oct - Dec) dynamic calculation
  const q4Holidays = holidays.filter(h => {
    const m = parseInt((h.date || '').split('-')[1], 10);
    return m >= 10 && m <= 12;
  });

  const sortedUpcoming = [...upcomingHolidays].sort((a, b) => a.date.localeCompare(b.date));
  const nextHol = sortedUpcoming[0];
  const daysToNextHoliday = nextHol ? Math.max(0, Math.ceil((new Date(nextHol.date + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / (1000 * 60 * 60 * 24))) : 0;

  const handleExportCSV = () => {
    if (holidays.length === 0) {
      alert('No holiday records to export.');
      return;
    }
    const headers = ['Holiday Name', 'Date', 'Day of Week', 'Type', 'Description'];
    const rows = holidays.map(h => [
      `"${h.name}"`,
      h.date,
      h.dayOfWeek || '',
      `"${h.type}"`,
      `"${(h.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Holiday_Calendar_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAddHoliday = () => {
    if (!canManageHolidays) {
      addToast('🔒 Access Restricted: Only HR & Admin can declare or add company holidays.', 'warning');
      return;
    }
    setIsAddModalOpen(true);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white p-3 px-4 rounded-[10px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <CalendarCheck size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-base font-extrabold text-slate-900 leading-tight">Company Holidays & Offs</h1>
              {canManageHolidays ? (
                <span className="text-[10.5px] py-px px-1.5 rounded bg-green-100 text-green-600 font-bold">
                  Admin & HR Access
                </span>
              ) : (
                <span className="text-[10.5px] py-px px-1.5 rounded bg-slate-100 text-slate-500 font-semibold">
                  Employee View
                </span>
              )}
            </div>
            <p className="m-0 mt-px text-[11.5px] text-slate-500">
              Annual gazetted, national festivals & company declared leaves
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-white text-blue-600 border border-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <Download size={13} />
            <span>Export Calendar</span>
          </button>
          <button
            onClick={handleOpenAddHoliday}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-blue-600 text-white border-none text-xs font-bold cursor-pointer shadow-sm hover:bg-blue-700 transition-colors"
          >
            {canManageHolidays ? <Plus size={14} /> : <Lock size={13} />}
            <span>Declare Holiday</span>
          </button>
        </div>
      </div>

      {/* Top Holiday Summary Cards (Total, Upcoming, Completed, This Month) */}
      <div className="kpi-grid-4">
        {/* 1. Total Holidays */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Holidays</span>
            <div className="kpi-icon-wrap bg-blue-50 text-blue-600">
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="kpi-value">{totalHolidaysCount} <span className="text-xs font-semibold text-slate-500">Days</span></div>
          <div className="kpi-subtext text-slate-500">
            <span>Annual gazetted, national & company offs</span>
          </div>
        </div>

        {/* 2. Upcoming Holidays */}
        <div className="kpi-card border-l-[3px] border-yellow-800">
          <div className="kpi-header">
            <span className="kpi-title">Upcoming Holidays</span>
            <div className="kpi-icon-wrap bg-yellow-100 text-yellow-800">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value text-yellow-800">{upcomingHolidays.length} <span className="text-xs font-semibold text-slate-500">Remaining</span></div>
          <div className="kpi-subtext text-yellow-800">
            <span>Next: {nextHol ? `${nextHol.name} in ${daysToNextHoliday}d` : 'None upcoming'}</span>
          </div>
        </div>

        {/* 3. Completed Holidays */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Completed Holidays</span>
            <div className="kpi-icon-wrap bg-green-100 text-green-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="kpi-value text-green-600">{completedHolidays.length} <span className="text-xs font-semibold text-slate-500">Passed</span></div>
          <div className="kpi-subtext text-green-600">
            <span>Celebrated earlier this year</span>
          </div>
        </div>

        {/* 4. This Month / Upcoming Focus */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Festive Season (Oct - Dec)</span>
            <div className="kpi-icon-wrap bg-amber-100 text-amber-600">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="kpi-value text-amber-600">{q4Holidays.length} <span className="text-xs font-semibold text-slate-500">Festival Offs</span></div>
          <div className="kpi-subtext text-amber-600">
            <span>{q4Holidays.length > 0 ? q4Holidays.map(h => h.name).slice(0, 2).join(', ') : 'No offs'}</span>
          </div>
        </div>
      </div>

      {/* Action Bar (Search Filter) */}
      <div className="bg-white rounded-[10px] border border-slate-200 py-2 px-3 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 bg-slate-50 min-w-[280px]">
          <Search size={13} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search holiday name, festival, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none bg-transparent outline-none text-xs w-full text-slate-900"
          />
        </div>
      </div>

      {/* Calendar Grid & List Section (Screenshot 3) */}
      <HolidayCalendar />

      {/* Add Holiday Modal */}
      {canManageHolidays && (
        <AddHolidayModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
};
