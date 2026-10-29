/**
 * @file TicketDetailModal.jsx
 * @description Interactive ticket details drawer/modal with instant Admin & Employee discussion thread, status switcher, internal notes, and team assignment.
 */

import React, { useState } from 'react';
import {
  X,
  Send,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  ShieldAlert,
  Lock,
  MessageSquare,
  FileText,
  UserCheck,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { useCRM } from '../../../../shared/context/CRMContext';
import { useHR } from '../../../hr/context/HRContext';
import { useConfirm } from '../../../../shared/context/ConfirmContext';

export const TicketDetailModal = ({ ticket, isOpen, onClose }) => {
  const { replyToTicket, updateTicketStatus, addTicketInternalNote, assignTicket, deleteTicket } = useCRM();
  const { currentUser, employees } = useHR();
  const { confirm } = useConfirm();

  const [replyText, setReplyText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [activeTab, setActiveTab] = useState('conversation'); // 'conversation' | 'internal_notes'

  if (!isOpen || !ticket) return null;

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyToTicket(ticket._id, replyText);
    setReplyText('');
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;
    addTicketInternalNote(ticket._id, internalNoteText);
    setInternalNoteText('');
  };

  const handleStatusChange = (status) => {
    updateTicketStatus(ticket._id, status);
  };

  const handleAssign = (empId) => {
    assignTicket(ticket._id, empId);
  };

  const isPrivileged = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr';
  const uId = String(currentUser?._id || '');
  const uCode = String(currentUser?.employeeCode || '');
  const uName = (currentUser?.name || '').toLowerCase().trim();

  const isRequester =
    (uId && String(ticket.requestedById) === uId) ||
    (uCode && String(ticket.requestedById) === uCode) ||
    (uId && String(ticket.createdBy) === uId) ||
    (uCode && String(ticket.createdBy) === uCode) ||
    (uName && ticket.requestedByName && ticket.requestedByName.toLowerCase().trim() === uName) ||
    (uName && ticket.createdByName && ticket.createdByName.toLowerCase().trim() === uName);

  const canDelete = isPrivileged || isRequester;

  const handleDeleteClick = async () => {
    const ok = await confirm({
      title: 'Delete Support Ticket?',
      message: `Are you sure you want to permanently delete "${ticket.ticketCode}: ${ticket.subject}"? This action cannot be undone.`,
      confirmText: 'Yes, Delete Ticket',
      cancelText: 'Keep Ticket',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await deleteTicket(ticket._id || ticket.ticketCode);
      onClose();
    } catch {
      // Handled
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-[#151e32] rounded-2xl w-full max-w-[740px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-[#243049] flex flex-col">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 dark:border-[#243049] flex items-center justify-between bg-slate-50 dark:bg-[#18233c] rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold py-[3px] px-2 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                {ticket.ticketCode}
              </span>
              <span className={`text-[11px] font-bold py-[3px] px-2 rounded-md uppercase ${
                ticket.priority === 'urgent'
                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                  : ticket.priority === 'high'
                  ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {ticket.priority}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 m-0 mt-1.5">
              {ticket.subject}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={handleDeleteClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                title="Delete this ticket permanently"
              >
                <Trash2 size={13} />
                <span>Delete Ticket</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-5">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Requester */}
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Requester</span>
              <div className="flex items-center gap-1.5 mt-1">
                <img
                  src={ticket.requestedByAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={ticket.requestedByName}
                  className="w-[22px] h-[22px] rounded-full object-cover"
                />
                <span className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100">
                  {ticket.requestedByName}
                </span>
              </div>
            </div>

            {/* Requested On */}
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Requested On</span>
              <div className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 mt-1">
                {ticket.requestedOn}
              </div>
            </div>

            {/* Category */}
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Category</span>
              <div className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 mt-1">
                {ticket.category || 'General Support'}
              </div>
            </div>

            {/* Status Switcher */}
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Status</span>
              <select
                value={ticket.status}
                onChange={e => handleStatusChange(e.target.value)}
                className={`block mt-1 py-1 px-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold outline-none cursor-pointer ${
                  ticket.status === 'resolved' || ticket.status === 'closed' ? 'text-green-600' : 'text-blue-600'
                }`}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Assigned Support</span>
              <select
                value={ticket.assignedToId || 'emp_005'}
                onChange={e => handleAssign(e.target.value)}
                className="block mt-1 py-1 px-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none cursor-pointer max-w-[160px]"
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.role?.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Card */}
          <div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ticket Problem Description</span>
            <div className="mt-1.5 p-3.5 px-4 rounded-[10px] bg-white dark:bg-[#18233c] border border-slate-200 dark:border-slate-700 text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">
              {ticket.description || 'No detailed description provided.'}
            </div>
          </div>

          {/* Discussion Tabs (Discussion Thread vs Admin Internal Notes) */}
          <div>
            <div className="flex gap-3 border-b border-slate-200 dark:border-slate-700 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('conversation')}
                className={`bg-transparent border-none py-1.5 px-3 text-[13px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors ${
                  activeTab === 'conversation'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare size={15} />
                Conversation Stream ({ticket.replies?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('internal_notes')}
                className={`bg-transparent border-none py-1.5 px-3 text-[13px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors ${
                  activeTab === 'internal_notes'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Lock size={14} />
                Admin Internal Notes ({ticket.internalNotes?.length || 0})
              </button>
            </div>

            {/* Conversation Tab Body */}
            {activeTab === 'conversation' && (
              <div className="mt-3.5 flex flex-col gap-3">
                <div className="max-h-[260px] overflow-y-auto flex flex-col gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-slate-700">
                  {(!ticket.replies || ticket.replies.length === 0) ? (
                    <div className="text-center py-6 text-slate-400 text-[13px]">
                      No replies yet. Admin can reply below to initiate conversation with employee.
                    </div>
                  ) : (
                    ticket.replies.map(rep => (
                      <div
                        key={rep.id}
                        className={`flex flex-col max-w-[85%] ${rep.isAdminReply ? 'self-end' : 'self-start'}`}
                      >
                        <div className={`flex items-center gap-1.5 mb-1 ${rep.isAdminReply ? 'self-end' : 'self-start'}`}>
                          <img
                            src={rep.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={rep.senderName}
                            className="w-[18px] h-[18px] rounded-full"
                          />
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {rep.senderName}
                          </span>
                          <span className="text-[10.5px] text-slate-400">
                            {new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className={`p-2.5 px-3.5 rounded-[10px] text-[13px] leading-relaxed shadow-xs ${
                          rep.isAdminReply
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {rep.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Input Bar */}
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your response to the employee / admin..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="flex-1 py-2.5 px-3.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 py-2.5 px-[18px] rounded-lg border-none bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold cursor-pointer transition-colors"
                  >
                    <Send size={15} />
                    Send Reply
                  </button>
                </form>
              </div>
            )}

            {/* Internal Notes Tab Body */}
            {activeTab === 'internal_notes' && (
              <div className="mt-3.5 flex flex-col gap-3">
                <div className="max-h-[220px] overflow-y-auto flex flex-col gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-[10px] border border-amber-200 dark:border-amber-900/50">
                  {(!ticket.internalNotes || ticket.internalNotes.length === 0) ? (
                    <div className="text-center py-[18px] text-amber-700 dark:text-amber-400 text-[12.5px]">
                      No internal notes recorded. Internal notes are only visible to Admins/Managers.
                    </div>
                  ) : (
                    ticket.internalNotes.map(n => (
                      <div key={n.id} className="bg-white dark:bg-slate-800 p-2.5 px-3 rounded-md border border-amber-200 dark:border-amber-900/40">
                        <div className="flex justify-between text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                          <span>🔒 Note by {n.author}</span>
                          <span>{new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="m-0 mt-1 text-[12.5px] text-amber-950 dark:text-amber-200">{n.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add private internal admin note..."
                    value={internalNoteText}
                    onChange={e => setInternalNoteText(e.target.value)}
                    className="flex-1 py-2.5 px-3.5 rounded-lg border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/40 text-[13px] text-amber-900 dark:text-amber-200 outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="py-2.5 px-4 rounded-lg border-none bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-bold cursor-pointer transition-colors"
                  >
                    Attach Note
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
