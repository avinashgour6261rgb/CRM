import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Zap } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { isHRorAdmin, getUserModulePermissions } from '../../../../shared/utils/permissionUtils';
import { getCompanySettings } from '../../../../shared/services/companySettingsService';

const formatOtDuration = (secs = 0, fallbackHours = 0) => {
  const s = Math.max(0, Math.floor(Number(secs) || Math.round((Number(fallbackHours) || 0) * 3600)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(rem).padStart(2, '0')}s`;
  return `${rem}s`;
};

export const OvertimeManagementPanel = ({ currentUser }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyCfg, setCompanyCfg] = useState(() => getCompanySettings());

  useEffect(() => {
    const onSettingsUpdate = () => setCompanyCfg(getCompanySettings());
    window.addEventListener('company-settings-updated', onSettingsUpdate);
    return () => window.removeEventListener('company-settings-updated', onSettingsUpdate);
  }, []);

  const shiftStart = companyCfg?.shiftStartTime || '10:00 AM';
  const shiftEnd = companyCfg?.shiftEndTime || '07:00 PM';
  const stdHours = companyCfg?.standardWorkHours ?? 9;
  const minOtMins = Number(companyCfg?.minOvertimeMinutes ?? 0);

  const perms = getUserModulePermissions(currentUser);
  const canViewAll = isHRorAdmin(currentUser) || Boolean(perms?.viewAllAttendance || perms?.liveOperations || perms?.teamoperations || perms?.allAccess);

  const fetchOvertimeData = useCallback(async () => {
    try {
      const data = await hrService.getOvertimeRequests();
      const list = Array.isArray(data) ? data : (data?.data || []);
      setRecords(list);
    } catch (e) {
      console.error('Error fetching overtime records:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOvertimeData();
    const interval = setInterval(fetchOvertimeData, 15000);
    const handleUpdate = () => fetchOvertimeData();
    window.addEventListener('hrms_storage_change', handleUpdate);
    window.addEventListener('ems_overtime_updated', handleUpdate);
    window.addEventListener('ems_telemetry_update', handleUpdate);
    window.addEventListener('ems_socket_reconnected', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('hrms_storage_change', handleUpdate);
      window.removeEventListener('ems_overtime_updated', handleUpdate);
      window.removeEventListener('ems_telemetry_update', handleUpdate);
      window.removeEventListener('ems_socket_reconnected', handleUpdate);
    };
  }, [fetchOvertimeData]);

  const filtered = records.filter(r => {
    const otSecs = Number(r.overtimeSeconds) || Math.round((Number(r.overtimeHours) || 0) * 3600);
    if (otSecs <= 0) return false;
    if (!canViewAll && currentUser) {
      const myId = String(currentUser?._id || currentUser?.id || '');
      const myCode = String(currentUser?.employeeCode || '').toUpperCase();
      const empId = String(r.employeeId || r.employee || '');
      const empCode = String(r.employeeCode || '').toUpperCase();
      if (myId !== empId && myCode !== empCode) return false;
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Zap size={16} />
          </div>
          <div>
            <h3 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
              Automatic Overtime Tracker (Live Synced)
            </h3>
            <p className="m-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Standard Shift: {shiftStart} – {shiftEnd} ({stdHours}h) • Work outside this window{minOtMins > 0 ? ` (${minOtMins}+ mins)` : ''} is automatically tracked and saved as Overtime.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
          {filtered.length} Recorded
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-[30px] text-slate-500 dark:text-slate-400 text-[13px]">
          Loading overtime records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 px-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Clock size={28} className="mx-auto mb-2 text-slate-400 dark:text-slate-500" />
          <div className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
            No Overtime Logged Yet
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Any work done before {shiftStart} or after {shiftEnd}{minOtMins > 0 ? ` (${minOtMins}+ mins)` : ''} is automatically tracked, saved, and live synced here.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((item) => {
            const otSecs = Number(item.overtimeSeconds) || Math.round((Number(item.overtimeHours) || 0) * 3600);
            const isLive = Boolean(item.isClockedIn && !item.clockOutTime);
            const tasks = item.overtimeTasks || [];

            return (
              <div
                key={item._id || item.id || `${item.employeeCode}_${item.date}`}
                className="py-3.5 px-[18px] rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between flex-wrap gap-3"
              >
                {/* Left Info */}
                <div className="flex items-center gap-3 min-w-[260px]">
                  <div className="w-[38px] h-[38px] rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-extrabold text-sm flex items-center justify-center shrink-0">
                    {(item.employeeName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-[13.5px] text-slate-900 dark:text-slate-100">
                        {item.employeeName || 'Employee'}
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        ({item.employeeCode || 'EMP'})
                      </span>
                      <span className={`text-[10.5px] font-bold py-0.5 px-2 rounded ${isLive ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'}`}>
                        {isLive ? '🟢 LIVE AUTO-OT' : '⚡ AUTO RECORDED'}
                      </span>
                    </div>

                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                      <span>📅 Date: <strong className="text-slate-800 dark:text-slate-200">{item.date}</strong></span>
                      <span>In: <strong className="text-slate-800 dark:text-slate-200">{item.clockInTime || '--'}</strong></span>
                      <span>Out: <strong className="text-slate-800 dark:text-slate-200">{item.clockOutTime || (isLive ? 'Working' : '--')}</strong></span>
                    </div>

                    {tasks.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">Tasks:</span>
                        {tasks.map((t, tidx) => (
                          <span
                            key={tidx}
                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded py-[1px] px-1.5 text-[10.5px] text-slate-800 dark:text-slate-200 font-semibold"
                          >
                            {t.taskCode || 'TSK'}: {t.title || 'Task'} ({t.durationText || ''})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right OT Duration Pill */}
                <div className="text-right">
                  <div className="text-[15px] font-extrabold text-amber-700 dark:text-amber-300 font-mono tabular-nums">
                    +{formatOtDuration(otSecs, item.overtimeHours)}
                  </div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    Overtime Saved
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
