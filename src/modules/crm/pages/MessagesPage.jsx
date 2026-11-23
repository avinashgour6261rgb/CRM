/**
 * @file MessagesPage.jsx
 * @description Enterprise Team Chat & Collaboration Hub with Channels, Direct Messages,
 * Rich Media & Document Sharing, Real-Time MongoDB Persistence & Polished Light/Dark Theme.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Check,
  CheckCheck,
  User,
  MessageSquare,
  Sparkles,
  Phone,
  Video,
  Info,
  Hash,
  Users,
  FileText,
  FileSpreadsheet,
  Download,
  X,
  Image as ImageIcon,
  Archive,
  FileCode,
  Maximize2,
  Lock,
  Pin,
  ChevronLeft,
  Monitor,
  Radio,
  Mic,
  Eye,
  Trash2,
  History
} from 'lucide-react';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { getLocalDateString } from '../../../shared/utils/timerUtils';
import { useCRM } from '../../../shared/context/CRMContext';
import { useHR } from '../../hr/context/HRContext';
import { useUserShiftStatus } from '../utils/useUserShiftStatus';
import { canScreenShare } from '../../../shared/utils/permissionUtils';
import { NewConversationModal } from '../components/messages/NewConversationModal';
import { ChatMediaViewerModal } from '../components/messages/ChatMediaViewerModal';
import { VoiceMemoPlayer } from '../components/messages/VoiceMemoPlayer';
import { LiveVoiceHuddleBar } from '../components/messages/LiveVoiceHuddleBar';
import { ScreenShareModal } from '../components/messages/ScreenShareModal';
import { CallAndScreenHistoryModal } from '../components/messages/CallAndScreenHistoryModal';
import { processFileForChat, downloadChatAttachment, fetchChatAttachmentMedia } from '../utils/chatMediaUtils';
import { getDmPartner, getUnreadCountForUser } from '../utils/chatPrivacyUtils';
import { useToast } from '../../../shared/context/ToastContext';
import { emitSocketEvent, subscribeSocketEvent, isSocketConnected } from '../../../shared/services/socketService';

const LazyChatImage = ({ att, conversationId, onOpen }) => {
  const [src, setSrc] = useState(() => att?.dataUrl || att?.thumbDataUrl || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const immediate = att?.dataUrl || att?.thumbDataUrl || '';
    setSrc(immediate);
    // Legacy images stored before thumbnails existed: fetch lazily ONLY while this chat is open
    if (!immediate && att?.hasFullMedia && att?.id) {
      let alive = true;
      setLoading(true);
      fetchChatAttachmentMedia(conversationId || att.conversationId, att.id)
        .then(url => {
          if (alive && url) setSrc(url);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
      return () => { alive = false; };
    }
  }, [att?.id, att?.dataUrl, att?.thumbDataUrl, att?.hasFullMedia, att?.conversationId, conversationId]);

  return (
    <div
      onClick={() => onOpen(att)}
      className="relative group cursor-pointer overflow-hidden rounded-lg bg-black/10 max-w-sm min-w-[140px] min-h-[90px] flex items-center justify-center"
    >
      {src ? (
        <img
          src={src}
          alt={att.name}
          loading="lazy"
          decoding="async"
          className="max-h-60 w-auto object-cover rounded-lg transition-transform duration-200 group-hover:scale-102"
        />
      ) : (
        <div className="px-4 py-6 text-[11px] font-semibold text-slate-300">
          {loading ? 'Loading photo...' : 'Click to view photo'}
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
        <Maximize2 size={16} />
        <span>Click to view HD</span>
      </div>
    </div>
  );
};

export const MessagesPage = () => {
  const {
    visibleConversations,
    conversations,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    deleteMessage,
    reactToChatMessage,
    markConversationAsRead
  } = useCRM();
  const { confirm } = useConfirm();
  const { currentUser: authUser } = useAuth();
  const { currentUser: hrUser, employees, attendance } = useHR();

  const currentUser = useMemo(() => {
    const base = authUser || hrUser;
    if (!base) return null;
    const localEmps = employees || [];
    const matched = localEmps.find(e =>
      (base._id && (String(e._id) === String(base._id) || String(e.id) === String(base._id))) ||
      (base.id && (String(e._id) === String(base.id) || String(e.id) === String(base.id))) ||
      (base.employeeCode && (String(e.employeeCode).toUpperCase() === String(base.employeeCode).toUpperCase())) ||
      (base.email && e.email && String(e.email).toLowerCase() === String(base.email).toLowerCase())
    );
    return matched ? { ...base, ...matched } : base;
  }, [authUser, hrUser, employees]);

  // High-performance decoupled shift state: 0 re-renders per second
  const { isClockedIn, isOnBreak } = useUserShiftStatus(currentUser);
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'channels' | 'dms'
  const [searchContact, setSearchContact] = useState('');
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isNewConvOpen, setIsNewConvOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // In-Chat Search, Typing Indicator & Emoji Reaction States
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [remoteTypingUsers, setRemoteTypingUsers] = useState([]);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState(null);
  const typingTimeoutRef = useRef(null);

  // Screen Share & Live Huddle State
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenShareOpen, setIsScreenShareOpen] = useState(false);
  const [isScreenShareHost, setIsScreenShareHost] = useState(false);
  const [screenShareSessionConv, setScreenShareSessionConv] = useState(null);
  const [screenShareSessionData, setScreenShareSessionData] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);

  const activeConv = useMemo(() => {
    // 1. Try finding in visibleConversations
    const foundVisible = (visibleConversations || []).find(c => c.id === activeConversationId);
    if (foundVisible) return foundVisible;

    // 2. If tab is 'dms', pick the first DM strictly from visibleConversations
    if (activeTab === 'dms') {
      const firstDm = (visibleConversations || []).find(c => c.type !== 'channel');
      if (firstDm) return firstDm;
    }

    // 3. If tab is 'channels', pick the first channel strictly from visibleConversations
    if (activeTab === 'channels') {
      const firstChannel = (visibleConversations || []).find(c => c.type === 'channel');
      if (firstChannel) return firstChannel;
    }

    // 4. Default fallback strictly from visibleConversations
    return (visibleConversations || [])[0] || null;
  }, [visibleConversations, activeConversationId, activeTab]);

  const activeIsChannel = Boolean(activeConv?.type === 'channel');
  const activePartner = useMemo(() => (!activeIsChannel && activeConv ? getDmPartner(activeConv, currentUser, employees) : null), [activeIsChannel, activeConv, currentUser, employees]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'dms') {
      if (!activeConv || activeConv.type === 'channel') {
        const firstDm = (visibleConversations || []).find(c => c.type !== 'channel');
        if (firstDm) {
          setActiveConversationId(firstDm.id);
        }
      }
    } else if (newTab === 'channels') {
      if (!activeConv || activeConv.type !== 'channel') {
        const firstChannel = (visibleConversations || []).find(c => c.type === 'channel');
        if (firstChannel) {
          setActiveConversationId(firstChannel.id);
        }
      }
    }
  };

  // Auto-mark conversation as read when active or new message arrives
  useEffect(() => {
    if (activeConv?.id) {
      markConversationAsRead(activeConv.id);
    }
  }, [activeConv?.id, activeConv?.messages?.length]);

  useEffect(() => {
    const handleFocus = () => {
      if (activeConv?.id) {
        markConversationAsRead(activeConv.id);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeConv?.id]);

  // Filter conversations by active tab and search query with privacy resolution and deduplication
  const filteredConversations = useMemo(() => {
    const q = searchContact.toLowerCase().trim();
    const seenIds = new Set();
    return (visibleConversations || []).filter(c => {
      if (!c || !c.id || seenIds.has(c.id)) return false;
      seenIds.add(c.id);

      // Tab filter
      if (activeTab === 'channels' && c.type !== 'channel') return false;
      if (activeTab === 'dms' && c.type === 'channel') return false;

      // Search filter
      if (!q) return true;
      let title = '';
      let role = '';
      if (c.type === 'channel') {
        title = (c.channelName || c.name || '').toLowerCase();
        role = (c.description || '').toLowerCase();
      } else {
        const partner = getDmPartner(c, currentUser, employees);
        title = (partner?.name || c.participantName || '').toLowerCase();
        role = (partner?.role || partner?.department || c.participantRole || '').toLowerCase();
      }
      const lastMsg = (c.lastMessage || '').toLowerCase();
      return title.includes(q) || role.includes(q) || lastMsg.includes(q);
    });
  }, [visibleConversations, activeTab, searchContact, currentUser, employees]);

  // Clean and deduplicate messages to eliminate duplicate keys and repeated bubbles
  const displayMessages = useMemo(() => {
    if (!activeConv || !Array.isArray(activeConv.messages)) return [];
    const seenKeys = new Set();
    const deduped = [];
    for (const msg of activeConv.messages) {
      if (!msg) continue;
      const key = msg.id || `${msg.senderId || ''}_${msg.createdAt || ''}_${msg.text || ''}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        deduped.push(msg);
      }
    }
    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase().trim();
      return deduped.filter(msg => {
        const textMatch = msg.text && msg.text.toLowerCase().includes(q);
        const attMatch = Array.isArray(msg.attachments) && msg.attachments.some(a => a.name && a.name.toLowerCase().includes(q));
        const senderMatch = msg.senderName && msg.senderName.toLowerCase().includes(q);
        return textMatch || attMatch || senderMatch;
      });
    }
    return deduped;
  }, [activeConv?.messages, chatSearchQuery]);

  // Typing event listener & auto-reset on conversation change
  useEffect(() => {
    const handleTypingEvent = (e) => {
      const { conversationId, user, isTyping } = e.detail || {};
      if (!conversationId || conversationId !== activeConv?.id) return;
      const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || '');
      if (String(user?.id) === myId) return;

      setRemoteTypingUsers(prev => {
        const filtered = prev.filter(u => String(u.id) !== String(user?.id));
        if (isTyping) {
          return [...filtered, user];
        }
        return filtered;
      });
    };

    window.addEventListener('ems_chat_typing', handleTypingEvent);
    return () => window.removeEventListener('ems_chat_typing', handleTypingEvent);
  }, [activeConv?.id, currentUser]);

  useEffect(() => {
    setRemoteTypingUsers([]);
    setChatSearchQuery('');
    setIsChatSearchOpen(false);
    setActiveReactionPickerMsgId(null);
  }, [activeConv?.id]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (activeConv?.id) {
      emitSocketEvent('chat:typing', {
        conversationId: activeConv.id,
        user: {
          id: currentUser?._id || currentUser?.id || currentUser?.employeeCode,
          name: currentUser?.name || 'Teammate'
        },
        isTyping: true
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitSocketEvent('chat:typing', {
          conversationId: activeConv.id,
          user: {
            id: currentUser?._id || currentUser?.id || currentUser?.employeeCode,
            name: currentUser?.name || 'Teammate'
          },
          isTyping: false
        });
      }, 2000);
    }
  };

  const handleReactToMessage = (messageId, emoji) => {
    setActiveReactionPickerMsgId(null);
    if (typeof reactToChatMessage === 'function' && activeConv?.id) {
      reactToChatMessage(activeConv.id, messageId, emoji);
    }
  };

  // Smooth scroll strictly within the message stream container without jumping outer page
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [displayMessages.length, activeConv?.id]);

  // Handle file uploads (images, videos, docs)
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      const processed = [];
      for (const file of files) {
        if (file.size > 25 * 1024 * 1024) {
          addToast(`File "${file.name}" is over 25MB limit`, 'warning');
          continue;
        }
        const item = await processFileForChat(file);
        processed.push(item);
      }
      setPendingAttachments(prev => [...prev, ...processed]);
    } catch (err) {
      console.error('File upload error:', err);
      addToast('Error processing file attachment', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePendingAttachment = (index) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSendingRef.current) return;
    if ((!inputText.trim() && pendingAttachments.length === 0) || !activeConv) return;

    isSendingRef.current = true;
    setIsSending(true);

    const attachmentsToSend = [...pendingAttachments];
    const textToSend = inputText;

    setInputText('');
    setPendingAttachments([]);
    setShowEmojiPicker(false);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (activeConv?.id) {
      emitSocketEvent('chat:typing', {
        conversationId: activeConv.id,
        user: {
          id: currentUser?._id || currentUser?.id || currentUser?.employeeCode,
          name: currentUser?.name || 'Teammate'
        },
        isTyping: false
      });
    }

    try {
      sendMessage(activeConv.id, textToSend, attachmentsToSend);
    } finally {
      setTimeout(() => {
        isSendingRef.current = false;
        setIsSending(false);
      }, 600);
    }
  };

  const addEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const getDocBadgeIcon = (filename = '') => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText size={18} className="text-red-500 shrink-0" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={18} className="text-emerald-500 shrink-0" />;
    if (['doc', 'docx'].includes(ext)) return <FileText size={18} className="text-blue-500 shrink-0" />;
    if (['zip', 'rar', '7z'].includes(ext)) return <Archive size={18} className="text-amber-500 shrink-0" />;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py'].includes(ext)) return <FileCode size={18} className="text-purple-500 shrink-0" />;
    return <FileText size={18} className="text-slate-400 shrink-0" />;
  };

  const isCurrentSender = (msg) => {
    if (!msg || !currentUser) return false;
    const myIdentifiers = [
      currentUser._id,
      currentUser.id,
      currentUser.employeeCode,
      currentUser.email
    ].filter(Boolean).map(id => String(id).toLowerCase().trim());

    const msgSenderIds = [
      msg.senderId,
      msg.senderCode,
      msg.senderEmail
    ].filter(Boolean).map(id => String(id).toLowerCase().trim());

    return msgSenderIds.some(id => myIdentifiers.includes(id));
  };

  const isMessageReadByOther = (msg) => {
    if (!msg) return false;
    const readList = Array.isArray(msg.readBy) ? msg.readBy : [];

    const senderIds = [
      msg.senderId,
      msg.senderCode,
      msg.senderEmail,
      currentUser?._id,
      currentUser?.id,
      currentUser?.employeeCode,
      currentUser?.email
    ].filter(Boolean).map(s => String(s).toLowerCase().trim());

    return readList.some(reader => {
      const r = String(reader).toLowerCase().trim();
      return r && !senderIds.includes(r);
    });
  };

  // Live partner shift state in 1-on-1 direct messages
  const partnerShiftState = useMemo(() => {
    if (!activeConv || activeConv.type === 'channel') return null;
    const partner = getDmPartner(activeConv, currentUser, employees);
    if (!partner) return null;

    const empKey = partner.employeeCode || (partner._id ? String(partner._id) : '');
    const today = getLocalDateString();
    const hrAttendance = (attendance || []).find(a =>
      a.date === today && (
        String(a.employeeId) === String(partner._id) ||
        String(a.employeeCode) === String(partner.employeeCode) ||
        (empKey && (String(a.employeeCode) === String(empKey) || String(a.employeeId) === String(empKey)))
      )
    );

    const isPartnerClockedIn = Boolean(
      (hrAttendance && !hrAttendance.outTime && hrAttendance.inTime && hrAttendance.status !== 'absent' && hrAttendance.status !== 'on_leave') ||
      (typeof localStorage !== 'undefined' && (
        localStorage.getItem(`ems_timer_${partner.employeeCode}_is_clocked_in`) === 'true' ||
        localStorage.getItem(`ems_timer_${partner._id}_is_clocked_in`) === 'true'
      ))
    );

    const isPartnerOnBreak = Boolean(
      typeof localStorage !== 'undefined' && (
        localStorage.getItem(`ems_timer_${partner.employeeCode}_is_on_break`) === 'true' ||
        localStorage.getItem(`ems_timer_${partner._id}_is_on_break`) === 'true'
      )
    );

    const breakType = (typeof localStorage !== 'undefined' && (
      localStorage.getItem(`ems_timer_${partner.employeeCode}_break_type`) ||
      localStorage.getItem(`ems_timer_${partner._id}_break_type`)
    )) || 'Break';

    return {
      isClockedIn: isPartnerClockedIn,
      isOnBreak: isPartnerOnBreak,
      breakType,
      partner
    };
  }, [activeConv, currentUser, employees, attendance]);

  // Synchronize active screen share across users & tabs
  const screenShareKey = activeConv?.id ? `ems_screenshare_${activeConv.id}` : null;
  const [activeScreenShare, setActiveScreenShare] = useState(null);

  const syncScreenShare = useCallback(() => {
    if (!screenShareKey || typeof localStorage === 'undefined') {
      setActiveScreenShare(null);
      return;
    }
    try {
      const raw = localStorage.getItem(screenShareKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (Date.now() - (parsed.startedAt || 0) < 6 * 3600 * 1000)) {
          setActiveScreenShare(parsed);
          return;
        }
      }
    } catch {}
    setActiveScreenShare(null);
  }, [screenShareKey]);

  useEffect(() => {
    syncScreenShare();
    const handleSync = (e) => {
      if (!e.detail || e.detail.key === screenShareKey) syncScreenShare();
    };
    const handleNative = (e) => {
      if (!e.key || e.key === screenShareKey) syncScreenShare();
    };
    window.addEventListener('hrms_storage_change', handleSync);
    window.addEventListener('storage', handleNative);

    // Cross-device / multi-browser live socket sync for screen sharing
    const unsubScreenStarted = subscribeSocketEvent('screen:started', (data) => {
      if (!data) return;
      if (String(data.conversationId) === String(activeConv?.id)) {
        setActiveScreenShare({
          hostId: data.host?.id,
          hostName: data.host?.name || 'Teammate',
          hostAvatar: data.host?.avatar || '',
          hostRole: data.host?.role || 'Team Member',
          convId: data.conversationId,
          startedAt: data.startedAt || Date.now()
        });
      }
    });

    const unsubScreenStopped = subscribeSocketEvent('screen:stopped', (data) => {
      if (!data) return;
      const stoppedConvId = String(data.conversationId);
      if (stoppedConvId === String(activeConv?.id)) {
        setActiveScreenShare(null);
      }
      const activeSessionId = String(screenShareSessionConv?.id || screenShareSessionData?.convId || '');
      if (!isScreenShareHost && activeSessionId && activeSessionId === stoppedConvId) {
        setIsScreenShareOpen(false);
        setScreenShareSessionConv(null);
        setScreenShareSessionData(null);
      }
    });

    return () => {
      window.removeEventListener('hrms_storage_change', handleSync);
      window.removeEventListener('storage', handleNative);
      unsubScreenStarted();
      unsubScreenStopped();
    };
  }, [screenShareKey, syncScreenShare, activeConv?.id, isScreenShareHost, screenShareSessionConv?.id, screenShareSessionData?.convId]);

  // Auto-connect viewer stream if navigated from global IncomingScreenShareModal
  useEffect(() => {
    try {
      const pendingRaw = sessionStorage.getItem('ems_pending_watch_screen');
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (pending && pending.conversationId) {
          if (String(activeConversationId) !== String(pending.conversationId)) {
            setActiveConversationId(pending.conversationId);
          }
          if (!activeConv || String(pending.conversationId) === String(activeConv.id)) {
            sessionStorage.removeItem('ems_pending_watch_screen');
            const sessionData = {
              hostId: pending.host?.id,
              hostName: pending.host?.name || 'Teammate',
              hostAvatar: pending.host?.avatar || '',
              hostRole: pending.host?.role || 'Team Member',
              convId: pending.conversationId,
              startedAt: pending.startedAt || Date.now()
            };
            setActiveScreenShare(sessionData);
            setScreenShareSessionData(sessionData);
            setScreenShareSessionConv(activeConv);
            setIsScreenShareHost(false);
            setIsScreenShareOpen(true);
          }
        }
      }
    } catch (_) {}
  }, [activeConv?.id, activeConversationId]);

  // Screen share controls
  const startScreenShare = async () => {
    if (!isClockedIn) {
      addToast('🔒 Shift Clock-In Required: You must clock into your shift to share your screen.', 'warning');
      return;
    }
    if (isOnBreak) {
      addToast('☕ Screen sharing is paused while on break.', 'warning');
      return;
    }
    if (!canScreenShare(currentUser)) {
      addToast('Screen share is disabled for your role.', 'error');
      return;
    }
    if (!isSocketConnected()) {
      addToast('📡 Real-time signaling server is currently reconnecting. Screen share will resume once connected.', 'warning');
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        addToast('Screen sharing is not supported by your browser.', 'error');
        return;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true
        });
      } catch (displayErr) {
        if (displayErr.name === 'NotAllowedError') throw displayErr;
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
      }

      setScreenStream(stream);
      setIsScreenShareHost(true);
      setIsScreenShareOpen(true);
      setScreenShareSessionConv(activeConv);

      const targetPartner = !activeIsChannel ? getDmPartner(activeConv, currentUser, employees) : null;
      const targetUserId = targetPartner?._id || targetPartner?.id;
      const targetEmployeeCode = targetPartner?.employeeCode;
      const targetEmail = targetPartner?.email;

      const sessionData = {
        hostId: String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || 'host'),
        hostName: currentUser?.name || 'Teammate',
        hostAvatar: currentUser?.avatar || '',
        hostRole: currentUser?.role || 'Team Member',
        convId: activeConv.id,
        startedAt: Date.now()
      };
      setScreenShareSessionData(sessionData);
      if (screenShareKey && typeof localStorage !== 'undefined') {
        localStorage.setItem(screenShareKey, JSON.stringify(sessionData));
        setActiveScreenShare(sessionData);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: screenShareKey } }));
      }

      emitSocketEvent('screen:start', {
        conversationId: activeConv.id,
        host: {
          id: sessionData.hostId,
          name: sessionData.hostName,
          avatar: sessionData.hostAvatar,
          role: sessionData.hostRole
        },
        targetUserId,
        targetEmployeeCode,
        targetEmail,
        isChannel: activeIsChannel,
        channelName: activeConv?.channelName || activeConv?.name || '',
        startedAt: sessionData.startedAt
      });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      if (activeConv) {
        sendMessage(activeConv.id, `🖥️ Started live screen share session.`);
      }
      addToast('🖥️ Live Screen Sharing started', 'success');
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('Error starting screen share:', err);
        addToast('Failed to start screen share.', 'error');
      }
    }
  };

  const stopScreenShare = () => {
    const sessionConv = screenShareSessionConv || activeConv;
    const sessionData = screenShareSessionData || activeScreenShare;
    const targetPartner = !activeIsChannel ? getDmPartner(sessionConv, currentUser, employees) : null;
    const targetUserId = targetPartner?._id || targetPartner?.id;
    const targetEmployeeCode = targetPartner?.employeeCode;

    const startedAt = sessionData?.startedAt || Date.now();
    const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    emitSocketEvent('screen:stop', {
      conversationId: sessionConv?.id,
      targetUserId,
      targetEmployeeCode,
      durationSeconds,
      durationText
    });

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsScreenShareHost(false);
    setIsScreenShareOpen(false);
    setScreenShareSessionConv(null);
    setScreenShareSessionData(null);

    const sKey = sessionConv?.id ? `ems_screenshare_${sessionConv.id}` : screenShareKey;
    if (sKey && typeof localStorage !== 'undefined') {
      localStorage.removeItem(sKey);
      setActiveScreenShare(null);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: sKey } }));
    }

    if (activeConv) {
      sendMessage(activeConv.id, `⏹️ Live screen share session ended.`);
    }
    addToast('Screen share stopped', 'info');
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeConv?.id || !messageId) return;
    const ok = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? It will be removed for everyone in this conversation.',
      confirmText: 'Delete for Everyone',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await deleteMessage(activeConv.id, messageId);
      addToast('Message deleted', 'info');
    } catch {
      addToast('Failed to delete message', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-2.5 h-[calc(100vh-105px)] max-h-[calc(100vh-105px)] select-none overflow-hidden">

      {/* Top Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-[#101b33] p-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs min-h-[58px] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-200/80 dark:border-blue-900/60 shadow-xs">
            <MessageSquare size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                Team Chat & Workspace Channels
              </h1>
              <span className="text-[10px] py-0.5 px-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800/80">
                ● Live DB Sync
              </span>
            </div>
            <p className="m-0 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Department channels, private direct messages, photos, videos & project files
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-[32px] rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 text-xs font-bold cursor-pointer shadow-xs transition-all"
            title="View Calls & Screen Sharing History (MongoDB Atlas)"
          >
            <History size={14} />
            <span>Call & Screen History</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewConvOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 h-[32px] rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 text-xs font-bold cursor-pointer shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>New Chat / Channel</span>
          </button>
        </div>
      </div>

      {/* Main Chat Layout Container */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[290px_1fr] bg-white dark:bg-[#101b33] rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">

        {/* ── Left Sidebar: Conversations & Channels ── */}
        <div className={`border-r border-slate-200/80 dark:border-slate-800 flex flex-col bg-slate-50/80 dark:bg-[#0c1427] h-full min-h-0 overflow-hidden ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>

          {/* Search Bar */}
          <div className="p-2.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c1427] shrink-0">
            <div className="flex items-center gap-2 px-2.5 h-[32px] rounded-lg border border-slate-300/80 dark:border-slate-700/80 bg-white dark:bg-[#111c35] focus-within:border-blue-500 dark:focus-within:border-sky-500 transition-colors">
              <Search size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search channels or contacts..."
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
                className="border-0 bg-transparent outline-none text-[12px] w-full text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* Segmented Filter Switcher */}
          <div className="flex p-1.5 gap-1 border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-100/60 dark:bg-[#0f1930] text-xs shrink-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'channels', label: '🏢 Channels' },
              { id: 'dms', label: '💬 DMs' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 py-1 px-2 rounded-md font-bold text-[11px] transition-all border-0 cursor-pointer text-center ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#1a2744] text-blue-600 dark:text-sky-300 shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversations List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-1.5 flex flex-col gap-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400 text-center">
                <MessageSquare size={26} className="text-slate-300 dark:text-slate-600 mb-1.5" />
                <span className="text-xs font-semibold">No chats found</span>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = activeConv?.id === conv.id;
                const isChannel = conv.type === 'channel';
                const partner = !isChannel ? getDmPartner(conv, currentUser, employees) : null;
                const displayName = isChannel ? (conv.channelName || conv.name) : (partner?.name || conv.participantName || 'Colleague');
                const displayAvatar = isChannel ? null : (partner?.avatar || conv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100');
                const unreadCount = getUnreadCountForUser(conv, currentUser);

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setMobileShowChat(true);
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-[#16223e] border-blue-200 dark:border-blue-900/60 shadow-xs border-l-3 border-l-blue-600 dark:border-l-sky-400'
                        : 'bg-white dark:bg-[#101a2e]/60 border-transparent hover:bg-slate-100 dark:hover:bg-[#15223c] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {/* Avatar / Channel Hash Icon */}
                    <div className="relative shrink-0">
                      {isChannel ? (
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-sm ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-slate-700'
                        }`}>
                          <Hash size={17} />
                        </div>
                      ) : (
                        <>
                          <img
                            src={displayAvatar}
                            alt={displayName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c1427]" />
                        </>
                      )}
                    </div>

                    {/* Meta & Last Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[12.5px] truncate ${
                          isSelected
                            ? 'font-extrabold text-blue-900 dark:text-sky-200'
                            : 'font-semibold text-slate-800 dark:text-slate-200'
                        }`}>
                          {displayName}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 ml-1">
                          {conv.lastMessageTime || ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-0.5 gap-1.5">
                        <div className={`text-[11px] truncate flex-1 ${
                          isSelected
                            ? 'text-blue-700 dark:text-sky-300/90 font-medium'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {conv.lastMessage || 'No messages yet'}
                        </div>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] min-w-[18px] text-center shadow-xs shrink-0 animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Side: Active Chat Window ── */}
        <div className={`flex flex-col bg-white dark:bg-[#0e172c] h-full min-h-0 overflow-hidden ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>

          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-slate-400 dark:text-slate-500">
              <MessageSquare size={36} className="text-slate-300 dark:text-slate-600" />
              <div className="text-sm font-semibold">Select a conversation or channel to chat</div>
            </div>
          ) : (() => {
            const headerTitle = activeIsChannel ? (activeConv.channelName || activeConv.name) : (activePartner?.name || activeConv.participantName);
            const headerAvatar = activePartner?.avatar || activeConv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
            const headerSubtitle = activeIsChannel
              ? (activeConv.description || 'Workspace Group Thread')
              : `${activePartner?.role || activeConv.participantRole || 'Team Member'} • ${activePartner?.department || activeConv.participantDepartment || 'General'}`;

            return (
              <>
                {/* Chat Header */}
                <div className="p-3 px-3 sm:px-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#111c35] shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      className="md:hidden inline-flex items-center gap-0.5 text-xs font-bold text-blue-600 dark:text-sky-400 py-1 px-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer -ml-1 shrink-0"
                      title="Back to conversation list"
                    >
                      <ChevronLeft size={18} />
                      <span className="hidden sm:inline">Back</span>
                    </button>
                    {activeIsChannel ? (
                      <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                        <Hash size={19} />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <img
                          src={headerAvatar}
                          alt={headerTitle}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#111c35] ${
                          partnerShiftState?.isClockedIn ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="text-[13.5px] font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                        <span>{headerTitle}</span>
                        {activeIsChannel && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-900/60">
                            Channel
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {headerSubtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* 1-Click WhatsApp-Style Call / Huddle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('ems_trigger_voice_call', {
                          detail: { conversationId: activeConv?.id }
                        }));
                      }}
                      disabled={!isClockedIn || isOnBreak || (!activeIsChannel && (!partnerShiftState?.isClockedIn || partnerShiftState?.isOnBreak))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        !isClockedIn || isOnBreak || (!activeIsChannel && (!partnerShiftState?.isClockedIn || partnerShiftState?.isOnBreak))
                          ? 'bg-slate-100 dark:bg-[#192644] opacity-50 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      }`}
                      title={
                        !isClockedIn
                          ? 'Clock into shift to call'
                          : isOnBreak
                          ? 'Cannot call while on break'
                          : !activeIsChannel && !partnerShiftState?.isClockedIn
                          ? `${activePartner?.name || 'Partner'} is clocked out`
                          : activeIsChannel
                          ? 'Start Channel Voice Huddle'
                          : `Voice call ${activePartner?.name || 'Partner'}`
                      }
                    >
                      <Phone size={13.5} />
                      <span className="hidden sm:inline">{activeIsChannel ? 'Huddle' : 'Call'}</span>
                    </button>

                    {/* In-Chat Message Search Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsChatSearchOpen(prev => !prev);
                        if (isChatSearchOpen) setChatSearchQuery('');
                      }}
                      className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                        isChatSearchOpen
                          ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-sky-300 border-blue-300 dark:border-blue-800'
                          : 'bg-slate-100 dark:bg-[#192644] hover:bg-slate-200 dark:hover:bg-[#203157] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                      title="Search in this chat"
                    >
                      <Search size={13.5} />
                      <span className="hidden lg:inline">Find</span>
                    </button>

                    {/* Screen Share Button */}
                    <button
                      type="button"
                      onClick={screenStream ? () => setIsScreenShareOpen(true) : startScreenShare}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        screenStream
                          ? 'bg-rose-500 text-white border-rose-600 shadow-md animate-pulse'
                          : 'bg-slate-100 dark:bg-[#192644] hover:bg-slate-200 dark:hover:bg-[#203157] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                      title={screenStream ? 'View active screen share' : 'Share your screen with team'}
                    >
                      <Monitor size={14} className={screenStream ? 'text-white' : 'text-blue-500'} />
                      <span className="hidden sm:inline">{screenStream ? 'Screen LIVE' : 'Share Screen'}</span>
                    </button>

                    <button
                      onClick={() => setIsNewConvOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#192644] hover:bg-slate-200 dark:hover:bg-[#203157] text-slate-700 dark:text-slate-200 border-0 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Plus size={14} />
                      <span>New Chat</span>
                    </button>
                  </div>
                </div>

                {/* In-Chat Search Bar */}
                {isChatSearchOpen && (
                  <div className="p-2.5 px-4 bg-blue-50/80 dark:bg-[#131e38] border-b border-blue-200/60 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Search size={14} className="text-blue-500 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search messages, links, files in this conversation..."
                        value={chatSearchQuery}
                        onChange={e => setChatSearchQuery(e.target.value)}
                        autoFocus
                        className="flex-1 bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                      />
                    </div>
                    {chatSearchQuery && (
                      <span className="text-[11px] font-bold text-blue-600 dark:text-sky-400 shrink-0">
                        {displayMessages.length} match{displayMessages.length === 1 ? '' : 'es'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setChatSearchQuery('');
                        setIsChatSearchOpen(false);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer border-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Live Voice Huddle & Walkie-Talkie Intercom Bar */}
                <LiveVoiceHuddleBar
                  activeConv={activeConv}
                  currentUser={currentUser}
                  activePartner={activePartner}
                  partnerShiftState={partnerShiftState}
                  isChannel={activeIsChannel}
                  employees={employees}
                  sendMessage={sendMessage}
                />

                {/* Incoming Screen Share Alert Banner for Viewers */}
                {activeScreenShare && String(activeScreenShare.hostId) !== String(currentUser?._id || currentUser?.id || currentUser?.employeeCode) && (
                  <div className="shrink-0 p-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-xs border-b border-indigo-400/30 animate-fadeIn">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0" />
                      <Monitor size={16} className="text-white shrink-0" />
                      <div className="min-w-0 text-xs">
                        <span className="font-extrabold">{activeScreenShare.hostName}</span>
                        <span className="opacity-90 ml-1">is sharing their screen live in this chat</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsScreenShareHost(false);
                        setScreenShareSessionConv(activeConv);
                        setScreenShareSessionData(activeScreenShare);
                        setIsScreenShareOpen(true);
                      }}
                      className="px-3 py-1 rounded-lg bg-white text-indigo-700 hover:bg-slate-100 font-extrabold text-xs cursor-pointer border-0 shadow-sm flex items-center gap-1.5 transition-transform hover:scale-105 shrink-0"
                    >
                      <Eye size={13} />
                      <span>Watch Stream</span>
                    </button>
                  </div>
                )}

                {/* Message Stream */}
                <div ref={messageContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 bg-slate-100/50 dark:bg-[#0b1329]">
                  {displayMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center mb-2 border border-blue-200/50 dark:border-blue-900/40 shadow-xs">
                        <Sparkles size={22} />
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Start of conversation</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">Send a greeting, photo, video, or project document below.</div>
                    </div>
                  ) : (
                    displayMessages.map((msg, idx) => {
                      const outgoing = isCurrentSender(msg);
                      const itemKey = msg.id ? `${msg.id}_${idx}` : `msg_${idx}`;

                      return (
                        <div
                          key={itemKey}
                          className={`group flex flex-col max-w-[78%] sm:max-w-[68%] ${outgoing ? 'self-end' : 'self-start'}`}
                        >
                          {/* Sender Label for Incoming or Channel Messages */}
                          {!outgoing && (
                            <div className="flex items-center gap-1.5 mb-1 ml-1">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                {msg.senderName || activePartner?.name || activeConv.participantName}
                              </span>
                              {msg.senderRole && (
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                                  {msg.senderRole}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bubble Container */}
                          <div className={`p-3 px-4 text-[13px] leading-relaxed shadow-xs ${
                            outgoing
                              ? 'rounded-2xl rounded-tr-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                              : 'rounded-2xl rounded-tl-xs bg-white dark:bg-[#1a2744] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700/80 shadow-xs'
                          }`}>
                            {/* Text Content */}
                            {msg.text && (
                              <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                            )}

                            {/* Attachments Section */}
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className={`flex flex-col gap-2 ${msg.text ? 'mt-2.5 pt-2 border-t' : ''} ${
                                outgoing ? 'border-white/20' : 'border-slate-100 dark:border-slate-700'
                              }`}>
                                {msg.attachments.map((att, aIdx) => (
                                 <div key={att.id ? `${att.id}_${aIdx}` : `att_${aIdx}`} className="overflow-hidden">
                                    {/* Photo Attachment */}
                                    {att.category === 'image' && (
                                      <LazyChatImage
                                        att={att}
                                        conversationId={activeConv?.id}
                                        onOpen={(a) => setViewerAttachment({ ...a, conversationId: activeConv?.id })}
                                      />
                                    )}

                                    {/* Video Attachment */}
                                    {att.category === 'video' && (
                                      <div className="max-w-sm rounded-lg overflow-hidden bg-black shadow-sm">
                                        <video
                                          controls
                                          playsInline
                                          src={att.dataUrl}
                                          className="max-h-56 w-full rounded-lg"
                                        />
                                      </div>
                                    )}

                                    {/* Audio Voice Memo Attachment */}
                                    {att.category === 'audio' && (
                                      <VoiceMemoPlayer attachment={att} isOutgoing={outgoing} />
                                    )}

                                    {/* Document Attachment */}
                                    {att.category === 'document' && (
                                      <div className={`flex items-center justify-between gap-3 p-2.5 px-3 rounded-lg border transition-colors ${
                                        outgoing
                                          ? 'bg-white/15 border-white/25 text-white'
                                          : 'bg-slate-50 dark:bg-[#121c33] border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                                      }`}>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {getDocBadgeIcon(att.name)}
                                          <div className="min-w-0">
                                            <div className="font-bold text-xs truncate max-w-[180px] sm:max-w-xs">{att.name}</div>
                                            <div className="text-[10px] opacity-75">{att.sizeFormatted || 'Document'}</div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => downloadChatAttachment(att, activeConv?.id)}
                                            className="w-7 h-7 rounded-md bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer border-0 text-current"
                                            title="Download file"
                                          >
                                            <Download size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Message Reactions Pills */}
                          {Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${outgoing ? 'self-end' : 'self-start'}`}>
                              {msg.reactions.map((r, rIdx) => {
                                const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || '');
                                const hasReacted = (r.users || []).some(u => String(u?.id || u) === myId);
                                return (
                                  <button
                                    key={rIdx}
                                    type="button"
                                    onClick={() => handleReactToMessage(msg.id, r.emoji)}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer transition-transform hover:scale-105 shadow-2xs ${
                                      hasReacted
                                        ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                    title={(r.users || []).map(u => u.name || 'Teammate').join(', ')}
                                  >
                                    <span>{r.emoji}</span>
                                    <span className="text-[10px] font-extrabold">{r.users?.length || 1}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Timestamp & Read Receipt Status & Reaction & Delete Action */}
                          <div className={`text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5 ${outgoing ? 'self-end' : 'self-start'}`}>
                            <span>{msg.timestamp || 'Just now'}</span>
                            {outgoing && (
                              isMessageReadByOther(msg) ? (
                                <span title={activeIsChannel ? 'Seen by channel members' : `Seen by ${activePartner?.name || 'recipient'}`} className="inline-flex items-center text-blue-500 dark:text-sky-400">
                                  <CheckCheck size={13.5} strokeWidth={2.2} />
                                </span>
                              ) : (
                                <span title="Sent (Delivered, not yet seen)" className="inline-flex items-center text-slate-400 dark:text-slate-500">
                                  <Check size={13.5} strokeWidth={2.2} />
                                </span>
                              )
                            )}

                            {/* Emoji Reaction Trigger */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveReactionPickerMsgId(prev => prev === msg.id ? null : msg.id)}
                                className="opacity-75 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 border-0 cursor-pointer"
                                title="Add reaction"
                              >
                                <Smile size={11.5} />
                              </button>

                              {/* Emoji Reaction Popover */}
                              {activeReactionPickerMsgId === msg.id && (
                                <div
                                  className={`absolute z-30 bottom-full mb-1 flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-lg animate-fadeIn ${
                                    outgoing ? 'right-0' : 'left-0'
                                  }`}
                                >
                                  {['👍', '❤️', '😂', '🎉', '🔥'].map(emoji => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => handleReactToMessage(msg.id, emoji)}
                                      className="text-sm p-1 hover:scale-130 transition-transform bg-transparent border-0 cursor-pointer"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {(outgoing || currentUser?.role === 'admin' || currentUser?.isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="opacity-75 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 border-0 cursor-pointer ml-1"
                                title="Delete message for everyone"
                              >
                                <Trash2 size={11.5} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ── Pending Attachments Preview Tray ── */}
                {pendingAttachments.length > 0 && (
                  <div className="p-2.5 px-4 bg-slate-100/90 dark:bg-[#131e38] border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2.5 overflow-x-auto shrink-0">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Attached:</span>
                    {pendingAttachments.map((att, idx) => (
                      <div
                        key={att.id || idx}
                        className="flex items-center gap-2 p-1.5 px-2.5 bg-white dark:bg-[#1b2947] rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 max-w-xs"
                      >
                        {att.category === 'image' ? (
                          <img src={att.dataUrl} alt={att.name} className="w-6 h-6 rounded object-cover" />
                        ) : (
                          getDocBadgeIcon(att.name)
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate max-w-[120px] text-slate-800 dark:text-slate-100">{att.name}</div>
                          <div className="text-[10px] text-slate-400">{att.sizeFormatted}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingAttachment(idx)}
                          className="w-5 h-5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 flex items-center justify-center cursor-pointer border-0 ml-1 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Emoji Bar (Toggleable) ── */}
                {showEmojiPicker && (
                  <div className="px-4 py-2 bg-slate-50 dark:bg-[#131e38] border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold mr-1">Quick Reaction:</span>
                    {['👍', '❤️', '🎉', '🔥', '🚀', '👏', '😊', '💡', '✅', '🙌'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => addEmoji(emoji)}
                        className="text-lg hover:scale-125 transition-transform bg-transparent border-0 cursor-pointer p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Live Remote Typing Indicator Banner */}
                {remoteTypingUsers.length > 0 && (
                  <div className="px-4 py-1.5 bg-slate-50 dark:bg-[#0d1527] border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0 animate-fadeIn">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {remoteTypingUsers.map(u => u.name || 'Teammate').join(', ')} {remoteTypingUsers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                )}

                {/* Privacy & Recipient Confirmation Indicator */}
                <div className={`px-4 py-2 border-t text-xs flex items-center justify-between select-none shrink-0 ${
                  activeIsChannel
                    ? 'bg-slate-50 dark:bg-[#0c1427] border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold truncate">
                    {activeIsChannel ? (
                      <>
                        <Hash size={14} className="text-blue-600 dark:text-sky-400 shrink-0" />
                        <span>Channel Broadcast: Posting to <strong>{headerTitle}</strong> (All channel members will receive this)</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Private Direct Message: Sharing strictly with <strong>{headerTitle}</strong> (Never visible in General)</span>
                      </>
                    )}
                  </div>
                  {!activeIsChannel && (
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 font-extrabold border border-emerald-300 dark:border-emerald-700 shrink-0">
                      Private DM
                    </span>
                  )}
                </div>

                {/* ── Chat Input Bar (Permanently Sticky & Shift-Gated) ── */}
                <form
                  onSubmit={handleSend}
                  className="p-2 sm:p-3 px-2.5 sm:px-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-[#111c35] shrink-0"
                >
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.txt,.json,.ppt,.pptx"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-300 cursor-pointer transition-all shadow-xs shrink-0"
                    title="Attach Photo, Video, Document or Code file"
                  >
                    <Paperclip size={18} className="rotate-45" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all border shadow-xs shrink-0 ${
                      showEmojiPicker
                        ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400/40'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400'
                    }`}
                    title="Quick Reactions, Stickers & Emojis"
                  >
                    <Smile size={18} />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                      pendingAttachments.length > 0
                        ? `Add caption and press Send...`
                        : activeIsChannel
                        ? `Message #${headerTitle}...`
                        : `Message ${headerTitle}...`
                    }
                    value={inputText}
                    onChange={handleInputChange}
                    className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-[12.5px] sm:text-[13px] outline-none bg-slate-50 dark:bg-[#0c1427] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:border-blue-600 dark:focus:border-sky-400 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium min-w-0"
                  />

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && pendingAttachments.length === 0) || isSending}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all border-0 shrink-0 ${
                      inputText.trim() || pendingAttachments.length > 0
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer shadow-md shadow-blue-600/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Modals ── */}
      <NewConversationModal
        isOpen={isNewConvOpen}
        onClose={() => setIsNewConvOpen(false)}
      />

      <ChatMediaViewerModal
        isOpen={!!viewerAttachment}
        attachment={viewerAttachment}
        conversationId={activeConv?.id}
        onClose={() => setViewerAttachment(null)}
      />

      <ScreenShareModal
        isOpen={isScreenShareOpen}
        onClose={() => {
          setIsScreenShareOpen(false);
          setScreenShareSessionConv(null);
          setScreenShareSessionData(null);
        }}
        activeConv={screenShareSessionConv || activeConv}
        currentUser={currentUser}
        stream={screenStream}
        isHost={isScreenShareHost}
        hostInfo={screenShareSessionData || activeScreenShare}
        targetUserId={!activeIsChannel ? getDmPartner(screenShareSessionConv || activeConv, currentUser, employees)?._id : null}
        onStopSharing={stopScreenShare}
      />

      <CallAndScreenHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentUser={currentUser}
        activeConv={activeConv}
      />
    </div>
  );
};
