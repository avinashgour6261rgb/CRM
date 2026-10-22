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
import { useToast } from '../../../shared/context/ToastContext';
import { ExpenseKPIOverview } from '../components/ExpenseKPIOverview';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ExpenseDetailModal } from '../components/ExpenseDetailModal';
import { ImportExpensesModal } from '../components/ImportExpensesModal';

export const ExpensesPage = () => {
  const { expenses, updateExpenseStatus, deleteExpense } = useCRM();
  const { addToast } = useToast();

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

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        (exp.itemName || '').toLowerCase().includes(q) ||
        (exp.purchasedFrom || '').toLowerCase().includes(q) ||
        (exp.employeeName || '').toLowerCase().includes(q) ||
        (exp.category || '').toLowerCase().includes(q) ||
        (exp.expenseCode || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;

      let matchesDate = true;
      const expDate = exp.purchaseDate || exp.date;
      if (startDateFilter && expDate && expDate < startDateFilter) matchesDate = false;
      if (endDateFilter && expDate && expDate > endDateFilter) matchesDate = false;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [expenses, search, statusFilter, startDateFilter, endDateFilter]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        minHeight: '68px',
        boxSizing: 'border-box',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DollarSign size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>Finance & Expense Management</h1>
              <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: '700' }}>
                {filteredExpenses.length} Records
              </span>
            </div>
            <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Track vouchers, claims, bills, vendor payouts & reimbursement statuses
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsImportOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Upload size={13} />
            Import
          </button>
          <button
            onClick={handleExport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#2563eb',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
            }}
          >
            <Plus size={14} />
            Add Expense
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <ExpenseKPIOverview expenses={expenses} />

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Duration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <span style={{ fontWeight: '600' }}>Duration:</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 8px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: '11.5px'
            }}>
              <input
                type="date"
                value={startDateFilter}
                onChange={e => setStartDateFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11.5px', color: '#334155' }}
              />
              <span style={{ color: '#94a3b8' }}>to</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11.5px', color: '#334155' }}
              />
            </div>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <span style={{ fontWeight: '600' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                height: '30px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 10px',
            height: '30px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            minWidth: '220px'
          }}>
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search item, vendor, employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                backgroundColor: 'transparent',
                color: '#0f172a'
              }}
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: '700' }}>
            {selectedIds.length} expenses selected
          </span>
        )}
      </div>

      {/* Expenses Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                color: '#64748b',
                fontWeight: '700',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textAlign: 'left'
              }}>
                <th style={{ padding: '8px 12px', width: '36px', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length}
                    onChange={handleSelectAll}
                    style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '8px 12px', width: '60px', whiteSpace: 'nowrap' }}>Id</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Item & Category</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Amount</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Claimed By</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Vendor / Merchant</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Purchase Date</th>
                <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '80px', whiteSpace: 'nowrap' }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>No expense records found</div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => (
                  <tr
                    key={exp._id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: selectedIds.includes(exp._id) ? 'rgba(37,99,235,0.04)' : '#ffffff',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(exp._id)}
                        onChange={() => handleSelectOne(exp._id)}
                        style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                    </td>

                    {/* Id */}
                    <td style={{ padding: '7px 12px', fontWeight: '600', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {exp.idNumber || idx + 1}
                    </td>

                    {/* Item Name */}
                    <td style={{ padding: '7px 12px' }}>
                      <div
                        onClick={() => setSelectedExpense(exp)}
                        style={{ fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}
                      >
                        {exp.itemName}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                        {exp.category || 'Utilities & Office'}
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '7px 12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      ₹{(exp.price || exp.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Employees / Paid By */}
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <img
                          src={exp.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={exp.employeeName || 'Employee'}
                          style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontWeight: '600', color: '#334155' }}>
                          {exp.employeeName || exp.paidBy || 'Employee'}
                        </span>
                      </div>
                    </td>

                    {/* Purchased From */}
                    <td style={{ padding: '7px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {exp.purchasedFrom || '—'}
                    </td>

                    {/* Purchase Date */}
                    <td style={{ padding: '7px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {exp.purchaseDate || exp.date || '25-09-2026'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: exp.status === 'approved' ? '#dcfce7' : exp.status === 'pending' ? '#fef3c7' : '#fee2e2',
                        color: exp.status === 'approved' ? '#15803d' : exp.status === 'pending' ? '#b45309' : '#b91c1c',
                        textTransform: 'capitalize'
                      }}>
                        {exp.status === 'approved' && <CheckCircle2 size={12} />}
                        {exp.status === 'pending' && <Clock size={12} />}
                        {exp.status === 'rejected' && <XCircle size={12} />}
                        {exp.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '7px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setSelectedExpense(exp)}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '5px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          color: '#2563eb',
                          fontSize: '11.5px',
                          fontWeight: '700'
                        }}
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
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          color: '#64748b',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Show</span>
            <select style={{
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '11.5px'
            }}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>entries</span>
          </div>

          <div>
            Showing 1 to {filteredExpenses.length} of {expenses.length} entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              disabled
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#94a3b8',
                fontSize: '11.5px',
                cursor: 'not-allowed'
              }}
            >
              Prev
            </button>
            <button
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #2563eb',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              1
            </button>
            <button
              disabled
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#94a3b8',
                fontSize: '11.5px',
                cursor: 'not-allowed'
              }}
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
