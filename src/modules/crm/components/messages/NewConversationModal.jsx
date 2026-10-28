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
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-[#151e32] rounded-2xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-[#243049] flex flex-col">
        {/* Header */}
        <div className="p-[18px] px-5 border-b border-slate-100 dark:border-[#243049] flex items-center justify-between bg-slate-50 dark:bg-[#101726] rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 text-sky-400 flex items-center justify-center">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50 m-0">
                New Direct Conversation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Select a team member to start chatting
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-[30px] h-[30px] flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 px-5 border-b border-slate-100 dark:border-[#243049]">
          <div className="flex items-center gap-2 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Search size={16} className="text-slate-400 dark:text-sky-400" />
            <input
              type="text"
              placeholder="Search by name, role or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-none bg-transparent outline-none text-[13px] w-full text-slate-900 dark:text-slate-50 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Employee List */}
        <div className="p-3 px-4 flex flex-col gap-1.5 max-h-[340px] overflow-y-auto">
          {availableEmployees.map(emp => (
            <div
              key={emp._id}
              onClick={() => handleSelect(emp._id)}
              className="flex items-center justify-between p-2.5 px-3 rounded-lg cursor-pointer transition-colors bg-white dark:bg-[#151e32] hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img
                    src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={emp.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full bg-emerald-500 border-2 border-white dark:border-[#151e32]" />
                </div>
                <div>
                  <div className="text-[13.5px] font-bold text-slate-900 dark:text-slate-50">
                    {emp.name}
                  </div>
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    {emp.role} • {emp.department}
                  </div>
                </div>
              </div>

              <span className="text-xs text-blue-600 dark:text-sky-400 font-semibold">
                Chat 💬
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
