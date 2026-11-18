/**
 * @file EmergencyContactsTab.jsx
 * @description Per-employee cloud-synced Emergency Contacts stored on the logged-in Employee record in MongoDB.
 */

import React, { useState, useMemo } from 'react';
import { Plus, Edit3, Trash2, List, Cloud } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useHR } from '../../hr/context/HRContext';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { useToast } from '../../../shared/context/ToastContext';
import { AddEmergencyContactModal } from './AddEmergencyContactModal';

export const EmergencyContactsTab = () => {
  const { currentUser: authUser, setCurrentUser: setAuthCurrentUser } = useAuth();
  const { employees, currentUser: hrUser, updateEmployee } = useHR();
  const { confirm } = useConfirm();
  const { addToast } = useToast();

  const currentUser = authUser || hrUser;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState(null);

  const myEmployeeRecord = useMemo(() => {
    if (!currentUser) return null;
    return (employees || []).find(emp =>
      (emp._id && currentUser._id && String(emp._id) === String(currentUser._id)) ||
      (emp.employeeCode && currentUser.employeeCode && String(emp.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase()) ||
      (emp.email && currentUser.email && String(emp.email).toLowerCase() === String(currentUser.email).toLowerCase())
    ) || currentUser;
  }, [employees, currentUser]);

  const emergencyContacts = useMemo(() => {
    if (Array.isArray(myEmployeeRecord?.emergencyContacts)) {
      return myEmployeeRecord.emergencyContacts;
    }
    const legacy = myEmployeeRecord?.emergencyContact;
    if (legacy && typeof legacy === 'object' && (legacy.name || legacy.phone || legacy.mobile)) {
      return [{
        _id: 'legacy_primary',
        name: legacy.name || 'Primary Contact',
        email: legacy.email || '',
        mobile: legacy.mobile || legacy.phone || '',
        alternateNumber: legacy.alternateNumber || '',
        relationship: legacy.relationship || legacy.relation || 'Family',
        address: legacy.address || ''
      }];
    }
    return [];
  }, [myEmployeeRecord]);

  const persistContacts = async (nextList, successMsg) => {
    const targetId = myEmployeeRecord?._id || currentUser?._id;
    if (!targetId) {
      addToast('Unable to identify your employee profile. Please refresh and try again.', 'error');
      return false;
    }
    const primary = nextList[0] || {};
    await updateEmployee(targetId, {
      emergencyContacts: nextList,
      emergencyContact: primary.name || primary.mobile
        ? {
            name: primary.name || '',
            phone: primary.mobile || '',
            relation: primary.relationship || ''
          }
        : {}
    });

    const updatedAuth = {
      ...(authUser || currentUser),
      emergencyContacts: nextList
    };
    delete updatedAuth.password;
    try {
      localStorage.setItem('ems_auth_session', JSON.stringify(updatedAuth));
    } catch (_) {}
    if (setAuthCurrentUser) {
      setAuthCurrentUser(updatedAuth);
    }
    addToast(successMsg, 'success');
    return true;
  };

  const handleSaveContact = async (formData, editingContact) => {
    const cleanEntry = {
      _id: editingContact?._id || `ec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: (formData.name || '').trim(),
      email: (formData.email || '').trim(),
      mobile: (formData.mobile || '').trim(),
      alternateNumber: (formData.alternateNumber || '').trim(),
      relationship: formData.relationship || 'Father',
      address: (formData.address || '').trim(),
      updatedAt: new Date().toISOString()
    };

    const nextList = editingContact
      ? emergencyContacts.map(c => (c._id === editingContact._id ? cleanEntry : c))
      : [...emergencyContacts, cleanEntry];

    await persistContacts(
      nextList,
      editingContact ? 'Emergency contact updated.' : 'Emergency contact saved to your profile.'
    );
  };

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
      try {
        const nextList = emergencyContacts.filter(c => c._id !== id);
        await persistContacts(nextList, 'Emergency contact removed.');
      } catch (err) {
        addToast(err?.message || 'Failed to remove emergency contact.', 'error');
      }
    }
  };

  return (
    <div className="flex flex-col gap-3.5 py-3">

      {/* Top Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
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

        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <Cloud size={13} className="text-sky-600 dark:text-sky-400" />
          Synced privately to your employee profile
        </span>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
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
              {emergencyContacts.length > 0 ? (
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
                    <div className="text-[13.5px]">- No emergency contacts added yet. -</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Contact Modal */}
      <AddEmergencyContactModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        contactToEdit={contactToEdit}
        onSaveContact={handleSaveContact}
      />

    </div>
  );
};
