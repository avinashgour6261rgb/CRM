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
import { useTimer } from '../../../../shared/context/TimerContext';

const PRESET_BREAKS = [
  { id: 'Tea / Coffee Break', label: 'Tea / Coffee Break', icon: Coffee, defaultMinutes: 15, color: '#0284c7', bg: '#f0f9ff' },
  { id: 'Lunch Break', label: 'Lunch Break', icon: Utensils, defaultMinutes: 45, color: '#ea580c', bg: '#fff7ed' },
  { id: 'Quick Rest / Stretch', label: 'Quick Rest / Stretch', icon: Clock, defaultMinutes: 10, color: '#16a34a', bg: '#f0fdf4' },
  { id: 'Personal Break', label: 'Personal Break', icon: User, defaultMinutes: 15, color: '#9333ea', bg: '#faf5ff' },
  { id: 'Wellness & Prayer', label: 'Wellness & Prayer', icon: Heart, defaultMinutes: 20, color: '#db2777', bg: '#fdf2f8' }
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '580px',
        maxHeight: '92vh',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coffee size={20} color="#ea580c" />
              <span>Break Time & Duration Manager</span>
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Choose your break time. Task and shift timers pause automatically during breaks.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f1f5f9',
          padding: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('choose')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'choose' ? '#ffffff' : 'transparent',
              color: activeTab === 'choose' ? '#2563eb' : '#64748b',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'choose' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            <Coffee size={15} />
            <span>{isOnBreak ? 'Active Break Status' : 'Take a Break'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? '#2563eb' : '#64748b',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            <History size={15} />
            <span>Break History & Logs ({breakHistory.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* TAB 1: Take Break / Monitor Active Break */}
          {activeTab === 'choose' && (
            isOnBreak ? (
              /* Active Break Live Status */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
                <div style={{
                  padding: '24px 20px',
                  backgroundColor: isBreakOverdue ? '#fef2f2' : '#fffbeb',
                  borderRadius: '14px',
                  border: isBreakOverdue ? '2px solid #f87171' : '1.5px solid #fde68a',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: isBreakOverdue ? '#fee2e2' : '#fef3c7',
                    color: isBreakOverdue ? '#dc2626' : '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Coffee size={30} />
                  </div>

                  <span style={{ fontSize: '11.5px', fontWeight: '800', color: isBreakOverdue ? '#b91c1c' : '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Break in Progress • Started at {breakStartTime || 'Recent'}
                  </span>

                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0' }}>
                    {breakType}
                  </h3>

                  {/* Chosen Target Info */}
                  <div style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Target Duration: <strong>{customBreakLimitMinutes || 15} minutes</strong></span>
                    <span>•</span>
                    <span style={{ color: isBreakOverdue ? '#dc2626' : '#16a34a', fontWeight: '700' }}>
                      {isBreakOverdue ? 'Overdue' : `${breakRemainingTimeString} remaining`}
                    </span>
                  </div>

                  {/* Live Break Timer */}
                  <div style={{
                    fontSize: '36px',
                    fontWeight: '800',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: isBreakOverdue ? '#dc2626' : '#ea580c',
                    letterSpacing: '0.05em',
                    margin: '6px 0'
                  }}>
                    {currentBreakTimeString}
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${activeBreakProgress}%`,
                      backgroundColor: isBreakOverdue ? '#ef4444' : '#f59e0b',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  {/* Overtime Alert */}
                  {isBreakOverdue ? (
                    <div style={{
                      marginTop: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <AlertTriangle size={15} />
                      <span>⚠️ You have passed your {customBreakLimitMinutes}m limit. Click Resume when ready!</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      ⏸️ Task & shift timers are paused.
                    </div>
                  )}

                  {/* Extend Break Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Need more time?</span>
                    <button
                      type="button"
                      onClick={() => extendBreak(5)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      +5 mins
                    </button>
                    <button
                      type="button"
                      onClick={() => extendBreak(10)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
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
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '13px 24px',
                    borderRadius: '10px',
                    fontSize: '14.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(22, 163, 74, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Play size={16} fill="#fff" />
                  <span>Resume Work Session & Log Break 🚀</span>
                </button>
              </div>
            ) : (
              /* Configure & Start Break (Decide own time) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. Category Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                    1. Choose Break Category
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: isSelected ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                            backgroundColor: isSelected ? opt.bg : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: opt.bg,
                            color: opt.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Icon size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {opt.label}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isCustomMode ? '2px solid #2563eb' : '1px dashed #cbd5e1',
                        backgroundColor: isCustomMode ? '#eff6ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Plus size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                          Custom Break
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Set own time & name
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* If Custom Mode, custom title input */}
                {isCustomMode && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Break Reason / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Doctor Visit, Quick Snack, Call with Family..."
                      value={customBreakTitle}
                      onChange={e => setCustomBreakTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #3b82f6',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                {/* 2. Employee Duration Selection (Decide Own Break Time) */}
                <div style={{
                  padding: '14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                      2. How much break time do you need?
                    </label>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                      {customMinutes} Minutes Chosen
                    </span>
                  </div>

                  {/* Quick Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {DURATION_PILLS.map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCustomMinutes(mins)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: Number(customMinutes) === mins ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          backgroundColor: Number(customMinutes) === mins ? '#0284c7' : '#ffffff',
                          color: Number(customMinutes) === mins ? '#ffffff' : '#334155',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>

                  {/* Or Manual Number Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Or enter exact minutes:</span>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={customMinutes}
                      onChange={e => setCustomMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={{
                        width: '80px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#0f172a',
                        textAlign: 'center',
                        outline: 'none',
                        backgroundColor: '#ffffff'
                      }}
                    />
                    <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>Minutes</span>
                  </div>
                </div>

                {/* 3. Optional Quick Note */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Quick Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Taking quick tea break, will return in 15 mins..."
                    value={breakNotes}
                    onChange={e => setBreakNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Start Break Button */}
                <button
                  type="button"
                  onClick={handleStartBreak}
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    fontSize: '14.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(234, 88, 12, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#c2410c'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ea580c'}
                >
                  <Coffee size={17} />
                  <span>Start Break ({customMinutes} min) ☕</span>
                </button>

                <div style={{ fontSize: '11.5px', color: '#94a3b8', textAlign: 'center' }}>
                  ℹ️ Active task timer and working shift timer will pause automatically.
                </div>
              </div>
            )
          )}

          {/* TAB 2: Break History & Reminders Log */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Summary Metric Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '12px'
              }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Total Breaks:</span>
                  <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                    {breakHistory.length} Sessions
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Total Break Time:</span>
                  <span style={{ fontWeight: '800', color: '#ea580c', fontSize: '14px' }}>
                    {breakDurationText}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Productive Work:</span>
                  <span style={{ fontWeight: '800', color: '#16a34a', fontSize: '14px' }}>
                    {workDurationText}
                  </span>
                </div>
              </div>

              {/* History Timeline */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '320px',
                overflowY: 'auto'
              }}>
                {breakHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8', fontSize: '13px' }}>
                    <History size={32} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                    No breaks recorded yet today. Take a break when you need to recharge!
                  </div>
                ) : (
                  breakHistory.map((item, idx) => {
                    const Icon = getBreakIcon(item.type);
                    return (
                      <div
                        key={item.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                              {item.type} {item.targetMinutes ? `(${item.targetMinutes}m target)` : ''}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {item.startTime} ➔ {item.endTime} ({item.durationText})
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#f0fdf4',
                            color: '#15803d'
                          }}>
                            Completed
                          </span>

                          <button
                            type="button"
                            onClick={() => deleteBreakHistoryItem(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
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
                <div style={{ textAlign: 'right', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={clearTodayBreaks}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
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
