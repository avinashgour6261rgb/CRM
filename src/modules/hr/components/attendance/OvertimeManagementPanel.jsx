import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, XCircle, Briefcase, User, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';

export const OvertimeManagementPanel = ({ currentUser, addToast }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  const isPrivileged = isHRorAdmin(currentUser);

  const fetchOvertimeData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await hrService.getOvertimeRequests();
      const list = Array.isArray(data) ? data : (data?.data || []);
      setRequests(list);
    } catch (e) {
      console.error('Error fetching overtime requests:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOvertimeData();
    const handleStorage = (e) => {
      if (!e?.detail?.key || e.detail.key === 'ems_attendance_overtime' || e.detail.key === 'hrms_attendance') {
        fetchOvertimeData();
      }
    };
    window.addEventListener('hrms_storage_change', handleStorage);
    window.addEventListener('ems_overtime_updated', fetchOvertimeData);
    return () => {
      window.removeEventListener('hrms_storage_change', handleStorage);
      window.removeEventListener('ems_overtime_updated', fetchOvertimeData);
    };
  }, [fetchOvertimeData]);

  const handleDecision = async (id, status) => {
    try {
      let reason = '';
      if (status === 'rejected') {
        reason = window.prompt('Please enter a reason for rejecting this overtime request (optional):') || 'Rejected by approver';
      }
      await hrService.updateOvertimeStatus(id, status, currentUser?.name || 'Admin', reason);
      if (addToast) {
        addToast(`Overtime request marked as ${status.toUpperCase()}!`, status === 'approved' ? 'success' : 'info');
      }
      fetchOvertimeData();
    } catch (err) {
      console.error('Decision error:', err);
      if (addToast) addToast('Failed to update overtime status', 'error');
    }
  };

  const filtered = requests.filter(r => {
    const s = r.overtimeStatus || r.status || 'pending';
    if (filterStatus !== 'all' && s !== filterStatus) return false;
    // Non-privileged users only see their own requests
    if (!isPrivileged) {
      const myId = String(currentUser?._id || currentUser?.id || '');
      const myCode = String(currentUser?.employeeCode || '');
      const empId = String(r.employeeId || r.employee || '');
      const empCode = String(r.employeeCode || '');
      if (myId !== empId && myCode !== empCode) return false;
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      {/* Header and Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
              Overtime Requests & Approvals
            </h3>
            <p className="m-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Side-by-side shift extra hours & task duration verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800"
          >
            <option value="all">All ({requests.length})</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-[30px] text-slate-500 dark:text-slate-400 text-[13px]">
          Loading overtime records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 px-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Clock size={28} className="mb-2 text-slate-400 dark:text-slate-500" />
          <div className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
            No Overtime Requests Found
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            When employees work beyond standard shift hours, their overtime claims and task work will appear here.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((item) => {
            const status = item.overtimeStatus || item.status || 'pending';
            const hours = item.overtimeHours || (item.overtimeSeconds ? +(item.overtimeSeconds / 3600).toFixed(2) : 0);
            const tasks = item.overtimeTasks || [];

            const isPending = status === 'pending';
            const isApproved = status === 'approved';

            return (
              <div
                key={item._id || item.id}
                className={`py-3.5 px-[18px] rounded-xl border flex items-center justify-between flex-wrap gap-3 ${isPending ? 'border-orange-200 dark:border-orange-800/60 bg-orange-50/50 dark:bg-orange-950/30' : (isApproved ? 'border-green-200 dark:border-green-800/60 bg-green-50/50 dark:bg-green-950/30' : 'border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/30')}`}
              >
                {/* Left Info */}
                <div className="flex items-center gap-3 min-w-[260px]">
                  <div className="w-[38px] h-[38px] rounded-full bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-extrabold text-sm flex items-center justify-center shrink-0">
                    {(item.employeeName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[13.5px] text-slate-900 dark:text-slate-100">
                        {item.employeeName || 'Employee'}
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        ({item.employeeCode || 'EMP'})
                      </span>
                      <span className={`text-[11px] font-bold py-0.5 px-2 rounded ${isPending ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300' : (isApproved ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300')}`}>
                        {status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2.5 flex-wrap">
                      <span>📅 Date: <strong className="text-slate-800 dark:text-slate-200">{item.date}</strong></span>
                      <span>⏰ Extra Time: <strong className="text-orange-600 dark:text-orange-400">+{hours}h</strong></span>
                      {item.overtimeRequestedTo && (
                        <span>Approver: <strong className="text-slate-800 dark:text-slate-200">{item.overtimeRequestedTo}</strong></span>
                      )}
                    </div>

                    {/* Reason Note */}
                    {item.overtimeReason && (
                      <div className="text-[11.5px] text-slate-700 dark:text-slate-300 mt-1 italic">
                        "{item.overtimeReason}"
                      </div>
                    )}

                    {/* Tasks Worked Pills */}
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

                {/* Right Actions */}
                {isPrivileged && isPending && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDecision(item._id || item.id, 'approved')}
                      className="py-1.5 px-3.5 rounded-md border-0 bg-green-600 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1 shadow-xs hover:bg-green-700"
                    >
                      <CheckCircle2 size={13} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleDecision(item._id || item.id, 'rejected')}
                      className="py-1.5 px-3 rounded-md border border-red-300 dark:border-red-800/60 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <XCircle size={13} />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
