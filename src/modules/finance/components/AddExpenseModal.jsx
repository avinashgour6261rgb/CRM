/**
 * @file AddExpenseModal.jsx
 * @description Modal form for submitting or recording company expenses with receipts, category, and paidBy metadata.
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  DollarSign,
  Building,
  Calendar,
  User,
  FileText,
  Upload,
  Sparkles,
  Check,
  Tag,
  Paperclip,
  Trash2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useHR } from '../../hr/context/HRContext';
import { isHRorAdmin } from '../../../shared/utils/permissionUtils';

export const AddExpenseModal = ({ isOpen, onClose }) => {
  const { createExpense } = useCRM();
  const { currentUser } = useAuth();
  const { employees } = useHR();

  const isPrivileged = useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const now = new Date().toISOString().split('T')[0];
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    itemName: '',
    price: '',
    category: 'Utilities & Office',
    purchasedFrom: '',
    purchaseDate: now,
    employeeId: currentUser?._id || employees[0]?._id || 'emp_001',
    status: isPrivileged ? 'approved' : 'pending',
    description: '',
    billAttachment: ''
  });

  const [fileInfo, setFileInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync default employee & status on modal open
  React.useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        employeeId: isPrivileged ? (prev.employeeId || currentUser?._id) : (currentUser?._id || 'emp_001'),
        status: isPrivileged ? prev.status : 'pending'
      }));
    }
  }, [isOpen, isPrivileged, currentUser]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please upload a smaller receipt or invoice.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, billAttachment: reader.result }));
      setFileInfo({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, billAttachment: '' }));
    setFileInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName.trim() || !formData.price) {
      alert('Please enter an Expense Item Name and Price');
      return;
    }

    try {
      setSubmitting(true);
      const targetEmpId = isPrivileged ? formData.employeeId : (currentUser?._id || 'emp_001');
      const selectedEmployee = employees.find(emp => emp._id === targetEmpId) || currentUser;

      await createExpense({
        ...formData,
        employeeId: targetEmpId,
        status: isPrivileged ? formData.status : 'pending',
        price: Number(formData.price),
        amount: Number(formData.price),
        employeeName: selectedEmployee?.name || currentUser?.name || 'Employee',
        paidBy: selectedEmployee?.name || currentUser?.name || 'Employee',
        employeeAvatar: selectedEmployee?.avatar || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      });

      // Reset
      setFormData({
        itemName: '',
        price: '',
        category: 'Utilities & Office',
        purchasedFrom: '',
        purchaseDate: now,
        employeeId: currentUser?._id || 'emp_001',
        status: isPrivileged ? 'approved' : 'pending',
        description: '',
        billAttachment: ''
      });
      setFileInfo(null);
      onClose();
    } catch (err) {
      console.error('Error creating expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[620px] max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 px-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 m-0">
                {isPrivileged ? 'Record Company Expense' : 'Submit Reimbursement Claim'}
              </h2>
            </div>
            <p className="text-[12px] sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-1 ml-10 m-0">
              {isPrivileged
                ? 'Record verified company expense or approve team reimbursements'
                : 'Submit receipt proof for business expense reimbursement'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-4">

          {/* Row 1: Item Name & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Item Name / Expense Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AWS Cloud Hosting, Office Fiber Broadband"
                value={formData.itemName}
                onChange={e => handleChange('itemName', e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Price (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 2500"
                value={formData.price}
                onChange={e => handleChange('price', e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Category & Purchased From */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Expense Category
              </label>
              <select
                value={formData.category}
                onChange={e => handleChange('category', e.target.value)}
                className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer focus:border-blue-500 transition-colors"
              >
                <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                <option value="Software & Tools">Software & Tools</option>
                <option value="Hardware & Devices">Hardware & Devices</option>
                <option value="Utilities & Office">Utilities & Office</option>
                <option value="Team & Events">Team & Events</option>
                <option value="Marketing & Ads">Marketing & Ads</option>
                <option value="Travel & Lodging">Travel & Lodging</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Purchased From / Vendor
              </label>
              <input
                type="text"
                placeholder="e.g. Amazon Web Services, Apple, Airtel"
                value={formData.purchasedFrom}
                onChange={e => handleChange('purchasedFrom', e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 3: Employee / Paid By & Purchase Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Employee / Paid By
              </label>
              {isPrivileged ? (
                <select
                  value={formData.employeeId}
                  onChange={e => handleChange('employeeId', e.target.value)}
                  className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer focus:border-blue-500 transition-colors"
                >
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} — {emp.role}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full h-[38px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="font-semibold">{currentUser?.name || 'My Account'}</span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">
                    Self Claim
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={e => handleChange('purchaseDate', e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 4: Status (Privileged vs Team Member) */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Approval Status
            </label>
            {isPrivileged ? (
              <div className="flex gap-3">
                {['approved', 'pending', 'rejected'].map(st => (
                  <label
                    key={st}
                    className={`flex-1 p-2.5 px-3.5 rounded-lg cursor-pointer flex items-center gap-2 text-[13px] font-semibold capitalize transition-all ${
                      formData.status === st
                        ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/40'
                        : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    } ${
                      st === 'approved' ? 'text-green-600 dark:text-green-400' : st === 'pending' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === st}
                      onChange={() => handleChange('status', st)}
                      className="accent-blue-600 cursor-pointer"
                    />
                    {st}
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span>
                  Claims submitted by team members are saved as <strong>Pending</strong> and routed to HR / Finance for approval.
                </span>
              </div>
            )}
          </div>

          {/* Row 5: Receipt / Invoice Upload */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Receipt / Tax Invoice Proof (Images or PDF)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            {formData.billAttachment ? (
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {formData.billAttachment.startsWith('data:image') ? (
                    <img
                      src={formData.billAttachment}
                      alt="Receipt preview"
                      className="w-12 h-12 rounded-lg object-cover border border-blue-200 dark:border-blue-800 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FileText size={22} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate m-0">
                      {fileInfo?.name || 'Attached Receipt'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                      {fileInfo?.size || 'Receipt File Attached'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="px-2.5 py-1 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs font-semibold cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/60 dark:bg-slate-800/40 cursor-pointer flex flex-col items-center justify-center text-center transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center mb-1.5 transition-colors">
                  <Upload size={17} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 m-0">
                  Click to upload bill receipt or invoice
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 m-0 mt-0.5">
                  Supports PNG, JPG, WEBP, or PDF (up to 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Row 6: Description */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description & Business Justification
            </label>
            <textarea
              rows={2}
              placeholder="Provide reason for purchase, project attribution or invoice details..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full p-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-y font-sans focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-[18px] py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5.5 py-2.25 rounded-lg border-0 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold cursor-pointer shadow-md shadow-blue-600/35 disabled:opacity-50 transition-colors"
            >
              <Check size={16} />
              {submitting ? 'Recording...' : isPrivileged ? 'Record Expense' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
