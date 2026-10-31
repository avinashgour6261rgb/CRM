/**
 * @file AddEmergencyContactModal.jsx
 * @description Modal for adding/editing emergency contact.
 */

import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Heart, MapPin, Check } from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';

export const AddEmergencyContactModal = ({ isOpen, onClose, contactToEdit = null }) => {
  const { addEmergencyContact, updateEmergencyContact } = useCRM();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    alternateNumber: '',
    relationship: 'Father',
    address: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contactToEdit) {
      setFormData({
        name: contactToEdit.name || '',
        email: contactToEdit.email || '',
        mobile: contactToEdit.mobile || '',
        alternateNumber: contactToEdit.alternateNumber || '',
        relationship: contactToEdit.relationship || 'Father',
        address: contactToEdit.address || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        mobile: '',
        alternateNumber: '',
        relationship: 'Father',
        address: ''
      });
    }
  }, [contactToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (contactToEdit) {
        await updateEmergencyContact(contactToEdit._id, formData);
      } else {
        await addEmergencyContact(formData);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-5 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[520px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-[18px] border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
              {contactToEdit ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              Add a trusted family member or contact person in case of emergencies
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Contact Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sunita Sharma"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-sky-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={formData.mobile}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-sky-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Relationship *
              </label>
              <select
                value={formData.relationship}
                onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-sky-600 transition-colors"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Spouse">Spouse</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend">Friend</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="contact@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-sky-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Alternate Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 00000"
                value={formData.alternateNumber}
                onChange={e => setFormData({ ...formData, alternateNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-sky-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Address
            </label>
            <textarea
              rows={2}
              placeholder="Residential address..."
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none resize-y font-inherit focus:border-sky-600 transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white border-0 text-[13px] font-bold cursor-pointer shadow-sm hover:shadow transition-all disabled:opacity-70"
            >
              <Check size={15} />
              {saving ? 'Saving...' : contactToEdit ? 'Update Contact' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
