import React, { useState, useMemo } from 'react';
import { X, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Briefcase, FileText, Send, User } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';

export const OvertimeRequestModal = ({
  isOpen,
  onClose,
  currentUser,
  workSeconds = 0,
  standardWorkHours = 9,
  shiftStartTime = '10:00 AM',
  shiftEndTime = '07:00 PM',
  todayTasks = [],
  employees = [],
  onConfirmClockOut,
  addToast
}) => {
  if (!isOpen) return null;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const standardWorkSeconds = standardWorkHours * 3600;
  const overtimeSeconds = Math.max(0, workSeconds - standardWorkSeconds);
  const overtimeHours = +(overtimeSeconds / 3600).toFixed(2);
  const overtimeHoursInt = Math.floor(overtimeSeconds / 3600);
  const overtimeMinsInt = Math.floor((overtimeSeconds % 3600) / 60);

  const workHoursInt = Math.floor(workSeconds / 3600);
  const workMinsInt = Math.floor((workSeconds % 3600) / 60);

  const isAdminUser = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.role === 'Administrator' || isHRorAdmin(currentUser);

  // Eligible approvers (Admin / HR)
  const eligibleApprovers = useMemo(() => {
    return (employees || []).filter(e => {
      const isSelf = String(e._id) === String(currentUser?._id) || (e.employeeCode && e.employeeCode === currentUser?.employeeCode);
      const isPrivileged = e.systemRole === 'admin' || e.systemRole === 'hr' || e.role?.toLowerCase().includes('admin') || e.role?.toLowerCase().includes('hr') || e.department === 'Human Resources';
      return isPrivileged && !isSelf;
    });
  }, [employees, currentUser]);

  const defaultApproverId = eligibleApprovers[0]?._id || '';

  const [selectedApproverId, setSelectedApproverId] = useState(defaultApproverId);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate task time worked today
  const tasksWorkedList = useMemo(() => {
    return (todayTasks || []).filter(t => {
      const secs = Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0;
      return secs > 0 && t.sessionDate === todayStr;
    });
  }, [todayTasks, todayStr]);

  const totalTaskSeconds = tasksWorkedList.reduce((acc, t) => acc + (Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0), 0);
  const totalTaskHoursInt = Math.floor(totalTaskSeconds / 3600);
  const totalTaskMinsInt = Math.floor((totalTaskSeconds % 3600) / 60);

  const formatSecs = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const handleSubmit = async (isSelfApprove = false) => {
    if (!reason.trim() && !isSelfApprove) {
      if (addToast) addToast('Please enter a brief note or reason for overtime work', 'warning');
      return;
    }

    const chosenApprover = eligibleApprovers.find(a => String(a._id) === String(selectedApproverId));

    setIsSubmitting(true);
    try {
      await hrService.requestOvertime({
        employeeId: currentUser?._id || currentUser?.employeeCode,
        employeeCode: currentUser?.employeeCode || '',
        employeeName: currentUser?.name || 'Employee',
        date: todayStr,
        shiftHours: +(workSeconds / 3600).toFixed(2),
        overtimeHours,
        overtimeSeconds,
        overtimeReason: reason.trim() || (isSelfApprove ? 'Admin self-confirmed overtime work session' : 'Completed scheduled deliverables'),
        overtimeTasks: tasksWorkedList.map(t => ({
          taskId: t._id || t.id,
          taskCode: t.taskCode,
          title: t.title,
          seconds: Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0,
          durationText: formatSecs(Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0)
        })),
        requestedToId: chosenApprover?._id || '',
        requestedToName: chosenApprover?.name || (isSelfApprove ? (currentUser?.name || 'Admin') : 'HR Directorate'),
        isSelfApproved: isSelfApprove
      });

      if (addToast) {
        if (isSelfApprove) {
          addToast(`⚡ Overtime of ${overtimeHoursInt}h ${overtimeMinsInt}m self-confirmed & officially logged!`, 'success');
        } else {
          addToast(`📨 Overtime request of ${overtimeHoursInt}h ${overtimeMinsInt}m sent to ${chosenApprover?.name || 'Approver'}!`, 'success');
        }
      }

      onClose();
      if (onConfirmClockOut) onConfirmClockOut();
    } catch (err) {
      console.error('Error submitting overtime request:', err);
      if (addToast) addToast('Failed to record overtime request. Clocking out shift.', 'error');
      onClose();
      if (onConfirmClockOut) onConfirmClockOut();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipOvertime = () => {
    onClose();
    if (onConfirmClockOut) onConfirmClockOut();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[560px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-[modalSlideUp_0.2s_ease-out]">
        {/* Header */}
        <div className="py-[18px] px-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-[38px] h-[38px] rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="m-0 text-[17px] font-extrabold text-slate-900 dark:text-slate-100">
                Overtime Detected & Clock Out
              </h3>
              <p className="m-0 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Shift exceeded standard {standardWorkHours}h ({shiftStartTime} - {shiftEndTime})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 px-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Dual Metrics Strip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/60 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-green-800 dark:text-green-300 uppercase tracking-wider">
                Total Shift Duration
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-green-700 dark:text-green-400">
                  {workHoursInt}h {workMinsInt}m
                </span>
                <span className="text-[11px] font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/60 py-0.5 px-1.5 rounded">
                  +{overtimeHoursInt}h {overtimeMinsInt}m extra
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                Productive Task Time
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                  {totalTaskHoursInt}h {totalTaskMinsInt}m
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  ({tasksWorkedList.length} task{tasksWorkedList.length === 1 ? '' : 's'})
                </span>
              </div>
            </div>
          </div>

          {/* Tasks Worked Breakdown */}
          <div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Briefcase size={14} className="text-slate-500 dark:text-slate-400" />
              <span>Tasks Worked Today:</span>
            </div>
            {tasksWorkedList.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-[130px] overflow-y-auto">
                {tasksWorkedList.map((t, idx) => {
                  const secs = Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0;
                  return (
                    <div key={t._id || idx} className="py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-px px-1.5 rounded text-[11px]">
                          {t.taskCode || 'TSK'}
                        </span>
                        <span className="text-slate-900 dark:text-slate-100 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                          {t.title}
                        </span>
                      </div>
                      <span className="text-sky-600 dark:text-sky-400 font-bold shrink-0 ml-2">
                        {formatSecs(secs)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-[11.5px] text-slate-500 dark:text-slate-400">
                No active tasks logged today. Working hours will be submitted for overtime review.
              </div>
            )}
          </div>

          {/* Admin Authority Banner or Approver Picker */}
          {isAdminUser ? (
            <div className="py-3 px-3.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/60 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[12.5px] text-yellow-800 dark:text-yellow-300 block">
                  Admin Direct Authority
                </strong>
                <span className="text-[11.5px] text-yellow-700 dark:text-yellow-400">
                  As an Administrator, you can self-confirm your extra working hours directly, or choose to skip claiming overtime.
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Submit Request To Approver:
              </label>
              {eligibleApprovers.length > 0 ? (
                <select
                  value={selectedApproverId}
                  onChange={(e) => setSelectedApproverId(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none"
                >
                  {eligibleApprovers.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({a.role || 'HR / Admin'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Request will be routed to HR Administrator by default.
                </div>
              )}
            </div>
          )}

          {/* Reason / Deliverables Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Work Accomplished & Overtime Reason:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Worked on completing client bug fixes and database indexing past shift end..."
              rows={3}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 font-inherit resize-none outline-none box-border placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="py-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleSkipOvertime}
            disabled={isSubmitting}
            className="py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            title="Clock out immediately without claiming extra overtime"
          >
            Clock Out Without Claim
          </button>

          <div className="flex items-center gap-2">
            {isAdminUser ? (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="py-2 px-5 rounded-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white text-[13px] font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-[0_4px_12px_rgba(22,163,74,0.25)] hover:from-green-600 hover:to-green-700 disabled:opacity-50"
              >
                <CheckCircle2 size={15} />
                <span>Self-Confirm & Clock Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="py-2 px-5 rounded-lg border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white text-[13px] font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-[0_4px_12px_rgba(234,88,12,0.25)] hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
              >
                <Send size={14} />
                <span>Submit & Clock Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
