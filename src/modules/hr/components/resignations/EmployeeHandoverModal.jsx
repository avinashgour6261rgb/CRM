/**
 * @file EmployeeHandoverModal.jsx
 * @description Smart Offboarding & Asset Handover Wizard.
 * Allows HR & Administrators to audit and reassign all pending tasks, active leads,
 * ongoing projects, and open tickets from a departing or transferred employee to a colleague.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Users2,
  CheckSquare,
  LifeBuoy,
  FileText,
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
  Send
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { getEmployeePendingAssets, executeAssetHandover } from '../../services/handoverService';

export const EmployeeHandoverModal = ({ isOpen, onClose, sourceEmployee, onHandoverComplete }) => {
  const { employees } = useHR();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [assets, setAssets] = useState({ tasks: [], leads: [], projects: [], tickets: [], totalCount: 0 });
  const [selectedSuccessorId, setSelectedSuccessorId] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Category selection flags
  const [transferTasks, setTransferTasks] = useState(true);
  const [transferLeads, setTransferLeads] = useState(true);
  const [transferProjects, setTransferProjects] = useState(true);
  const [transferTickets, setTransferTickets] = useState(true);

  // Expand / collapse item lists
  const [expandedSection, setExpandedSection] = useState(null); // 'tasks' | 'leads' | 'projects' | 'tickets' | null

  // Eligible successors: active employees excluding the source employee
  const eligibleSuccessors = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    const sourceId = String(sourceEmployee?._id || sourceEmployee?.id || sourceEmployee?.employeeId || '');
    const sourceCode = String(sourceEmployee?.employeeCode || '').toUpperCase();

    return employees.filter(emp => {
      const isSelf = (sourceId && String(emp._id || emp.id) === sourceId) ||
        (sourceCode && String(emp.employeeCode || '').toUpperCase() === sourceCode);
      if (isSelf) return false;

      const isArchived = ['resigned', 'relieved', 'inactive', 'terminated', 'suspended', 'archived']
        .includes(String(emp.status || 'active').toLowerCase());
      if (isArchived) return false;

      return true;
    });
  }, [employees, sourceEmployee]);

  // Load live assets whenever sourceEmployee changes or modal opens
  useEffect(() => {
    if (isOpen && sourceEmployee) {
      const scan = getEmployeePendingAssets(sourceEmployee);
      setAssets(scan);
      // Auto-select first eligible successor if none selected
      if (!selectedSuccessorId && eligibleSuccessors.length > 0) {
        setSelectedSuccessorId(eligibleSuccessors[0]._id || eligibleSuccessors[0].id || '');
      }
    }
  }, [isOpen, sourceEmployee, eligibleSuccessors]);

  if (!isOpen || !sourceEmployee) return null;

  const sourceName = sourceEmployee.name || sourceEmployee.employeeName || 'Employee';
  const sourceCode = sourceEmployee.employeeCode || 'EMP';
  const sourceRole = sourceEmployee.role || 'Team Member';
  const sourceDept = sourceEmployee.department || 'General';

  const toggleSection = (sec) => {
    setExpandedSection(prev => prev === sec ? null : sec);
  };

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!selectedSuccessorId) {
      addToast('Please select a designated successor employee', 'warning');
      return;
    }

    const successor = eligibleSuccessors.find(e => String(e._id || e.id) === String(selectedSuccessorId));
    if (!successor) {
      addToast('Selected successor not found', 'error');
      return;
    }

    if (!transferTasks && !transferLeads && !transferProjects && !transferTickets) {
      addToast('Please select at least one asset category to transfer', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await executeAssetHandover({
        sourceEmployee,
        targetEmployee: successor,
        selections: {
          tasks: transferTasks,
          leads: transferLeads,
          projects: transferProjects,
          tickets: transferTickets
        },
        handoverNotes: handoverNotes.trim(),
        performedBy: currentUser
      });

      const totalMoved =
        res.transferred.tasksCount +
        res.transferred.leadsCount +
        res.transferred.projectsCount +
        res.transferred.ticketsCount;

      addToast(
        `🎉 Handover Complete! Transferred ${totalMoved} items (${res.transferred.tasksCount} tasks, ${res.transferred.leadsCount} leads, ${res.transferred.projectsCount} projects) to ${successor.name}.`,
        'success'
      );

      if (onHandoverComplete) {
        onHandoverComplete(res);
      }
      onClose();
    } catch (err) {
      console.error('Handover failed:', err);
      addToast(err.message || 'Failed to complete handover', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shrink-0">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold m-0 leading-tight">
                Work & Asset Handover Wizard
              </h2>
              <p className="text-xs text-blue-100 m-0 mt-0.5">
                Reassign active leads, pending tasks & projects to prevent work loss
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-none"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleExecute} className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          {/* Source Employee Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                {sourceName.charAt(0)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Departing / Relieving Employee
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {sourceName} <span className="text-xs font-normal text-slate-500">(#{sourceCode})</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {sourceRole} • {sourceDept}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Pending Workload</div>
              <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                {assets.totalCount} {assets.totalCount === 1 ? 'Asset' : 'Assets'}
              </div>
            </div>
          </div>

          {/* Pending Work Audit Breakdown Cards */}
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>Detected Active Workload (Audit Trail)</span>
              <span className="text-[11px] text-slate-400 font-normal">Select categories to transfer</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Tasks Card */}
              <div
                onClick={() => setTransferTasks(prev => !prev)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  transferTasks
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <CheckSquare size={16} className={transferTasks ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                  <input
                    type="checkbox"
                    checked={transferTasks}
                    onChange={() => {}}
                    className="accent-blue-600 cursor-pointer"
                  />
                </div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {assets.tasks.length}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Pending Tasks</span>
                  {assets.tasks.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSection('tasks'); }}
                      className="text-[10px] text-blue-600 hover:underline p-0 border-none bg-transparent cursor-pointer"
                    >
                      {expandedSection === 'tasks' ? 'Hide' : 'View'}
                    </button>
                  )}
                </div>
              </div>

              {/* Leads Card */}
              <div
                onClick={() => setTransferLeads(prev => !prev)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  transferLeads
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Users2 size={16} className={transferLeads ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                  <input
                    type="checkbox"
                    checked={transferLeads}
                    onChange={() => {}}
                    className="accent-emerald-600 cursor-pointer"
                  />
                </div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {assets.leads.length}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Active Leads</span>
                  {assets.leads.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSection('leads'); }}
                      className="text-[10px] text-emerald-600 hover:underline p-0 border-none bg-transparent cursor-pointer"
                    >
                      {expandedSection === 'leads' ? 'Hide' : 'View'}
                    </button>
                  )}
                </div>
              </div>

              {/* Projects Card */}
              <div
                onClick={() => setTransferProjects(prev => !prev)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  transferProjects
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Briefcase size={16} className={transferProjects ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'} />
                  <input
                    type="checkbox"
                    checked={transferProjects}
                    onChange={() => {}}
                    className="accent-purple-600 cursor-pointer"
                  />
                </div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {assets.projects.length}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Projects</span>
                  {assets.projects.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSection('projects'); }}
                      className="text-[10px] text-purple-600 hover:underline p-0 border-none bg-transparent cursor-pointer"
                    >
                      {expandedSection === 'projects' ? 'Hide' : 'View'}
                    </button>
                  )}
                </div>
              </div>

              {/* Tickets Card */}
              <div
                onClick={() => setTransferTickets(prev => !prev)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  transferTickets
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <LifeBuoy size={16} className={transferTickets ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} />
                  <input
                    type="checkbox"
                    checked={transferTickets}
                    onChange={() => {}}
                    className="accent-amber-600 cursor-pointer"
                  />
                </div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {assets.tickets.length}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Open Tickets</span>
                  {assets.tickets.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSection('tickets'); }}
                      className="text-[10px] text-amber-600 hover:underline p-0 border-none bg-transparent cursor-pointer"
                    >
                      {expandedSection === 'tickets' ? 'Hide' : 'View'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Item Detail List */}
            {expandedSection === 'tasks' && assets.tasks.length > 0 && (
              <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/60 max-h-40 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tasks to be Reassigned ({assets.tasks.length}):
                </div>
                <div className="flex flex-col gap-1.5">
                  {assets.tasks.map(t => (
                    <div key={t._id || t.id} className="text-xs flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                        #{t.taskCode || 'TSK'} {t.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 font-bold uppercase">
                        {t.status || 'incomplete'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedSection === 'leads' && assets.leads.length > 0 && (
              <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/60 max-h-40 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Leads to be Transferred ({assets.leads.length}):
                </div>
                <div className="flex flex-col gap-1.5">
                  {assets.leads.map(l => (
                    <div key={l._id || l.id} className="text-xs flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                        {l.companyName || l.client || l.name} — ({l.name})
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 font-bold uppercase">
                        {l.status || 'new'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedSection === 'projects' && assets.projects.length > 0 && (
              <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/60 max-h-40 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Projects to be Reassigned ({assets.projects.length}):
                </div>
                <div className="flex flex-col gap-1.5">
                  {assets.projects.map(p => (
                    <div key={p._id || p.id} className="text-xs flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                        #{p.projectCode || 'PRJ'} {p.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-600 font-bold uppercase">
                        {p.status || 'in_progress'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedSection === 'tickets' && assets.tickets.length > 0 && (
              <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/60 max-h-40 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Open Tickets to be Transferred ({assets.tickets.length}):
                </div>
                <div className="flex flex-col gap-1.5">
                  {assets.tickets.map(t => (
                    <div key={t._id || t.id} className="text-xs flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                        #{t.ticketCode || 'TKT'} {t.subject}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-600 font-bold uppercase">
                        {t.status || 'open'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Successor Employee Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Successor Employee (Reassign To) *
            </label>
            <select
              required
              value={selectedSuccessorId}
              onChange={e => setSelectedSuccessorId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="" disabled>-- Choose Successor Colleague --</option>
              {eligibleSuccessors.map(emp => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name} (#{emp.employeeCode || 'EMP'}) — {emp.role || 'Associate'} ({emp.department || 'General'})
                </option>
              ))}
            </select>
          </div>

          {/* Transition Notes & Context */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Handover Instructions & Briefing Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Handing over ongoing client discussions and active sprint tasks. Please review ticket notes with manager..."
              value={handoverNotes}
              onChange={e => setHandoverNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Warning / Confirmation Banner */}
          <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Instant Continuity:</strong> Clicking execute will automatically re-scope all chosen tasks, leads, and projects to the successor's personal dashboard. A direct Handover Notification memo will be sent to the colleague.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSuccessorId}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 border-none"
            >
              <ArrowRightLeft size={14} />
              <span>{submitting ? 'Transferring Work...' : 'Execute Handover & Reassign Work'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
