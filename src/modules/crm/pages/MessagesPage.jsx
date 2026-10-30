/**
 * @file MessagesPage.jsx
 * @description Enterprise Team Chat & Collaboration Hub with Channels, Direct Messages,
 * and Rich Media & Document Sharing (Photos, Videos, PDFs, Sheets, Code, Archives).
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
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
  Maximize2
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useHR } from '../../hr/context/HRContext';
import { NewConversationModal } from '../components/messages/NewConversationModal';
import { ChatMediaViewerModal } from '../components/messages/ChatMediaViewerModal';
import { processFileForChat, downloadChatAttachment } from '../utils/chatMediaUtils';
import { useToast } from '../../../shared/context/ToastContext';

export const MessagesPage = () => {
  const { conversations, activeConversationId, setActiveConversationId, sendMessage } = useCRM();
  const { currentUser } = useHR();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'channels' | 'dms'
  const [searchContact, setSearchContact] = useState('');
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isNewConvOpen, setIsNewConvOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const activeConv = useMemo(() => {
    return (conversations || []).find(c => c.id === activeConversationId) || conversations?.[0] || null;
  }, [conversations, activeConversationId]);

  // Filter conversations by active tab and search query
  const filteredConversations = useMemo(() => {
    const q = searchContact.toLowerCase().trim();
    return (conversations || []).filter(c => {
      // Tab filter
      if (activeTab === 'channels' && c.type !== 'channel') return false;
      if (activeTab === 'dms' && c.type === 'channel') return false;

      // Search filter
      if (!q) return true;
      const title = (c.channelName || c.name || c.participantName || '').toLowerCase();
      const role = (c.participantRole || c.description || '').toLowerCase();
      const lastMsg = (c.lastMessage || '').toLowerCase();
      return title.includes(q) || role.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, activeTab, searchContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

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
    e.preventDefault();
    if ((!inputText.trim() && pendingAttachments.length === 0) || !activeConv) return;

    sendMessage(activeConv.id, inputText, pendingAttachments);
    setInputText('');
    setPendingAttachments([]);
    setShowEmojiPicker(false);
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
    const curId = currentUser?._id || currentUser?.employeeCode;
    return msg.senderId === curId || msg.senderCode === curId || (currentUser?.email && msg.senderEmail === currentUser.email);
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-110px)] select-none">

      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-xs min-h-[68px] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/50">
            <MessageSquare size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="m-0 text-base font-extrabold text-slate-900 dark:text-slate-50 leading-tight">
                Team Chat & Workspace Channels
              </h1>
              <span className="text-[10px] py-0.5 px-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800">
                ● Live Sync Active
              </span>
            </div>
            <p className="m-0 mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
              Direct messages, department channels (#general, #it-tech, #marketing), media & file attachments
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewConvOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 h-[32px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs font-bold cursor-pointer shadow-sm transition-colors"
        >
          <Plus size={15} />
          <span>New Chat / Channel</span>
        </button>
      </div>

      {/* Main Chat Layout Container */}
      <div className="flex-1 grid grid-cols-[300px_1fr] bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">

        {/* ── Left Sidebar: Conversations & Channels ── */}
        <div className="border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-900">

          {/* Search Bar */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 px-2.5 h-[32px] rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <Search size={14} className="text-slate-400 dark:text-sky-400 shrink-0" />
              <input
                type="text"
                placeholder="Search channels or contacts..."
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
                className="border-0 bg-transparent outline-none text-[12.5px] w-full text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex p-2 gap-1 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900 text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'channels', label: '🏢 Channels' },
              { id: 'dms', label: '💬 Direct Messages' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1 px-2.5 rounded-md font-bold text-[11px] transition-colors border-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400 text-center">
                <MessageSquare size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
                <span className="text-xs font-semibold">No chats found</span>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = activeConv?.id === conv.id;
                const isChannel = conv.type === 'channel';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {/* Avatar / Hash Icon */}
                    <div className="relative shrink-0">
                      {isChannel ? (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-slate-700'
                        }`}>
                          <Hash size={18} />
                        </div>
                      ) : (
                        <>
                          <img
                            src={conv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={conv.participantName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        </>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[13px] truncate ${isSelected ? 'font-extrabold text-blue-900 dark:text-sky-200' : 'font-bold text-slate-800 dark:text-slate-100'}`}>
                          {isChannel ? conv.channelName || conv.name : conv.participantName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                          {conv.lastMessageTime || ''}
                        </span>
                      </div>

                      <div className={`text-[11.5px] truncate mt-0.5 ${
                        isSelected ? 'text-blue-700 dark:text-sky-300 font-medium' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {conv.lastMessage || 'No messages yet'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Side: Active Chat Window ── */}
        <div className="flex flex-col bg-white dark:bg-slate-900">

          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-slate-400">
              <MessageSquare size={36} className="text-slate-300 dark:text-slate-600" />
              <div className="text-sm font-semibold">Select a conversation or channel to chat</div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3 min-w-0">
                  {activeConv.type === 'channel' ? (
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                      <Hash size={20} />
                    </div>
                  ) : (
                    <div className="relative shrink-0">
                      <img
                        src={activeConv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={activeConv.participantName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                      <span>{activeConv.type === 'channel' ? activeConv.channelName || activeConv.name : activeConv.participantName}</span>
                      {activeConv.type === 'channel' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300">
                          Channel
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                      {activeConv.type === 'channel'
                        ? activeConv.description || 'Workspace Group Thread'
                        : `${activeConv.participantRole || 'Team Member'} • ${activeConv.participantDepartment || 'General'}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsNewConvOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border-0 text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Plus size={14} />
                    <span>New Chat</span>
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 bg-slate-50/60 dark:bg-slate-950">
                {(!activeConv.messages || activeConv.messages.length === 0) ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-sky-400 flex items-center justify-center mb-2">
                      <Sparkles size={22} />
                    </div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Start of conversation</div>
                    <div className="text-[11.5px] text-slate-400 mt-0.5">Send a greeting, photo, video, or project document below.</div>
                  </div>
                ) : (
                  activeConv.messages.map((msg, idx) => {
                    const outgoing = isCurrentSender(msg);

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col max-w-[78%] sm:max-w-[68%] ${outgoing ? 'self-end' : 'self-start'}`}
                      >
                        {/* Sender Label for Incoming or Channel Messages */}
                        {!outgoing && (
                          <div className="flex items-center gap-1.5 mb-1 ml-1">
                            <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
                              {msg.senderName || activeConv.participantName}
                            </span>
                            {msg.senderRole && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                                {msg.senderRole}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Bubble Container */}
                        <div className={`p-3 px-4 text-[13px] leading-relaxed shadow-xs ${
                          outgoing
                            ? 'rounded-[16px_16px_4px_16px] bg-blue-600 text-white'
                            : 'rounded-[16px_16px_16px_4px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700'
                        }`}>
                          {/* Text Content */}
                          {msg.text && (
                            <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                          )}

                          {/* Attachments Section */}
                          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                            <div className={`flex flex-col gap-2 ${msg.text ? 'mt-2.5 pt-2 border-t' : ''} ${
                              outgoing ? 'border-blue-400/40' : 'border-slate-100 dark:border-slate-700'
                            }`}>
                              {msg.attachments.map((att, aIdx) => (
                                <div key={att.id || aIdx} className="overflow-hidden">
                                  {/* Photo Attachment */}
                                  {att.category === 'image' && (
                                    <div
                                      onClick={() => setViewerAttachment(att)}
                                      className="relative group cursor-pointer overflow-hidden rounded-lg bg-black/10 max-w-sm"
                                    >
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="max-h-60 w-auto object-cover rounded-lg transition-transform duration-200 group-hover:scale-102"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                                        <Maximize2 size={16} />
                                        <span>Click to view</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Video Attachment */}
                                  {att.category === 'video' && (
                                    <div className="max-w-sm rounded-lg overflow-hidden bg-black">
                                      <video
                                        controls
                                        playsInline
                                        src={att.dataUrl}
                                        className="max-h-56 w-full rounded-lg"
                                      />
                                    </div>
                                  )}

                                  {/* Document Attachment */}
                                  {att.category === 'document' && (
                                    <div className={`flex items-center justify-between gap-3 p-2.5 px-3 rounded-lg border transition-colors ${
                                      outgoing
                                        ? 'bg-blue-700/60 border-blue-400/50 text-white'
                                        : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
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
                                          onClick={() => downloadChatAttachment(att)}
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

                        {/* Timestamp & Status */}
                        <div className={`text-[10px] text-slate-400 mt-1 flex items-center gap-1 ${outgoing ? 'self-end' : 'self-start'}`}>
                          <span>{msg.timestamp || 'Just now'}</span>
                          {outgoing && <CheckCheck size={13} className="text-blue-500" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Pending Attachments Preview Tray ── */}
              {pendingAttachments.length > 0 && (
                <div className="p-2.5 px-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2.5 overflow-x-auto">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">Attached:</span>
                  {pendingAttachments.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className="flex items-center gap-2 p-1.5 px-2.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-xs shrink-0 max-w-xs"
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
                        className="w-5 h-5 rounded-full hover:bg-rose-100 hover:text-rose-600 text-slate-400 flex items-center justify-center cursor-pointer border-0 ml-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Emoji Bar (Toggleable) ── */}
              {showEmojiPicker && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold mr-1">Quick Reaction:</span>
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

              {/* ── Chat Input Bar ── */}
              <form
                onSubmit={handleSend}
                className="p-3 px-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900"
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
                  className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-600 dark:hover:text-sky-400 cursor-pointer border-0 transition-colors"
                  title="Attach Photo, Video or Document"
                >
                  <Paperclip size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer border-0 transition-colors ${
                    showEmojiPicker ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-500'
                  }`}
                  title="Emoji reactions"
                >
                  <Smile size={18} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder={pendingAttachments.length > 0 ? "Add an optional caption and press Send..." : "Type a message..."}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-600 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && pendingAttachments.length === 0}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-0 ${
                    inputText.trim() || pendingAttachments.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md shadow-blue-600/30'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
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
        onClose={() => setViewerAttachment(null)}
      />
    </div>
  );
};
