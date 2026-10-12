import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { ShieldAlert, AlertTriangle, LogOut, Clock, User } from 'lucide-react';

export const AdminForceClockOutModal = ({ isOpen, onClose, targetEmployee = null }) => {
  const { employees, adminForceClockOut, currentUser, attendance } = useHR();

  const [selectedEmpId, setSelectedEmpId] = useState(targetEmployee?._id || 'emp_003');
  const [auditNote, setAuditNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const adminIdentifier = currentUser?.employeeCode || currentUser?._id || 'ADM-001';
  const adminName = currentUser?.name || 'Administrator';

  // Find employee details
  const emp = employees.find(e => e._id === (targetEmployee?._id || selectedEmpId));

  const handleForceClockOut = async (e) => {
    e.preventDefault();
    if (!auditNote.trim()) {
      alert('Audit note explaining why shift is being forcefully closed is mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      await adminForceClockOut(targetEmployee?._id || selectedEmpId, auditNote.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Force Clock-Out & Override"
      subtitle="Immediately terminate active shift session with full regulatory audit logging."
    >
      <form onSubmit={handleForceClockOut} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Warning Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '12px 14px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#991b1b'
        }}>
          <ShieldAlert size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Administrative Action Required:</strong> This action will immediately clock out the employee's live shift, pause their task timers, and stamp this event into both the employee's time log and the system audit log under Administrator ID <code>#{adminIdentifier}</code>.
          </div>
        </div>

        {/* Target Employee Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Target Employee
          </label>
          {targetEmployee ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px'
            }}>
              <img
                src={targetEmployee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={targetEmployee.name}
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{targetEmployee.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{targetEmployee.role} • ID: {targetEmployee.employeeCode || targetEmployee._id}</div>
              </div>
            </div>
          ) : (
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="filter-select"
              style={{ width: '100%', height: '40px' }}
            >
              {employees.map(e => (
                <option key={e._id} value={e._id}>
                  {e.name} ({e.role}) — #{e.employeeCode || e._id}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Current Time Stamp Callout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          padding: '12px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '12px'
        }}>
          <div>
            <span style={{ color: '#64748b' }}>Closing Time Stamp:</span>
            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (Immediate)
            </div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Authorized By:</span>
            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
              {adminName} <span style={{ color: '#2563eb', fontSize: '11px' }}>[#{adminIdentifier}]</span>
            </div>
          </div>
        </div>

        {/* Mandatory Reason for Override */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
            Audit Note & Reason for Force Clock-Out <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={auditNote}
            onChange={(e) => setAuditNote(e.target.value)}
            placeholder="e.g. Employee left premises at 06:30 PM without clocking out; verified via security logs / client off-site transition."
            style={{
              width: '100%',
              minHeight: '75px',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12.5px',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            required
          />
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
            This note will be permanently etched in the employee's audit log and daily timecard.
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
          >
            <LogOut size={14} />
            <span>{submitting ? 'Executing Override...' : 'Confirm Force Clock-Out'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
