/**
 * @file ExpenseDetailModal.jsx
 * @description Modal showing full expense details, bill attachment, and admin approval buttons.
 */

import React from 'react';
import {
  X,
  DollarSign,
  Building,
  Calendar,
  User,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { isHRorAdmin, isAdmin } from '../../../shared/utils/permissionUtils';

export const ExpenseDetailModal = ({ expense, isOpen, onClose }) => {
  const { updateExpenseStatus, deleteExpense } = useCRM();
  const { currentUser } = useAuth();
  const { confirm } = useConfirm();

  if (!isOpen || !expense) return null;

  const isClaimant = (expense.employeeId && currentUser?._id && expense.employeeId === currentUser._id) ||
    (expense.employeeName && currentUser?.name && expense.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
  const canApprove = !isClaimant && isHRorAdmin(currentUser);
  const canDelete = isAdmin(currentUser) || (isClaimant && expense.status === 'pending');

  const handleStatusChange = (status) => {
    updateExpenseStatus(expense._id, status);
    onClose();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Expense',
      message: `Are you sure you want to delete expense "${expense.itemName}"? This action cannot be undone.`,
      confirmText: 'Delete Expense',
      variant: 'danger'
    });
    if (ok) {
      deleteExpense(expense._id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <span className="text-[11px] font-bold px-2 py-[3px] rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              {expense.expenseCode || 'EXP-101'}
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1.5 m-0">
              {expense.itemName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-[18px]">
          
          {/* Price Banner */}
          <div className="p-4 px-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Amount</span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                ₹{(expense.price || expense.amount || 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold ${
                expense.status === 'approved'
                  ? 'bg-green-100 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-400 border border-green-200 dark:border-emerald-800'
                  : expense.status === 'pending'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                  : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}>
                {expense.status === 'approved' && <CheckCircle2 size={15} />}
                {expense.status === 'pending' && <Clock size={15} />}
                {expense.status === 'rejected' && <XCircle size={15} />}
                {expense.status?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Category</span>
              <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {expense.category || 'Utilities & Office'}
              </div>
            </div>

            <div>
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Purchased From</span>
              <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {expense.purchasedFrom || 'Vendor'}
              </div>
            </div>

            <div>
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Employee / Paid By</span>
              <div className="flex items-center gap-2 mt-1">
                <img
                  src={expense.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={expense.employeeName || 'Employee'}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                  {expense.employeeName || expense.paidBy || 'Employee'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Purchase Date</span>
              <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {expense.purchaseDate || expense.date || '25-09-2026'}
              </div>
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <div>
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Description</span>
              <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mt-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                {expense.description}
              </p>
            </div>
          )}

          {/* Bill Attachment */}
          {expense.billAttachment && (
            <div>
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Attachment / Invoice Proof</span>
              <div className="mt-1.5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-[13px] text-slate-900 dark:text-slate-100 font-medium">
                    Invoice_Receipt_{expense.expenseCode || '101'}.pdf
                  </span>
                </div>
                <a
                  href={expense.billAttachment}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 no-underline transition-colors"
                >
                  <ExternalLink size={14} />
                  View Bill
                </a>
              </div>
            </div>
          )}

          {/* Admin Status Actions */}
          <div className={`flex items-center pt-4 border-t border-slate-100 dark:border-slate-800 mt-2 ${canDelete ? 'justify-between' : 'justify-end'}`}>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-[12.5px] font-semibold cursor-pointer transition-colors"
              >
                <Trash2 size={14} />
                {isClaimant ? 'Cancel Claim' : 'Delete'}
              </button>
            )}

            <div className="flex gap-2 items-center">
              {isClaimant && expense.status === 'pending' && (
                <span className="text-[11.5px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-md font-bold">
                  ⏳ Awaiting HR / Finance Approval
                </span>
              )}

              {canApprove && (
                <>
                  {expense.status !== 'approved' && (
                    <button
                      onClick={() => handleStatusChange('approved')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-0 bg-green-600 hover:bg-green-700 text-white text-[12.5px] font-bold cursor-pointer shadow-xs transition-colors"
                    >
                      <CheckCircle2 size={14} />
                      Approve Expense
                    </button>
                  )}

                  {expense.status !== 'rejected' && (
                    <button
                      onClick={() => handleStatusChange('rejected')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-0 bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-bold cursor-pointer shadow-xs transition-colors"
                    >
                      <XCircle size={14} />
                      Reject Expense
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
