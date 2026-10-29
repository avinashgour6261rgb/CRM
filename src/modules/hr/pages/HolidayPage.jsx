import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  CalendarCheck,
  Clock,
  CheckCircle2,
  Sparkles,
  Download,
  Lock,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useToast } from '../../../shared/context/ToastContext';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { HolidayCalendar } from '../components/holidays/HolidayCalendar';
import { AddHolidayModal } from '../components/holidays/AddHolidayModal';
import { isHRorAdmin } from '../../../shared/utils/permissionUtils';
import { holidaySyncService } from '../services/holidaySyncService';

export const HolidayPage = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { holidays, searchQuery, setSearchQuery, currentUser } = useHR();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [suggestedHolidays, setSuggestedHolidays] = useState([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Access Control: Admin & HR permission check
  const canManageHolidays = isHRorAdmin(currentUser);

  // Dynamic today's date
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  // Load Pan-India suggested festivals and national holidays
  const loadSuggested = async () => {
    try {
      const list = await holidaySyncService.getSuggestedHolidays(currentYear);
      setSuggestedHolidays(list);
    } catch (err) {
      console.error('[HolidayPage] Failed to fetch suggested holidays:', err);
    }
  };

  useEffect(() => {
    loadSuggested();
    const handleSync = () => loadSuggested();
    window.addEventListener('hrms_storage_change', handleSync);
    window.addEventListener('ems_holidays_updated', handleSync);
    return () => {
      window.removeEventListener('hrms_storage_change', handleSync);
      window.removeEventListener('ems_holidays_updated', handleSync);
    };
  }, [holidays]);

  const cleanHolidays = (holidays || []).filter(h => !(h.date === '2026-10-15' && (h.name?.toLowerCase().includes('foundation') || h.title?.toLowerCase().includes('foundation'))));
  const totalHolidaysCount = cleanHolidays.length;
  const upcomingHolidays = cleanHolidays.filter(h => h.date >= todayStr);
  const completedHolidays = cleanHolidays.filter(h => h.date < todayStr);

  const sortedUpcoming = [...upcomingHolidays].sort((a, b) => a.date.localeCompare(b.date));
  const nextHol = sortedUpcoming[0];
  const daysToNextHoliday = nextHol ? Math.max(0, Math.ceil((new Date(nextHol.date + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / (1000 * 60 * 60 * 24))) : 0;

  // Unconfirmed suggested holidays count
  const unconfirmedSuggestions = suggestedHolidays.filter(s => !s.isConfirmed);

  const handleConfirmAll = async () => {
    if (!canManageHolidays) return;
    try {
      const res = await holidaySyncService.confirmAllSuggestedHolidays(currentYear, currentUser);
      addToast(`🎉 Confirmed ${res.newlyAddedCount} national holidays & festivals as official company offs!`, 'success');
      loadSuggested();
    } catch {
      addToast('Failed to confirm holidays.', 'error');
    }
  };

  const handleConfirmOne = (item) => {
    if (!canManageHolidays) return;
    try {
      holidaySyncService.confirmHolidayAsCompanyOff(item, currentUser);
      addToast(`✅ Confirmed "${item.name}" as official company holiday.`, 'success');
      loadSuggested();
    } catch {
      addToast('Failed to confirm holiday.', 'error');
    }
  };

  const handleCancelOne = async (item) => {
    if (!canManageHolidays) return;
    const ok = await confirm({
      title: 'Cancel Company Holiday?',
      message: `Are you sure you want to cancel "${item.name}" (${item.date}) as an official company holiday? This day will immediately revert back to a normal working day for all employees across the company.`,
      confirmText: 'Yes, Cancel Holiday',
      cancelText: 'Keep Holiday',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      const targetId = item.confirmedRecordId || item.code || item.date;
      const res = await holidaySyncService.cancelOrDeleteHoliday(targetId, currentUser);
      if (res.success) {
        addToast(`🗑️ Cancelled "${item.name}". Reverted to normal working day.`, 'info');
      } else {
        addToast(res.message || 'Could not cancel holiday.', 'warning');
      }
      loadSuggested();
    } catch (err) {
      console.error('Cancel holiday failed:', err);
      addToast('Failed to cancel holiday.', 'error');
    }
  };

  const handleSyncAll12Months = async () => {
    if (!canManageHolidays) return;
    try {
      setIsSyncing(true);
      const upgraded = await holidaySyncService.autoUpgradeStaleHolidays(currentYear, true);
      await loadSuggested();
      addToast(`✨ Successfully synchronized all ${upgraded.length} Pan-India national holidays & festivals for ${currentYear}!`, 'success');
    } catch (err) {
      console.error('Failed to sync holidays:', err);
      addToast('Failed to sync holidays.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

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
          {canManageHolidays && (
            <button
              onClick={handleSyncAll12Months}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors"
              title="Synchronize all 12 months (Jan-Dec) of official Indian gazetted holidays and festivals for this year"
            >
              <Sparkles size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync All 12 Months'}</span>
            </button>
          )}
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

      {/* Admin / HR Auto-Suggested National Holidays & Festivals Confirmation Banner */}
      {canManageHolidays && unconfirmedSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-[10px] p-3.5 px-4 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0 shadow-xs">
                🪔
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="m-0 text-sm font-extrabold text-slate-900 leading-tight">
                    {unconfirmedSuggestions.length} Pan-India National Holidays & Festivals Available for {currentYear}
                  </h3>
                  <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                    Action Required
                  </span>
                </div>
                <p className="m-0 text-xs text-slate-600 mt-0.5">
                  Google Calendar & National Gazetted list has identified major festivals (Diwali, Holi, Eid, Independence Day, etc.). Confirm them to officially enforce as paid company offs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsReviewOpen(!isReviewOpen)}
                className="px-3 h-[32px] rounded-md border border-amber-300 bg-white text-amber-900 text-xs font-semibold hover:bg-amber-50 cursor-pointer flex items-center gap-1"
              >
                <span>{isReviewOpen ? 'Hide Review' : 'Review List'}</span>
                {isReviewOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              <button
                onClick={handleConfirmAll}
                className="px-3.5 h-[32px] rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 size={14} />
                <span>Confirm All as Company Offs</span>
              </button>
            </div>
          </div>

          {/* Collapsible Review Table */}
          {isReviewOpen && (
            <div className="mt-2 pt-3 border-t border-amber-200/60 overflow-x-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {suggestedHolidays.map(item => (
                  <div
                    key={item.code}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      item.isConfirmed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-white border-amber-200 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold flex items-center gap-1.5 truncate">
                        <span>{item.icon}</span>
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {item.date} ({item.dayOfWeek})
                      </div>
                    </div>
                    {item.isConfirmed ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          <Check size={11} /> Off
                        </span>
                        {canManageHolidays && (
                          <button
                            onClick={() => handleCancelOne(item)}
                            title="Cancel / Revert this company holiday"
                            className="text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConfirmOne(item)}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10.5px] cursor-pointer shrink-0 transition-colors shadow-xs"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

        {/* 4. Pan-India Festivals (Jan - Dec) */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Pan-India Festivals ({currentYear})</span>
            <div className="kpi-icon-wrap bg-amber-100 text-amber-600">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="kpi-value text-amber-600">{suggestedHolidays.length || 32} <span className="text-xs font-semibold text-slate-500">Jan - Dec</span></div>
          <div className="kpi-subtext text-amber-600">
            <span>{suggestedHolidays.filter(s => s.isConfirmed).length} confirmed offs • {unconfirmedSuggestions.length} available to review</span>
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

      {/* Calendar Grid & List Section */}
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
