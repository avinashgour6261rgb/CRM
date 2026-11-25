import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Monitor,
  Calendar,
  Clock,
  ShieldCheck,
  Search,
  RefreshCw,
  Users,
  ChevronRight,
  Radio
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../../../../shared/config/apiConfig';

const formatDateTime = (dateVal) => {
  if (!dateVal) return 'Recent';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Recent';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (_) {
    return 'Recent';
  }
};

/**
 * @file CallAndScreenHistoryModal.jsx
 * @description Enterprise Call & Screen Share Session History Audit Viewer.
 * Directly queries MongoDB Atlas via `/api/calls/history` and `/api/calls/screenshare/history`.
 * ZERO audio/video media stored — lightweight enterprise audit records only.
 */
export const CallAndScreenHistoryModal = ({
  isOpen,
  onClose,
  currentUser,
  activeConv
}) => {
  const [activeTab, setActiveTab] = useState('calls'); // 'calls' | 'screens'
  const [calls, setCalls] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState('all'); // 'all' | 'conversation'

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const convParam = filterScope === 'conversation' && activeConv?.id ? `?conversationId=${encodeURIComponent(activeConv.id)}` : '';

      const [callRes, screenRes] = await Promise.allSettled([
        fetch(`${API_BASE}/calls/history${convParam}`, { headers: getAuthHeaders(), credentials: 'include' }).then(r => r.json()),
        fetch(`${API_BASE}/calls/screenshare/history${convParam}`, { headers: getAuthHeaders(), credentials: 'include' }).then(r => r.json())
      ]);

      if (callRes.status === 'fulfilled' && callRes.value?.success) {
        setCalls(callRes.value.data || []);
      }
      if (screenRes.status === 'fulfilled' && screenRes.value?.success) {
        setScreens(screenRes.value.data || []);
      }
    } catch (err) {
      console.warn('[HistoryModal] Error fetching audit logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, filterScope, activeConv?.id]);

  const filteredCalls = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return calls;
    return calls.filter(c =>
      (c.caller?.name && c.caller.name.toLowerCase().includes(q)) ||
      (c.receiver?.name && c.receiver.name.toLowerCase().includes(q)) ||
      (c.channelName && c.channelName.toLowerCase().includes(q)) ||
      (c.status && c.status.toLowerCase().includes(q))
    );
  }, [calls, searchQuery]);

  const filteredScreens = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return screens;
    return screens.filter(s =>
      (s.host?.name && s.host.name.toLowerCase().includes(q)) ||
      (s.channelName && s.channelName.toLowerCase().includes(q))
    );
  }, [screens, searchQuery]);

  if (!isOpen) return null;

  const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || '');

  return (
    <div className="fixed inset-0 z-[1060] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn select-none">
      <div className="bg-white dark:bg-[#111c35] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 px-5 bg-slate-50 dark:bg-[#0c1527] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-200 dark:border-blue-900 shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  Communications Audit History
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  MongoDB Atlas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Zero audio/video recorded • Real-time session durations & timestamps only
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer border-0 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls & Filters */}
        <div className="p-3 px-5 bg-white dark:bg-[#111c35] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('calls')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer border-0 transition-all ${
                activeTab === 'calls'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Phone size={13} />
              <span>Voice Calls ({calls.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('screens')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer border-0 transition-all ${
                activeTab === 'screens'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Monitor size={13} />
              <span>Screen Shares ({screens.length})</span>
            </button>
          </div>

          {/* Search & Scope Filters */}
          <div className="flex items-center gap-2 flex-1 max-w-sm ml-auto">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by teammate..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {activeConv && (
              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Chats</option>
                <option value="conversation">This Chat</option>
              </select>
            )}

            <button
              type="button"
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
              title="Refresh logs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 min-h-[320px] max-h-[58vh]">
          {loading && calls.length === 0 && screens.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500">
              <RefreshCw size={24} className="animate-spin text-blue-500 mb-2" />
              <span className="text-xs font-semibold">Loading session audit records...</span>
            </div>
          ) : activeTab === 'calls' ? (
            filteredCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500">
                <PhoneOff size={32} className="opacity-40 mb-2" />
                <p className="text-xs font-semibold m-0">No voice call records found</p>
                <span className="text-[11px] opacity-75 mt-0.5">Calls between clocked-in team members will appear here.</span>
              </div>
            ) : (
              filteredCalls.map((call) => {
                const isOutbound = String(call.caller?.id) === myId;
                const otherParty = isOutbound ? call.receiver : call.caller;
                const statusColor =
                  call.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : call.status === 'declined'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800';

                return (
                  <div
                    key={call._id || call.callId}
                    className="p-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={otherParty?.avatar || call.caller?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-white flex items-center justify-center text-white ${
                          call.status === 'completed' ? 'bg-emerald-500' : call.status === 'declined' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}>
                          {call.status === 'completed' ? (
                            isOutbound ? <PhoneOutgoing size={8} /> : <PhoneIncoming size={8} />
                          ) : (
                            <PhoneMissed size={8} />
                          )}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate m-0">
                            {call.isChannel ? `#${call.channelName || 'channel'} Huddle` : (otherParty?.name || 'Teammate')}
                          </h4>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${statusColor} uppercase`}>
                            {call.status || 'ended'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{isOutbound ? 'Outgoing' : 'Incoming'}</span>
                          <span>•</span>
                          <span>{call.durationText || `${call.durationSeconds || 0}s`}</span>
                          <span>•</span>
                          <span>{formatDateTime(call.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {call.durationText || '0s'}
                      </span>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            filteredScreens.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500">
                <Monitor size={32} className="opacity-40 mb-2" />
                <p className="text-xs font-semibold m-0">No screen share records found</p>
                <span className="text-[11px] opacity-75 mt-0.5">Live screen presentation sessions will be logged here.</span>
              </div>
            ) : (
              filteredScreens.map((screen) => (
                <div
                  key={screen._id || screen.sessionId}
                  className="p-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={screen.host?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-600 border border-white flex items-center justify-center text-white">
                        <Monitor size={8} />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate m-0">
                          {screen.host?.name || 'Teammate'}
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {screen.isChannel ? `#${screen.channelName || 'channel'}` : 'Direct Share'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{formatDateTime(screen.createdAt)}</span>
                        <span>•</span>
                        <span>{screen.viewersCount || 1} viewer{(screen.viewersCount || 1) > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      {screen.durationText || '0s'}
                    </span>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 bg-slate-50 dark:bg-[#0c1527] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-[11px]">Database Encrypted Audit Trail Active</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer border-0 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
