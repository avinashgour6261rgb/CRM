import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { ShieldAlert, AlertTriangle, LogOut, Clock, User } from 'lucide-react';

export const AdminForceClockOutModal = ({ isOpen, onClose, targetEmployee = null }) => {
  const { employees, adminForceClockOut, currentUser, attendance } = useHR();

  const [selectedEmpId, setSelectedEmpId] = useState(targetEmployee?._id || 'emp_003');
  const [auditNote, setAuditNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const adminIdentifier = currentUser?.employeeCode || currentUser?._id || 'ADM-001';
  const adminName = currentUser?.name || 'Administrator';

  // Find employee details
  const emp = employees.find(e => e._id === (targetEmployee?._id || selectedEmpId));

  const handleForceClockOut = async (e) => {
    e.preventDefault();
    if (!auditNote.trim()) {
      alert('Audit note explaining why shift is being forcefully closed is mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      await adminForceClockOut(targetEmployee?._id || selectedEmpId, auditNote.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Force Clock-Out & Override"
      subtitle="Immediately terminate active shift session with full regulatory audit logging."
    >
      <form onSubmit={handleForceClockOut} className="flex flex-col gap-4">
        
        {/* Warning Banner */}
        <div className="flex items-start gap-2.5 p-3 px-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-800 dark:text-red-300">
          <ShieldAlert size={20} className="shrink-0 mt-0.5 text-red-600" />
          <div>
            <strong>Administrative Action Required:</strong> This action will immediately clock out the employee's live shift, pause their task timers, and stamp this event into both the employee's time log and the system audit log under Administrator ID <code>#{adminIdentifier}</code>.
          </div>
        </div>

        {/* Target Employee Selection */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Target Employee
          </label>
          {targetEmployee ? (
            <div className="flex items-center gap-2.5 p-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md">
              <img
                src={targetEmployee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={targetEmployee.name}
                className="w-7 h-7 rounded-full object-cover"
              />
              <div>
                <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{targetEmployee.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{targetEmployee.role} • ID: {targetEmployee.employeeCode || targetEmployee._id}</div>
              </div>
            </div>
          ) : (
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="filter-select w-full h-10"
            >
              {employees.map(e => (
                <option key={e._id} value={e._id}>
                  {e.name} ({e.role}) — #{e.employeeCode || e._id}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Current Time Stamp Callout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Closing Time Stamp:</span>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-[13px]">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (Immediate)
            </div>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Authorized By:</span>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-[13px]">
              {adminName} <span className="text-blue-600 text-[11px]">[#{adminIdentifier}]</span>
            </div>
          </div>
        </div>

        {/* Mandatory Reason for Override */}
        <div>
          <label className="block text-[13px] font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            Audit Note & Reason for Force Clock-Out <span className="text-red-600">*</span>
          </label>
          <textarea
            value={auditNote}
            onChange={(e) => setAuditNote(e.target.value)}
            placeholder="e.g. Employee left premises at 06:30 PM without clocking out; verified via security logs / client off-site transition."
            className="w-full min-h-[75px] p-2.5 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[12.5px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none font-sans focus:border-red-500 transition-colors"
            required
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            This note will be permanently etched in the employee's audit log and daily timecard.
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 mt-2">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 disabled:opacity-50"
          >
            <LogOut size={14} />
            <span>{submitting ? 'Executing Override...' : 'Confirm Force Clock-Out'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
