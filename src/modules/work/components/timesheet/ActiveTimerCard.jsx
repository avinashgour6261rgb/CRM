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
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '8px 14px',
        border: '1px dashed #cbd5e1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
              No Active Task Timer Running
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
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
    <div style={{
      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      borderRadius: '8px',
      padding: '10px 14px',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
    }}>
      {/* Left Details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          backgroundColor: 'rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid rgba(255,255,255,0.25)'
        }}>
          <Zap size={18} fill="#ffffff" />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
            <span style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '0.02em'
            }}>
              {activeRunningTask.taskCode}
            </span>
            <span style={{ fontSize: '11px', color: '#e0f2fe', fontWeight: '500' }}>
              {activeRunningTask.projectName}
            </span>
          </div>

          <h3 style={{ fontSize: '13.5px', fontWeight: '700', margin: 0, color: '#ffffff', lineHeight: 1.2 }}>
            {activeRunningTask.title}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#bae6fd', marginTop: '1px' }}>
            <span>👤 {activeRunningTask.assignedToName}</span>
            <span>•</span>
            <span>Started: Today</span>
          </div>
        </div>
      </div>

      {/* Right Controls & Live Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#e0f2fe', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600' }}>
            Running Duration
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '800',
            fontFamily: 'monospace',
            letterSpacing: '0.03em',
            lineHeight: 1.1
          }}>
            {formatSeconds(activeRunningTask.timerSeconds || 0)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {activeRunningTask.timerRunning ? (
            <button
              onClick={() => pauseTaskTimer(activeRunningTask._id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                height: '28px'
              }}
            >
              <Pause size={12} fill="#ffffff" /> Pause
            </button>
          ) : (
            <button
              onClick={() => startTaskTimer(activeRunningTask._id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                height: '28px'
              }}
            >
              <Play size={12} fill="#ffffff" /> {activeRunningTask?.timerSeconds > 0 ? 'Resume' : 'Start'}
            </button>
          )}

          <button
            onClick={() => onSelectTask && onSelectTask(activeRunningTask)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(255,255,255,0.18)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: '600',
              cursor: 'pointer',
              height: '28px'
            }}
          >
            <Eye size={13} /> View
          </button>

          <button
            onClick={handleStop}
            disabled={stopping}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
              height: '28px'
            }}
          >
            <Square size={11} fill="#ffffff" />
            {stopping ? 'Logging...' : 'Stop'}
          </button>
        </div>
      </div>
    </div>
  );
};
