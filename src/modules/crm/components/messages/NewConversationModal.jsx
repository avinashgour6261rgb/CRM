/**
 * @file NewConversationModal.jsx
 * @description Modal allowing employees to search team members and initiate a new direct chat conversation.
 */

import React, { useState } from 'react';
import {
  X,
  Search,
  MessageSquare,
  User,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useHR } from '../../../hr/context/HRContext';
import { useCRM } from '../../../../shared/context/CRMContext';

export const NewConversationModal = ({ isOpen, onClose }) => {
  const { employees, currentUser } = useHR();
  const { startConversation, darkMode } = useCRM();
  const isDark = !!darkMode;
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const availableEmployees = employees.filter(emp =>
    emp._id !== currentUser?._id &&
    (emp.name.toLowerCase().includes(search.toLowerCase()) ||
     emp.role.toLowerCase().includes(search.toLowerCase()) ||
     emp.department.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (empId) => {
    startConversation(empId);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: isDark ? '#151e32' : '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: isDark ? '1px solid #243049' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: isDark ? '1px solid #243049' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDark ? '#101726' : '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: isDark ? '#1e293b' : '#eff6ff',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                New Direct Conversation
              </h2>
              <p style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', margin: '2px 0 0 0' }}>
                Select a team member to start chatting
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: isDark ? '#1e293b' : '#ffffff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#cbd5e1' : '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 20px', borderBottom: isDark ? '1px solid #243049' : '1px solid #f1f5f9' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
            backgroundColor: isDark ? '#1e293b' : '#f8fafc'
          }}>
            <Search size={16} color={isDark ? '#38bdf8' : '#94a3b8'} />
            <input
              type="text"
              placeholder="Search by name, role or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                width: '100%',
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
            />
          </div>
        </div>

        {/* Employee List */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '340px', overflowY: 'auto' }}>
          {availableEmployees.map(emp => (
            <div
              key={emp._id}
              onClick={() => handleSelect(emp._id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                backgroundColor: isDark ? '#151e32' : '#ffffff'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = isDark ? '#151e32' : '#ffffff'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={emp.name}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    border: `2px solid ${isDark ? '#151e32' : '#ffffff'}`
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {emp.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    {emp.role} • {emp.department}
                  </div>
                </div>
              </div>

              <span style={{ fontSize: '12px', color: isDark ? '#38bdf8' : '#2563eb', fontWeight: '600' }}>
                Chat 💬
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
