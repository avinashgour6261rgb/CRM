import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { canGiveAppreciation } from '../../../../shared/utils/permissionUtils';

export const AddAppreciationModal = ({ isOpen, onClose }) => {
  const { employees, currentUser, addAppreciation } = useHR();
  const canGive = useMemo(() => canGiveAppreciation(currentUser), [currentUser]);

  const recipientOptions = useMemo(() => {
    return (employees || []).filter(emp => {
      const isSelf = currentUser && (
        String(emp._id || emp.id) === String(currentUser._id || currentUser.id) ||
        (emp.employeeCode && currentUser.employeeCode && String(emp.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase()) ||
        (emp.email && currentUser.email && emp.email.toLowerCase() === currentUser.email.toLowerCase())
      );
      return !isSelf;
    });
  }, [employees, currentUser]);

  const [formData, setFormData] = useState({
    givenToId: '',
    awardName: 'Star Performer of the Month',
    awardBadgeIcon: 'trophy',
    givenOn: new Date().toISOString().split('T')[0],
    rewardPointsOrCash: '₹5,000 Bonus / Gift Voucher',
    appreciationNote: ''
  });

  useEffect(() => {
    if (isOpen && recipientOptions.length > 0 && (!formData.givenToId || !recipientOptions.some(r => String(r._id) === String(formData.givenToId)))) {
      setFormData(prev => ({ ...prev, givenToId: recipientOptions[0]._id }));
    }
  }, [isOpen, recipientOptions, formData.givenToId]);

  if (!isOpen) return null;
  if (!canGive) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.appreciationNote.trim()) {
      alert('Please enter an appreciation message or reason for the award.');
      return;
    }

    const selectedEmp = recipientOptions.find(emp => 
      String(emp._id) === String(formData.givenToId) || 
      String(emp.employeeCode) === String(formData.givenToId)
    ) || recipientOptions[0];

    if (!selectedEmp) {
      alert('Please select an employee to recognize.');
      return;
    }

    const isSelf = currentUser && (
      String(selectedEmp._id || selectedEmp.id) === String(currentUser._id || currentUser.id) ||
      (selectedEmp.employeeCode && currentUser.employeeCode && String(selectedEmp.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase())
    );

    if (isSelf) {
      alert('Self-recognition is not permitted. Please select a colleague to appreciate.');
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Award Recipient (Given To)
          </label>
          <select
            value={formData.givenToId}
            onChange={(e) => setFormData({ ...formData, givenToId: e.target.value })}
            className="filter-select w-full h-10"
          >
            {recipientOptions.map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.name} — {emp.role || emp.designation || 'Team Member'}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Award Title / Category
            </label>
            <input
              type="text"
              value={formData.awardName}
              onChange={(e) => setFormData({ ...formData, awardName: e.target.value })}
              placeholder="e.g. Employee of the Month, Customer Champion"
              className="filter-input w-full h-10 pl-3"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Award Date
            </label>
            <input
              type="date"
              value={formData.givenOn}
              onChange={(e) => setFormData({ ...formData, givenOn: e.target.value })}
              className="filter-input w-full h-10 pl-3"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Reward / Gift Incentive
          </label>
          <input
            type="text"
            value={formData.rewardPointsOrCash}
            onChange={(e) => setFormData({ ...formData, rewardPointsOrCash: e.target.value })}
            placeholder="e.g. ₹5,000 Gift Voucher, 500 Reward Points"
            className="filter-input w-full h-10 pl-3"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Appreciation Citation / Note
          </label>
          <textarea
            rows={3}
            value={formData.appreciationNote}
            onChange={(e) => setFormData({ ...formData, appreciationNote: e.target.value })}
            placeholder="Write why this employee is being recognized..."
            className="w-full p-2.5 px-3 border border-slate-300 rounded-lg text-[13px] outline-none font-sans focus:border-blue-500 transition-colors resize-y"
            required
          />
        </div>

        <div className="flex justify-end gap-2.5 mt-3">
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
