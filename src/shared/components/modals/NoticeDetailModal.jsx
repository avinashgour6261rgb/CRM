/**
 * @file NoticeDetailModal.jsx
 * @description Modal showing full content of a company announcement / HR notice,
 * with expiry status, employee acknowledgment button, and HR read-receipt compliance tracking.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Bell,
  Calendar,
  User,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { isHRorAdmin, canDeleteNotice } from '../../utils/permissionUtils';
import { getLocalDateString } from '../../utils/timerUtils';
import { useModalUX } from '../../hooks/useModalUX';

export const NoticeDetailModal = ({ notice, onClose }) => {
  const { handleBackdropClick, handleCardClick } = useModalUX({ onClose, isOpen: Boolean(notice) });
  const { acknowledgeNotice, deleteNotice } = useCRM() || {};
  const { currentUser } = useAuth() || {};
  const { employees } = useHR() || {};
  const { addToast } = useToast() || {};
  const { confirm } = useConfirm() || {};

  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [receiptsTab, setReceiptsTab] = useState('read'); // 'read' | 'pending'
  const [submittingAck, setSubmittingAck] = useState(false);

  // Full resolution of all unique readers from acknowledgements and acknowledgedBy mapped with employees
  const allReaders = useMemo(() => {
    if (!notice) return [];
    const rawIds = Array.isArray(notice.acknowledgedBy) ? notice.acknowledgedBy : [];
    const details = Array.isArray(notice.acknowledgements) ? notice.acknowledgements : [];
    const allEmps = employees || [];
    const map = new Map();

    // 1. Add from acknowledgements details (rich objects)
    details.forEach(ad => {
      const key = String(ad.userId || ad.userCode || ad.userName).toLowerCase();
      const matchedEmp = allEmps.find(e => 
        String(e._id).toLowerCase() === key || 
        String(e.employeeCode || '').toLowerCase() === key ||
        (e.name && ad.userName && e.name.trim().toLowerCase() === ad.userName.trim().toLowerCase())
      );
      map.set(key, {
        userId: ad.userId || matchedEmp?._id || key,
        userCode: ad.userCode || matchedEmp?.employeeCode || '',
        userName: ad.userName || matchedEmp?.name || 'Team Member',
        userRole: ad.userRole || matchedEmp?.designation || matchedEmp?.role || 'Member',
        userAvatar: ad.userAvatar || matchedEmp?.avatar || '',
        department: matchedEmp?.department || '',
        date: ad.date || (ad.acknowledgedAt ? String(ad.acknowledgedAt).slice(0, 10) : '')
      });
    });

    // 2. Add from acknowledgedBy IDs if not already present
    rawIds.forEach(id => {
      const str = String(id).toLowerCase();
      const matchedEmp = allEmps.find(e => 
        String(e._id).toLowerCase() === str || 
        String(e.employeeCode || '').toLowerCase() === str ||
        String(e.id || '').toLowerCase() === str
      );
      const key = matchedEmp ? String(matchedEmp._id).toLowerCase() : str;
      if (!map.has(key)) {
        map.set(key, {
          userId: matchedEmp?._id || id,
          userCode: matchedEmp?.employeeCode || (id.startsWith('EMP') ? id : ''),
          userName: matchedEmp?.name || (id.startsWith('EMP') ? `Employee (${id})` : 'Team Member'),
          userRole: matchedEmp?.designation || matchedEmp?.role || 'Member',
          userAvatar: matchedEmp?.avatar || '',
          department: matchedEmp?.department || '',
          date: notice.date || 'Acknowledged'
        });
      }
    });

    return Array.from(map.values());
  }, [notice?.acknowledgedBy, notice?.acknowledgements, employees, notice?.date]);

  const uniqueReadersCount = allReaders.length;

  const pendingEmployees = useMemo(() => {
    const allEmps = (employees || []).filter(e =>
      !['resigned', 'relieved', 'inactive', 'terminated'].includes(String(e.status || 'active').toLowerCase())
    );
    const readKeys = new Set(allReaders.map(r => String(r.userId || r.userCode).toLowerCase()));
    return allEmps.filter(e => 
      !readKeys.has(String(e._id).toLowerCase()) && 
      !readKeys.has(String(e.employeeCode || '').toLowerCase())
    );
  }, [employees, allReaders]);

  if (!notice) return null;

  const todayStr = getLocalDateString();
  const isExpired = Boolean(notice.expiryDate && notice.expiryDate < todayStr);
  const isPrivileged = isHRorAdmin(currentUser);
  const canDelete = canDeleteNotice ? canDeleteNotice(currentUser, notice) : isPrivileged;

  const userId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || '');
  const userCode = String(currentUser?.employeeCode || '').toUpperCase();

  const ackList = Array.isArray(notice.acknowledgedBy) ? notice.acknowledgedBy : [];
  const ackDetails = Array.isArray(notice.acknowledgements) ? notice.acknowledgements : [];

  const hasAcknowledged = ackList.some(id =>
    String(id) === userId ||
    (userCode && String(id).toUpperCase() === userCode)
  ) || ackDetails.some(a =>
    String(a.userId) === userId ||
    (userCode && String(a.userCode || a.userId).toUpperCase() === userCode)
  );

  const myAckRecord = ackDetails.find(a =>
    String(a.userId) === userId ||
    (userCode && String(a.userCode || a.userId).toUpperCase() === userCode)
  );

  const handleAcknowledge = async () => {
    if (typeof acknowledgeNotice === 'function') {
      try {
        setSubmittingAck(true);
        await acknowledgeNotice(notice._id || notice.id);
        addToast('Notice marked as read & acknowledged! ✅', 'success');
      } catch (e) {
        addToast('Failed to acknowledge notice', 'error');
      } finally {
        setSubmittingAck(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteNotice) return;
    const ok = await confirm({
      title: 'Delete Company Notice',
      message: `Are you sure you want to permanently delete notice "${notice.title}"? This cannot be undone.`,
      confirmText: 'Delete Notice',
      variant: 'danger'
    });
    if (ok) {
      deleteNotice(notice._id || notice.id);
      addToast('Notice removed successfully', 'info');
      onClose();
    }
  };

  const totalEmployeesCount = (employees || []).filter(e =>
    !['resigned', 'relieved', 'inactive', 'terminated'].includes(String(e.status || 'active').toLowerCase())
  ).length || 1;

  const readRate = Math.min(100, Math.round((uniqueReadersCount / totalEmployeesCount) * 100));

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-3 sm:p-5 animate-fade-in" onClick={handleBackdropClick}>
      <div className="popup-spring bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[640px] max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto" onClick={handleCardClick}>
        {/* Header */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                notice.isImportant || notice.priority === 'urgent'
                  ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' 
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
              }`}>
                {notice.isImportant || notice.priority === 'urgent' ? '🔥 High Priority' : '📢 Notice'}
              </span>

              {isExpired ? (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                  ⌛ Expired
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  Active
                </span>
              )}

              <span className="text-xs text-slate-500 dark:text-slate-400">
                {notice.category || 'Company Announcement'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0 leading-snug">
              {notice.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex-1 min-h-0 overflow-y-auto space-y-4">
          {/* Metadata bar */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-slate-400" />
              <span>Posted By: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{notice.postedBy || notice.createdBy || 'Management'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <span>Published: <strong>{notice.date}</strong></span>
            </div>
            {notice.expiryDate && (
              <div className="flex items-center gap-1.5">
                <Clock size={14} className={isExpired ? 'text-rose-500' : 'text-slate-400'} />
                <span>Expires: <strong className={isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}>{notice.expiryDate}</strong></span>
              </div>
            )}
          </div>

          {/* Expired Warning Alert */}
          {isExpired && (
            <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>
                <strong>Archived Notice:</strong> This announcement reached its expiry date on <strong>{notice.expiryDate}</strong> and is kept for historical reference.
              </span>
            </div>
          )}

          {/* Target Audience Badge */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Users size={14} className="text-slate-400" />
            <span>Target Audience: <strong className="text-blue-600 dark:text-blue-400">{notice.to || notice.targetAudience || 'All Employees'}</strong></span>
          </div>

          {/* Full Content */}
          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 sm:p-5 shadow-xs">
            {notice.fullContent || notice.description || notice.shortDescription}
          </div>

          {/* User Acknowledgment Status Pill */}
          <div className="p-3 rounded-xl border flex items-center justify-between flex-wrap gap-2 text-xs transition-colors bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              {hasAcknowledged ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400">
                      Acknowledged & Read by You
                    </div>
                    {myAckRecord?.date && (
                      <div className="text-[11px] text-slate-400">
                        Confirmed on {myAckRecord.date}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Clock size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      Acknowledgment Required
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Confirm you have read and understood this circular
                    </div>
                  </div>
                </>
              )}
            </div>

            {!hasAcknowledged && (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={submittingAck}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{submittingAck ? 'Confirming...' : 'Acknowledge Now'}</span>
              </button>
            )}
          </div>

          {/* HR / Admin Read Receipts Compliance Panel */}
          {isPrivileged && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setShowReadReceipts(prev => !prev)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-left font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-blue-600 dark:text-blue-400" />
                  <span>HR Compliance: Employee Read Receipts</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold">
                    {uniqueReadersCount} / {totalEmployeesCount} ({readRate}%)
                  </span>
                </div>
                {showReadReceipts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showReadReceipts && (
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  {/* Tabs: Read vs Pending */}
                  <div className="flex items-center gap-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <button
                      type="button"
                      onClick={() => setReceiptsTab('read')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border-none ${
                        receiptsTab === 'read'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-transparent'
                      }`}
                    >
                      ✓ Read ({allReaders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptsTab('pending')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border-none ${
                        receiptsTab === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-transparent'
                      }`}
                    >
                      ⏳ Pending ({pendingEmployees.length})
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {receiptsTab === 'read' ? (
                      allReaders.length === 0 ? (
                        <div className="text-slate-400 text-center py-3 italic text-[11px]">
                          No employee acknowledgments recorded yet.
                        </div>
                      ) : (
                        allReaders.map((reader, idx) => (
                          <div
                            key={reader.userId || reader.userCode || idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors text-[11.5px]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={reader.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={reader.userName}
                                className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                  <span>{reader.userName}</span>
                                  {String(reader.userId) === userId && (
                                    <span className="text-[9.5px] px-1 py-0.2 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 font-bold">You</span>
                                  )}
                                </div>
                                <div className="text-slate-400 dark:text-slate-500 text-[10px] truncate">
                                  {reader.userRole || 'Member'} {reader.department ? `• ${reader.department}` : ''} {reader.userCode ? `• ${reader.userCode}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 text-emerald-600 dark:text-emerald-400 font-semibold text-[10.5px] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                              <CheckCircle2 size={11} />
                              <span>{reader.date || 'Read'}</span>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      pendingEmployees.length === 0 ? (
                        <div className="text-emerald-600 dark:text-emerald-400 text-center py-4 font-semibold text-[11px]">
                          🎉 All employees have read and acknowledged this notice!
                        </div>
                      ) : (
                        pendingEmployees.map((emp, idx) => (
                          <div
                            key={emp._id || emp.id || idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11.5px] opacity-80"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={emp.name}
                                className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 grayscale"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                                  {emp.name}
                                </div>
                                <div className="text-slate-400 text-[10px] truncate">
                                  {emp.role || emp.designation || 'Team Member'} {emp.department ? `• ${emp.department}` : ''} {emp.employeeCode ? `• ${emp.employeeCode}` : ''}
                                </div>
                              </div>
                            </div>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold text-[10px] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 shrink-0">
                              Pending
                            </span>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete Notice</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border-none px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
