/**
 * @file NewConversationModal.jsx
 * @description Modal allowing employees to initiate a Direct Message with any team member
 * or create a new dedicated Group Channel.
 */

import React, { useState } from 'react';
import {
  X,
  Search,
  MessageSquare,
  Users,
  Hash,
  Plus,
  Building2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useHR } from '../../../hr/context/HRContext';
import { useCRM } from '../../../../shared/context/CRMContext';

export const NewConversationModal = ({ isOpen, onClose }) => {
  const { currentUser: authUser } = useAuth();
  const { employees, currentUser: hrUser } = useHR();
  const currentUser = authUser || hrUser;
  const { startConversation, createChannel } = useCRM();

  const [activeTab, setActiveTab] = useState('dm'); // 'dm' | 'channel'
  const [search, setSearch] = useState('');

  // Channel Creation State
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelCategory, setChannelCategory] = useState('general');

  if (!isOpen) return null;

  const currentUserId = currentUser?._id || currentUser?.employeeCode;

  const availableEmployees = (employees || []).filter(emp => {
    const isMe = emp._id === currentUserId || emp.employeeCode === currentUserId || emp.email === currentUser?.email;
    if (isMe) return false;
    const q = search.toLowerCase();
    return (
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.role || '').toLowerCase().includes(q) ||
      (emp.department || '').toLowerCase().includes(q) ||
      (emp.employeeCode || '').toLowerCase().includes(q)
    );
  });

  const handleSelectEmployee = (empId) => {
    startConversation(empId);
    onClose();
  };

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    createChannel({
      name: channelName,
      description: channelDesc,
      category: channelCategory
    });
    setChannelName('');
    setChannelDesc('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-[1000] p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[480px] max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-sky-400 flex items-center justify-center">
              <MessageSquare size={17} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
                New Chat & Conversation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Connect directly with a teammate or create a channel
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('dm')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0 ${
              activeTab === 'dm'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Users size={14} />
            <span>Direct Message ({availableEmployees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('channel')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0 ${
              activeTab === 'channel'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs'
                : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Hash size={14} />
            <span>Create New Channel</span>
          </button>
        </div>

        {/* Tab 1: Direct Message List */}
        {activeTab === 'dm' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search */}
            <div className="p-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <Search size={15} className="text-slate-400 dark:text-sky-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search teammate by name, role or department..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border-none bg-transparent outline-none text-[12.5px] w-full text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Employee List */}
            <div className="p-2 px-3 flex flex-col gap-1 max-h-[360px] overflow-y-auto">
              {availableEmployees.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No colleagues match "{search}".
                </div>
              ) : (
                availableEmployees.map(emp => (
                  <div
                    key={emp._id || emp.id || emp.employeeCode}
                    onClick={() => handleSelectEmployee(emp._id || emp.id || emp.employeeCode)}
                    className="flex items-center justify-between p-2.5 px-3 rounded-xl cursor-pointer transition-colors bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={emp.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 truncate">
                          {emp.name}
                        </div>
                        <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                          {emp.role || 'Member'} • <span className="text-blue-600 dark:text-sky-400">{emp.department || 'General'}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11.5px] px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 font-bold shrink-0">
                      Start Chat 💬
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Create Group Channel Form */}
        {activeTab === 'channel' && (
          <form onSubmit={handleCreateChannel} className="p-5 flex flex-col gap-3.5 flex-1 overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Channel Name *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">#</span>
                <input
                  type="text"
                  placeholder="e.g. project-crm-revamp or sprint-alpha"
                  value={channelName}
                  onChange={e => setChannelName(e.target.value)}
                  className="w-full h-10 pl-8 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600 font-semibold"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Lowercase letters, numbers, and hyphens only.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Channel Purpose & Topic
              </label>
              <textarea
                placeholder="What is this channel about? (e.g. Daily sprint coordination, client updates)"
                value={channelDesc}
                onChange={e => setChannelDesc(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={channelCategory}
                onChange={e => setChannelCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none font-semibold"
              >
                <option value="general">🏢 General Team</option>
                <option value="it_tech">💻 IT & Software Development</option>
                <option value="marketing">🚀 Digital Marketing</option>
                <option value="project">📁 Specific Project</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!channelName.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed border-0"
              >
                Create Channel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
