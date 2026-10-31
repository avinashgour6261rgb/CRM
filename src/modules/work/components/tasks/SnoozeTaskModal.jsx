/**
 * @file SnoozeTaskModal.jsx
 * @description Sleek, fluid modal for postponing/snoozing a task and setting a CRM reminder.
 * Pauses task timer, preserves accumulated seconds, and reminds the user at the exact scheduled time.
 */

import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  X,
  Bell,
  Sparkles,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useToast } from '../../../../shared/context/ToastContext';

const QUICK_SNOOZE_PRESETS = [
  { label: '15 Minutes', minutes: 15, icon: '⚡' },
  { label: '30 Minutes', minutes: 30, icon: '☕' },
  { label: '1 Hour', minutes: 60, icon: '⏳' },
  { label: '2 Hours', minutes: 120, icon: '⏱️' },
  { label: 'Tomorrow 9:00 AM', type: 'tomorrow_9am', icon: '🌅' }
];

export const SnoozeTaskModal = ({ isOpen, onClose, task }) => {
  const { snoozeTask, formatSeconds } = useWork();
  const { addToast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState(30);
  const [customDateTime, setCustomDateTime] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const handleSnooze = async () => {
    const targetId = task._id || task.id;
    if (!targetId) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    try {
      if (selectedPreset === 'custom') {
        if (!customDateTime) {
          addToast('Please select a reminder date and time', 'warning');
          setIsSubmitting(false);
          return;
        }
        await snoozeTask(targetId, { customDateTime, note });
      } else if (selectedPreset === 'tomorrow_9am') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        await snoozeTask(targetId, { customDateTime: tomorrow.toISOString(), note });
      } else {
        await snoozeTask(targetId, { remindInMinutes: selectedPreset, note });
      }
    } catch (e) {
      console.error('Error during snooze:', e);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[5px] flex items-center justify-center z-[1100] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[480px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:px-[18px] border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-purple-50 dark:bg-purple-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white m-0">
                Do Later & Remind Me ⏰
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
                Timer pauses right here & CRM will alert you when to resume
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-md flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:px-[18px] flex flex-col gap-3.5">
          {/* Target Task Summary */}
          <div className="p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                #{task.taskCode || 'TSK'} • {task.projectName || 'General'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                Time Logged: <strong className="text-slate-900 dark:text-white">{task.hoursLoggedText || formatSeconds(task.timerSeconds || 0)}</strong>
              </span>
            </div>
            <div className="text-[13px] font-bold text-slate-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap">
              {task.title}
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Remind me in:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {QUICK_SNOOZE_PRESETS.map((preset, idx) => {
                const isSelected = selectedPreset === (preset.minutes || preset.type);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPreset(preset.minutes || preset.type)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 text-left transition-all ${
                      isSelected
                        ? 'border-[1.5px] border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all ${
                  selectedPreset === 'custom'
                    ? 'border-[1.5px] border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                    : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                <span>📅</span>
                <span>Custom Time...</span>
              </button>
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          {selectedPreset === 'custom' && (
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Pick Custom Reminder Date & Time:
              </label>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={e => setCustomDateTime(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border-[1.5px] border-purple-600 text-[12.5px] text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-800 focus:ring-1 focus:ring-purple-600"
              />
            </div>
          )}

          {/* Optional Reminder Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Note / Why do later? (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Waiting on client feedback, taking urgent call..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-[18px] border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSnooze}
            className="px-4 py-1.5 rounded-lg border-none bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-colors disabled:opacity-50"
          >
            <Bell size={13} />
            <span>Pause & Set Reminder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
