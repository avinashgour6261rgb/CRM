/**
 * @file AddExpenseModal.jsx
 * @description Modal form for submitting or recording company expenses with receipts, category, and paidBy metadata.
 */

import React, { useState } from 'react';
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
  Tag
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useHR } from '../../hr/context/HRContext';

export const AddExpenseModal = ({ isOpen, onClose }) => {
  const { createExpense } = useCRM();
  const { employees, currentUser } = useHR();

  const now = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    itemName: '',
    price: '',
    category: 'Utilities & Office',
    purchasedFrom: '',
    purchaseDate: now,
    employeeId: currentUser?._id || employees[0]?._id || 'emp_001',
    status: 'approved',
    description: '',
    billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500'
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName.trim() || !formData.price) {
      alert('Please enter an Expense Item Name and Price');
      return;
    }

    try {
      setSubmitting(true);
      const selectedEmployee = employees.find(emp => emp._id === formData.employeeId) || currentUser;

      await createExpense({
        ...formData,
        price: Number(formData.price),
        amount: Number(formData.price),
        employeeName: selectedEmployee?.name || currentUser?.name || 'Employee',
        paidBy: selectedEmployee?.name || currentUser?.name || 'Employee',
        employeeAvatar: selectedEmployee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      });

      // Reset
      setFormData({
        itemName: '',
        price: '',
        category: 'Utilities & Office',
        purchasedFrom: '',
        purchaseDate: now,
        employeeId: currentUser?._id || 'emp_001',
        status: 'approved',
        description: '',
        billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500'
      });
      onClose();
    } catch (err) {
      console.error('Error creating expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[1000] p-5">
      <div className="bg-white rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 m-0">
                Add New Company Expense
              </h2>
            </div>
            <p className="text-[12.5px] text-slate-500 mt-1 ml-10 m-0">
              Record company purchase, assign paying employee, and upload receipt proof
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white border border-slate-200 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          
          {/* Row 1: Item Name & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Item Name / Expense Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AWS Cloud Hosting, Office Fiber Broadband"
                value={formData.itemName}
                onChange={e => handleChange('itemName', e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 text-[13px] outline-none bg-white text-slate-900 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Price (₹) *
              </label>
              <input
                type="number"
                required
                placeholder="e.g. 25000"
                value={formData.price}
                onChange={e => handleChange('price', e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 text-[13px] outline-none bg-white text-slate-900 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Category & Purchased From */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Expense Category
              </label>
              <select
                value={formData.category}
                onChange={e => handleChange('category', e.target.value)}
                className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 text-[13px] outline-none bg-white text-slate-900 cursor-pointer focus:border-blue-500 transition-colors"
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
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Purchased From / Vendor
              </label>
              <input
                type="text"
                placeholder="e.g. Amazon Web Services, Apple, Airtel"
                value={formData.purchasedFrom}
                onChange={e => handleChange('purchasedFrom', e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 text-[13px] outline-none bg-white text-slate-900 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 3: Employee / Paid By & Purchase Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Employee / Paid By
              </label>
              <select
                value={formData.employeeId}
                onChange={e => handleChange('employeeId', e.target.value)}
                className="w-full h-[38px] px-2.5 rounded-lg border border-slate-300 text-[13px] outline-none bg-white text-slate-900 cursor-pointer focus:border-blue-500 transition-colors"
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} — {emp.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={e => handleChange('purchaseDate', e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-300 text-[13px] outline-none bg-white text-slate-900 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 4: Status (Admin Controlled) */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Approval Status
            </label>
            <div className="flex gap-3">
              {['approved', 'pending', 'rejected'].map(st => (
                <label
                  key={st}
                  className={`flex-1 p-2.5 px-3.5 rounded-lg cursor-pointer flex items-center gap-2 text-[13px] font-semibold capitalize transition-all ${
                    formData.status === st
                      ? 'border-2 border-blue-600 bg-blue-50'
                      : 'border border-slate-200 bg-white hover:bg-slate-50'
                  } ${
                    st === 'approved' ? 'text-green-600' : st === 'pending' ? 'text-amber-600' : 'text-red-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    checked={formData.status === st}
                    onChange={() => handleChange('status', st)}
                    className="accent-blue-600"
                  />
                  {st}
                </label>
              ))}
            </div>
          </div>

          {/* Row 5: Description */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Description & Business Justification
            </label>
            <textarea
              rows={3}
              placeholder="Provide reason for purchase, project attribution or invoice details..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full p-2.5 px-3 rounded-lg border border-slate-300 text-[13px] outline-none bg-white text-slate-900 resize-y font-sans focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-[18px] py-[9px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-[13px] font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-[22px] py-[9px] rounded-lg border-0 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold cursor-pointer shadow-md shadow-blue-600/35 disabled:opacity-50 transition-colors"
            >
              <Check size={16} />
              {submitting ? 'Recording...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
