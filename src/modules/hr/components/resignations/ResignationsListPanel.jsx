import React, { useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Send,
  Calendar
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { isHRorAdmin, isAdmin } from '../../../../shared/utils/permissionUtils';
import { ReviewResignationModal } from './ReviewResignationModal';
import { SubmitResignationModal } from './SubmitResignationModal';

export const ResignationsListPanel = () => {
  const { resignations, employees } = useHR();
  const { currentUser: authUser } = useAuth();
  const { currentUser: hrUser } = useHR();
  const currentUser = authUser || hrUser;

  const isActorPrivileged = isHRorAdmin(currentUser) || isAdmin(currentUser);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected', 'relieved'
  const [selectedResignationForReview, setSelectedResignationForReview] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Scoped Resignations:
  // Non-privileged users only see their own resignation; HR/Admin see all
  const filteredResignations = useMemo(() => {
    let list = Array.isArray(resignations) ? [...resignations] : [];

    if (!isActorPrivileged) {
      const myId = String(currentUser?._id || currentUser?.id || '');
      const myCode = String(currentUser?.employeeCode || '').toUpperCase();
      list = list.filter(r =>
        (r.employeeId && String(r.employeeId) === myId) ||
        (r.employeeCode && String(r.employeeCode).toUpperCase() === myCode)
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'relieved') {
        list = list.filter(r => r.isRelieved);
      } else {
        list = list.filter(r => r.status === filterStatus && !r.isRelieved);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.employeeName && r.employeeName.toLowerCase().includes(q)) ||
        (r.employeeCode && r.employeeCode.toLowerCase().includes(q)) ||
        (r.department && r.department.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q))
      );
    }

    return list;
  }, [resignations, isActorPrivileged, currentUser, filterStatus, search]);

  const pendingCount = (resignations || []).filter(r => r.status === 'pending').length;
  const relievedCount = (resignations || []).filter(r => r.isRelieved).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Requests</span>
            <FileText size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1.5">
            {isActorPrivileged ? (resignations?.length || 0) : filteredResignations.length}
          </div>
          <span className="text-[11px] text-slate-400">Formal separation filings</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Pending Review</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
            {pendingCount}
          </div>
          <span className="text-[11px] text-slate-400">Requires executive clearance</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Approved Notice</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {(resignations || []).filter(r => r.status === 'approved' && !r.isRelieved).length}
          </div>
          <span className="text-[11px] text-slate-400">Serving active notice period</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Relieved Ex-Employees</span>
            <UserCheck size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1.5">
            {relievedCount}
          </div>
          <span className="text-[11px] text-slate-400">Archived safely in MongoDB</span>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name, code, reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 outline-none font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review ({pendingCount})</option>
              <option value="approved">Approved Notice</option>
              <option value="rejected">Rejected / Retained</option>
              <option value="relieved">Relieved (Ex-Employees)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
        >
          <Send size={13} />
          <span>Submit Resignation</span>
        </button>
      </div>

      {/* Resignations Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {filteredResignations.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">
            <FileText size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <div className="font-semibold text-sm">No Resignation Requests Found</div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {filterStatus !== 'all'
                ? `No separation records matching status "${filterStatus}".`
                : 'There are currently no active resignation requests submitted.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                  <th className="p-3">Employee</th>
                  <th className="p-3">Submission Date</th>
                  <th className="p-3">Proposed Last Day</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Authority Decision</th>
                  {isActorPrivileged && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredResignations.map((res) => {
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center shrink-0">
                            {res.employeeName?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{res.employeeName}</div>
                            <div className="text-[11px] text-slate-400">#{res.employeeCode} • {res.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {res.submissionDate}
                      </td>
                      <td className="p-3 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                        {res.approvedLastWorkingDay || res.proposedLastWorkingDay}
                        {res.approvedLastWorkingDay && res.approvedLastWorkingDay !== res.proposedLastWorkingDay && (
                          <span className="block text-[10px] text-purple-600 font-normal">Adjusted by HR</span>
                        )}
                      </td>
                      <td className="p-3 max-w-[200px] truncate" title={res.detailedNotes ? `${res.reason} — ${res.detailedNotes}` : res.reason}>
                        <div className="font-medium truncate">{res.reason}</div>
                        {res.detailedNotes && (
                          <div className="text-[11px] text-slate-400 italic truncate">{res.detailedNotes}</div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          res.isRelieved
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                            : res.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : res.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          {res.isRelieved ? (
                            <>
                              <UserCheck size={11} />
                              <span>Relieved</span>
                            </>
                          ) : res.status === 'approved' ? (
                            <>
                              <CheckCircle2 size={11} />
                              <span>Approved</span>
                            </>
                          ) : res.status === 'rejected' ? (
                            <>
                              <XCircle size={11} />
                              <span>Rejected</span>
                            </>
                          ) : (
                            <>
                              <Clock size={11} />
                              <span>Pending Review</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-[11.5px]">
                        {res.reviewedByName ? (
                          <div>
                            <span className="font-semibold">{res.reviewedByName}</span>
                            {res.reviewRemarks && (
                              <div className="text-[11px] text-slate-400 italic truncate max-w-[160px]" title={res.reviewRemarks}>
                                "{res.reviewRemarks}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Awaiting clearance</span>
                        )}
                      </td>
                      {isActorPrivileged && (
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedResignationForReview(res)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11.5px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                          >
                            <ShieldCheck size={12} />
                            <span>{res.isRelieved ? 'View Decision' : 'Review / Take Action'}</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedResignationForReview && (
        <ReviewResignationModal
          isOpen={!!selectedResignationForReview}
          onClose={() => setSelectedResignationForReview(null)}
          resignation={selectedResignationForReview}
        />
      )}

      {/* Submit Modal */}
      <SubmitResignationModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </div>
  );
};
