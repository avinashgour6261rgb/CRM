/**
 * @file LogTimeModal.jsx
 * @description Modal for manually logging working hours to the timesheet.
 * Supports:
 * 1. 🏢 Existing Project & Task Selection
 * 2. 📌 Custom / Basic Task direct entry
 * 3. ⏱️ Duration presets & easy-to-use inputs
 */

import React, { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  User,
  FolderGit2,
  Check,
  Zap,
  Layers,
  FileText
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useToast } from '../../../../shared/context/ToastContext';

export const LogTimeModal = ({ isOpen, onClose }) => {
  const {
    projects,
    tasks,
    employees,
    currentUser,
    logTimesheet
  } = useWork();
  const { addToast } = useToast();

  const [mode, setMode] = useState(projects.length > 0 && tasks.length > 0 ? 'existing' : 'custom');

  const [formData, setFormData] = useState({
    projectId: projects[0]?._id || '',
    taskId: tasks[0]?._id || '',
    customTaskName: '',
    customProjectName: 'General Work',
    employeeId: currentUser?._id || employees[0]?._id || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:30:00',
    endTime: '17:30:00',
    memo: '',
    isBillable: true
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateDurationSeconds = () => {
    try {
      const [startH, startM] = formData.startTime.split(':').map(Number);
      const [endH, endM] = formData.endTime.split(':').map(Number);
      let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      return diffMinutes * 60;
    } catch {
      return 3600;
    }
  };

  const setDurationHours = (hours) => {
    try {
      const [startH, startM] = formData.startTime.split(':').map(Number);
      let endTotalMinutes = startH * 60 + startM + Math.round(hours * 60);
      let endH = Math.floor(endTotalMinutes / 60) % 24;
      let endM = endTotalMinutes % 60;
      const formatted = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
      setFormData(prev => ({ ...prev, endTime: formatted }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let taskCode = 'GEN';
      let taskTitle = 'General Work';
      let taskId = '';
      let projectId = '';
      let projectName = 'General Project';

      if (mode === 'existing') {
        const selectedProject = projects.find(p => p._id === formData.projectId) || projects[0];
        const selectedTask = tasks.find(t => t._id === formData.taskId) || tasks[0];
        taskCode = selectedTask?.taskCode || 'TSK-1';
        taskTitle = selectedTask?.title || 'General Task';
        taskId = selectedTask?._id || '';
        projectId = selectedProject?._id || '';
        projectName = selectedProject?.name || 'General Project';
      } else {
        taskTitle = formData.customTaskName.trim() || 'Custom Offline Work';
        taskCode = 'CUST';
        projectName = formData.customProjectName.trim() || 'General Work';
      }

      const selectedEmp = employees.find(e => e._id === formData.employeeId) || currentUser || employees[0];
      const totalSecs = calculateDurationSeconds();

      const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
      const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');

      await logTimesheet({
        taskId,
        taskCode,
        taskTitle,
        projectId,
        projectName,
        employeeId: selectedEmp?._id || '',
        employeeName: selectedEmp?.name || 'Team Member',
        employeeAvatar: selectedEmp?.avatar || '',
        employeeRole: selectedEmp?.role || '',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        totalDurationSeconds: totalSecs,
        totalDurationText: `${hrs}h ${mins}m`,
        memo: formData.memo || (mode === 'custom' ? `Custom: ${taskTitle}` : `Manual time log`),
        isBillable: formData.isBillable,
        status: 'approved'
      });

      if (addToast) addToast(`Logged ${hrs}h ${mins}m for "${taskTitle}"`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Failed to log time', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs sm:text-sm outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:border-sky-500 focus:ring-1 focus:ring-sky-500";

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[5px] flex items-center justify-center z-[1000] p-4 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[640px] max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white m-0">
              Log Time (Manual Entry)
            </h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1 mb-0">
              Record offline work duration for completed tasks or general work
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Toggle Switcher */}
        <div className="pt-4 px-6">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`py-2 px-3 rounded-lg border-none text-[13px] font-bold cursor-pointer transition-all ${
                mode === 'custom'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              📌 Custom / Basic Task
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`py-2 px-3 rounded-lg border-none text-[13px] font-bold cursor-pointer transition-all ${
                mode === 'existing'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              🏢 Existing Project & Task
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:px-6 flex flex-col gap-4">
          
          {/* Custom Task Entry */}
          {mode === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-3.5">
              <div>
                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Custom Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customTaskName}
                  onChange={e => handleChange('customTaskName', e.target.value)}
                  placeholder="e.g. Client Call or Bug Fixing..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Project / Tag Name
                </label>
                <input
                  type="text"
                  value={formData.customProjectName}
                  onChange={e => handleChange('customProjectName', e.target.value)}
                  placeholder="e.g. General Work, SEO..."
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Existing Project & Task Selection */}
          {mode === 'existing' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Project *
                </label>
                <select
                  value={formData.projectId}
                  onChange={e => handleChange('projectId', e.target.value)}
                  className={selectClass}
                >
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>[{p.projectCode}] {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Task *
                </label>
                <select
                  value={formData.taskId}
                  onChange={e => handleChange('taskId', e.target.value)}
                  className={selectClass}
                >
                  {tasks.map(t => (
                    <option key={t._id} value={t._id}>[{t.taskCode}] {t.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Employee & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Employee (CRM Team) *
              </label>
              <select
                value={formData.employeeId}
                onChange={e => handleChange('employeeId', e.target.value)}
                className={selectClass}
              >
                {employees.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({e.role || 'Member'}) {e._id === currentUser?._id ? '— You' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => handleChange('date', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Quick Duration Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12.5px] font-semibold text-slate-600 dark:text-slate-400">
                Quick Set Duration:
              </label>
              <span className="text-[11.5px] text-blue-600 dark:text-blue-400 font-bold">
                Total: {Math.floor(calculateDurationSeconds() / 3600)}h {Math.floor((calculateDurationSeconds() % 3600) / 60)}m
              </span>
            </div>
            <div className="flex gap-1.5">
              {[0.5, 1, 2, 4, 6, 8].map(hrs => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => setDurationHours(hrs)}
                  className="flex-1 py-1.5 px-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
                >
                  {hrs < 1 ? '30m' : `${hrs}h`}
                </button>
              ))}
            </div>
          </div>

          {/* Start Time & End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Time *
              </label>
              <input
                type="time"
                step="1"
                required
                value={formData.startTime}
                onChange={e => handleChange('startTime', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                End Time *
              </label>
              <input
                type="time"
                step="1"
                required
                value={formData.endTime}
                onChange={e => handleChange('endTime', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Memo / Notes */}
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Work Memo / Description
            </label>
            <textarea
              rows={3}
              placeholder="What did you work on during this session?"
              value={formData.memo}
              onChange={e => handleChange('memo', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none resize-y font-sans bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Billable Checkbox */}
          <label className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isBillable}
              onChange={e => handleChange('isBillable', e.target.checked)}
              className="accent-blue-600 rounded"
            />
            Billable Work Session
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white border-none px-5 py-2.5 rounded-lg text-[13.5px] font-semibold cursor-pointer shadow-md shadow-sky-600/30 transition-colors disabled:opacity-50"
            >
              <Check size={16} />
              {submitting ? 'Logging...' : 'Log Time'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 rounded-lg text-[13.5px] font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogTimeModal;
