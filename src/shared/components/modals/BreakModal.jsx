/**
 * @file BreakModal.jsx
 * @description Enterprise Break Management & Custom Duration Engine:
 * 1. Employee self-decided break duration (presets + custom minute inputs + quick time pills).
 * 2. Active break monitoring with live ticking clock, remaining countdown, and overtime reminder alerts.
 * 3. Break extension controls (+5m, +10m).
 * 4. Automatic task timer & shift work timer pausing while on break.
 * 5. Complete Break History Timeline Log tracking every break with start/end times and durations.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Coffee,
  Utensils,
  User,
  Clock,
  Sparkles,
  Check,
  History,
  AlertTriangle,
  Play,
  Trash2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Heart,
  Plus
} from 'lucide-react';
import { useTimer } from '../../context/TimerContext';

const PRESET_BREAKS = [
  { id: 'Tea / Coffee Break', label: 'Tea / Coffee Break', icon: Coffee, defaultMinutes: 15, activeBorder: 'border-sky-500', activeBg: 'bg-sky-50 dark:bg-sky-950/60', iconColor: 'text-sky-600', iconBg: 'bg-sky-50 dark:bg-sky-900/40' },
  { id: 'Lunch Break', label: 'Lunch Break', icon: Utensils, defaultMinutes: 45, activeBorder: 'border-orange-500', activeBg: 'bg-orange-50 dark:bg-orange-950/60', iconColor: 'text-orange-600', iconBg: 'bg-orange-50 dark:bg-orange-900/40' },
  { id: 'Quick Rest / Stretch', label: 'Quick Rest / Stretch', icon: Clock, defaultMinutes: 10, activeBorder: 'border-green-500', activeBg: 'bg-green-50 dark:bg-green-950/60', iconColor: 'text-green-600', iconBg: 'bg-green-50 dark:bg-green-900/40' },
  { id: 'Personal Break', label: 'Personal Break', icon: User, defaultMinutes: 15, activeBorder: 'border-purple-500', activeBg: 'bg-purple-50 dark:bg-purple-950/60', iconColor: 'text-purple-600', iconBg: 'bg-purple-50 dark:bg-purple-900/40' },
  { id: 'Wellness & Prayer', label: 'Wellness & Prayer', icon: Heart, defaultMinutes: 20, activeBorder: 'border-pink-500', activeBg: 'bg-pink-50 dark:bg-pink-950/60', iconColor: 'text-pink-600', iconBg: 'bg-pink-50 dark:bg-pink-900/40' }
];

const DURATION_PILLS = [5, 10, 15, 20, 30, 45, 60];

export const BreakModal = ({ isOpen, onClose }) => {
  const {
    startBreak,
    isOnBreak,
    resumeFromBreak,
    extendBreak,
    breakType,
    customBreakLimitMinutes,
    currentBreakTimeString,
    currentBreakSeconds,
    breakStartTime,
    activeBreakLimit,
    activeBreakProgress,
    isBreakOverdue,
    breakRemainingSeconds,
    breakRemainingTimeString,
    breakHistory,
    breakDurationText,
    workDurationText,
    deleteBreakHistoryItem,
    clearTodayBreaks
  } = useTimer();

  const [activeTab, setActiveTab] = useState(isOnBreak ? 'active' : 'choose');
  const [selectedType, setSelectedType] = useState('Tea / Coffee Break');
  const [customMinutes, setCustomMinutes] = useState(15);
  const [breakNotes, setBreakNotes] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customBreakTitle, setCustomBreakTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(isOnBreak ? 'active' : 'choose');
    }
  }, [isOpen, isOnBreak]);

  if (!isOpen) return null;

  const handleStartBreak = () => {
    const finalType = isCustomMode ? (customBreakTitle.trim() || 'Custom Break') : selectedType;
    const finalMinutes = Number(customMinutes) > 0 ? Number(customMinutes) : 15;
    startBreak(finalType, breakNotes, finalMinutes);
    setBreakNotes('');
    onClose();
  };

  const getBreakIcon = (type = '') => {
    if (type.includes('Lunch')) return Utensils;
    if (type.includes('Tea') || type.includes('Coffee')) return Coffee;
    if (type.includes('Wellness') || type.includes('Prayer')) return Heart;
    if (type.includes('Personal')) return User;
    return Clock;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-4 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[580px] max-h-[92vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white m-0 flex items-center gap-2">
              <Coffee size={20} className="text-orange-600" />
              <span>Break Time & Duration Manager</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
              Choose your break time. Task and shift timers pause automatically during breaks.
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('choose')}
            className={`flex-1 py-2 px-3 rounded-lg border-none text-xs sm:text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'choose'
                ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Coffee size={15} />
            <span>{isOnBreak ? 'Active Break Status' : 'Take a Break'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-3 rounded-lg border-none text-xs sm:text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <History size={15} />
            <span>Break History & Logs ({breakHistory.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:px-6 overflow-y-auto flex flex-col gap-4">
          
          {/* TAB 1: Take Break / Monitor Active Break */}
          {activeTab === 'choose' && (
            isOnBreak ? (
              /* Active Break Live Status */
              <div className="flex flex-col gap-4 text-center">
                <div className={`p-6 sm:px-5 rounded-2xl border flex flex-col items-center gap-2 ${
                  isBreakOverdue
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-900'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60'
                }`}>
                  <div className={`w-15 h-15 rounded-full flex items-center justify-center ${
                    isBreakOverdue
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                      : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                  }`}>
                    <Coffee size={30} />
                  </div>

                  <span className={`text-[11.5px] font-extrabold uppercase tracking-wide ${
                    isBreakOverdue ? 'text-red-700 dark:text-red-400' : 'text-amber-800 dark:text-amber-300'
                  }`}>
                    Break in Progress • Started at {breakStartTime || 'Recent'}
                  </span>

                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white m-0">
                    {breakType}
                  </h3>

                  {/* Chosen Target Info */}
                  <div className="text-[12.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>Target Duration: <strong className="text-slate-800 dark:text-slate-200">{customBreakLimitMinutes || 15} minutes</strong></span>
                    <span>•</span>
                    <span className={`font-bold ${isBreakOverdue ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {isBreakOverdue ? 'Overdue' : `${breakRemainingTimeString} remaining`}
                    </span>
                  </div>

                  {/* Live Break Timer */}
                  <div className={`text-4xl font-extrabold font-mono tracking-wider my-1.5 ${
                    isBreakOverdue ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {currentBreakTimeString}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isBreakOverdue ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${activeBreakProgress}%` }}
                    />
                  </div>

                  {/* Overtime Alert */}
                  {isBreakOverdue ? (
                    <div className="mt-1.5 py-2 px-3.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-xs font-bold flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      <span>⚠️ You have passed your {customBreakLimitMinutes}m limit. Click Resume when ready!</span>
                    </div>
                  ) : (
                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400">
                      ⏸️ Task & shift timers are paused.
                    </div>
                  )}

                  {/* Extend Break Buttons */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Need more time?</span>
                    <button
                      type="button"
                      onClick={() => extendBreak(5)}
                      className="py-1 px-2.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      +5 mins
                    </button>
                    <button
                      type="button"
                      onClick={() => extendBreak(10)}
                      className="py-1 px-2.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      +10 mins
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    resumeFromBreak();
                    onClose();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white border-none py-3.5 px-6 rounded-xl text-[14.5px] font-bold cursor-pointer shadow-md shadow-green-600/35 flex items-center justify-center gap-2 transition-colors"
                >
                  <Play size={16} className="fill-white" />
                  <span>Resume Work Session & Log Break 🚀</span>
                </button>
              </div>
            ) : (
              /* Configure & Start Break (Decide own time) */
              <div className="flex flex-col gap-4">
                
                {/* 1. Category Selection */}
                <div>
                  <label className="block text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-2">
                    1. Choose Break Category
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRESET_BREAKS.map(opt => {
                      const Icon = opt.icon;
                      const isSelected = !isCustomMode && selectedType === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setIsCustomMode(false);
                            setSelectedType(opt.id);
                            setCustomMinutes(opt.defaultMinutes);
                          }}
                          className={`flex items-center gap-2.5 p-2.5 px-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? `border-2 ${opt.activeBorder} ${opt.activeBg}`
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${opt.iconBg} ${opt.iconColor}`}>
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-bold text-slate-900 dark:text-white truncate">
                              {opt.label}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Default: {opt.defaultMinutes}m
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Custom Break Card */}
                    <div
                      onClick={() => {
                        setIsCustomMode(true);
                        setCustomBreakTitle('Personal Break');
                      }}
                      className={`flex items-center gap-2.5 p-2.5 px-3 rounded-xl cursor-pointer transition-all ${
                        isCustomMode
                          ? 'border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/60'
                          : 'border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-400'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Plus size={16} />
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-slate-900 dark:text-white">
                          Custom Break
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Set own time & name
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* If Custom Mode, custom title input */}
                {isCustomMode && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Break Reason / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Doctor Visit, Quick Snack, Call with Family..."
                      value={customBreakTitle}
                      onChange={e => setCustomBreakTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-blue-500 text-sm outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* 2. Employee Duration Selection (Decide Own Break Time) */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-bold text-slate-900 dark:text-white">
                      2. How much break time do you need?
                    </label>
                    <span className="text-xs font-extrabold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                      {customMinutes} Minutes Chosen
                    </span>
                  </div>

                  {/* Quick Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {DURATION_PILLS.map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCustomMinutes(mins)}
                        className={`py-1.5 px-3 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                          Number(customMinutes) === mins
                            ? 'border border-sky-600 bg-sky-600 text-white'
                            : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>

                  {/* Or Manual Number Input */}
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Or enter exact minutes:</span>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={customMinutes}
                      onChange={e => setCustomMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-20 py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white text-center outline-none bg-white dark:bg-slate-800 focus:border-sky-500"
                    />
                    <span className="text-[12.5px] text-slate-600 dark:text-slate-300 font-semibold">Minutes</span>
                  </div>
                </div>

                {/* 3. Optional Quick Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Quick Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Taking quick tea break, will return in 15 mins..."
                    value={breakNotes}
                    onChange={e => setBreakNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Start Break Button */}
                <button
                  type="button"
                  onClick={handleStartBreak}
                  className="bg-orange-600 hover:bg-orange-700 text-white border-none py-3 px-5 rounded-xl text-[14.5px] font-bold cursor-pointer shadow-md shadow-orange-600/35 flex items-center justify-center gap-2 transition-colors"
                >
                  <Coffee size={17} />
                  <span>Start Break ({customMinutes} min) ☕</span>
                </button>

                <div className="text-[11.5px] text-slate-400 text-center">
                  ℹ️ Active task timer and working shift timer will pause automatically.
                </div>
              </div>
            )
          )}

          {/* TAB 2: Break History & Reminders Log */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-3.5">
              {/* Summary Metric Strip */}
              <div className="grid grid-cols-3 gap-2.5 p-3 px-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Total Breaks:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {breakHistory.length} Sessions
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Total Break Time:</span>
                  <span className="font-extrabold text-orange-600 dark:text-orange-400 text-sm">
                    {breakDurationText}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Productive Work:</span>
                  <span className="font-extrabold text-green-600 dark:text-green-400 text-sm">
                    {workDurationText}
                  </span>
                </div>
              </div>

              {/* History Timeline */}
              <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
                {breakHistory.length === 0 ? (
                  <div className="text-center py-7 px-5 text-slate-400 text-sm">
                    <History size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    No breaks recorded yet today. Take a break when you need to recharge!
                  </div>
                ) : (
                  breakHistory.map((item, idx) => {
                    const Icon = getBreakIcon(item.type);
                    return (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Icon size={16} />
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-slate-900 dark:text-white">
                              {item.type} {item.targetMinutes ? `(${item.targetMinutes}m target)` : ''}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.startTime} ➔ {item.endTime} ({item.durationText})
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300">
                            Completed
                          </span>

                          <button
                            type="button"
                            onClick={() => deleteBreakHistoryItem(item.id)}
                            className="bg-transparent border-none text-slate-400 hover:text-red-500 cursor-pointer p-1 transition-colors"
                            title="Delete log"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {breakHistory.length > 0 && (
                <div className="text-right border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <button
                    type="button"
                    onClick={clearTodayBreaks}
                    className="bg-transparent border-none text-red-600 hover:text-red-700 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Clear All Break Logs
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
