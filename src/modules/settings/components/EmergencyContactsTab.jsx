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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px 0' }}>
      
      {/* Top Action Button */}
      <div>
        <button
          onClick={() => {
            setContactToEdit(null);
            setIsAddModalOpen(true);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            height: '30px',
            borderRadius: '6px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)'
          }}
        >
          <Plus size={14} />
          Create New
        </button>
      </div>

      {/* Table Container Matching Screenshot 8 */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '8px 12px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
              <th style={{ padding: '8px 12px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</th>
              <th style={{ padding: '8px 12px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mobile</th>
              <th style={{ padding: '8px 12px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Relationship</th>
              <th style={{ padding: '8px 12px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(emergencyContacts || []).length > 0 ? (
              emergencyContacts.map(contact => (
                <tr
                  key={contact._id}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '7px 12px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {contact.name}
                  </td>
                  <td style={{ padding: '7px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {contact.email || '—'}
                  </td>
                  <td style={{ padding: '7px 12px', color: '#0f172a', fontWeight: '500', whiteSpace: 'nowrap' }}>
                    {contact.mobile}
                  </td>
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb'
                    }}>
                      {contact.relationship}
                    </span>
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => handleEdit(contact)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          padding: '3px 6px',
                          cursor: 'pointer',
                          color: '#475569',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Edit Contact"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact._id)}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '5px',
                          padding: '3px 6px',
                          cursor: 'pointer',
                          color: '#dc2626',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
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
                <td colSpan={5} style={{ textAlign: 'center', padding: '48px 18px', color: '#94a3b8' }}>
                  <List size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div style={{ fontSize: '13.5px' }}>- No record found. -</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <AddEmergencyContactModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setContactToEdit(null);
        }}
        contactToEdit={contactToEdit}
      />
    </div>
  );
};
