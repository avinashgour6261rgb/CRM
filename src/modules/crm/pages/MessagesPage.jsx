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
  const { conversations, activeConversationId, setActiveConversationId, sendMessage } = useCRM();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: 'calc(100vh - 110px)' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        minHeight: '68px',
        boxSizing: 'border-box',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageSquare size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>Team Chat & Direct Messages</h1>
              <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: '700' }}>
                Online
              </span>
            </div>
            <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Real-time collaboration, direct messages, project group threads & attachments
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewConvOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            height: '30px',
            borderRadius: '6px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
          }}
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>

      {/* Main Chat Layout Container */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '290px 1fr',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        
        {/* Left Sidebar: Contact Search & Conversation List */}
        <div style={{
          borderRight: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8fafc'
        }}>
          
          {/* Search Bar */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 8px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc'
            }}>
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Type to search contact"
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '12.5px',
                  width: '100%',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Conversations List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredConversations.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '30px 16px',
                color: '#64748b',
                textAlign: 'center'
              }}>
                <MessageSquare size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>- No conversation found. -</span>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = activeConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#ffffff' : 'transparent',
                      boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                      border: isSelected ? '1px solid #e2e8f0' : '1px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => !isSelected && (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={e => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Avatar & Online Dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={conv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={conv.participantName}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      {conv.isOnline && (
                        <span style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          border: '2px solid #ffffff'
                        }} />
                      )}
                    </div>

                    {/* Contact Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: isSelected ? '700' : '600', color: '#0f172a' }}>
                          {conv.participantName}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {conv.lastMessageTime}
                        </span>
                      </div>

                      <div style={{
                        fontSize: '12px',
                        color: isSelected ? '#334155' : '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '2px'
                      }}>
                        {conv.lastMessage}
                      </div>
                    </div>

                    {/* Unread Badge */}
                    {conv.unreadCount > 0 && (
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '10px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff'
        }}>
          
          {/* If No Conversation Selected: Empty State Matching Screenshot 4 */}
          {!activeConv ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              padding: '40px',
              color: '#64748b'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MessageSquare size={32} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#64748b' }}>
                - Select a conversation to send a message -
              </div>
              <button
                onClick={() => setIsNewConvOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
                }}
              >
                <Plus size={16} />
                New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header Matching Screenshot */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={activeConv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={activeConv.participantName}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    {activeConv.isOnline && (
                      <span style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        border: '2px solid #ffffff'
                      }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                      {activeConv.participantName}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {activeConv.participantRole} • {activeConv.isOnline ? '🟢 Active Now' : 'Offline'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Action Button: + New Conversation Matching Screenshot 4 Top Right */}
                  <button
                    onClick={() => setIsNewConvOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(2,132,199,0.25)'
                    }}
                  >
                    <Plus size={15} />
                    New Conversation
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                backgroundColor: '#f8fafc'
              }}>
                {activeConv.messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf: msg.isOutgoing ? 'flex-end' : 'flex-start',
                      maxWidth: '70%'
                    }}
                  >
                    {!msg.isOutgoing && (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '3px', marginLeft: '4px' }}>
                        {activeConv.participantName}
                      </span>
                    )}

                    <div style={{
                      padding: '10px 16px',
                      borderRadius: msg.isOutgoing ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      backgroundColor: msg.isOutgoing ? '#2563eb' : '#ffffff',
                      color: msg.isOutgoing ? '#ffffff' : '#0f172a',
                      border: msg.isOutgoing ? 'none' : '1px solid #e2e8f0',
                      fontSize: '13.5px',
                      lineHeight: '1.5',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                      {msg.text}
                    </div>

                    <div style={{
                      fontSize: '10.5px',
                      color: '#94a3b8',
                      marginTop: '3px',
                      alignSelf: msg.isOutgoing ? 'flex-end' : 'flex-start',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{msg.timestamp}</span>
                      {msg.isOutgoing && <CheckCheck size={13} color="#2563eb" />}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSend}
                style={{
                  padding: '14px 18px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#ffffff'
                }}
              >
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '24px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#f8fafc'
                  }}
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: inputText.trim() ? '#2563eb' : '#e2e8f0',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.15s ease'
                  }}
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
