/**
 * @file MessagesPage.jsx
 * @description Modern, responsive Team Chat & Messages module matching Screenshot 4 exactly.
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
  Info
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useHR } from '../../hr/context/HRContext';
import { NewConversationModal } from '../components/messages/NewConversationModal';

export const MessagesPage = () => {
  const { conversations, activeConversationId, setActiveConversationId, sendMessage, darkMode } = useCRM();
  const isDark = !!darkMode;
  const { currentUser } = useHR();

  const [searchContact, setSearchContact] = useState('');
  const [inputText, setInputText] = useState('');
  const [isNewConvOpen, setIsNewConvOpen] = useState(false);

  const messagesEndRef = useRef(null);

  const activeConv = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c =>
      (c.participantName || '').toLowerCase().includes(searchContact.toLowerCase()) ||
      (c.participantRole || '').toLowerCase().includes(searchContact.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(searchContact.toLowerCase())
    );
  }, [conversations, searchContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv) return;
    sendMessage(activeConv.id, inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-110px)]">

      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-md min-h-[68px] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 text-sky-400 flex items-center justify-center">
            <MessageSquare size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-base font-extrabold text-slate-900 dark:text-slate-50 leading-tight">Team Chat & Direct Messages</h1>
              <span className="text-[10.5px] py-px px-1.5 rounded bg-green-100 dark:bg-emerald-950 text-green-600 dark:text-emerald-400 font-bold">
                Online
              </span>
            </div>
            <p className="m-0 mt-px text-[11.5px] text-slate-500 dark:text-slate-400">
              Real-time collaboration, direct messages, project group threads & attachments
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewConvOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-blue-600 hover:bg-blue-700 text-white border-none text-xs font-bold cursor-pointer shadow-sm transition-colors"
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>

      {/* Main Chat Layout Container */}
      <div className="flex-1 grid grid-cols-[290px_1fr] bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs dark:shadow-md">

        {/* Left Sidebar: Contact Search & Conversation List */}
        <div className="border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900">

          {/* Search Bar */}
          <div className="p-2 px-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-1.5 px-2 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <Search size={13} className="text-slate-400 dark:text-sky-400" />
              <input
                type="text"
                placeholder="Type to search contact"
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
                className="border-none bg-transparent outline-none text-[12.5px] w-full text-slate-900 dark:text-slate-50 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500 text-center">
                <MessageSquare size={28} className="text-slate-400 mb-2" />
                <span className="text-[13px] font-semibold">- No conversation found. -</span>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = activeConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`flex items-center gap-3 p-3 rounded-[10px] cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700'
                        : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Avatar & Online Dot */}
                    <div className="relative shrink-0">
                      <img
                        src={conv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={conv.participantName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {conv.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      )}
                    </div>

                    {/* Contact Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[13.5px] ${isSelected ? 'font-bold' : 'font-semibold'} text-slate-900 dark:text-slate-50`}>
                          {conv.participantName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {conv.lastMessageTime}
                        </span>
                      </div>

                      <div className={`text-xs truncate mt-0.5 ${isSelected
                        ? 'text-slate-700 dark:text-blue-300'
                        : 'text-slate-500 dark:text-slate-400'
                        }`}>
                        {conv.lastMessage}
                      </div>
                    </div>

                    {/* Unread Badge */}
                    {conv.unreadCount > 0 && (
                      <span className="py-0.5 px-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Chat Window Matching Screenshot 4 */}
        <div className="flex flex-col bg-white dark:bg-slate-900">

          {/* If No Conversation Selected: Empty State Matching Screenshot 4 */}
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-slate-500 dark:text-slate-400">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-800 text-sky-400 flex items-center justify-center">
                <MessageSquare size={32} />
              </div>
              <div className="text-base font-semibold text-slate-600 dark:text-slate-300">
                - Select a conversation to send a message -
              </div>
              <button
                onClick={() => setIsNewConvOpen(true)}
                className="inline-flex items-center gap-1.5 py-2.25 px-4.5 rounded-lg border-none bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-bold cursor-pointer shadow-md transition-colors"
              >
                <Plus size={16} />
                New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header Matching Screenshot */}
              <div className="p-3.5 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={activeConv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={activeConv.participantName}
                      className="w-[38px] h-[38px] rounded-full object-cover"
                    />
                    {activeConv.isOnline && (
                      <span className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    )}
                  </div>
                  <div>
                    <div className="text-[14.5px] font-extrabold text-slate-900 dark:text-slate-50">
                      {activeConv.participantName}
                    </div>
                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400">
                      {activeConv.participantRole} • {activeConv.isOnline ? '🟢 Active Now' : 'Offline'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Action Button: + New Conversation Matching Screenshot 4 Top Right */}
                  <button
                    onClick={() => setIsNewConvOpen(true)}
                    className="inline-flex items-center gap-1.5 py-1.75 px-3.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white border-none text-[12.5px] font-bold cursor-pointer shadow-sm transition-colors"
                  >
                    <Plus size={15} />
                    New Conversation
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3.5 bg-slate-50 dark:bg-slate-950">
                {activeConv.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[70%] ${msg.isOutgoing ? 'self-end' : 'self-start'}`}
                  >
                    {!msg.isOutgoing && (
                      <span className="text-[11px] font-bold text-slate-500 dark:text-sky-400 mb-0.5 ml-1">
                        {activeConv.participantName}
                      </span>
                    )}

                    <div className={`p-2.5 px-4 text-[13.5px] leading-relaxed shadow-xs ${
                      msg.isOutgoing
                        ? 'rounded-[14px_14px_2px_14px] bg-blue-600 text-white'
                        : 'rounded-[14px_14px_14px_2px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {msg.text}
                    </div>

                    <div className={`text-[10.5px] text-slate-400 mt-0.5 flex items-center gap-1 ${msg.isOutgoing ? 'self-end' : 'self-start'
                      }`}>
                      <span>{msg.timestamp}</span>
                      {msg.isOutgoing && <CheckCheck size={13} className="text-blue-400" />}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSend}
                className="p-3.5 px-[18px] border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 bg-white dark:bg-slate-900"
              >
                <button
                  type="button"
                  className="bg-transparent border-none text-slate-500 dark:text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 py-2.5 px-4 rounded-full border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:border-blue-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`w-[38px] h-[38px] rounded-full border-none flex items-center justify-center transition-colors text-white ${
                    inputText.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewConvOpen}
        onClose={() => setIsNewConvOpen(false)}
      />
    </div>
  );
};
