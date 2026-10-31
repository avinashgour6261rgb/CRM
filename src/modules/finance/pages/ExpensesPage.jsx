/**
 * @file ExpensesPage.jsx
 * @description Dedicated Finance & Expenses Management Page matching Screenshot 1 exactly.
 */

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  DollarSign,
  ChevronDown,
  Calendar,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { isHRorAdmin, getUserModulePermissions } from '../../../shared/utils/permissionUtils';
import { matchesFilter, matchesDateRange, matchesSearch } from '../../../shared/utils/filterUtils';
import { ExpenseKPIOverview } from '../components/ExpenseKPIOverview';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ExpenseDetailModal } from '../components/ExpenseDetailModal';
import { ImportExpensesModal } from '../components/ImportExpensesModal';

export const ExpensesPage = () => {
  const { expenses, updateExpenseStatus, deleteExpense } = useCRM();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const isPrivileged = useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const perms = useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  const canViewAllExpenses = isPrivileged || perms?.accessFinance || perms?.viewAllExpenses;

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Scoped expenses based on role (Regular employees only see their own expense claims)
  const scopedExpenses = useMemo(() => {
    if (canViewAllExpenses) return expenses || [];
    if (!currentUser) return expenses || [];
    const uId = String(currentUser._id || currentUser.id || '').toLowerCase();
    const uCode = String(currentUser.employeeCode || '').toLowerCase();
    const uName = (currentUser.name || '').toLowerCase().trim();
    return (expenses || []).filter(exp => {
      const eId = String(exp.employeeId || exp.employee || '').toLowerCase();
      const eCode = String(exp.employeeCode || '').toLowerCase();
      const eName = (exp.employeeName || '').toLowerCase().trim();
      return (uId && eId === uId) || (uCode && (eId === uCode || eCode === uCode)) || (uName && eName === uName);
    });
  }, [expenses, canViewAllExpenses, currentUser]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return scopedExpenses.filter(exp => {
      const matchSearch = matchesSearch(exp, search, [
        'itemName', 'purchasedFrom', 'employeeName', 'category', 'expenseCode', 'description'
      ]);

      const matchStatus = statusFilter === 'all' || matchesFilter(exp.status, statusFilter);
      const matchDate = matchesDateRange(exp.purchaseDate || exp.date || exp.createdAt, startDateFilter, endDateFilter);

      return matchSearch && matchStatus && matchDate;
    });
  }, [scopedExpenses, search, statusFilter, startDateFilter, endDateFilter]);

  // Select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredExpenses.map(item => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Export to CSV
  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      alert('No expense records available to export');
      return;
    }

    const headers = ['Id,Item Name,Price,Employees,Purchased From,Purchase Date,Status,Category,Description'];
    const rows = filteredExpenses.map(e =>
      `"${e.expenseCode || e.idNumber}","${e.itemName}","${e.price || e.amount}","${e.employeeName || e.paidBy}","${e.purchasedFrom || ''}","${e.purchaseDate || e.date}","${e.status}","${e.category || ''}","${(e.description || '').replace(/"/g, '""')}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `company_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Expenses exported successfully to CSV!', 'success');
  };

  return (
    <div className="flex flex-col gap-3">

      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <DollarSign size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Finance & Expense Management</h1>
              <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 font-bold">
                {filteredExpenses.length} Records
              </span>
            </div>
            <p className="mt-0.5 m-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Track vouchers, claims, bills, vendor payouts & reimbursement statuses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            <Upload size={13} />
            Import
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-white dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700/60 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs font-bold cursor-pointer shadow-xs transition-colors"
          >
            <Plus size={14} />
            Add Expense
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <ExpenseKPIOverview expenses={scopedExpenses} />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 px-3 flex items-center justify-between flex-wrap gap-2.5 shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">

          {/* Duration */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Duration:</span>
            <div className="flex items-center gap-1 px-2 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11.5px]">
              <input
                type="date"
                value={startDateFilter}
                onChange={e => setStartDateFilter(e.target.value)}
                className="border-0 bg-transparent outline-none text-[11.5px] text-slate-700 dark:text-slate-200 cursor-pointer"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                className="border-0 bg-transparent outline-none text-[11.5px] text-slate-700 dark:text-slate-200 cursor-pointer"
              />
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-[30px] px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none cursor-pointer focus:border-blue-500 transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 min-w-[220px] focus-within:border-blue-500 transition-colors">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search item, vendor, employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-0 outline-none text-xs w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <span className="text-[11.5px] text-blue-600 dark:text-blue-400 font-bold">
            {selectedIds.length} expenses selected
          </span>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider text-left">
                <th className="p-2 px-3 w-9 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length}
                    onChange={handleSelectAll}
                    className="accent-blue-600 cursor-pointer"
                  />
                </th>
                <th className="p-2 px-3 w-[60px] whitespace-nowrap">Id</th>
                <th className="p-2 px-3 whitespace-nowrap">Item & Category</th>
                <th className="p-2 px-3 whitespace-nowrap">Amount</th>
                <th className="p-2 px-3 whitespace-nowrap">Claimed By</th>
                <th className="p-2 px-3 whitespace-nowrap">Vendor / Merchant</th>
                <th className="p-2 px-3 whitespace-nowrap">Purchase Date</th>
                <th className="p-2 px-3 whitespace-nowrap">Status</th>
                <th className="p-2 px-3 text-center w-20 whitespace-nowrap">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-9 text-center text-slate-500 dark:text-slate-400">
                    <div className="text-[13px] font-medium">No expense records found</div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => (
                  <tr
                    key={exp._id}
                    className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${selectedIds.includes(exp._id)
                        ? 'bg-blue-600/10 dark:bg-blue-900/30'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                      }`}
                  >
                    {/* Checkbox */}
                    <td className="py-[7px] px-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(exp._id)}
                        onChange={() => handleSelectOne(exp._id)}
                        className="accent-blue-600 cursor-pointer"
                      />
                    </td>

                    {/* Id */}
                    <td className="py-[7px] px-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {exp.idNumber || idx + 1}
                    </td>

                    {/* Item Name */}
                    <td className="py-[7px] px-3">
                      <div
                        onClick={() => setSelectedExpense(exp)}
                        className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {exp.itemName}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-[1px]">
                        {exp.category || 'Utilities & Office'}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-[7px] px-3 font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      ₹{(exp.price || exp.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Employees / Paid By */}
                    <td className="py-[7px] px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={exp.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={exp.employeeName || 'Employee'}
                          className="w-[22px] h-[22px] rounded-full object-cover"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {exp.employeeName || exp.paidBy || 'Employee'}
                        </span>
                      </div>
                    </td>

                    {/* Purchased From */}
                    <td className="py-[7px] px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {exp.purchasedFrom || '—'}
                    </td>

                    {/* Purchase Date */}
                    <td className="py-[7px] px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {exp.purchaseDate || exp.date || '25-09-2026'}
                    </td>

                    {/* Status */}
                    <td className="py-[7px] px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-[3px] px-[7px] py-0.5 rounded text-[11px] font-bold capitalize ${exp.status === 'approved'
                          ? 'bg-green-100 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-400 border border-green-200 dark:border-emerald-800'
                          : exp.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                        }`}>
                        {exp.status === 'approved' && <CheckCircle2 size={12} />}
                        {exp.status === 'pending' && <Clock size={12} />}
                        {exp.status === 'rejected' && <XCircle size={12} />}
                        {exp.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-[7px] px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedExpense(exp)}
                        className="bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded px-2 py-[3px] cursor-pointer text-blue-600 dark:text-blue-300 text-[11.5px] font-bold transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-2 px-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span>Show</span>
            <select className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[11.5px] outline-none">
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>entries</span>
          </div>

          <div>
            Showing 1 to {filteredExpenses.length} of {expenses.length} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled
              className="px-2 py-[3px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[11.5px] cursor-not-allowed"
            >
              Prev
            </button>
            <button className="px-2 py-[3px] rounded border border-blue-600 bg-blue-600 text-white text-[11.5px] font-bold cursor-pointer">
              1
            </button>
            <button
              disabled
              className="px-2 py-[3px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 text-[11.5px] cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      <ImportExpensesModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
        />
      )}
    </div>
  );
};
