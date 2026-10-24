import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';

export const AddAppreciationModal = ({ isOpen, onClose }) => {
  const { employees, currentUser, addAppreciation } = useHR();

  const [formData, setFormData] = useState({
    givenToId: '',
    awardName: 'Star Performer of the Month',
    awardBadgeIcon: 'trophy',
    givenOn: new Date().toISOString().split('T')[0],
    rewardPointsOrCash: '₹5,000 Bonus / Gift Voucher',
    appreciationNote: ''
  });

  useEffect(() => {
    if (isOpen && employees && employees.length > 0 && !formData.givenToId) {
      setFormData(prev => ({ ...prev, givenToId: employees[0]._id }));
    }
  }, [isOpen, employees, formData.givenToId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.appreciationNote.trim()) {
      alert('Please enter an appreciation message or reason for the award.');
      return;
    }

    const selectedEmp = (employees || []).find(emp => 
      String(emp._id) === String(formData.givenToId) || 
      String(emp.employeeCode) === String(formData.givenToId)
    ) || employees[0];

    if (!selectedEmp) {
      alert('Please select an employee to recognize.');
      return;
    }

    await addAppreciation({
      givenTo: selectedEmp._id,
      givenToId: String(selectedEmp._id),
      givenToName: selectedEmp.name,
      givenToAvatar: selectedEmp.avatar || '',
      givenToRole: selectedEmp.role || selectedEmp.designation || 'Team Member',
      awardName: formData.awardName,
      awardBadgeIcon: formData.awardBadgeIcon,
      givenOn: formData.givenOn,
      givenBy: currentUser?._id,
      givenById: currentUser?._id ? String(currentUser._id) : '',
      givenByName: currentUser?.name || 'Administrator',
      rewardPointsOrCash: formData.rewardPointsOrCash,
      appreciationNote: formData.appreciationNote
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recognize Employee / Give Appreciation"
      subtitle="Celebrate achievements and recognize hard work across the team."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Award Recipient (Given To)
          </label>
          <select
            value={formData.givenToId}
            onChange={(e) => setFormData({ ...formData, givenToId: e.target.value })}
            className="filter-select"
            style={{ width: '100%', height: '40px' }}
          >
            {employees.map(emp => {
              const isSelf = currentUser && (String(emp._id || emp.id) === String(currentUser._id || currentUser.id) || (emp.employeeCode && currentUser.employeeCode && String(emp.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase()) || (emp.email && currentUser.email && emp.email.toLowerCase() === currentUser.email.toLowerCase()));
              return (
                <option key={emp._id} value={emp._id}>
                  {emp.name} — {emp.role} {isSelf ? "(It's You)" : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Award Title / Category
            </label>
            <input
              type="text"
              value={formData.awardName}
              onChange={(e) => setFormData({ ...formData, awardName: e.target.value })}
              placeholder="e.g. Employee of the Month, Customer Champion"
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Award Date
            </label>
            <input
              type="date"
              value={formData.givenOn}
              onChange={(e) => setFormData({ ...formData, givenOn: e.target.value })}
              className="filter-input"
              style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
              required
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Reward / Gift Incentive
          </label>
          <input
            type="text"
            value={formData.rewardPointsOrCash}
            onChange={(e) => setFormData({ ...formData, rewardPointsOrCash: e.target.value })}
            placeholder="e.g. ₹5,000 Gift Voucher, 500 Reward Points"
            className="filter-input"
            style={{ width: '100%', height: '40px', paddingLeft: '12px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Appreciation Citation / Note
          </label>
          <textarea
            rows={3}
            value={formData.appreciationNote}
            onChange={(e) => setFormData({ ...formData, appreciationNote: e.target.value })}
            placeholder="Write why this employee is being recognized..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none'
            }}
            required
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <button type="button" onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Present Award 🎉
          </button>
        </div>
      </form>
    </Modal>
  );
};
