/**
 * @file EmergencyContactsTab.jsx
 * @description Emergency Contacts list matching Screenshot 8.
 */

import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Phone, Mail, UserCheck, List } from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { AddEmergencyContactModal } from './AddEmergencyContactModal';

export const EmergencyContactsTab = () => {
  const { emergencyContacts, deleteEmergencyContact } = useCRM();
  const { confirm } = useConfirm();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState(null);

  const handleEdit = (contact) => {
    setContactToEdit(contact);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Remove Contact',
      message: 'Are you sure you want to remove this emergency contact?',
      confirmText: 'Remove Contact',
      variant: 'danger'
    });
    if (ok) {
      deleteEmergencyContact(id);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 py-3">
      
      {/* Top Action Button */}
      <div>
        <button
          onClick={() => {
            setContactToEdit(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 h-[30px] rounded-md bg-sky-600 hover:bg-sky-700 text-white border-0 text-xs font-bold cursor-pointer shadow-xs hover:shadow transition-all"
        >
          <Plus size={14} />
          Create New
        </button>
      </div>

      {/* Table Container Matching Screenshot 8 */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <th className="py-2 px-3 font-bold text-[11px] uppercase tracking-wider">Name</th>
              <th className="py-2 px-3 font-bold text-[11px] uppercase tracking-wider">Email</th>
              <th className="py-2 px-3 font-bold text-[11px] uppercase tracking-wider">Mobile</th>
              <th className="py-2 px-3 font-bold text-[11px] uppercase tracking-wider">Relationship</th>
              <th className="py-2 px-3 font-bold text-[11px] uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {(emergencyContacts || []).length > 0 ? (
              emergencyContacts.map(contact => (
                <tr
                  key={contact._id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {contact.name}
                  </td>
                  <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {contact.email || '—'}
                  </td>
                  <td className="py-1.5 px-3 text-slate-900 dark:text-slate-100 font-medium whitespace-nowrap">
                    {contact.mobile}
                  </td>
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                      {contact.relationship}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-[5px] p-1 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center cursor-pointer transition-colors"
                        title="Edit Contact"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact._id)}
                        className="bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/60 rounded-[5px] p-1 text-red-600 dark:text-red-400 inline-flex items-center justify-center cursor-pointer transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-12 px-[18px] text-slate-400">
                  <List size={28} className="mx-auto mb-2 opacity-50" />
                  <div className="text-[13.5px]">- No record found. -</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Contact Modal */}
      <AddEmergencyContactModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        contactToEdit={contactToEdit}
      />

    </div>
  );
};
