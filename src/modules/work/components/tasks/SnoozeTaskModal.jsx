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

const QUICK_SNOOZE_PRESETS = [
  { label: '15 Minutes', minutes: 15, icon: '⚡' },
  { label: '30 Minutes', minutes: 30, icon: '☕' },
  { label: '1 Hour', minutes: 60, icon: '⏳' },
  { label: '2 Hours', minutes: 120, icon: '⏱️' },
  { label: 'Tomorrow 9:00 AM', type: 'tomorrow_9am', icon: '🌅' }
];

export const SnoozeTaskModal = ({ isOpen, onClose, task }) => {
  const { snoozeTask, formatSeconds } = useWork();
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
          alert('Please select a reminder date and time');
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#faf5ff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#9333ea',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(147, 51, 234, 0.3)'
            }}>
              <Bell size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Do Later & Remind Me ⏰
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                Timer pauses right here & CRM will alert you when to resume
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Target Task Summary */}
          <div style={{
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b21a8' }}>
                #{task.taskCode || 'TSK'} • {task.projectName || 'General'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                Time Logged: <strong style={{ color: '#0f172a' }}>{task.hoursLoggedText || formatSeconds(task.timerSeconds || 0)}</strong>
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Remind me in:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
              {QUICK_SNOOZE_PRESETS.map((preset, idx) => {
                const isSelected = selectedPreset === (preset.minutes || preset.type);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPreset(preset.minutes || preset.type)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid #9333ea' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#faf5ff' : '#ffffff',
                      color: isSelected ? '#7e22ce' : '#475569',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textAlign: 'left'
                    }}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: selectedPreset === 'custom' ? '1.5px solid #9333ea' : '1px solid #cbd5e1',
                  backgroundColor: selectedPreset === 'custom' ? '#faf5ff' : '#ffffff',
                  color: selectedPreset === 'custom' ? '#7e22ce' : '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📅</span>
                <span>Custom Time...</span>
              </button>
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          {selectedPreset === 'custom' && (
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                Pick Custom Reminder Date & Time:
              </label>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={e => setCustomDateTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #9333ea',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          )}

          {/* Optional Reminder Note */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Note / Why do later? (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Waiting on client feedback, taking urgent call..."
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          backgroundColor: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSnooze}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#9333ea',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(147, 51, 234, 0.3)'
            }}
          >
            <Bell size={13} />
            <span>Pause & Set Reminder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
