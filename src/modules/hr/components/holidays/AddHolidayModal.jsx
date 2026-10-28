import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';
import { ShieldCheck } from 'lucide-react';

export const AddHolidayModal = ({ isOpen, onClose, selectedDate = '' }) => {
  const { addHoliday, currentUser } = useHR();
  const canManageHolidays = isHRorAdmin(currentUser);

  const [formData, setFormData] = useState({
    name: '',
    date: selectedDate || new Date().toISOString().split('T')[0],
    type: 'National Holiday',
    description: '',
    isRecurringYearly: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageHolidays) {
      alert('🔒 Access Denied: Only HR and Admin administrators have authorization to publish company holidays.');
      return;
    }
    if (!formData.name.trim()) {
      alert('Please enter holiday name');
      return;
    }

    const d = new Date(formData.date);
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });

    await addHoliday({
      ...formData,
      dayOfWeek
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Declare Company Holiday"
      subtitle="Publish a new national, gazetted, or corporate holiday to the company-wide calendar."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Holiday Name / Occasion
          </label>
          <input
            type="text"
            placeholder="e.g. Gandhi Jayanti, Diwali, New Year Day"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="filter-input w-full h-10 pl-3"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Holiday Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="filter-input w-full h-10 pl-3"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Holiday Category
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="filter-select w-full h-10"
            >
              <option value="National Holiday">National Holiday</option>
              <option value="Gazetted Holiday">Gazetted Holiday</option>
              <option value="Restricted / Optional Holiday">Restricted / Optional</option>
              <option value="Company Holiday">Company Special Off</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Additional notes or celebration details..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full py-2.5 px-3 border border-slate-300 rounded-lg text-[13px] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="recurringHoliday"
            checked={formData.isRecurringYearly}
            onChange={(e) => setFormData({ ...formData, isRecurringYearly: e.target.checked })}
          />
          <label htmlFor="recurringHoliday" className="text-[13px] text-slate-700 cursor-pointer">
            Recurring every year on this date
          </label>
        </div>

        <div className="flex justify-end gap-2.5 mt-3">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add Holiday
          </button>
        </div>
      </form>
    </Modal>
  );
};
