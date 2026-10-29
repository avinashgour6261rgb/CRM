/**
 * @file ExpenseKPIOverview.jsx
 * @description KPI summary cards for Expenses (Total, Approved, Pending, Rejected, Monthly).
 */

import React from 'react';
import {
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  PieChart,
  ArrowUpRight
} from 'lucide-react';

export const ExpenseKPIOverview = ({ expenses = [] }) => {
  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.price || e.amount) || 0), 0);
  const approvedAmount = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (Number(e.price || e.amount) || 0), 0);
  const pendingAmount = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (Number(e.price || e.amount) || 0), 0);
  const rejectedAmount = expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + (Number(e.price || e.amount) || 0), 0);

  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const approvedCount = expenses.filter(e => e.status === 'approved').length;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 mb-2.5">
      {/* Total Expenses */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-blue-500 p-2.5 px-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Expenses</span>
          <div className="w-[26px] h-[26px] rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <DollarSign size={15} />
          </div>
        </div>
        <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1 leading-tight">
          ₹{totalAmount.toLocaleString('en-IN')}
        </div>
        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
          {expenses.length} recorded items
        </div>
      </div>

      {/* Approved Expenses */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-emerald-500 p-2.5 px-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Approved</span>
          <div className="w-[26px] h-[26px] rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={15} />
          </div>
        </div>
        <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">
          ₹{approvedAmount.toLocaleString('en-IN')}
        </div>
        <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
          {approvedCount} items cleared
        </div>
      </div>

      {/* Pending Expenses */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-amber-500 p-2.5 px-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pending Review</span>
          <div className="w-[26px] h-[26px] rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock size={15} />
          </div>
        </div>
        <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-1 leading-tight">
          ₹{pendingAmount.toLocaleString('en-IN')}
        </div>
        <div className="text-[10.5px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
          {pendingCount} items waiting
        </div>
      </div>

      {/* Rejected Expenses */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-red-500 p-2.5 px-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Rejected</span>
          <div className="w-[26px] h-[26px] rounded-md bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
            <XCircle size={15} />
          </div>
        </div>
        <div className="text-lg font-extrabold text-red-600 dark:text-red-400 mt-1 leading-tight">
          ₹{rejectedAmount.toLocaleString('en-IN')}
        </div>
        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
          Non-compliant requests
        </div>
      </div>
    </div>
  );
};
