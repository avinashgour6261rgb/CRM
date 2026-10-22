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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        minHeight: '68px',
        boxSizing: 'border-box',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CalendarCheck size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>Company Holidays & Offs</h1>
              {canManageHolidays ? (
                <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: '700' }}>
                  Admin & HR Access
                </span>
              ) : (
                <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: '600' }}>
                  Employee View
                </span>
              )}
            </div>
            <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Annual gazetted, national festivals & company declared leaves
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#2563eb',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>Export Calendar</span>
          </button>
          <button
            onClick={handleOpenAddHoliday}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
            }}
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
            <div className="kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="kpi-value">{totalHolidaysCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Days</span></div>
          <div className="kpi-subtext" style={{ color: '#64748b' }}>
            <span>Annual gazetted, national & company offs</span>
          </div>
        </div>

        {/* 2. Upcoming Holidays */}
        <div className="kpi-card" style={{ borderLeft: '3px solid #854d0e' }}>
          <div className="kpi-header">
            <span className="kpi-title">Upcoming Holidays</span>
            <div className="kpi-icon-wrap" style={{ background: '#fef9c3', color: '#854d0e' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#854d0e' }}>{upcomingHolidays.length} <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Remaining</span></div>
          <div className="kpi-subtext" style={{ color: '#854d0e' }}>
            <span>Next: {nextHol ? `${nextHol.name} in ${daysToNextHoliday}d` : 'None upcoming'}</span>
          </div>
        </div>

        {/* 3. Completed Holidays */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Completed Holidays</span>
            <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#16a34a' }}>{completedHolidays.length} <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Passed</span></div>
          <div className="kpi-subtext" style={{ color: '#16a34a' }}>
            <span>Celebrated earlier this year</span>
          </div>
        </div>

        {/* 4. This Month / Upcoming Focus */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Festive Season (Oct - Dec)</span>
            <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Sparkles size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#d97706' }}>{q4Holidays.length} <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Festival Offs</span></div>
          <div className="kpi-subtext" style={{ color: '#d97706' }}>
            <span>{q4Holidays.length > 0 ? q4Holidays.map(h => h.name).slice(0, 2).join(', ') : 'No offs'}</span>
          </div>
        </div>
      </div>

      {/* Action Bar (Search Filter) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 10px',
          height: '30px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          backgroundColor: '#f8fafc',
          minWidth: '280px'
        }}>
          <Search size={13} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search holiday name, festival, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '12px',
              width: '100%',
              color: '#0f172a'
            }}
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
