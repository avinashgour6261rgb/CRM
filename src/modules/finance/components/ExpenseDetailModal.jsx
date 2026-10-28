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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#eff6ff',
              color: '#2563eb'
            }}>
              {expense.expenseCode || 'EXP-101'}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '6px 0 0' }}>
              {expense.itemName}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Price Banner */}
          <div style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Total Amount</span>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                ₹{(expense.price || expense.amount || 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                backgroundColor: expense.status === 'approved' ? '#dcfce7' : expense.status === 'pending' ? '#fef3c7' : '#fee2e2',
                color: expense.status === 'approved' ? '#15803d' : expense.status === 'pending' ? '#b45309' : '#b91c1c'
              }}>
                {expense.status === 'approved' && <CheckCircle2 size={15} />}
                {expense.status === 'pending' && <Clock size={15} />}
                {expense.status === 'rejected' && <XCircle size={15} />}
                {expense.status?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Category</span>
              <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                {expense.category || 'Utilities & Office'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Purchased From</span>
              <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                {expense.purchasedFrom || 'Vendor'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Employee / Paid By</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <img
                  src={expense.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={expense.employeeName || 'Employee'}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                  {expense.employeeName || expense.paidBy || 'Employee'}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Purchase Date</span>
              <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>
                {expense.purchaseDate || expense.date || '25-09-2026'}
              </div>
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <div>
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Description</span>
              <p style={{
                fontSize: '13px',
                color: '#334155',
                lineHeight: '1.6',
                marginTop: '4px',
                backgroundColor: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #f1f5f9'
              }}>
                {expense.description}
              </p>
            </div>
          )}

          {/* Bill Attachment */}
          {expense.billAttachment && (
            <div>
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Attachment / Invoice Proof</span>
              <div style={{
                marginTop: '6px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#2563eb" />
                  <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                    Invoice_Receipt_{expense.expenseCode || '101'}.pdf
                  </span>
                </div>
                <a
                  href={expense.billAttachment}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#2563eb',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={14} />
                  View Bill
                </a>
              </div>
            </div>
          )}

          {/* Admin Status Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: canDelete ? 'space-between' : 'flex-end',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
            marginTop: '8px'
          }}>
            {canDelete && (
              <button
                onClick={handleDelete}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #fee2e2',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} />
                {isClaimant ? 'Cancel Claim' : 'Delete'}
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isClaimant && expense.status === 'pending' && (
                <span style={{ fontSize: '11.5px', color: '#d97706', background: '#fef3c7', padding: '4px 10px', borderRadius: '6px', fontWeight: '700' }}>
                  ⏳ Awaiting HR / Finance Approval
                </span>
              )}

              {canApprove && (
                <>
                  {expense.status !== 'approved' && (
                    <button
                      onClick={() => handleStatusChange('approved')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      <CheckCircle2 size={14} />
                      Approve Expense
                    </button>
                  )}

                  {expense.status !== 'rejected' && (
                    <button
                      onClick={() => handleStatusChange('rejected')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
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
