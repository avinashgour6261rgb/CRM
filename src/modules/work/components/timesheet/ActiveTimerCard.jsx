/**
 * @file ActiveTimerCard.jsx
 * @description Real-time running timer card for active task tracking with Stop & Log controls.
 */

import React, { useState } from 'react';
import {
  Clock,
  Square,
  Eye,
  Pause,
  Play,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';

export const ActiveTimerCard = ({ onSelectTask }) => {
  const {
    activeRunningTask,
    stopTaskTimer,
    pauseTaskTimer,
    startTaskTimer,
    formatSeconds
  } = useWork();

  const [memo, setMemo] = useState('');
  const [stopping, setStopping] = useState(false);

  if (!activeRunningTask) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-2 px-3.5 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              No Active Task Timer Running
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Start tracking from the Tasks table or click "Log Time" to record hours.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleStop = async () => {
    setStopping(true);
    await stopTaskTimer(activeRunningTask._id, memo);
    setStopping(false);
    setMemo('');
  };

  return (
    <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-xl p-2.5 px-3.5 text-white flex items-center justify-between flex-wrap gap-3 shadow-md shadow-sky-600/30">
      {/* Left Details */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 border border-white/25">
          <Zap size={18} className="fill-white" />
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="bg-white/25 px-1.5 py-[1px] rounded text-[10px] font-bold tracking-tight">
              {activeRunningTask.taskCode}
            </span>
            <span className="text-[11px] text-sky-100 font-medium">
              {activeRunningTask.projectName}
            </span>
          </div>

          <h3 className="text-[13.5px] font-bold m-0 text-white leading-tight">
            {activeRunningTask.title}
          </h3>

          <div className="flex items-center gap-2 text-[11px] text-sky-200 mt-0.5">
            <span>👤 {activeRunningTask.assignedToName}</span>
            <span>•</span>
            <span>Started: Today</span>
          </div>
        </div>
      </div>

      {/* Right Controls & Live Clock */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="text-right">
          <div className="text-[10px] text-sky-100 uppercase tracking-wider font-semibold">
            Running Duration
          </div>
          <div className="text-lg font-extrabold font-mono tracking-wide leading-tight">
            {formatSeconds(activeRunningTask.timerSeconds || 0)}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {activeRunningTask.timerRunning ? (
            <button
              onClick={() => pauseTaskTimer(activeRunningTask._id)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 px-2 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer h-7 transition-colors"
            >
              <Pause size={12} className="fill-white" /> Pause
            </button>
          ) : (
            <button
              onClick={() => startTaskTimer(activeRunningTask._id)}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white border-none px-2 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer h-7 transition-colors"
            >
              <Play size={12} className="fill-white" /> {activeRunningTask?.timerSeconds > 0 ? 'Resume' : 'Start'}
            </button>
          )}

          <button
            onClick={() => onSelectTask && onSelectTask(activeRunningTask)}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 px-2 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer h-7 transition-colors"
          >
            <Eye size={13} /> View
          </button>

          <button
            onClick={handleStop}
            disabled={stopping}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white border-none px-2.5 py-1 rounded-md text-[11.5px] font-bold cursor-pointer shadow-sm shadow-red-600/30 h-7 transition-colors disabled:opacity-50"
          >
            <Square size={11} className="fill-white" />
            {stopping ? 'Logging...' : 'Stop'}
          </button>
        </div>
      </div>
    </div>
  );
};
