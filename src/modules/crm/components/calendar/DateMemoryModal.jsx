import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Tag,
  Lock,
  Calendar,
  Sparkles,
  Edit2,
  Save,
  AlertCircle
} from 'lucide-react';
import { dateMemoryService } from '../../services/dateMemoryService';
import { useToast } from '../../../../shared/context/ToastContext';

const TAG_CONFIGS = [
  { id: 'personal', label: 'Personal Note', icon: '📝', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'task', label: 'Work Task', icon: '🎯', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { id: 'reminder', label: 'Time Reminder', icon: '⏰', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'meeting', label: 'Meeting / Call', icon: '💬', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'idea', label: 'Quick Idea', icon: '💡', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800' }
];

export const DateMemoryModal = ({
  isOpen,
  onClose,
  selectedDate,
  currentUser,
  dayEvents = []
}) => {
  const { addToast } = useToast();
  const [memories, setMemories] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [selectedTag, setSelectedTag] = useState('personal');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Load memories for this specific date & strictly current user
  const loadMemories = () => {
    if (!selectedDate || !currentUser) return;
    const items = dateMemoryService.getMemoriesByDate(selectedDate, currentUser);
    setMemories(items);
  };

  useEffect(() => {
    if (isOpen) {
      loadMemories();
      setNewTitle('');
      setNewTime('');
      setIsAllDay(true);
      setSelectedTag('personal');
      setNewDescription('');
      setEditingId(null);
    }
  }, [isOpen, selectedDate, currentUser?._id]);

  // Listen to cross-component storage changes
  useEffect(() => {
    const handleSync = () => loadMemories();
    window.addEventListener('ems_user_memories_updated', handleSync);
    window.addEventListener('hrms_storage_change', handleSync);
    return () => {
      window.removeEventListener('ems_user_memories_updated', handleSync);
      window.removeEventListener('hrms_storage_change', handleSync);
    };
  }, [selectedDate, currentUser?._id]);

  if (!isOpen) return null;

  // Format date display (e.g., "Thursday, 29 Oct 2026")
  const dateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const handleAddMemory = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      addToast('Please enter a note or task title.', 'warning');
      return;
    }

    try {
      dateMemoryService.addMemory({
        date: selectedDate,
        title: newTitle,
        time: isAllDay ? 'All Day' : (newTime || 'Anytime'),
        tag: selectedTag,
        description: newDescription
      }, currentUser);

      addToast('Memory note saved securely!', 'success');
      setNewTitle('');
      setNewDescription('');
      if (!isAllDay) setNewTime('');
      loadMemories();
    } catch (err) {
      addToast(err.message || 'Failed to save note.', 'error');
    }
  };

  const handleToggleCompleted = (memId) => {
    dateMemoryService.toggleCompleted(memId, currentUser);
    loadMemories();
  };

  const handleDelete = (memId) => {
    if (window.confirm('Delete this private memory note?')) {
      dateMemoryService.deleteMemory(memId, currentUser);
      addToast('Memory deleted.', 'info');
      loadMemories();
    }
  };

  const handleSaveEdit = (memId) => {
    if (!editTitle.trim()) return;
    dateMemoryService.updateMemory(memId, { title: editTitle.trim() }, currentUser);
    setEditingId(null);
    loadMemories();
  };

  // Check if date has official holiday or major festivals
  const dayHolidays = (dayEvents || []).filter(ev => ev.isHoliday || ev.type?.toLowerCase().includes('holiday'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Calendar size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  {formattedDate}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <Lock size={10} />
                  Private to You (Zero Leakage)
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Day Context Banner (if holiday or official company events) */}
          {dayHolidays.length > 0 && (
            <div className="p-2.5 px-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-2.5">
              <span className="text-lg">🏖️</span>
              <div className="text-xs">
                <span className="font-extrabold text-red-700 dark:text-red-400">
                  {dayHolidays.map(h => h.title).join(', ')}
                </span>
                <span className="text-red-600/80 dark:text-red-400/80 block text-[11px]">
                  Official Holiday / Observance on this date
                </span>
              </div>
            </div>
          )}

          {/* Existing Memories List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider m-0">
                My Planned Notes ({memories.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Click circle to check off
              </span>
            </div>

            {memories.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                  No private memories or tasks recorded for this date yet.
                </p>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold block mt-1">
                  Add your task or note below 👇
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {memories.map(mem => {
                  const tagConfig = TAG_CONFIGS.find(t => t.id === mem.tag) || TAG_CONFIGS[0];
                  return (
                    <div
                      key={mem._id}
                      className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-2.5 ${
                        mem.isCompleted
                          ? 'bg-slate-50/80 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-60'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleCompleted(mem._id)}
                        className="mt-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shrink-0"
                      >
                        {mem.isCompleted ? (
                          <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-100 dark:fill-emerald-950/40" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${tagConfig.color}`}>
                            {tagConfig.icon} {tagConfig.label}
                          </span>
                          {mem.time && (
                            <span className="text-[10.5px] font-semibold text-slate-500 flex items-center gap-1">
                              <Clock size={11} />
                              {mem.time}
                            </span>
                          )}
                        </div>

                        {editingId === mem._id ? (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="text-xs px-2 py-1 rounded border border-blue-400 outline-none w-full bg-white dark:bg-slate-900 dark:text-slate-100"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(mem._id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className={`text-xs font-bold text-slate-900 dark:text-slate-100 m-0 mt-1 break-words ${
                            mem.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}>
                            {mem.title}
                          </p>
                        )}

                        {mem.description && !editingId && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                            {mem.description}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingId(mem._id);
                            setEditTitle(mem.title);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Edit title"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(mem._id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Delete memory"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Memory / Note Form */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5 m-0">
              <Plus size={14} className="text-blue-600 dark:text-blue-400" />
              Add Personal Memory / Task For This Date
            </h3>

            <form onSubmit={handleAddMemory} className="space-y-3">
              {/* Note / Task Title */}
              <div>
                <input
                  type="text"
                  placeholder="e.g., Client meeting at Connaught Place, file GST return, buy flowers..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Time & All Day Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    All Day
                  </label>
                </div>

                {!isAllDay && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <Clock size={12} className="text-slate-400" />
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Tag Selection Pills */}
              <div>
                <span className="text-[10.5px] font-bold text-slate-500 block mb-1.5">
                  Tag / Category:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TAG_CONFIGS.map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setSelectedTag(t.id)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-md border cursor-pointer transition-all ${
                        selectedTag === t.id
                          ? `${t.color} ring-2 ring-blue-500/30 font-extrabold shadow-xs`
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Description / Details */}
              <div>
                <textarea
                  placeholder="Optional details, agenda notes, or memory reminders..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock size={10} />
                  Saved locally & isolated to your account.
                </span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Save size={13} />
                  <span>Save Memory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

