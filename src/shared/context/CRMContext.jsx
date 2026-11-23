/**
 * @file CRMContext.jsx
 * @description State Management for CRM modules: Expenses/Finance, Tickets with discussion threads,
 * Events with Automatic Birthday Generation from employee DOB, Team Chat/Messages, Notices, and Dark Mode.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getCollection, saveCollection, KEYS } from '../services/storageService';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { useHR } from '../../modules/hr/context/HRContext';
import { getCompanySettings } from '../services/companySettingsService';
import { API_BASE, getAuthHeaders as buildJwtAuthHeaders } from '../config/apiConfig';

import { calculateComputedBirthdays, calculateComputedAnniversaries } from '../../modules/crm/utils/celebrationUtils';
import {
  isConversationVisibleToUser,
  getUnreadCountForUser,
  playChatNotificationSound
} from '../../modules/crm/utils/chatPrivacyUtils';
import {
  canDeleteTicket,
  canDeleteNotice,
  canDeleteLead
} from '../utils/permissionUtils';
import { readTimerStorage, getLocalDateString } from '../utils/timerUtils';
import { isSocketConnected } from '../services/socketService';

const DEFAULT_WEEKLY_TIMELOGS = [
  { day: 'Monday', shortDay: 'Mo', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Tuesday', shortDay: 'Tu', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Wednesday', shortDay: 'We', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Thursday', shortDay: 'Th', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Friday', shortDay: 'Fr', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Saturday', shortDay: 'Sa', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Sunday', shortDay: 'Su', date: '', durationText: '0h 00m', durationHours: 0, loginTime: 'Off', logoutTime: 'Off', breakDuration: '0m', isDayOff: true }
];

const defaultCRMContext = {
  expenses: [],
  loadExpenses: async () => {},
  createExpense: async () => {},
  updateExpense: async () => {},
  updateExpenseStatus: async () => {},
  deleteExpense: async () => {},
  importExpensesBatch: async () => {},

  tickets: [],
  loadTickets: async () => {},
  createTicket: async () => {},
  updateTicketStatus: async () => {},
  replyToTicket: async () => {},
  addTicketInternalNote: async () => {},
  assignTicket: async () => {},
  deleteTicket: async () => {},

  events: [],
  loadEvents: async () => {},
  createEvent: async () => {},
  updateEvent: async () => {},
  deleteEvent: async () => {},
  computedBirthdays: [],
  birthdays: [],
  computedAnniversaries: [],
  anniversaries: [],

  conversations: [],
  visibleConversations: [],
  totalUnreadMessagesCount: 0,
  activeConversationId: null,
  setActiveConversationId: () => {},
  sendMessage: async () => {},
  deleteMessage: async () => {},
  startConversation: async () => {},
  createChannel: async () => {},
  updateChannelMembers: () => {},
  markConversationAsRead: () => {},

  notices: [],
  loadNotices: async () => {},
  createNotice: async () => {},
  updateNotice: async () => {},
  deleteNotice: async () => {},
  dismissNoticeForUser: () => {},

  leads: [],
  loadLeads: async () => {},
  leadsFilter: 'all',
  setLeadsFilter: () => {},
  createLead: async () => {},
  updateLead: async () => {},
  updateLeadStatus: async () => {},
  deleteLead: async () => {},
  importLeadsBatch: async () => {},

  emergencyContacts: [],
  addEmergencyContact: async () => {},
  updateEmergencyContact: async () => {},
  deleteEmergencyContact: async () => {},

  userSettings: {},
  updateUserSettings: async () => {},

  wfhEmployees: [],
  weeklyTimeLogs: {},
  computedWeeklyTimeLogs: {},
  darkMode: false,
  toggleDarkMode: () => {},
  updateUserProfile: async () => {}
};

const CRMContext = createContext(defaultCRMContext);

// Module-level backend availability circuit breaker (shared across all parallel loaders & re-renders)
let crmBackendOnline = null;
let lastCrmCheck = 0;
let crmHealthInFlight = null;

const isCrmBackendAvailable = async () => {
  const now = Date.now();
  if (crmBackendOnline !== null && (now - lastCrmCheck < 25000)) {
    return crmBackendOnline;
  }
  if (crmHealthInFlight) return crmHealthInFlight;

  crmHealthInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(8000) });
      const ct = res.headers.get('content-type') || '';
      crmBackendOnline = res.ok && ct.includes('application/json');
    } catch {
      crmBackendOnline = false;
    }
    lastCrmCheck = Date.now();
    crmHealthInFlight = null;
    return crmBackendOnline;
  })();

  return crmHealthInFlight;
};

const isMongoObjectId = (val) => typeof val === 'string' && /^[a-fA-F0-9]{24}$/.test(val);

export const CRMProvider = ({ children }) => {
  const { addToast } = useToast();
  const { currentUser: authUser } = useAuth();
  const { currentUser: hrUser, updateEmployee, employees } = useHR();

  // Resolve canonical user profile across Auth and HR contexts
  const currentUser = useMemo(() => {
    const base = authUser || hrUser;
    if (!base) return null;
    const localEmps = getCollection(KEYS.EMPLOYEES) || employees || [];
    const matched = localEmps.find(e =>
      (base._id && (String(e._id) === String(base._id) || String(e.id) === String(base._id))) ||
      (base.id && (String(e._id) === String(base.id) || String(e.id) === String(base.id))) ||
      (base.employeeCode && (String(e.employeeCode).toUpperCase() === String(base.employeeCode).toUpperCase())) ||
      (base.email && e.email && String(e.email).toLowerCase() === String(base.email).toLowerCase())
    );
    return matched ? { ...base, ...matched } : base;
  }, [authUser, hrUser, employees]);

  // Helper to normalize event objects so undefined values never leak to UI
  const normalizeEvent = (e) => ({
    _id: e._id || `ev_${Math.random()}`,
    eventName: e.eventName || e.title || 'Company Event',
    title: e.title || e.eventName || 'Company Event',
    eventType: e.eventType || e.type || 'Company Event',
    type: e.type || e.eventType || 'Company Event',
    startDate: e.startDate || e.date || getLocalDateString(),
    date: e.date || e.startDate || getLocalDateString(),
    endDate: e.endDate || e.startDate || e.date || getLocalDateString(),
    startTime: e.startTime || e.time || '10:00 AM',
    time: e.time || e.startTime || '10:00 AM',
    location: e.location || 'Headquarters / Main Office',
    description: e.description || '',
    isRecurring: !!e.isRecurring,
    color: e.color || '#2563eb',
    bgColor: e.bgColor || '#eff6ff',
    ...e
  });

  // Default company and department channels for chat
  const DEFAULT_ENTERPRISE_CHANNELS = [
    {
      id: 'channel_general',
      type: 'channel',
      name: 'General',
      channelName: '#general',
      description: 'Company-wide open discussion, daily greetings, and team collaboration',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120',
      members: ['all'],
      isOnline: true,
      lastMessage: 'Welcome to Inforag Technology official workspace chat!',
      lastMessageTime: '09:00 AM',
      unreadCount: 0,
      messages: [
        {
          id: 'msg_gen_init',
          conversationId: 'channel_general',
          senderId: 'ADM-001',
          senderName: 'Inforag Admin',
          senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
          senderRole: 'Administrator',
          text: '👋 Welcome everyone to the Inforag Technology company chat! Feel free to collaborate, share project updates, photos, videos, documents, and connect with teammates.',
          attachments: [],
          timestamp: '09:00 AM',
          createdAt: 1730000000000,
          readBy: ['ADM-001']
        }
      ]
    },
    {
      id: 'channel_it_dev',
      type: 'channel',
      name: 'IT & Software Development',
      channelName: '#it-software-development',
      description: 'Code architecture, sprint deliverables, bug fixes & tech stack updates',
      avatar: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=120',
      members: ['all_it'],
      isOnline: true,
      lastMessage: 'All sprint environments are live and operational.',
      lastMessageTime: '09:15 AM',
      unreadCount: 0,
      messages: [
        {
          id: 'msg_it_init',
          conversationId: 'channel_it_dev',
          senderId: 'ADM-001',
          senderName: 'Inforag Admin',
          senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
          senderRole: 'Administrator',
          text: '💻 IT & Software Development channel is active. Share code files, pull request reviews, architecture diagrams, and testing logs here.',
          attachments: [],
          timestamp: '09:15 AM',
          createdAt: 1730000100000,
          readBy: ['ADM-001']
        }
      ]
    },
    {
      id: 'channel_marketing',
      type: 'channel',
      name: 'Digital Marketing & Growth',
      channelName: '#digital-marketing',
      description: 'Campaigns, SEO, PPC Ads, SMM, copywriting and creative design discussions',
      avatar: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=120',
      members: ['all_marketing'],
      isOnline: true,
      lastMessage: 'Weekly campaign creatives and review assets.',
      lastMessageTime: '10:30 AM',
      unreadCount: 0,
      messages: [
        {
          id: 'msg_mkt_init',
          conversationId: 'channel_marketing',
          senderId: 'ADM-001',
          senderName: 'Inforag Admin',
          senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
          senderRole: 'Administrator',
          text: '🚀 Digital Marketing hub is ready! Share campaign creatives, Google & Meta Ads performance reports, SEO audit sheets, and copy decks.',
          attachments: [],
          timestamp: '10:30 AM',
          createdAt: 1730000200000,
          readBy: ['ADM-001']
        }
      ]
    },
    {
      id: 'channel_announcements',
      type: 'channel',
      name: 'Company Announcements',
      channelName: '#announcements',
      description: 'Official corporate notices, policy updates, and executive announcements',
      avatar: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=120',
      members: ['all'],
      isOnline: true,
      lastMessage: 'Official guidelines and company updates.',
      lastMessageTime: 'Yesterday',
      unreadCount: 0,
      messages: [
        {
          id: 'msg_ann_init',
          conversationId: 'channel_announcements',
          senderId: 'ADM-001',
          senderName: 'HR & Executive Team',
          senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
          senderRole: 'Executive',
          text: '📢 This channel is reserved for official Inforag Technology company-wide announcements, policy rollouts, and holiday reminders.',
          attachments: [],
          timestamp: 'Yesterday',
          createdAt: 1729900000000,
          readBy: ['ADM-001']
        }
      ]
    }
  ];

  // Helper to remove any duplicate messages within conversations
  const sanitizeConversationMessages = (convList = []) => {
    if (!Array.isArray(convList)) return [];
    return convList.map(c => {
      if (!c || !Array.isArray(c.messages)) return c;
      const seen = new Set();
      const deduped = [];
      for (const m of c.messages) {
        if (!m) continue;
        const k = m.id || `${m.senderId || ''}_${m.createdAt || ''}_${m.text || ''}`;
        if (!seen.has(k)) {
          seen.add(k);
          deduped.push(m);
        }
      }
      return deduped.length === c.messages.length ? c : { ...c, messages: deduped };
    });
  };

  const ensureDefaultChannels = (storedConvs = []) => {
    let convs = Array.isArray(storedConvs) ? [...storedConvs] : [];
    // Deduplicate conversations by id
    const convMap = new Map();
    convs.forEach(c => {
      if (c && c.id && !convMap.has(c.id)) {
        convMap.set(c.id, c);
      }
    });
    convs = Array.from(convMap.values());

    let changed = false;
    DEFAULT_ENTERPRISE_CHANNELS.forEach(defaultCh => {
      const exists = convs.some(c => c.id === defaultCh.id || c.channelName === defaultCh.channelName);
      if (!exists) {
        convs.unshift(defaultCh);
        changed = true;
      }
    });

    const sanitized = sanitizeConversationMessages(convs);
    if (sanitized.some((c, i) => c !== convs[i])) {
      changed = true;
      convs = sanitized;
    }

    if (changed) {
      saveCollection(KEYS.CONVERSATIONS, convs, { broadcast: false });
    }
    return convs;
  };

  // Core Storage States
  const [expenses, setExpenses] = useState(() => getCollection(KEYS.EXPENSES));
  const [tickets, setTickets] = useState(() => getCollection(KEYS.TICKETS));
  const [notices, setNotices] = useState(() => getCollection(KEYS.NOTICES));
  const [events, setEvents] = useState(() => (getCollection(KEYS.EVENTS) || []).map(normalizeEvent));
  const [conversations, setConversations] = useState(() => ensureDefaultChannels(getCollection(KEYS.CONVERSATIONS)));
  const [activeConversationId, setActiveConversationIdState] = useState(() => {
    try {
      return localStorage.getItem('ems_active_chat_conv_id') || 'channel_general';
    } catch {
      return 'channel_general';
    }
  });

  const setActiveConversationId = (id) => {
    if (!id) return;
    setActiveConversationIdState(id);
    try {
      localStorage.setItem('ems_active_chat_conv_id', id);
    } catch (_) {}
  };

  // Strict Scoped Conversations & Global Unread Badges
  const visibleConversations = useMemo(() => {
    if (!currentUser) return conversations || [];
    return (conversations || []).filter(c => isConversationVisibleToUser(c, currentUser));
  }, [conversations, currentUser]);

  const totalUnreadMessagesCount = useMemo(() => {
    if (!currentUser) return 0;
    return visibleConversations.reduce((sum, conv) => {
      return sum + getUnreadCountForUser(conv, currentUser);
    }, 0);
  }, [visibleConversations, currentUser]);

  // Audio chime notification for incoming chat messages
  useEffect(() => {
    const handleChatMessage = (e) => {
      const { message } = e.detail || {};
      if (!message || !currentUser) return;
      const myId = String(currentUser._id || '').toLowerCase();
      const myCode = String(currentUser.employeeCode || '').toLowerCase();
      const myEmail = String(currentUser.email || '').toLowerCase();

      const senderId = String(message.senderId || '').toLowerCase();
      const senderCode = String(message.senderCode || '').toLowerCase();
      const senderEmail = String(message.senderEmail || '').toLowerCase();

      const isFromMe = (myId && senderId === myId) || (myCode && senderCode === myCode) || (myEmail && senderEmail === myEmail);
      if (!isFromMe) {
        playChatNotificationSound();
      }
    };
    window.addEventListener('ems_chat_message_sent', handleChatMessage);
    return () => window.removeEventListener('ems_chat_message_sent', handleChatMessage);
  }, [currentUser]);
  const [wfhEmployees, setWfhEmployees] = useState(() => getCollection(KEYS.WFH));
  const [storedWeeklyTimeLogs, setStoredWeeklyTimeLogs] = useState(() => getCollection(KEYS.WEEKLY_TIMELOGS));
  const [leads, setLeads] = useState(() => getCollection(KEYS.LEADS));
  const [emergencyContacts, setEmergencyContacts] = useState(() => getCollection(KEYS.EMERGENCY_CONTACTS));
  const [userSettings, setUserSettings] = useState(() => {
    const saved = localStorage.getItem(KEYS.USER_SETTINGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      salutation: 'Mr.',
      emailNotifications: 'enable',
      googleCalendar: 'yes',
      country: 'India',
      countryCode: '+91',
      mobile: '',
      language: 'English',
      gender: 'Male',
      dob: '',
      slackId: '',
      maritalStatus: 'Single',
      address: '',
      about: '',
      twoFactorEmail: false,
      twoFactorAuth: false
    };
  });

  const [leadsFilter, setLeadsFilter] = useState({
    search: '',
    status: 'all',
    leadType: 'all',
    leadOwnerId: 'all',
    priority: 'all',
    client: 'all',
    startDate: '',
    endDate: ''
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('ems_dark_mode') === 'true' || localStorage.getItem('ems_theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('ems_dark_mode', darkMode.toString());
    localStorage.setItem('ems_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark-mode', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-mode', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode', 'dark');
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark-mode', 'dark');
      document.body.removeAttribute('data-theme');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      addToast(next ? 'Dark Mode Enabled 🌙' : 'Light Mode Enabled ☀️', 'info');
      return next;
    });
  };

  const getAuthHeaders = () => {
    return buildJwtAuthHeaders({ 'Content-Type': 'application/json' });
  };

  const [storageTick, setStorageTick] = useState(0);
  const [companySettings, setCompanySettings] = useState(getCompanySettings);

  // Sync state with storage
  const syncWithStorage = () => {
    setExpenses(getCollection(KEYS.EXPENSES));
    setTickets(getCollection(KEYS.TICKETS));
    setNotices(getCollection(KEYS.NOTICES));
    setEvents((getCollection(KEYS.EVENTS) || []).map(normalizeEvent));
    setConversations(ensureDefaultChannels(getCollection(KEYS.CONVERSATIONS)));
    setWfhEmployees(getCollection(KEYS.WFH));
    setStoredWeeklyTimeLogs(getCollection(KEYS.WEEKLY_TIMELOGS));
    setLeads(getCollection(KEYS.LEADS));
    setEmergencyContacts(getCollection(KEYS.EMERGENCY_CONTACTS));
    setStorageTick(prev => prev + 1);
  };

  // Synchronize tickets with MongoDB backend (MongoDB is authoritative; never resurrect deleted items)
  const loadTickets = async () => {
    try {
      if (!(await isCrmBackendAvailable())) {
        setTickets(getCollection(KEYS.TICKETS) || []);
        return;
      }
      const res = await fetch(`${API_BASE}/tickets`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const remoteTickets = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(remoteTickets)) {
          const local = getCollection(KEYS.TICKETS) || [];
          const ticketMap = new Map();

          remoteTickets.forEach(t => {
            const key = String(t._id || t.ticketCode);
            ticketMap.set(key, t);
          });

          // Only preserve unsynced offline-created temp tickets (non-ObjectId)
          local.forEach(t => {
            const idStr = String(t._id || '');
            const key = String(t._id || t.ticketCode);
            if (!ticketMap.has(key) && !isMongoObjectId(idStr)) {
              ticketMap.set(key, t);
            } else if (ticketMap.has(key)) {
              const remote = ticketMap.get(key);
              if ((t.replies?.length || 0) > (remote.replies?.length || 0)) {
                ticketMap.set(key, { ...remote, replies: t.replies });
              }
            }
          });

          const merged = Array.from(ticketMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          saveCollection(KEYS.TICKETS, merged, { broadcast: false });
          setTickets(merged);
          return;
        }
      }
    } catch (err) {
      console.warn('[CRMContext] Offline fallback for tickets:', err);
    }
    setTickets(getCollection(KEYS.TICKETS) || []);
  };

const stripHeavyMediaForStorage = (convs = []) => {
  if (!Array.isArray(convs)) return [];
  return convs.map(c => {
    if (!c || !Array.isArray(c.messages)) return c;
    return {
      ...c,
      messages: c.messages.map(m => {
        if (!m || !Array.isArray(m.attachments) || m.attachments.length === 0) return m;
        return {
          ...m,
          attachments: m.attachments.map(att => {
            if (att && typeof att.dataUrl === 'string' && att.dataUrl.length > 15000) {
              return { ...att, dataUrl: '', hasFullMedia: true, conversationId: c.id };
            }
            return att;
          })
        };
      })
    };
  });
};

  // Synchronize conversations with MongoDB backend database (lite mode strips heavy base64 images for 20x faster load)
  const loadConversations = async () => {
    try {
      if (!(await isCrmBackendAvailable())) {
        setConversations(ensureDefaultChannels(getCollection(KEYS.CONVERSATIONS)));
        return;
      }
      const res = await fetch(`${API_BASE}/conversations?lite=1`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const remoteConvs = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(remoteConvs) && remoteConvs.length > 0) {
          const local = getCollection(KEYS.CONVERSATIONS) || [];
          const map = new Map();

          // Index remote channels & conversations from database
          remoteConvs.forEach(c => map.set(c.id, c));

          // Deep merge local messages with remote messages so no messages are ever lost
          let hasUnsynced = false;
          local.forEach(c => {
            if (!map.has(c.id)) {
              map.set(c.id, c);
              hasUnsynced = true;
            } else {
              const remote = map.get(c.id);
              const msgMap = new Map();
              (remote.messages || []).forEach(m => {
                if (m.id) msgMap.set(m.id, m);
              });
              (c.messages || []).forEach(m => {
                if (m.id) {
                  if (!msgMap.has(m.id)) {
                    msgMap.set(m.id, m);
                    hasUnsynced = true;
                  } else {
                    const ex = msgMap.get(m.id);
                    const combinedReadBy = Array.from(new Set([...(ex.readBy || []), ...(m.readBy || [])]));
                    msgMap.set(m.id, { ...m, ...ex, readBy: combinedReadBy });
                  }
                }
              });
              const mergedMessages = Array.from(msgMap.values()).sort((a, b) => (Number(a.createdAt || 0) - Number(b.createdAt || 0)));
              map.set(c.id, {
                ...c,
                ...remote,
                messages: mergedMessages,
                lastMessage: mergedMessages.length > 0 ? mergedMessages[mergedMessages.length - 1].text : remote.lastMessage,
                lastMessageTime: mergedMessages.length > 0 ? mergedMessages[mergedMessages.length - 1].timestamp : remote.lastMessageTime
              });
            }
          });

          const merged = Array.from(map.values());
          saveCollection(KEYS.CONVERSATIONS, stripHeavyMediaForStorage(merged), { broadcast: false });
          setConversations(merged);

          if (hasUnsynced) {
            fetch(`${API_BASE}/conversations/sync-batch`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ conversations: stripHeavyMediaForStorage(merged) })
            }).catch(() => {});
          }
          return;
        }
      }
    } catch (err) {
      console.warn('[CRMContext] Offline fallback for conversations:', err);
    }
    setConversations(ensureDefaultChannels(getCollection(KEYS.CONVERSATIONS)));
  };

  // Synchronize company calendar events with backend
  const loadEvents = async () => {
    try {
      if (!(await isCrmBackendAvailable())) {
        setEvents(getCollection(KEYS.EVENTS) || []);
        return;
      }
      const res = await fetch(`${API_BASE}/events`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const remoteEvents = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(remoteEvents)) {
          const local = getCollection(KEYS.EVENTS) || [];
          const map = new Map();
          remoteEvents.forEach(e => {
            if (e._id) map.set(String(e._id), normalizeEvent(e));
          });
          local.forEach(e => {
            const idStr = String(e._id || '');
            if (idStr && !map.has(idStr) && !isMongoObjectId(idStr)) {
              map.set(idStr, normalizeEvent(e));
            }
          });
          const merged = Array.from(map.values());
          saveCollection(KEYS.EVENTS, merged, { broadcast: false });
          setEvents(merged);
        }
      }
    } catch (err) {
      console.warn('[CRMContext] Offline fallback for events:', err);
    }
  };

  // Synchronize company expenses with backend
  const loadExpenses = async () => {
    try {
      if (!(await isCrmBackendAvailable())) {
        setExpenses(getCollection(KEYS.EXPENSES) || []);
        return;
      }
      const res = await fetch(`${API_BASE}/expenses`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const remoteExpenses = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(remoteExpenses)) {
          const local = getCollection(KEYS.EXPENSES) || [];
          const map = new Map();
          remoteExpenses.forEach(exp => {
            const key = String(exp._id || exp.expenseCode || exp.idNumber);
            map.set(key, exp);
          });
          local.forEach(exp => {
            const idStr = String(exp._id || '');
            const key = String(exp._id || exp.expenseCode || exp.idNumber);
            if (!map.has(key) && !isMongoObjectId(idStr)) {
              map.set(key, exp);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.purchaseDate || b.date || b.createdAt || 0) - new Date(a.purchaseDate || a.date || a.createdAt || 0));
          saveCollection(KEYS.EXPENSES, merged, { broadcast: false });
          setExpenses(merged);
        }
      }
    } catch (err) {
      console.warn('[CRMContext] Offline fallback for expenses:', err);
    }
  };

  // Synchronize CRM leads pipeline with backend
  const loadLeads = async () => {
    try {
      if (!(await isCrmBackendAvailable())) {
        setLeads(getCollection(KEYS.LEADS) || []);
        return;
      }
      const res = await fetch(`${API_BASE}/leads`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const remoteLeads = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(remoteLeads)) {
          const local = getCollection(KEYS.LEADS) || [];
          const map = new Map();
          remoteLeads.forEach(l => {
            const key = String(l._id || l.leadCode || l.id);
            map.set(key, l);
          });
          local.forEach(l => {
            const idStr = String(l._id || '');
            const key = String(l._id || l.leadCode || l.id);
            if (!map.has(key) && !isMongoObjectId(idStr)) {
              map.set(key, l);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          saveCollection(KEYS.LEADS, merged, { broadcast: false });
          setLeads(merged);
        }
      }
    } catch (err) {
      console.warn('[CRMContext] Offline fallback for leads:', err);
    }
  };

  // Synchronize company notices & announcements with backend
  const loadNotices = async () => {
    try {
      if (!(await isCrmBackendAvailable())) {
        setNotices(getCollection(KEYS.NOTICES) || []);
        return;
      }
      const res = await fetch(`${API_BASE}/notices`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const remoteNotices = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(remoteNotices)) {
          const local = getCollection(KEYS.NOTICES) || [];
          const map = new Map();
          remoteNotices.forEach(n => {
            const key = String(n._id || n.id);
            map.set(key, n);
          });
          local.forEach(n => {
            const idStr = String(n._id || '');
            const key = String(n._id || n.id);
            if (!map.has(key) && !isMongoObjectId(idStr)) {
              map.set(key, n);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
          saveCollection(KEYS.NOTICES, merged, { broadcast: false });
          setNotices(merged);
        }
      }
    } catch (err) {
      console.warn('[CRMContext] Offline fallback for notices:', err);
    }
  };

  // Stable user identity string so employee list refreshes NEVER re-trigger all 6 CRM fetches
  const currentUserIdentity = String(currentUser?._id || currentUser?.employeeCode || currentUser?.email || '');
  const lastFocusSyncRef = React.useRef(0);

  useEffect(() => {
    if (!currentUserIdentity) return;
    loadTickets();
    loadConversations();
    loadEvents();
    loadExpenses();
    loadLeads();
    loadNotices();
  }, [currentUserIdentity]);

  // ── Multi-User Real-time CRM & Chat Sync: Socket-driven + throttled focus/reconnect sync ──
  useEffect(() => {
    if (!currentUserIdentity) return;
    const timers = {};
    const scheduleRefresh = (key, fn, delay = 350) => {
      if (timers[key]) clearTimeout(timers[key]);
      timers[key] = setTimeout(() => {
        fn();
      }, delay);
    };

    const refreshAllCRM = () => {
      loadTickets();
      loadConversations();
      loadEvents();
      loadExpenses();
      loadLeads();
      loadNotices();
    };

    const syncIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const now = Date.now();
        // 20s cooldown prevents firing 12 duplicate HTTP requests when clicking between tabs
        if (now - lastFocusSyncRef.current < 20000) return;
        lastFocusSyncRef.current = now;
        refreshAllCRM();
      }
    };

    const handleRemoteSync = (e) => {
      const key = e?.detail?.key;
      if (!key) return;
      if (key === KEYS.LEADS) scheduleRefresh('leads', loadLeads);
      else if (key === KEYS.TICKETS) scheduleRefresh('tickets', loadTickets);
      else if (key === KEYS.NOTICES) scheduleRefresh('notices', loadNotices);
      else if (key === KEYS.EVENTS) scheduleRefresh('events', loadEvents);
      else if (key === KEYS.EXPENSES) scheduleRefresh('expenses', loadExpenses);
      else if (key === KEYS.CONVERSATIONS) scheduleRefresh('conversations', loadConversations);
      else if (key === 'all') scheduleRefresh('all', refreshAllCRM);
    };

    const pollIfNeeded = () => {
      // Socket.IO handles instant updates; poll only as safety fallback when socket is down
      if (!isSocketConnected()) {
        syncIfVisible();
      }
    };

    const interval = setInterval(pollIfNeeded, 45000);
    window.addEventListener('focus', syncIfVisible);
    document.addEventListener('visibilitychange', syncIfVisible);
    window.addEventListener('ems_remote_sync', handleRemoteSync);
    window.addEventListener('ems_socket_reconnected', refreshAllCRM);
    return () => {
      clearInterval(interval);
      Object.values(timers).forEach(t => clearTimeout(t));
      window.removeEventListener('focus', syncIfVisible);
      document.removeEventListener('visibilitychange', syncIfVisible);
      window.removeEventListener('ems_remote_sync', handleRemoteSync);
      window.removeEventListener('ems_socket_reconnected', refreshAllCRM);
    };
  }, [currentUserIdentity]);

  useEffect(() => {
    const syncKey = (key) => {
      if (!key || key === 'all') {
        syncWithStorage();
        return;
      }
      if (key === KEYS.EXPENSES) setExpenses(getCollection(KEYS.EXPENSES));
      else if (key === KEYS.TICKETS) setTickets(getCollection(KEYS.TICKETS));
      else if (key === KEYS.NOTICES) setNotices(getCollection(KEYS.NOTICES));
      else if (key === KEYS.EVENTS) setEvents((getCollection(KEYS.EVENTS) || []).map(normalizeEvent));
      else if (key === KEYS.CONVERSATIONS) setConversations(ensureDefaultChannels(getCollection(KEYS.CONVERSATIONS)));
      else if (key === KEYS.WFH) setWfhEmployees(getCollection(KEYS.WFH));
      else if (key === KEYS.WEEKLY_TIMELOGS) setStoredWeeklyTimeLogs(getCollection(KEYS.WEEKLY_TIMELOGS));
      else if (key === KEYS.LEADS) setLeads(getCollection(KEYS.LEADS));
      else if (key === KEYS.EMERGENCY_CONTACTS) setEmergencyContacts(getCollection(KEYS.EMERGENCY_CONTACTS));
      else if (key === 'ems_timesheets' || key === 'ems_tasks' || key === 'hrms_attendance') {
        setStorageTick(prev => prev + 1);
      }
    };
    const handleStorageUpdate = (e) => syncKey(e?.detail?.key);
    const handleNativeStorage = (e) => syncKey(e?.key);
    const handleSettingsUpdate = () => {
      setCompanySettings(getCompanySettings());
      setStorageTick(prev => prev + 1);
    };

    window.addEventListener('hrms_storage_change', handleStorageUpdate);
    window.addEventListener('storage', handleNativeStorage);
    window.addEventListener('company-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('hrms_storage_change', handleStorageUpdate);
      window.removeEventListener('storage', handleNativeStorage);
      window.removeEventListener('company-settings-updated', handleSettingsUpdate);
    };
  }, []);

  // Re-compute weekly logs when user clocks in/out, takes breaks, or changes task timers
  useEffect(() => {
    let timeoutId = null;
    const refreshTick = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setStorageTick(prev => prev + 1);
      }, 300);
    };

    window.addEventListener('ems_clocked_in', refreshTick);
    window.addEventListener('ems_clocked_out', refreshTick);
    window.addEventListener('ems_break_started', refreshTick);
    window.addEventListener('ems_break_ended', refreshTick);
    window.addEventListener('ems_force_clock_out', refreshTick);
    window.addEventListener('ems_task_timer_started', refreshTick);
    window.addEventListener('ems_task_timer_paused', refreshTick);
    window.addEventListener('ems_task_timer_stopped', refreshTick);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('ems_clocked_in', refreshTick);
      window.removeEventListener('ems_clocked_out', refreshTick);
      window.removeEventListener('ems_break_started', refreshTick);
      window.removeEventListener('ems_break_ended', refreshTick);
      window.removeEventListener('ems_force_clock_out', refreshTick);
      window.removeEventListener('ems_task_timer_started', refreshTick);
      window.removeEventListener('ems_task_timer_paused', refreshTick);
      window.removeEventListener('ems_task_timer_stopped', refreshTick);
    };
  }, []);

  // =========================================================================
  // 🎂 AUTOMATIC BIRTHDAY & ANNIVERSARY ENGINE (Pure Calculation Helper)
  // =========================================================================
  const computedBirthdays = useMemo(() => calculateComputedBirthdays(employees), [employees]);
  const computedAnniversaries = useMemo(() => calculateComputedAnniversaries(employees, companySettings), [employees, companySettings]);

  // =========================================================================
  // ⏱️ DYNAMIC WEEKLY TIME LOGS & TASK ACTIVITY ENGINE (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
  // =========================================================================
  const computedWeeklyTimeLogs = useMemo(() => {
    const timesheets = getCollection(KEYS.TIMESHEETS) || [];
    const attendance = getCollection(KEYS.ATTENDANCE) || [];
    const settings = getCompanySettings();
    const standardWorkHours = Number(settings.standardWorkHours) || 9;
    const shiftStart = settings.shiftStartTime || '10:00 AM';
    const shiftEnd = settings.shiftEndTime || '07:00 PM';

    const now = new Date();
    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatLocalDate(now);
    const todayDayIndex = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    // Mon = 0, Tue = 1, Wed = 2, Thu = 3, Fri = 4, Sat = 5, Sun = 6
    const currentDayOffset = todayDayIndex === 0 ? 6 : todayDayIndex - 1;

    // Calculate current week's Monday purely in local calendar dates
    const mondayDiff = todayDayIndex === 0 ? -6 : 1 - todayDayIndex;
    const mondayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayDiff);

    const dayMeta = [
      { day: 'Monday', shortDay: 'Mo', offset: 0 },
      { day: 'Tuesday', shortDay: 'Tu', offset: 1 },
      { day: 'Wednesday', shortDay: 'We', offset: 2 },
      { day: 'Thursday', shortDay: 'Th', offset: 3 },
      { day: 'Friday', shortDay: 'Fr', offset: 4 },
      { day: 'Saturday', shortDay: 'Sa', offset: 5 },
      { day: 'Sunday', shortDay: 'Su', offset: 6, isSunday: true, isDayOff: true }
    ];

    return dayMeta.map(item => {
      const dayDateObj = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + item.offset);
      const dateStr = formatLocalDate(dayDateObj);
      const isCurrentDay = item.offset === currentDayOffset;
      const isPastDay = item.offset < currentDayOffset;
      const isFutureDay = item.offset > currentDayOffset;

      // Special rule: Sunday is always an official Holiday / Day Off
      if (item.isSunday) {
        return {
          day: 'Sunday',
          shortDay: 'Su',
          date: dateStr,
          durationText: '0h 00m',
          durationHours: 0,
          loginTime: 'Off',
          logoutTime: 'Off',
          clockInsCount: 0,
          clockOutsCount: 0,
          breakDuration: '0m',
          breaksCount: 0,
          teaBreaksCount: 0,
          lunchBreaksCount: 0,
          isSunday: true,
          isDayOff: true,
          isCurrentDay,
          tasksWorked: []
        };
      }

      const allTasks = getCollection(KEYS.TASKS) || [];
      const userKey = currentUser?.employeeCode || (currentUser?._id ? String(currentUser._id) : 'ADM-001');

      // Find matching timesheet logs for this date strictly scoped to authenticated user (Strict date authority)
      const rawMatchingTimesheets = timesheets.filter(t => {
        const tsDate = t.date || (t.createdAt ? t.createdAt.split('T')[0] : '');
        if (tsDate !== dateStr) return false;
        if (!currentUser) return true;
        const cId = currentUser._id ? String(currentUser._id).toLowerCase() : null;
        const cCode = currentUser.employeeCode ? String(currentUser.employeeCode).toLowerCase() : null;
        const cName = currentUser.name ? currentUser.name.toLowerCase().trim() : null;

        const tEmpId = t.employeeId ? String(t.employeeId).toLowerCase() : (t.employee ? String(t.employee._id || t.employee).toLowerCase() : null);
        const tEmpCode = t.employeeCode ? String(t.employeeCode).toLowerCase() : null;
        const tEmpName = t.employeeName ? t.employeeName.toLowerCase().trim() : null;

        const matchesUser = Boolean(
          (cId && (tEmpId === cId || String(t.employee) === cId)) ||
          (cCode && (tEmpId === cCode || tEmpCode === cCode)) ||
          (cName && tEmpName && (tEmpName === cName || tEmpName.includes(cName) || cName.includes(tEmpName)))
        );
        if (!matchesUser) return false;

        // Cross-verification: If timesheet references a known task, ensure task is assigned to currentUser
        if (t.taskId || t.taskCode) {
          const matchedTask = allTasks.find(pt =>
            (t.taskId && String(pt._id || pt.id) === String(t.taskId)) ||
            (t.taskCode && pt.taskCode && String(pt.taskCode).trim().toLowerCase() === String(t.taskCode).trim().toLowerCase())
          );
          if (matchedTask) {
            const myAssignedIds = [currentUser?._id, currentUser?.employeeCode, currentUser?.email].filter(Boolean).map(s => String(s).toLowerCase());
            const targetAssignedId = matchedTask.assignedToId || (typeof matchedTask.assignedTo === 'string' ? matchedTask.assignedTo : matchedTask.assignedTo?._id);
            const isAssigned = (targetAssignedId && myAssignedIds.includes(String(targetAssignedId).toLowerCase())) ||
              (Array.isArray(matchedTask.assignedToIds) && matchedTask.assignedToIds.some(id => myAssignedIds.includes(String(id).toLowerCase()))) ||
              (Array.isArray(matchedTask.assignees) && matchedTask.assignees.some(a => myAssignedIds.includes(String(a._id || a.employeeCode).toLowerCase()) || (cName && a.name && a.name.toLowerCase().trim() === cName))) ||
              (matchedTask.assignedToName && cName && matchedTask.assignedToName.trim().toLowerCase() === cName);
            if (!isAssigned) return false;
          }
        }
        return true;
      });

      // Deduplicate by task to prevent double-counting multiple auto-saves on the same day
      const crmTaskMap = new Map();
      rawMatchingTimesheets.forEach(ts => {
        let key = null;
        if (ts.taskCode && String(ts.taskCode).trim()) {
          key = `code_${String(ts.taskCode).trim().toLowerCase()}`;
        } else if (ts.taskId && String(ts.taskId).trim()) {
          key = `id_${String(ts.taskId).trim().toLowerCase()}`;
        } else if (ts.taskTitle && String(ts.taskTitle).trim()) {
          key = `title_${String(ts.taskTitle).trim().toLowerCase()}`;
        } else {
          key = `raw_${ts._id || Math.random()}`;
        }
        const dur = Number(ts.totalDurationSeconds) || 0;
        if (!crmTaskMap.has(key) || dur > (Number(crmTaskMap.get(key).totalDurationSeconds) || 0)) {
          crmTaskMap.set(key, ts);
        }
      });
      const matchingTimesheets = Array.from(crmTaskMap.values());
      let timesheetTaskSeconds = matchingTimesheets.reduce((acc, curr) => acc + (Number(curr.totalDurationSeconds) || 0), 0);

      // Helper: match an attendance record to the current user
      const isMyAttRecord = (a) =>
        (currentUser?._id && (String(a.employeeId) === String(currentUser._id) || a.employeeId === currentUser.employeeCode)) ||
        (currentUser?.employeeCode && a.employeeId === currentUser.employeeCode) ||
        (currentUser?.name && a.employeeName?.toLowerCase() === currentUser.name.toLowerCase());

      const todayAttRec = isCurrentDay ? (attendance || []).find(a => a.date === dateStr && isMyAttRecord(a)) : null;

      const hadClockedOutToday = Boolean(
        readTimerStorage(currentUser, 'had_clocked_out') === 'true' ||
        readTimerStorage(currentUser, 'had_clocked_out') === true ||
        readTimerStorage(currentUser, 'clock_out') ||
        readTimerStorage(currentUser, 'clockout_time') ||
        localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`) === 'true' ||
        todayAttRec?.clockOutTime ||
        todayAttRec?.clockOut
      );
      const isClockedInToday = !hadClockedOutToday && Boolean(
        readTimerStorage(currentUser, 'is_clocked_in') === 'true' ||
        readTimerStorage(currentUser, 'is_clocked_in') === true ||
        localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true'
      );
      const rawBreakSecs = Number(readTimerStorage(currentUser, 'break_seconds') || localStorage.getItem(`ems_timer_${userKey}_break_seconds`)) || 0;
      let todayBreakHistory = [];
      try {
        const rawBh = readTimerStorage(currentUser, 'break_history') || localStorage.getItem(`ems_timer_${userKey}_break_history`);
        const parsed = typeof rawBh === 'string' ? JSON.parse(rawBh) : (rawBh || []);
        todayBreakHistory = (Array.isArray(parsed) ? parsed : []).filter(b => b.date === dateStr);
      } catch (e) {}

      // Helper to check if task belongs to user
      const isTaskForMe = (t) => {
        if (!t) return false;
        const cId = currentUser?._id ? String(currentUser._id) : null;
        const cCode = currentUser?.employeeCode ? String(currentUser.employeeCode) : null;
        const cName = currentUser?.name ? currentUser.name.toLowerCase().trim() : null;
        if (cId && (String(t.assignedToId) === cId || String(t.assignedTo) === cId)) return true;
        if (cCode && (t.assignedToId === cCode || t.assignedTo === cCode)) return true;
        if (cName && t.assignedToName && t.assignedToName.toLowerCase().trim() === cName) return true;
        if (Array.isArray(t.assignedToIds) && (cId && t.assignedToIds.includes(cId) || cCode && t.assignedToIds.includes(cCode))) return true;
        if (Array.isArray(t.assignees) && t.assignees.some(a => (cId && String(a._id) === cId) || (cCode && a.employeeCode === cCode))) return true;
        return false;
      };

      // Default baseline hours for working days
      let finalDurationText = '0h 00m';
      let finalDurationHours = 0;
      let dayLoginTime = shiftStart;
      let dayLogoutTime = shiftEnd;
      let dayBreakDuration = '0m';
      let dayTeaBreaks = 0;
      let dayLunchBreaks = 0;
      let dayClockIns = 0;
      let dayClockOuts = 0;

      // Task calculation based on user request:
      // "week logs me total day wise task ke anusar time count hoga or duration me bhi total task or uske time kitni der me khatam kiya agar task time 1 hour hai or tumne 1:30 laga diye to wo bhi count hote jayega or nest task kiya usna time plus ho jayega"
      let dayTotalTaskSeconds = timesheetTaskSeconds;
      let activeTimerTask = null;
      let liveActiveTimerSecs = 0;
      let dayTasks = [];
      // Also find any tasks completed on this date that aren't already captured in timesheets
      const matchingCompletedTasks = allTasks.filter(t => {
        if (!isTaskForMe(t)) return false;
        const isCompletedOnDate = t.completedOn === dateStr || (t.completedAt && String(t.completedAt).startsWith(dateStr));
        const alreadyInTimesheets = matchingTimesheets.some(ts => ts.taskId === t._id || ts.taskCode === t.taskCode);
        return isCompletedOnDate && !alreadyInTimesheets;
      });

      if (isCurrentDay) {
        const rawLogin = localStorage.getItem(`ems_timer_${userKey}_login_time`);
        const rawLogout = localStorage.getItem(`ems_timer_${userKey}_clockout_time`);
        const todayAttRec = attendance.find(a => a.date === dateStr && isMyAttRecord(a));
        dayLoginTime = rawLogin || todayAttRec?.clockInTime || todayAttRec?.clockIn || (isClockedInToday ? 'Active' : '--');
        dayLogoutTime = rawLogout || todayAttRec?.clockOutTime || todayAttRec?.clockOut || (isClockedInToday ? 'Active / In Progress' : (hadClockedOutToday ? (rawLogout || '--') : '--'));
        dayClockIns = isClockedInToday || hadClockedOutToday ? 1 : 0;
        dayClockOuts = hadClockedOutToday ? 1 : 0;

        const bHrs = Math.floor(rawBreakSecs / 3600);
        const bMins = Math.floor((rawBreakSecs % 3600) / 60);
        dayBreakDuration = bHrs > 0 ? `${bHrs}h ${bMins}m` : (bMins > 0 ? `${bMins}m` : '0m');
        dayTeaBreaks = todayBreakHistory.filter(b => b.type?.toLowerCase().includes('tea')).length;
        dayLunchBreaks = todayBreakHistory.filter(b => b.type?.toLowerCase().includes('lunch')).length;

        // 1. Check live active task timer from localStorage
        const activeTimerKey = `ems_active_task_timer_${userKey}`;
        let activeTimer = null;
        try {
          activeTimer = JSON.parse(localStorage.getItem(activeTimerKey) || 'null');
        } catch (e) {}

        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const todayMidnightMs = todayMidnight.getTime();

        if (activeTimer && activeTimer.date === dateStr && isClockedInToday && !hadClockedOutToday) {
          const nowMs = Date.now();
          const isStartedToday = activeTimer.startedAt && Number(activeTimer.startedAt) >= todayMidnightMs;
          const runningElapsed = (activeTimer.timerRunning && isClockedInToday && !hadClockedOutToday && isStartedToday)
            ? Math.max(0, Math.floor((nowMs - Number(activeTimer.startedAt)) / 1000))
            : 0;

          // Strictly calculate today's session duration, NOT all-time minus timesheets!
          let dayPortion = 0;
          if (activeTimer.accumulatedTodaySeconds !== undefined && activeTimer.accumulatedTodaySeconds !== null) {
            dayPortion = Number(activeTimer.accumulatedTodaySeconds) + runningElapsed;
          } else if (activeTimer.dailySessions && typeof activeTimer.dailySessions === 'object' && activeTimer.dailySessions[dateStr] !== undefined) {
            dayPortion = (Number(activeTimer.dailySessions[dateStr]) || 0) + runningElapsed;
          } else if (activeTimer.sessionDate === dateStr && activeTimer.todayWorkSeconds !== undefined) {
            const baseSecs = activeTimer.timerRunning
              ? Math.max(0, (Number(activeTimer.todayWorkSeconds) || 0) - runningElapsed)
              : (Number(activeTimer.todayWorkSeconds) || 0);
            dayPortion = baseSecs + runningElapsed;
          } else {
            dayPortion = runningElapsed;
          }

          activeTimerTask = activeTimer;

          const timesheetsForThisTask = matchingTimesheets
            .filter(ts => (activeTimer.taskId && String(ts.taskId) === String(activeTimer.taskId)) || (activeTimer.taskCode && ts.taskCode && String(ts.taskCode).trim().toLowerCase() === String(activeTimer.taskCode).trim().toLowerCase()) || (activeTimer.title && ts.taskTitle && String(ts.taskTitle).trim().toLowerCase() === String(activeTimer.title).trim().toLowerCase()))
            .reduce((s, ts) => Math.max(s, Number(ts.totalDurationSeconds) || 0), 0);

          const unsubmitted = Math.max(0, dayPortion - timesheetsForThisTask);
          dayTotalTaskSeconds += unsubmitted;
        }

        // 2. Check any other paused or worked tasks today (strictly tasks worked today!)
        if (isClockedInToday || hadClockedOutToday) {
          allTasks.forEach(t => {
            if (!isTaskForMe(t)) return;
            const tId = String(t._id || t.id);
            if (activeTimerTask && (
              String(activeTimerTask.taskId) === tId ||
              String(activeTimerTask._id) === tId ||
              (t.taskCode && activeTimerTask.taskCode === t.taskCode)
            )) return;

            // Strict guard: Skip tasks completed on other days
            const isCompletedToday = t.completedOn === dateStr || (t.completedAt && String(t.completedAt).startsWith(dateStr));
            if (t.status === 'completed' && !isCompletedToday) return;

            // Only consider tasks explicitly worked today
            const hasSessionToday = (t.dailySessions && Number(t.dailySessions[dateStr]) > 0) || (t.sessionDate === dateStr && Number(t.todayWorkSeconds) > 0);
            if (!hasSessionToday) return;

            let dayPortion = 0;
            if (t.dailySessions && typeof t.dailySessions === 'object' && t.dailySessions[dateStr] !== undefined) {
              dayPortion = Number(t.dailySessions[dateStr]) || 0;
            } else if (t.sessionDate === dateStr && t.accumulatedTodaySeconds !== undefined && t.accumulatedTodaySeconds !== null) {
              dayPortion = Number(t.accumulatedTodaySeconds);
            } else if (t.sessionDate === dateStr && t.todayWorkSeconds !== undefined) {
              dayPortion = Number(t.todayWorkSeconds) || 0;
            }

            const timesheetsForThisTask = matchingTimesheets
              .filter(ts => (tId && String(ts.taskId) === tId) || (t.taskCode && ts.taskCode && String(ts.taskCode).trim().toLowerCase() === String(t.taskCode).trim().toLowerCase()) || (t.title && ts.taskTitle && String(ts.taskTitle).trim().toLowerCase() === String(t.title).trim().toLowerCase()))
              .reduce((s, ts) => Math.max(s, Number(ts.totalDurationSeconds) || 0), 0);

            const unsubmitted = Math.max(0, dayPortion - timesheetsForThisTask);
            dayTotalTaskSeconds += unsubmitted;
          });
        }
      } else {
        const completedTaskSeconds = matchingCompletedTasks.reduce((acc, curr) => {
          let secs = 0;
          if (curr.dailySessions && typeof curr.dailySessions === 'object' && curr.dailySessions[dateStr] !== undefined) {
            secs = Number(curr.dailySessions[dateStr]) || 0;
          } else if (curr.sessionDate === dateStr && curr.todayWorkSeconds !== undefined) {
            secs = Number(curr.todayWorkSeconds) || 0;
          } else if (curr.startDate === dateStr || curr.createdAt?.startsWith(dateStr)) {
            secs = Number(curr.timerSeconds) || Number(curr.durationSeconds) || 0;
          }
          return acc + secs;
        }, 0);

        dayTotalTaskSeconds += completedTaskSeconds;

        // Also check any tasks worked on this past date that were not marked completed
        allTasks.forEach(t => {
          if (!isTaskForMe(t)) return;
          const tId = String(t._id || t.id);
          const hasPastSession = (t.dailySessions && Number(t.dailySessions[dateStr]) > 0) || (t.sessionDate === dateStr && Number(t.todayWorkSeconds) > 0);
          if (!hasPastSession) return;

          const alreadyInTimesheets = matchingTimesheets.some(ts => String(ts.taskId) === tId || (t.taskCode && ts.taskCode === t.taskCode));
          const alreadyInCompleted = matchingCompletedTasks.some(ct => String(ct._id || ct.id) === tId);
          if (alreadyInTimesheets || alreadyInCompleted) return;

          let secs = 0;
          if (t.dailySessions && typeof t.dailySessions === 'object' && t.dailySessions[dateStr] !== undefined) {
            secs = Number(t.dailySessions[dateStr]) || 0;
          } else if (t.sessionDate === dateStr && t.todayWorkSeconds !== undefined) {
            secs = Number(t.todayWorkSeconds) || 0;
          }
          if (secs > 0) {
            dayTotalTaskSeconds += secs;
            const estH = t.estimatedHours || 3;
            const loggedH = secs / 3600;
            const isOver = loggedH > estH;
            dayTasks.push({
              taskId: t._id,
              taskCode: t.taskCode || 'TSK',
              taskTitle: t.title || 'Worked Task',
              projectName: t.projectName || 'General Work',
              durationText: `${Math.floor(secs / 3600)}h ${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}m`,
              durationSeconds: secs,
              estimatedHours: estH,
              isOverBudget: isOver,
              overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
              startTime: shiftStart,
              endTime: shiftEnd,
              memo: `Worked on task: ${Math.floor(secs / 60)} mins tracked`,
              employeeName: t.assignedToName || currentUser?.name || 'Employee',
              status: t.status || 'in_progress',
              isCompleted: false
            });
          }
        });
      }

      // Map tasks worked with budget estimate comparison
      if (matchingTimesheets.length > 0) {
        const mappedTimesheets = matchingTimesheets.map(t => {
          const matchedTask = allTasks.find(at => at._id === t.taskId || at.taskCode === t.taskCode);
          const estH = matchedTask?.estimatedHours || 3;
          const loggedH = (t.totalDurationSeconds || 0) / 3600;
          const isOver = loggedH > estH;
          return {
            taskId: t.taskId,
            taskCode: t.taskCode || 'TSK',
            taskTitle: t.taskTitle || 'Assigned Work',
            projectName: t.projectName || 'General Work',
            durationText: t.totalDurationText || `${Math.floor((t.totalDurationSeconds || 0) / 60)}m`,
            durationSeconds: t.totalDurationSeconds || 0,
            estimatedHours: estH,
            isOverBudget: isOver,
            overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
            startTime: t.startTime || shiftStart,
            endTime: t.endTime || shiftEnd,
            memo: t.memo || 'Work session',
            employeeName: t.employeeName || currentUser?.name || 'Employee',
            status: 'completed',
            isCompleted: true
          };
        });
        dayTasks = [...dayTasks, ...mappedTimesheets];
      }

      matchingCompletedTasks.forEach(t => {
        let secs = 0;
        if (t.dailySessions && typeof t.dailySessions === 'object' && t.dailySessions[dateStr] !== undefined) {
          secs = Number(t.dailySessions[dateStr]) || 0;
        } else if (isCurrentDay) {
          secs = Number(t.todayWorkSeconds || 0);
        } else if (t.sessionDate === dateStr && t.todayWorkSeconds !== undefined) {
          secs = Number(t.todayWorkSeconds) || 0;
        } else if (t.completedOn === dateStr && (t.startDate === dateStr || t.createdAt?.startsWith(dateStr))) {
          secs = Number(t.timerSeconds) || 0;
        }
        if (secs <= 0) return; // Do not add fake or un-timed entries for this date
        const estH = t.estimatedHours || Math.round(secs / 3600) || 3;
        const loggedH = secs / 3600;
        const isOver = loggedH > estH;
        dayTasks.push({
          taskId: t._id,
          taskCode: t.taskCode || 'TSK',
          taskTitle: t.title || 'Completed Task',
          projectName: t.projectName || 'General Work',
          durationText: `${Math.floor(secs / 3600)}h ${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}m`,
          durationSeconds: secs,
          estimatedHours: estH,
          isOverBudget: isOver,
          overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
          startTime: shiftStart,
          endTime: shiftEnd,
          memo: `Completed task: ${t.title}`,
          employeeName: t.assignedToName || currentUser?.name || 'Employee',
          status: 'completed',
          isCompleted: true
        });
      });

      if (isCurrentDay) {
        // Paused tasks worked today that haven't been stopped into timesheets yet
        const pausedTasks = (isClockedInToday || hadClockedOutToday) ? allTasks.filter(t => {
          if (!isTaskForMe(t)) return false;
          if (activeTimerTask && (String(activeTimerTask.taskId) === String(t._id) || String(activeTimerTask._id) === String(t._id))) return false;
          const alreadyInTimesheets = matchingTimesheets.some(ts => ts.taskId === t._id);
          const alreadyInCompleted = matchingCompletedTasks.some(ct => ct._id === t._id);
          const secs = Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0;
          return !alreadyInTimesheets && !alreadyInCompleted && secs > 0 && (t.sessionDate === dateStr || t.timerRunning);
        }) : [];

        pausedTasks.forEach(pt => {
          const secs = Number(pt.timerSeconds) || 0;
          const estH = pt.estimatedHours || 3;
          const loggedH = secs / 3600;
          const isOver = loggedH > estH;
          dayTasks.push({
            taskId: pt._id,
            taskCode: pt.taskCode || 'TSK',
            taskTitle: pt.title || 'Worked Task',
            projectName: pt.projectName || 'General Work',
            durationText: `${Math.floor(secs / 3600)}h ${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}m`,
            durationSeconds: secs,
            estimatedHours: estH,
            isOverBudget: isOver,
            overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
            startTime: shiftStart,
            endTime: 'Paused ⏸️',
            memo: `Worked on task: ${Math.floor(secs / 60)} mins tracked`,
            employeeName: pt.assignedToName || currentUser?.name || 'Employee',
            status: 'on_hold',
            isCompleted: false,
            timerRunning: false
          });
        });

        // Shift work seconds guard: Ensure valid tracking without artificially clamping independent task time
        const rawShiftWorkSecs = Number(localStorage.getItem(`ems_timer_${userKey}_work_seconds`)) || 0;
        const isOnBreakToday = localStorage.getItem(`ems_timer_${userKey}_is_on_break`) === 'true';
        if (!isClockedInToday && !isOnBreakToday && !hadClockedOutToday && rawShiftWorkSecs === 0 && matchingTimesheets.length === 0 && !activeTimerTask) {
          dayTotalTaskSeconds = 0;
        }

        if (dayTotalTaskSeconds > 0) {
          const hrs = Math.floor(dayTotalTaskSeconds / 3600);
          const mins = Math.floor((dayTotalTaskSeconds % 3600) / 60);
          finalDurationText = `${hrs}h ${String(mins).padStart(2, '0')}m`;
          finalDurationHours = +(dayTotalTaskSeconds / 3600).toFixed(2);
        } else {
          finalDurationText = '0h 00m';
          finalDurationHours = 0;
        }

        if (activeTimerTask) {
          const runningTaskObj = allTasks.find(at => at._id === activeTimerTask.taskId || at._id === activeTimerTask._id);
          const estH = runningTaskObj?.estimatedHours || 3;
          const loggedH = liveActiveTimerSecs / 3600;
          const isOver = loggedH > estH;
          dayTasks.unshift({
            taskId: activeTimerTask.taskId,
            taskCode: activeTimerTask.taskCode || 'TSK',
            taskTitle: activeTimerTask.title || 'Current Task',
            projectName: activeTimerTask.projectName || 'Active Project',
            durationText: `${Math.floor(liveActiveTimerSecs / 3600)}h ${String(Math.floor((liveActiveTimerSecs % 3600) / 60)).padStart(2, '0')}m`,
            durationSeconds: liveActiveTimerSecs,
            estimatedHours: estH,
            isOverBudget: isOver,
            overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
            startTime: shiftStart,
            endTime: 'Running Now 🟢',
            memo: 'Active Timer Running',
            employeeName: currentUser?.name || 'Employee',
            status: 'in_progress',
            isCompleted: false
          });
        }
      } else if (dayTotalTaskSeconds > 0) {
        // If tasks or timesheets were recorded for this day, strictly use actual task hours
        const pastAttRec = attendance.find(a => a.date === dateStr && isMyAttRecord(a));
        const hrs = Math.floor(dayTotalTaskSeconds / 3600);
        const mins = Math.floor((dayTotalTaskSeconds % 3600) / 60);
        finalDurationText = `${hrs}h ${String(mins).padStart(2, '0')}m`;
        finalDurationHours = +(dayTotalTaskSeconds / 3600).toFixed(2);
        dayBreakDuration = pastAttRec?.totalBreakHours ? `${Math.round(pastAttRec.totalBreakHours * 60)}m` : '0m';

        if (pastAttRec) {
          if (pastAttRec.clockInTime) dayLoginTime = pastAttRec.clockInTime;
          if (pastAttRec.clockOutTime) dayLogoutTime = pastAttRec.clockOutTime;
        }
      } else if (isPastDay) {
        // For past working days: Strictly check if employee has actual logged attendance or timesheets
        const pastAttRec = attendance.find(a => a.date === dateStr && isMyAttRecord(a));
        const rawWorkHours = pastAttRec
          ? (Number(pastAttRec.totalWorkingHours) > 0
              ? Number(pastAttRec.totalWorkingHours)
              : (Number(pastAttRec.workSeconds) > 0 ? Number(pastAttRec.workSeconds) / 3600 : 0))
          : 0;
        const hasRealAttendanceHours = pastAttRec &&
          pastAttRec.status !== 'absent' &&
          pastAttRec.status !== 'on_leave' &&
          pastAttRec.status !== 'day_off' &&
          rawWorkHours > 0;

        if (hasRealAttendanceHours) {
          const workHours = rawWorkHours;
          dayTotalTaskSeconds = Math.round(workHours * 3600);
          const hrs = Math.floor(dayTotalTaskSeconds / 3600);
          const mins = Math.floor((dayTotalTaskSeconds % 3600) / 60);
          finalDurationText = `${hrs}h ${String(mins).padStart(2, '0')}m`;
          finalDurationHours = +workHours.toFixed(2);
          dayLoginTime = pastAttRec.clockInTime || '--';
          dayLogoutTime = pastAttRec.clockOutTime || '--';
          dayBreakDuration = pastAttRec?.totalBreakHours ? `${Math.round(pastAttRec.totalBreakHours * 60)}m` : '0m';
        } else {
          // No work or attendance logged for this employee on this past day — strictly 0h 00m
          dayTotalTaskSeconds = 0;
          finalDurationText = '0h 00m';
          finalDurationHours = 0;
          dayLoginTime = pastAttRec?.clockInTime || '--';
          dayLogoutTime = pastAttRec?.clockOutTime || '--';
          dayBreakDuration = '--';
          dayTasks = [];
        }
      }

      return {
        day: item.day,
        shortDay: item.shortDay,
        date: dateStr,
        durationText: finalDurationText,
        durationHours: finalDurationHours,
        durationSeconds: dayTotalTaskSeconds,
        loginTime: dayLoginTime,
        logoutTime: dayLogoutTime,
        clockInsCount: dayClockIns,
        clockOutsCount: dayClockOuts,
        breakDuration: dayBreakDuration,
        breaksCount: dayTeaBreaks + dayLunchBreaks,
        teaBreaksCount: dayTeaBreaks,
        lunchBreaksCount: dayLunchBreaks,
        isCurrentDay,
        isFutureDay,
        isCompleted: isPastDay,
        tasksWorked: dayTasks
      };
    });
  }, [currentUser, storageTick, companySettings]);

  // 💰 FINANCE / EXPENSES MODULE
  // =========================================================================
  const createExpense = async (expenseData) => {
    const currentList = getCollection(KEYS.EXPENSES);
    const nextNum = currentList.length > 0 ? Math.max(...currentList.map(e => e.idNumber || 0)) + 1 : 1;
    const now = new Date();

    const selectedEmployee = employees.find(emp => emp._id === expenseData.employeeId) || currentUser;

    const newExpense = {
      _id: `exp_${Date.now()}`,
      idNumber: nextNum,
      expenseCode: `EXP-${100 + nextNum}`,
      itemName: expenseData.itemName || expenseData.title || 'Office Expense',
      price: Number(expenseData.price || expenseData.amount) || 0,
      amount: Number(expenseData.price || expenseData.amount) || 0,
      category: expenseData.category || 'Utilities & Office',
      purchasedFrom: expenseData.purchasedFrom || 'Vendor Partner',
      purchaseDate: expenseData.purchaseDate || expenseData.date || getLocalDateString(now),
      date: expenseData.purchaseDate || expenseData.date || getLocalDateString(now),
      employeeId: selectedEmployee?._id || selectedEmployee?.employeeCode || currentUser?._id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
      employeeName: selectedEmployee?.name || currentUser?.name || 'Employee',
      employeeAvatar: selectedEmployee?.avatar || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      paidBy: selectedEmployee?.name || currentUser?.name || 'Employee',
      status: expenseData.status || 'pending',
      description: expenseData.description || '',
      billAttachment: expenseData.billAttachment || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
      createdById: currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
      createdByName: currentUser?.name || 'Employee',
      createdAt: now.toISOString(),
      ...(expenseData.status === 'approved' ? {
        approvedBy: expenseData.approvedBy || (currentUser?.employeeCode ? `${currentUser.name || 'Administrator'} (${currentUser.employeeCode})` : (currentUser?.name || 'Administrator')),
        approvedById: expenseData.approvedById || currentUser?._id,
        approvedByCode: expenseData.approvedByCode || currentUser?.employeeCode,
        approvedAt: expenseData.approvedAt || now.toISOString(),
        lastActionBy: currentUser?.employeeCode ? `${currentUser.name || 'Administrator'} (${currentUser.employeeCode})` : (currentUser?.name || 'Administrator'),
        lastActionById: currentUser?._id,
        lastActionByCode: currentUser?.employeeCode
      } : {}),
      ...expenseData
    };

    try {
      const expensePayload = { ...newExpense };
      delete expensePayload._id;
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(expensePayload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?._id) newExpense._id = String(json.data._id);
      }
    } catch (_) {}

    currentList.unshift(newExpense);
    saveCollection(KEYS.EXPENSES, currentList);
    setExpenses([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
    addToast(`Expense "${newExpense.itemName}" recorded successfully!`, 'success');
    return newExpense;
  };

  const updateExpense = async (expenseId, updateData) => {
    try {
      const payload = { ...updateData };
      delete payload._id;
      await fetch(`${API_BASE}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.EXPENSES);
    const idx = currentList.findIndex(e => e._id === expenseId);
    if (idx !== -1) {
      currentList[idx] = {
        ...currentList[idx],
        ...updateData,
        price: Number(updateData.price || updateData.amount || currentList[idx].price),
        amount: Number(updateData.price || updateData.amount || currentList[idx].amount),
        updatedAt: new Date().toISOString()
      };
      saveCollection(KEYS.EXPENSES, currentList);
      setExpenses([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
      addToast('Expense record updated successfully!', 'success');
      return currentList[idx];
    }
  };

  const updateExpenseStatus = async (expenseId, status, actorMeta = {}) => {
    const actorName = actorMeta.actor || (currentUser ? (currentUser.name || 'Administrator') : 'Administrator');
    const actorCode = actorMeta.actorCode || currentUser?.employeeCode || '';
    const actorId = actorMeta.actorId || currentUser?._id || '';
    const actorLabel = actorCode ? `${actorName} (${actorCode})` : actorName;

    const payload = {
      status,
      lastActionBy: actorLabel,
      lastActionById: actorId,
      lastActionByCode: actorCode,
      updatedAt: new Date().toISOString()
    };

    if (status === 'approved') {
      payload.approvedBy = actorLabel;
      payload.approvedById = actorId;
      payload.approvedByCode = actorCode;
      payload.approvedAt = new Date().toISOString();
    } else if (status === 'rejected') {
      payload.rejectedBy = actorLabel;
      payload.rejectedById = actorId;
      payload.rejectedByCode = actorCode;
      payload.rejectedAt = new Date().toISOString();
    }

    try {
      await fetch(`${API_BASE}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.EXPENSES);
    const idx = currentList.findIndex(e => e._id === expenseId);
    if (idx !== -1) {
      Object.assign(currentList[idx], payload);
      saveCollection(KEYS.EXPENSES, currentList);
      setExpenses([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
      addToast(`Expense status marked as ${status.toUpperCase()}`, status === 'approved' ? 'success' : 'info');
    }
  };

  const deleteExpense = async (expenseId) => {
    try {
      await fetch(`${API_BASE}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.EXPENSES);
    const filtered = currentList.filter(e => e._id !== expenseId);
    saveCollection(KEYS.EXPENSES, filtered);
    setExpenses(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
    addToast('Expense record removed', 'info');
  };

  const importExpensesBatch = async (importedList) => {
    const currentList = getCollection(KEYS.EXPENSES);
    let maxNum = currentList.length > 0 ? Math.max(...currentList.map(e => e.idNumber || 0)) : 0;
    const now = new Date();

    const formatted = importedList.map((item, idx) => {
      maxNum++;
      return {
        _id: `exp_${Date.now()}_${idx}`,
        idNumber: maxNum,
        expenseCode: `EXP-${100 + maxNum}`,
        itemName: item.itemName || item.title || 'Imported Expense Item',
        price: Number(item.price || item.amount) || 1000,
        amount: Number(item.price || item.amount) || 1000,
        category: item.category || 'Utilities & Office',
        purchasedFrom: item.purchasedFrom || 'Vendor',
        purchaseDate: item.purchaseDate || item.date || getLocalDateString(now),
        date: item.purchaseDate || item.date || getLocalDateString(now),
        employeeId: currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
        employeeName: item.employeeName || item.paidBy || currentUser?.name || 'Employee',
        employeeAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        paidBy: item.paidBy || currentUser?.name || 'Employee',
        status: item.status || 'pending',
        description: item.description || 'Imported via CSV template',
        billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
        createdById: currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
        createdByName: currentUser?.name || 'Employee',
        createdAt: now.toISOString()
      };
    });

    const updated = [...formatted, ...currentList];
    saveCollection(KEYS.EXPENSES, updated);
    setExpenses(updated);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
    addToast(`Successfully imported ${formatted.length} expense items!`, 'success');
  };

  // =========================================================================
  // 🎫 TICKETS MODULE (Immediate Admin & Employee Synchronization)
  // =========================================================================
  const createTicket = async (ticketData) => {
    const currentList = getCollection(KEYS.TICKETS) || [];
    const nextNum = currentList.length > 0 ? Math.max(...currentList.map(t => parseInt(t.ticketCode?.replace('TKT-', '') || '1040', 10))) + 1 : 1041;
    const now = new Date();

    const u = currentUser;
    const reqId = String(u?._id || u?.employeeCode || (employees && employees[0]?._id) || 'emp_user');
    const reqName = u?.name || 'Employee';
    const reqAvatar = u?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
    const reqRole = u?.role || 'Team Member';

    const activeEmployees = employees || [];
    const defaultSupportEmp = activeEmployees.find(e =>
      Boolean(e.isAdmin || e.systemRole === 'admin' || (e.role && /admin|it|support|manager/i.test(e.role)))
    ) || activeEmployees[0] || u;

    const defAssigneeId = String(defaultSupportEmp?._id || defaultSupportEmp?.id || defaultSupportEmp?.employeeCode || 'admin');
    const defAssigneeName = defaultSupportEmp?.name ? `${defaultSupportEmp.name} (Support)` : 'Admin / IT Support';

    const newTicket = {
      _id: `tkt_${Date.now()}`,
      ticketCode: `TKT-${nextNum}`,
      subject: ticketData.subject || 'Helpdesk Support Request',
      category: ticketData.category || 'General Support',
      priority: ticketData.priority || 'medium',
      description: ticketData.description || 'Support request raised.',
      attachment: ticketData.attachment || '',
      fileName: ticketData.fileName || '',
      status: 'open',
      department: ticketData.category || 'IT Support',
      requestedById: reqId,
      requestedByName: reqName,
      requestedByAvatar: reqAvatar,
      requestedByRole: reqRole,
      createdBy: reqId,
      createdByName: reqName,
      createdByAvatar: reqAvatar,
      createdByRole: reqRole,
      assignedToId: ticketData.assignedToId || defAssigneeId,
      assignedToName: ticketData.assignedToName || defAssigneeName,
      assignedTo: ticketData.assignedToId || defAssigneeId,
      requestedOn: getLocalDateString(now),
      createdAt: now.toISOString(),
      replies: [],
      internalNotes: [],
      ...ticketData
    };

    try {
      const payload = { ...newTicket };
      delete payload._id;
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?._id) newTicket._id = String(json.data._id);
        if (json.data?.ticketCode) newTicket.ticketCode = json.data.ticketCode;
      }
    } catch (e) {
      console.warn('[CRMContext] Ticket offline save:', e);
    }

    currentList.unshift(newTicket);
    saveCollection(KEYS.TICKETS, currentList);
    setTickets([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
    addToast(`Ticket "${newTicket.ticketCode}" raised! Admin has been notified immediately.`, 'success');
    return newTicket;
  };

  const updateTicketStatus = async (ticketId, status, actorMeta = {}) => {
    const actorName = actorMeta.actor || currentUser?.name || 'Administrator';
    const actorCode = actorMeta.actorCode || currentUser?.employeeCode || '';
    const actorId = actorMeta.actorId || currentUser?._id || '';
    const actorLabel = actorCode ? `${actorName} (${actorCode})` : actorName;

    const payload = {
      status,
      lastActionBy: actorLabel,
      lastActionById: actorId,
      lastActionByCode: actorCode,
      updatedAt: new Date().toISOString()
    };

    if (status === 'resolved') {
      payload.resolvedBy = actorLabel;
      payload.resolvedById = actorId;
      payload.resolvedByCode = actorCode;
      payload.resolvedAt = new Date().toISOString();
    } else if (status === 'closed') {
      payload.closedBy = actorLabel;
      payload.closedById = actorId;
      payload.closedByCode = actorCode;
      payload.closedAt = new Date().toISOString();
    } else if (status === 'open' || status === 'in_progress') {
      payload.reopenedBy = actorLabel;
      payload.reopenedById = actorId;
      payload.reopenedByCode = actorCode;
      payload.reopenedAt = new Date().toISOString();
    }

    try {
      await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.TICKETS) || [];
    const idx = currentList.findIndex(t => String(t._id) === String(ticketId) || String(t.id) === String(ticketId) || String(t.ticketCode) === String(ticketId));
    if (idx !== -1) {
      Object.assign(currentList[idx], payload);
      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast(`Ticket status updated to ${status.replace('_', ' ').toUpperCase()}`, 'success');
    }
  };

  const replyToTicket = async (ticketId, messageText) => {
    if (!messageText.trim()) return;
    const currentList = getCollection(KEYS.TICKETS) || [];
    const idx = currentList.findIndex(t => String(t._id) === String(ticketId) || String(t.ticketCode) === String(ticketId));
    if (idx !== -1) {
      const isUserAdmin = Boolean(
        currentUser?.isAdmin ||
        currentUser?.systemRole === 'admin' ||
        currentUser?.systemRole === 'hr' ||
        currentUser?.role?.toLowerCase().includes('lead') ||
        currentUser?.role?.toLowerCase().includes('director') ||
        currentUser?.role?.toLowerCase().includes('manager') ||
        currentUser?.role?.toLowerCase().includes('admin') ||
        currentUser?.role?.toLowerCase().includes('hr')
      );
      const newReply = {
        id: `rep_${Date.now()}`,
        senderId: currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || 'emp_user',
        senderName: currentUser?.name || 'Employee',
        senderAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        message: messageText,
        timestamp: new Date().toISOString(),
        isAdminReply: isUserAdmin
      };

      try {
        await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            authorName: newReply.senderName,
            authorAvatar: newReply.senderAvatar,
            authorRole: isUserAdmin ? 'Administrator' : 'Team Member',
            message: messageText,
            isAdminReply: isUserAdmin
          })
        });
      } catch (_) {}

      currentList[idx].replies = [...(currentList[idx].replies || []), newReply];
      if (currentList[idx].status === 'open' && isUserAdmin) {
        currentList[idx].status = 'in_progress';
      }

      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast('Reply sent successfully!', 'success');
    }
  };

  const addTicketInternalNote = async (ticketId, noteText) => {
    if (!noteText.trim()) return;
    const currentList = getCollection(KEYS.TICKETS) || [];
    const idx = currentList.findIndex(t => String(t._id) === String(ticketId) || String(t.ticketCode) === String(ticketId));
    if (idx !== -1) {
      const authorName = currentUser?.name || 'Administrator';
      const authorCode = currentUser?.employeeCode || '';
      const authorLabel = authorCode ? `${authorName} (${authorCode})` : authorName;
      const newNote = {
        id: `note_${Date.now()}`,
        author: authorLabel,
        authorName,
        authorCode,
        authorId: currentUser?._id,
        text: noteText,
        date: new Date().toISOString()
      };
      currentList[idx].internalNotes = [...(currentList[idx].internalNotes || []), newNote];
      try {
        await fetch(`${API_BASE}/tickets/${ticketId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ internalNotes: currentList[idx].internalNotes })
        });
      } catch (_) {}
      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast('Internal admin note attached to ticket', 'info');
    }
  };

  const assignTicket = async (ticketId, employeeId, actorMeta = {}) => {
    const actorName = actorMeta.actor || currentUser?.name || 'Administrator';
    const actorCode = actorMeta.actorCode || currentUser?.employeeCode || '';
    const actorId = actorMeta.actorId || currentUser?._id || '';
    const actorLabel = actorCode ? `${actorName} (${actorCode})` : actorName;

    const currentList = getCollection(KEYS.TICKETS) || [];
    const idx = currentList.findIndex(t => String(t._id) === String(ticketId) || String(t.ticketCode) === String(ticketId));
    const emp = employees.find(e => String(e._id) === String(employeeId) || String(e.employeeCode) === String(employeeId));
    if (idx !== -1 && emp) {
      const payload = {
        assignedTo: emp._id,
        assignedToId: emp._id,
        assignedToName: emp.name,
        assignedBy: actorLabel,
        assignedById: actorId,
        assignedByCode: actorCode,
        assignedAt: new Date().toISOString(),
        lastActionBy: actorLabel,
        lastActionById: actorId,
        lastActionByCode: actorCode,
        updatedAt: new Date().toISOString()
      };
      Object.assign(currentList[idx], payload);
      try {
        await fetch(`${API_BASE}/tickets/${ticketId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
      } catch (_) {}
      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast(`Ticket reassigned to ${emp.name}`, 'info');
    }
  };

  const deleteTicket = async (ticketId) => {
    const currentList = getCollection(KEYS.TICKETS) || [];
    const targetTicket = currentList.find(t => String(t._id) === String(ticketId) || String(t.ticketCode) === String(ticketId));

    if (!canDeleteTicket(currentUser, targetTicket)) {
      addToast('Access Denied: You do not have permission to delete this support ticket.', 'error');
      return false;
    }

    try {
      await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (e) {
      console.warn('[CRMContext] Ticket deleted offline:', e);
    }
    const filtered = currentList.filter(t => String(t._id) !== String(ticketId) && String(t.ticketCode) !== String(ticketId));
    saveCollection(KEYS.TICKETS, filtered);
    setTickets(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
    addToast('Ticket removed successfully', 'info');
    return true;
  };

  // =========================================================================
  // 📅 EVENTS & COMPANY CALENDAR
  // =========================================================================
  const createEvent = async (eventData) => {
    const currentList = getCollection(KEYS.EVENTS);
    const newEvent = {
      _id: `ev_${Date.now()}`,
      eventName: eventData.eventName || eventData.title || 'Company Event',
      title: eventData.eventName || eventData.title || 'Company Event',
      eventType: eventData.eventType || 'Company Event',
      type: (eventData.eventType || 'meeting').toLowerCase().replace(/\s+/g, '_'),
      startDate: eventData.startDate || getLocalDateString(),
      endDate: eventData.endDate || eventData.startDate || getLocalDateString(),
      date: eventData.startDate || getLocalDateString(),
      startTime: eventData.startTime || '10:00 AM',
      time: eventData.startTime || '10:00 AM',
      location: eventData.location || 'Headquarters & Video Link',
      description: eventData.description || '',
      isRecurring: !!eventData.isRecurring,
      color: eventData.color || '#2563eb',
      bgColor: eventData.bgColor || '#eff6ff',
      createdById: currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
      createdAt: new Date().toISOString(),
      ...eventData
    };

    try {
      const payload = { ...newEvent };
      delete payload._id;
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?._id) newEvent._id = String(json.data._id);
      }
    } catch (_) {}

    currentList.unshift(newEvent);
    saveCollection(KEYS.EVENTS, currentList);
    setEvents([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EVENTS } }));
    addToast(`Event "${newEvent.eventName}" scheduled on company calendar!`, 'success');
    return newEvent;
  };

  const updateEvent = async (eventId, updateData) => {
    try {
      const payload = { ...updateData };
      delete payload._id;
      await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.EVENTS);
    const idx = currentList.findIndex(e => e._id === eventId || e.id === eventId);
    if (idx !== -1) {
      currentList[idx] = {
        ...currentList[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      saveCollection(KEYS.EVENTS, currentList);
      setEvents([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EVENTS } }));
      addToast('Calendar event updated!', 'success');
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.EVENTS);
    const filtered = currentList.filter(e => e._id !== eventId && e.id !== eventId);
    saveCollection(KEYS.EVENTS, filtered);
    setEvents(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EVENTS } }));
    addToast('Event removed from calendar', 'info');
  };

  // =========================================================================
  // 💬 MESSAGES & TEAM CHAT (ENTERPRISE MULTI-USER ENGINE)
  // =========================================================================
  const sendMessage = (conversationId, text = '', attachments = []) => {
    const trimmedText = (text || '').trim();
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!trimmedText && !hasAttachments) return;

    const currentConvs = getCollection(KEYS.CONVERSATIONS);
    const idx = currentConvs.findIndex(c => c.id === conversationId);
    if (idx === -1) return;

    // Deduplicate rapid accidental double-sends (e.g. within 2 seconds)
    const senderId = currentUser?._id || currentUser?.employeeCode || 'EMP-001';
    const existingMsgs = Array.isArray(currentConvs[idx].messages) ? currentConvs[idx].messages : [];
    if (existingMsgs.length > 0) {
      const lastMsg = existingMsgs[existingMsgs.length - 1];
      const isSameSender = lastMsg && (lastMsg.senderId === senderId || (currentUser?.email && lastMsg.senderEmail === currentUser.email));
      const isWithin2Secs = lastMsg && (Date.now() - (lastMsg.createdAt || 0) < 2000);
      if (isSameSender && isWithin2Secs) {
        const isSameText = (lastMsg.text || '') === trimmedText;
        const isSameAttCount = (lastMsg.attachments?.length || 0) === (attachments?.length || 0);
        const isSameFirstAtt = !hasAttachments || (lastMsg.attachments?.[0]?.name === attachments?.[0]?.name);
        if (isSameText && isSameAttCount && isSameFirstAtt) {
          console.warn('[CRMContext] Prevented duplicate rapid message submission');
          return;
        }
      }
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId,
      senderCode: currentUser?.employeeCode || 'EMP-001',
      senderName: currentUser?.name || 'Team Member',
      senderAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      senderRole: currentUser?.role || 'Associate',
      senderEmail: currentUser?.email || '',
      text: trimmedText,
      attachments: hasAttachments ? attachments : [],
      timestamp: timeStr,
      createdAt: Date.now(),
      readBy: Array.from(new Set([senderId, currentUser?.employeeCode, currentUser?._id, currentUser?.id].filter(Boolean)))
    };

    if (!Array.isArray(currentConvs[idx].messages)) {
      currentConvs[idx].messages = [];
    }

    // Deduplicate existing messages in this conversation if any were corrupted
    const seenMsgIds = new Set();
    currentConvs[idx].messages = currentConvs[idx].messages.filter(m => {
      if (!m) return false;
      const k = m.id || `${m.senderId || ''}_${m.createdAt || ''}_${m.text || ''}`;
      if (seenMsgIds.has(k)) return false;
      seenMsgIds.add(k);
      return true;
    });

    const alreadyInList = currentConvs[idx].messages.some(m => m.id === newMsg.id);
    if (!alreadyInList) {
      currentConvs[idx].messages.push(newMsg);
    }
    currentConvs[idx].lastMessage = trimmedText || (hasAttachments ? `📎 Shared ${attachments.length} file(s)` : 'Attachment');
    currentConvs[idx].lastMessageTime = timeStr;
    currentConvs[idx].updatedAt = Date.now();

    saveCollection(KEYS.CONVERSATIONS, stripHeavyMediaForStorage(currentConvs), { broadcast: false });
    setConversations([...currentConvs]);
    window.dispatchEvent(new CustomEvent('ems_chat_message_sent', { detail: { message: newMsg, conversationId } }));

    // Persist message to MongoDB Atlas database
    try {
      fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newMsg)
      }).catch(err => console.warn('[CRMContext] Offline message sync queued:', err));
    } catch (err) {
      console.warn('[CRMContext] Message database persistence failed:', err);
    }
  };

  const deleteMessage = async (conversationId, messageId) => {
    if (!conversationId || !messageId) return;
    const currentConvs = getCollection(KEYS.CONVERSATIONS);
    const idx = currentConvs.findIndex(c => c.id === conversationId);
    if (idx === -1) return;

    if (Array.isArray(currentConvs[idx].messages)) {
      currentConvs[idx].messages = currentConvs[idx].messages.filter(m => m && String(m.id) !== String(messageId));
      if (currentConvs[idx].messages.length > 0) {
        const lastMsg = currentConvs[idx].messages[currentConvs[idx].messages.length - 1];
        currentConvs[idx].lastMessage = lastMsg.text || (lastMsg.attachments?.length ? `📎 Shared ${lastMsg.attachments.length} file(s)` : 'Attachment');
        currentConvs[idx].lastMessageTime = lastMsg.timestamp || '';
      } else {
        currentConvs[idx].lastMessage = '';
        currentConvs[idx].lastMessageTime = '';
      }
      currentConvs[idx].updatedAt = Date.now();
    }

    saveCollection(KEYS.CONVERSATIONS, stripHeavyMediaForStorage(currentConvs), { broadcast: false });
    setConversations([...currentConvs]);
    window.dispatchEvent(new CustomEvent('ems_chat_message_deleted', { detail: { messageId, conversationId } }));

    // Persist message deletion to MongoDB Atlas database
    try {
      fetch(`${API_BASE}/conversations/${conversationId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      }).catch(err => console.warn('[CRMContext] Offline delete sync queued:', err));
    } catch (err) {
      console.warn('[CRMContext] Delete message failed:', err);
    }
  };

  const reactToChatMessage = async (conversationId, messageId, emoji) => {
    if (!conversationId || !messageId || !emoji || !currentUser) return;
    const userId = String(currentUser._id || currentUser.id || currentUser.employeeCode || 'anon');
    const userName = currentUser.name || 'Teammate';

    const currentConvs = getCollection(KEYS.CONVERSATIONS);
    const idx = currentConvs.findIndex(c => c.id === conversationId);
    if (idx === -1) return;

    let updatedReactions = [];
    if (Array.isArray(currentConvs[idx].messages)) {
      const msg = currentConvs[idx].messages.find(m => String(m.id) === String(messageId));
      if (msg) {
        if (!Array.isArray(msg.reactions)) msg.reactions = [];
        const existingIdx = msg.reactions.findIndex(r => r.emoji === emoji);
        if (existingIdx !== -1) {
          const r = msg.reactions[existingIdx];
          const userIdx = (r.users || []).findIndex(u => String(u?.id || u) === userId);
          if (userIdx !== -1) {
            r.users.splice(userIdx, 1);
            if (r.users.length === 0) msg.reactions.splice(existingIdx, 1);
          } else {
            r.users.push({ id: userId, name: userName });
          }
        } else {
          msg.reactions.push({ emoji, users: [{ id: userId, name: userName }] });
        }
        updatedReactions = msg.reactions;
      }
    }

    saveCollection(KEYS.CONVERSATIONS, stripHeavyMediaForStorage(currentConvs), { broadcast: false });
    setConversations([...currentConvs]);
    window.dispatchEvent(new CustomEvent('ems_chat_reaction', { detail: { conversationId, messageId, reactions: updatedReactions } }));

    try {
      fetch(`${API_BASE}/conversations/${conversationId}/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ emoji, user: { id: userId, name: userName } })
      }).catch(() => {});
    } catch (_) {}
  };

  const acknowledgeNotice = async (noticeId) => {
    if (!noticeId || !currentUser) return;
    const userId = String(currentUser._id || currentUser.id || currentUser.employeeCode || 'anon');
    const userCode = String(currentUser.employeeCode || '');
    const userName = currentUser.name || 'Team Member';
    const userRole = currentUser.role || 'Associate';
    const userAvatar = currentUser.avatar || '';

    const currentNotices = getCollection(KEYS.NOTICES) || [];
    const target = currentNotices.find(n => n._id === noticeId || n.id === noticeId || n.noticeCode === noticeId);
    if (!target) return;
    const ackList = Array.isArray(target.acknowledgedBy) ? target.acknowledgedBy : [];
    const ackDetails = Array.isArray(target.acknowledgements) ? target.acknowledgements : [];

    const alreadyAck = ackList.some(id => String(id) === userId || (userCode && String(id).toUpperCase() === userCode.toUpperCase())) ||
      ackDetails.some(a => String(a.userId) === userId || (userCode && String(a.userCode || '').toUpperCase() === userCode.toUpperCase()));

    if (!alreadyAck) {
      const updatedList = [...ackList, userId];
      const updatedDetails = [
        ...ackDetails,
        {
          userId,
          userCode,
          userName,
          userRole,
          userAvatar,
          acknowledgedAt: new Date().toISOString(),
          date: getLocalDateString()
        }
      ];
      await updateNotice(target._id || target.id, {
        acknowledgedBy: updatedList,
        acknowledgements: updatedDetails
      });
    }
  };

  const startConversation = (employeeId) => {
    const emp = (employees || []).find(e =>
      String(e._id) === String(employeeId) ||
      String(e.id) === String(employeeId) ||
      String(e.employeeCode).toUpperCase() === String(employeeId).toUpperCase()
    );
    if (!emp) return null;

    const currentConvs = getCollection(KEYS.CONVERSATIONS);
    const currentId = currentUser?._id || currentUser?.id || currentUser?.employeeCode || 'EMP-001';
    const targetId = emp._id || emp.id || emp.employeeCode;

    const myIdentifiers = [
      currentUser?._id,
      currentUser?.id,
      currentUser?.employeeCode,
      currentUser?.email
    ].filter(Boolean).map(id => String(id).toLowerCase().trim());

    const targetIdentifiers = [
      emp._id,
      emp.id,
      emp.employeeCode,
      emp.email
    ].filter(Boolean).map(id => String(id).toLowerCase().trim());

    // Check if DM exists strictly between current user and this target
    const existing = currentConvs.find(c => {
      if (c.type !== 'dm') return false;
      if (Array.isArray(c.participants) && c.participants.length > 0) {
        const parts = c.participants.map(p => String(p).toLowerCase().trim());
        const hasMe = parts.some(p => myIdentifiers.includes(p));
        const hasTarget = parts.some(p => targetIdentifiers.includes(p));
        return hasMe && hasTarget;
      }
      const c1 = String(c.createdBy || '').toLowerCase().trim();
      const p1 = String(c.participantId || c.participantCode || '').toLowerCase().trim();
      const match1 = (myIdentifiers.includes(c1) && targetIdentifiers.includes(p1));
      const match2 = (targetIdentifiers.includes(c1) && myIdentifiers.includes(p1));
      return match1 || match2;
    });

    if (existing) {
      setActiveConversationId(existing.id);
      addToast(`Chat opened with ${emp.name}`, 'info');
      return existing.id;
    }

    const dmId = 'dm_' + [String(currentUser?.employeeCode || currentId), String(emp.employeeCode || targetId)].sort().join('_');
    const allParticipants = Array.from(new Set([
      String(currentUser?._id || ''),
      String(currentUser?.id || ''),
      String(currentUser?.employeeCode || ''),
      String(currentUser?.email || ''),
      String(emp._id || ''),
      String(emp.id || ''),
      String(emp.employeeCode || ''),
      String(emp.email || '')
    ])).filter(Boolean);

    const newConv = {
      id: dmId,
      type: 'dm',
      participants: allParticipants,
      participantId: emp._id || emp.id,
      participantCode: emp.employeeCode,
      participantName: emp.name,
      participantRole: emp.role || 'Team Member',
      participantDepartment: emp.department || 'General',
      participantAvatar: emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      participantEmail: emp.email,
      createdBy: currentId,
      createdByName: currentUser?.name || 'Administrator',
      creatorCode: currentUser?.employeeCode || '',
      creatorRole: currentUser?.role || 'Team Member',
      creatorDepartment: currentUser?.department || 'General',
      creatorAvatar: currentUser?.avatar || '',
      isOnline: true,
      lastMessage: 'Conversation started',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      createdAt: Date.now(),
      messages: []
    };

    currentConvs.unshift(newConv);
    saveCollection(KEYS.CONVERSATIONS, currentConvs);
    setConversations([...currentConvs]);
    setActiveConversationId(newConv.id);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));
    addToast(`New conversation started with ${emp.name}!`, 'success');

    // Persist conversation to MongoDB Atlas database
    try {
      fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newConv)
      }).catch(err => console.warn('[CRMContext] Offline conversation sync queued:', err));
    } catch (err) {
      console.warn('[CRMContext] Conversation database persistence failed:', err);
    }
    return newConv.id;
  };

  const markConversationAsRead = (conversationId) => {
    if (!conversationId || !currentUser) return;
    const myIdentifiers = [
      currentUser._id,
      currentUser.id,
      currentUser.employeeCode,
      currentUser.email
    ].filter(Boolean).map(id => String(id).toLowerCase().trim());

    const currentConvs = getCollection(KEYS.CONVERSATIONS);
    const idx = currentConvs.findIndex(c => c.id === conversationId);
    if (idx === -1) return;

    let changed = false;
    if (Array.isArray(currentConvs[idx].messages)) {
      currentConvs[idx].messages.forEach(msg => {
        const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
        const hasRead = readBy.some(id => {
          const s = String(id).toLowerCase().trim();
          return myIdentifiers.includes(s);
        });
        if (!hasRead) {
          const readerIdentifier = currentUser.employeeCode || currentUser._id || currentUser.id || 'reader';
          msg.readBy = [...readBy, readerIdentifier];
          changed = true;
        }
      });
    }

    if (changed) {
      currentConvs[idx].unreadCount = 0;
      saveCollection(KEYS.CONVERSATIONS, currentConvs);
      setConversations([...currentConvs]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));

      // Persist read status to MongoDB Atlas database
      try {
        fetch(`${API_BASE}/conversations/${conversationId}/read`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ userId: currentUser?._id || currentUser?.employeeCode })
        }).catch(() => {});
      } catch (err) {}
    }
  };

  const createChannel = ({ name, description = '', category = 'general', members = ['all'] }) => {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/^#/, '');
    const channelId = `channel_${cleanName}_${Date.now()}`;
    const currentConvs = getCollection(KEYS.CONVERSATIONS);
    const myId = currentUser?._id || currentUser?.employeeCode;

    const finalMembers = Array.isArray(members) && members.length > 0
      ? (members.includes('all') ? ['all'] : Array.from(new Set([...members, myId].filter(Boolean))))
      : ['all'];

    const welcomeNotice = finalMembers.includes('all')
      ? `🎉 Channel #${cleanName} created! ${description.trim()}`
      : `🎉 Group #${cleanName} created with ${finalMembers.length} member(s)! ${description.trim()}`;

    const newChannel = {
      id: channelId,
      type: 'channel',
      name: name.trim(),
      channelName: `#${cleanName}`,
      description: description.trim() || 'Team collaboration channel',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120',
      category,
      members: finalMembers,
      createdBy: myId,
      createdByName: currentUser?.name || 'Administrator',
      isOnline: true,
      lastMessage: 'Channel created',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      createdAt: Date.now(),
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          conversationId: channelId,
          senderId: myId,
          senderName: currentUser?.name || 'Administrator',
          senderAvatar: currentUser?.avatar || '',
          senderRole: currentUser?.role || 'Admin',
          text: welcomeNotice,
          attachments: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: Date.now(),
          readBy: [myId]
        }
      ]
    };

    currentConvs.unshift(newChannel);
    saveCollection(KEYS.CONVERSATIONS, currentConvs);
    setConversations([...currentConvs]);
    setActiveConversationId(newChannel.id);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));
    addToast(`Channel #${cleanName} created successfully!`, 'success');

    // Persist channel to MongoDB Atlas database
    try {
      fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newChannel)
      }).catch(err => console.warn('[CRMContext] Offline channel sync queued:', err));
    } catch (err) {}

    return newChannel.id;
  };

  const updateChannelMembers = (channelId, newMembers = []) => {
    if (!channelId) return;
    const currentConvs = getCollection(KEYS.CONVERSATIONS);
    const idx = currentConvs.findIndex(c => c.id === channelId);
    if (idx === -1) return;
    const finalMembers = Array.isArray(newMembers) && newMembers.length > 0 ? newMembers : ['all'];
    currentConvs[idx].members = finalMembers;
    currentConvs[idx].updatedAt = Date.now();
    saveCollection(KEYS.CONVERSATIONS, currentConvs);
    setConversations([...currentConvs]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));
    addToast('Channel members updated successfully!', 'success');
  };

  // =========================================================================
  // 📢 NOTICE BOARD MODULE
  // =========================================================================
  const createNotice = async (noticeData) => {
    const currentList = getCollection(KEYS.NOTICES);
    const now = new Date();
    const creatorName = currentUser?.name || 'HR Operations';
    const creatorCode = currentUser?.employeeCode || '';
    const creatorLabel = creatorCode ? `${creatorName} (${creatorCode})` : creatorName;

    const noticePayload = {
      title: noticeData.title || 'Company Notice',
      description: noticeData.description || noticeData.shortDescription || '',
      shortDescription: noticeData.shortDescription || noticeData.description || '',
      category: noticeData.category || 'Company Announcement',
      priority: noticeData.priority || 'medium',
      targetAudience: noticeData.targetAudience || noticeData.to || 'All Employees',
      to: noticeData.targetAudience || noticeData.to || 'All Employees',
      postedBy: creatorLabel,
      createdBy: creatorLabel,
      postedById: currentUser?._id,
      postedByCode: creatorCode,
      date: noticeData.date || getLocalDateString(now),
      expiryDate: noticeData.expiryDate || getLocalDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      attachment: noticeData.attachment || '',
      isImportant: noticeData.priority === 'urgent' || noticeData.priority === 'high' || !!noticeData.isImportant,
      fullContent: noticeData.description || noticeData.fullContent || '',
      createdAt: now.toISOString(),
      ...noticeData
    };
    // Never send client-side temporary string ID to backend
    delete noticePayload._id;

    let savedNotice = {
      _id: `not_${Date.now()}`,
      ...noticePayload
    };

    try {
      const res = await fetch(`${API_BASE}/notices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(noticePayload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          savedNotice = {
            ...savedNotice,
            ...json.data,
            _id: String(json.data._id || savedNotice._id)
          };
        }
      } else {
        console.warn('Backend rejected notice creation:', await res.text());
      }
    } catch (err) {
      console.warn('Notice saved locally, offline sync will propagate to MongoDB:', err);
    }

    currentList.unshift(savedNotice);
    saveCollection(KEYS.NOTICES, currentList);
    setNotices([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
    addToast('Company announcement published to Notice Board & Dashboards!', 'success');
    return savedNotice;
  };

  const updateNotice = async (noticeId, updateData) => {
    const actorName = currentUser?.name || 'Administrator';
    const actorCode = currentUser?.employeeCode || '';
    const actorLabel = actorCode ? `${actorName} (${actorCode})` : actorName;

    const payload = {
      ...updateData,
      lastActionBy: actorLabel,
      lastActionById: currentUser?._id,
      lastActionByCode: actorCode,
      updatedAt: new Date().toISOString()
    };
    delete payload._id;

    try {
      await fetch(`${API_BASE}/notices/${noticeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.NOTICES);
    const idx = currentList.findIndex(n => n._id === noticeId || n.id === noticeId || n.noticeCode === noticeId);
    if (idx !== -1) {
      currentList[idx] = {
        ...currentList[idx],
        ...payload
      };
      saveCollection(KEYS.NOTICES, currentList);
      setNotices([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
      addToast('Notice updated successfully!', 'success');
    }
  };

  const dismissNoticeForUser = async (noticeId, userIdentifier) => {
    if (!noticeId || !userIdentifier) return;
    const currentList = getCollection(KEYS.NOTICES) || [];
    const idx = currentList.findIndex(n => String(n._id) === String(noticeId) || String(n.id) === String(noticeId) || String(n.noticeCode) === String(noticeId));
    if (idx !== -1) {
      const existingDismissed = Array.isArray(currentList[idx].dismissedBy) ? currentList[idx].dismissedBy : [];
      const updatedDismissed = [...new Set([...existingDismissed, String(userIdentifier)])];
      currentList[idx] = {
        ...currentList[idx],
        dismissedBy: updatedDismissed,
        updatedAt: new Date().toISOString()
      };
      saveCollection(KEYS.NOTICES, currentList);
      setNotices([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));

      try {
        const realId = currentList[idx]._id || noticeId;
        await fetch(`${API_BASE}/notices/${realId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ dismissedBy: updatedDismissed })
        });
      } catch (_) {}
    }
  };

  const deleteNotice = async (noticeId) => {
    const currentList = getCollection(KEYS.NOTICES) || [];
    const targetNotice = currentList.find(n => n._id === noticeId || n.id === noticeId || n.noticeCode === noticeId);

    if (!canDeleteNotice(currentUser, targetNotice)) {
      addToast('Access Denied: You do not have permission to delete this company notice.', 'error');
      return false;
    }

    try {
      await fetch(`${API_BASE}/notices/${noticeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (_) {}

    const filtered = currentList.filter(n => n._id !== noticeId && n.id !== noticeId && n.noticeCode !== noticeId);
    saveCollection(KEYS.NOTICES, filtered);
    setNotices(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
    addToast('Notice removed from board', 'info');
    return true;
  };

  // =========================================================================
  // 👤 PROFILE UPDATE
  // =========================================================================
  const updateUserProfile = async (profileData) => {
    if (currentUser?._id) {
      await updateEmployee(currentUser._id, profileData);
      addToast('Profile updated successfully!', 'success');
    }
  };

  // =========================================================================
  // 👥 LEADS MANAGEMENT
  // =========================================================================
  const createLead = async (leadData) => {
    const currentList = getCollection(KEYS.LEADS);
    const nextNum = (currentList.length > 0 ? Math.max(...currentList.map(l => l.idNumber || 0)) + 1 : 1);
    const now = new Date();

    const leadPayload = {
      idNumber: nextNum,
      leadCode: leadData.leadCode || `LEAD-${1000 + nextNum}`,
      name: leadData.name || leadData.contactPerson,
      contactPerson: leadData.contactPerson || leadData.name,
      companyName: leadData.companyName || leadData.client || 'Enterprise Client',
      client: leadData.client || leadData.companyName || 'Enterprise Client',
      email: leadData.email || '',
      phone: leadData.phone || '',
      leadType: leadData.leadType || 'Inbound Web',
      leadOwnerId: leadData.leadOwnerId || currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
      leadOwnerName: leadData.leadOwnerName || currentUser?.name || 'Lead Owner',
      leadOwnerRole: leadData.leadOwnerRole || currentUser?.role || 'Sales Lead',
      leadOwnerAvatar: leadData.leadOwnerAvatar || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      createdById: currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
      createdByName: currentUser?.name || 'Employee',
      createdByRole: currentUser?.role || 'Senior',
      createdByAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      startDate: leadData.startDate || getLocalDateString(now),
      endDate: leadData.endDate || getLocalDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      createdDate: now.toLocaleDateString('en-GB').replace(/\//g, '-'),
      createdAt: now.toISOString(),
      status: leadData.status || 'new',
      priority: leadData.priority || 'medium',
      dealValue: Number(String(leadData.dealValue || '').replace(/[^0-9.-]+/g, '')) || 0,
      leadSource: leadData.leadSource || 'Website Inquiry',
      notes: leadData.notes || '',
      ...leadData
    };
    delete leadPayload._id;

    let savedLead = {
      _id: `lead_${Date.now()}`,
      ...leadPayload
    };

    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(leadPayload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          savedLead = {
            ...savedLead,
            ...json.data,
            _id: String(json.data._id || savedLead._id)
          };
        }
      }
    } catch (_) {}

    currentList.unshift(savedLead);
    saveCollection(KEYS.LEADS, currentList);
    setLeads([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));
    addToast(`Lead "${savedLead.name}" added successfully!`, 'success');
    return savedLead;
  };

  const updateLead = async (leadId, updateData) => {
    try {
      const payload = { ...updateData };
      delete payload._id;
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.LEADS);
    const idx = currentList.findIndex(l => l._id === leadId || l.id === leadId || l.leadCode === leadId);
    if (idx !== -1) {
      currentList[idx] = {
        ...currentList[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      saveCollection(KEYS.LEADS, currentList);
      setLeads([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));
      addToast('Lead updated successfully!', 'success');
      return currentList[idx];
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.LEADS);
    const idx = currentList.findIndex(l => l._id === leadId || l.id === leadId || l.leadCode === leadId);
    if (idx !== -1) {
      const prevStatus = currentList[idx].status;
      currentList[idx].status = status;
      currentList[idx].updatedAt = new Date().toISOString();
      saveCollection(KEYS.LEADS, currentList);
      setLeads([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));

      if (status === 'converted' && prevStatus !== 'converted') {
        addToast(`🎉 Awesome! Lead marked as Converted (Won Deal)!`, 'success');
      } else {
        addToast(`Lead status updated to ${status.replace('_', ' ')}`, 'info');
      }
    }
  };

  const deleteLead = async (leadId) => {
    const currentList = getCollection(KEYS.LEADS) || [];
    const targetLead = currentList.find(l => l._id === leadId || l.id === leadId || l.leadCode === leadId);

    if (!canDeleteLead(currentUser, targetLead)) {
      addToast('Access Denied: You do not have permission to delete this CRM lead.', 'error');
      return false;
    }

    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (_) {}

    const filtered = currentList.filter(l => l._id !== leadId && l.id !== leadId && l.leadCode !== leadId);
    saveCollection(KEYS.LEADS, filtered);
    setLeads(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));
    addToast('Lead deleted from database', 'info');
    return true;
  };

  const importLeadsBatch = async (importedList) => {
    const currentList = getCollection(KEYS.LEADS);
    let maxNum = currentList.length > 0 ? Math.max(...currentList.map(l => l.idNumber || 0)) : 0;
    const now = new Date();

    const formattedList = importedList.map((item, idx) => {
      maxNum++;
      return {
        _id: `lead_${Date.now()}_${idx}`,
        idNumber: maxNum,
        leadCode: `LEAD-${1000 + maxNum}`,
        name: item.name || item.contactPerson || 'Untitled Lead',
        contactPerson: item.contactPerson || item.name || 'Contact Person',
        companyName: item.companyName || item.client || 'Enterprise Client',
        client: item.client || item.companyName || 'Enterprise Client',
        email: item.email || '',
        phone: item.phone || item.phoneNumber || '',
        leadType: item.leadType || item.category || 'Inbound Web',
        leadOwnerId: item.leadOwnerId || currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
        leadOwnerName: item.leadOwnerName || currentUser?.name || 'Lead Owner',
        leadOwnerRole: item.leadOwnerRole || currentUser?.role || 'Sales Lead',
        leadOwnerAvatar: item.leadOwnerAvatar || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        createdById: currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
        createdByName: currentUser?.name || 'Employee',
        createdByRole: currentUser?.role || 'Senior',
        createdByAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        startDate: item.startDate || getLocalDateString(now),
        endDate: item.endDate || getLocalDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        createdDate: now.toLocaleDateString('en-GB').replace(/\//g, '-'),
        createdAt: now.toISOString(),
        status: item.status || 'new',
        priority: item.priority || 'medium',
        dealValue: Number(String(item.dealValue || '').replace(/[^0-9.-]+/g, '')) || 0,
        leadSource: item.leadSource || 'CSV Import',
        notes: item.notes || item.description || 'Imported via CSV/Excel template.'
      };
    });

    const updated = [...formattedList, ...currentList];
    saveCollection(KEYS.LEADS, updated);
    setLeads(updated);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));

    // Persist batch to backend MongoDB Atlas if online
    try {
      const payloadLeads = formattedList.map(item => {
        const copy = { ...item };
        delete copy._id;
        return copy;
      });

      const res = await fetch(`${API_BASE}/leads/import`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ leads: payloadLeads })
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const idMap = new Map();
          json.data.forEach(savedItem => {
            if (savedItem.leadCode) idMap.set(savedItem.leadCode, savedItem);
          });
          formattedList.forEach((item, i) => {
            const saved = idMap.get(item.leadCode);
            if (saved && saved._id) {
              formattedList[i]._id = String(saved._id);
            }
          });
          const reSynced = [...formattedList, ...currentList];
          saveCollection(KEYS.LEADS, reSynced);
          setLeads(reSynced);
        }
      }
    } catch (err) {
      console.warn('[CRMContext] Offline fallback for leads batch import:', err);
    }

    addToast(`Successfully imported ${formattedList.length} leads!`, 'success');
    return formattedList;
  };

  // =========================================================================
  // 🚑 EMERGENCY CONTACTS
  // =========================================================================
  const addEmergencyContact = async (contactData) => {
    const currentList = getCollection(KEYS.EMERGENCY_CONTACTS);
    const newContact = {
      _id: `emg_${Date.now()}`,
      name: contactData.name || '',
      email: contactData.email || '',
      mobile: contactData.mobile || '',
      alternateNumber: contactData.alternateNumber || '',
      relationship: contactData.relationship || 'Family',
      address: contactData.address || '',
      employeeId: currentUser?._id || currentUser?.id || currentUser?.employeeCode || (employees && employees[0]?._id) || '',
      createdAt: new Date().toISOString()
    };
    currentList.push(newContact);
    saveCollection(KEYS.EMERGENCY_CONTACTS, currentList);
    setEmergencyContacts([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMERGENCY_CONTACTS } }));
    addToast('Emergency contact added successfully!', 'success');
    return newContact;
  };

  const updateEmergencyContact = async (contactId, updateData) => {
    const currentList = getCollection(KEYS.EMERGENCY_CONTACTS);
    const idx = currentList.findIndex(c => c._id === contactId);
    if (idx !== -1) {
      currentList[idx] = { ...currentList[idx], ...updateData, updatedAt: new Date().toISOString() };
      saveCollection(KEYS.EMERGENCY_CONTACTS, currentList);
      setEmergencyContacts([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMERGENCY_CONTACTS } }));
      addToast('Emergency contact updated!', 'success');
    }
  };

  const deleteEmergencyContact = async (contactId) => {
    const currentList = getCollection(KEYS.EMERGENCY_CONTACTS);
    const filtered = currentList.filter(c => c._id !== contactId);
    saveCollection(KEYS.EMERGENCY_CONTACTS, filtered);
    setEmergencyContacts(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMERGENCY_CONTACTS } }));
    addToast('Emergency contact removed', 'info');
  };



  // =========================================================================
  // ⚙️ USER SETTINGS
  // =========================================================================
  const updateUserSettings = async (newSettings) => {
    const merged = { ...userSettings, ...newSettings };
    setUserSettings(merged);
    localStorage.setItem(KEYS.USER_SETTINGS, JSON.stringify(merged));
    addToast('Settings saved successfully!', 'success');
  };

  const contextValue = useMemo(() => ({
    expenses,
    loadExpenses,
    createExpense,
    updateExpense,
    updateExpenseStatus,
    deleteExpense,
    importExpensesBatch,

    tickets,
    loadTickets,
    createTicket,
    updateTicketStatus,
    replyToTicket,
    addTicketInternalNote,
    assignTicket,
    deleteTicket,

    events,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    computedBirthdays,
    birthdays: computedBirthdays,
    computedAnniversaries,
    anniversaries: computedAnniversaries,

    conversations,
    visibleConversations,
    totalUnreadMessagesCount,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    deleteMessage,
    reactToChatMessage,
    startConversation,
    createChannel,
    updateChannelMembers,
    markConversationAsRead,

    notices,
    loadNotices,
    createNotice,
    updateNotice,
    deleteNotice,
    acknowledgeNotice,
    dismissNoticeForUser,

    leads,
    loadLeads,
    leadsFilter,
    setLeadsFilter,
    createLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
    importLeadsBatch,

    emergencyContacts,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,

    userSettings,
    updateUserSettings,

    wfhEmployees,
    weeklyTimeLogs: computedWeeklyTimeLogs,
    computedWeeklyTimeLogs,
    darkMode,
    toggleDarkMode,
    updateUserProfile
  }), [
    expenses, tickets, events, computedBirthdays, computedAnniversaries,
    conversations, visibleConversations, totalUnreadMessagesCount, activeConversationId, notices, leads, leadsFilter,
    emergencyContacts, userSettings, wfhEmployees,
    computedWeeklyTimeLogs, darkMode
  ]);

  return (
    <CRMContext.Provider value={contextValue}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  return context || defaultCRMContext;
};
