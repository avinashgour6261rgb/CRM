/**
 * @file chatPrivacyUtils.js
 * @description Enterprise Privacy & Scoping Engine for Team Chat.
 * Ensures:
 * 1. Direct Messages (DMs) are strictly private between the 2 participants (zero leakage to 3rd parties).
 * 2. In DMs, each user sees the *other* colleague's name, avatar, role, and department.
 * 3. Channels are scoped by department or company-wide access.
 * 4. Unread messages are computed per-user and per-conversation.
 */

import { isHRorAdmin } from '../../../shared/utils/permissionUtils';

/**
 * Check if a conversation is visible to the given user.
 */
export const isConversationVisibleToUser = (conv, user) => {
  if (!conv || !user) return false;

  const myId = String(user._id || '').toLowerCase();
  const myCode = String(user.employeeCode || '').toLowerCase();
  const myEmail = String(user.email || '').toLowerCase();
  const myDept = (user.department || '').toLowerCase();
  const isPrivileged = isHRorAdmin(user);

  // ── 1. Channels (Group Threads) ──
  if (conv.type === 'channel') {
    const chId = conv.id;
    const chName = (conv.channelName || '').toLowerCase();

    // Company-wide global channels: visible to everyone
    if (chId === 'channel_general' || chId === 'channel_announcements' || chName === '#general' || chName === '#announcements') {
      return true;
    }

    // IT & Tech channel: visible to IT/Dev staff + HR/Admin
    if (chId === 'channel_it_dev' || chName.includes('it') || chName.includes('dev') || chName.includes('software')) {
      if (isPrivileged || myDept.includes('it') || myDept.includes('software') || myDept.includes('tech') || myDept.includes('eng')) {
        return true;
      }
      return false;
    }

    // Digital Marketing channel: visible to Marketing/Growth staff + HR/Admin
    if (chId === 'channel_marketing' || chName.includes('marketing') || chName.includes('growth') || chName.includes('seo') || chName.includes('smm')) {
      if (isPrivileged || myDept.includes('marketing') || myDept.includes('content') || myDept.includes('seo') || myDept.includes('design') || myDept.includes('sales')) {
        return true;
      }
      return false;
    }

    // Custom channels
    if (Array.isArray(conv.members)) {
      if (conv.members.includes('all') || conv.members.includes(myId) || conv.members.includes(myCode)) return true;
    }
    if (conv.createdBy && (String(conv.createdBy).toLowerCase() === myId || String(conv.createdBy).toLowerCase() === myCode)) {
      return true;
    }
    return isPrivileged;
  }

  // ── 2. Direct Messages (DMs) — STRICT PRIVACY ──
  // A DM must ONLY be visible to the two people involved!
  // If participants array is present, check strictly against participants
  if (Array.isArray(conv.participants) && conv.participants.length > 0) {
    return conv.participants.some(p => {
      const s = String(p).toLowerCase();
      return (myId && s === myId) || (myCode && s === myCode) || (myEmail && s === myEmail);
    });
  }

  // Fallback for legacy conversations without participants array
  const pId = String(conv.participantId || '').toLowerCase();
  const pCode = String(conv.participantCode || '').toLowerCase();
  const pEmail = String(conv.participantEmail || '').toLowerCase();

  const cId = String(conv.createdBy || '').toLowerCase();
  const cCode = String(conv.creatorCode || '').toLowerCase();

  if ((myId && pId === myId) || (myCode && pCode === myCode) || (myEmail && pEmail === myEmail)) return true;
  if ((myId && cId === myId) || (myCode && cCode === myCode)) return true;

  // Check if current user sent any message in this conversation
  if (Array.isArray(conv.messages) && conv.messages.length > 0) {
    const sentByMe = conv.messages.some(m => {
      const sId = String(m.senderId || '').toLowerCase();
      const sCode = String(m.senderCode || '').toLowerCase();
      const sEmail = String(m.senderEmail || '').toLowerCase();
      return (myId && sId === myId) || (myCode && sCode === myCode) || (myEmail && sEmail === myEmail);
    });
    if (sentByMe) return true;
  }

  return false;
};

/**
 * In a 1-on-1 Direct Message, resolve the OTHER participant's details
 * so the logged-in user sees who they are chatting with (never themselves).
 */
export const getDmPartner = (conv, currentUser, employees = []) => {
  if (!conv || conv.type === 'channel') return null;

  const myId = String(currentUser?._id || '').toLowerCase();
  const myCode = String(currentUser?.employeeCode || '').toLowerCase();
  const myEmail = String(currentUser?.email || '').toLowerCase();
  const myName = String(currentUser?.name || '').toLowerCase();

  // 1. Identify target's identifier from participants
  let partnerId = null;
  if (Array.isArray(conv.participants)) {
    partnerId = conv.participants.find(p => {
      const s = String(p).toLowerCase();
      return s && s !== myId && s !== myCode && s !== myEmail;
    });
  }

  // 2. If not found, check participant vs creator
  if (!partnerId) {
    const pId = String(conv.participantId || '').toLowerCase();
    const pCode = String(conv.participantCode || '').toLowerCase();
    const cId = String(conv.createdBy || '').toLowerCase();
    const cCode = String(conv.creatorCode || '').toLowerCase();

    const isParticipantMe = (myId && pId === myId) || (myCode && pCode === myCode);
    if (!isParticipantMe && (pId || pCode)) {
      partnerId = conv.participantId || conv.participantCode;
    } else if (cId || cCode) {
      partnerId = conv.createdBy || conv.creatorCode;
    } else {
      // Find from messages
      const otherMsg = (conv.messages || []).find(m => {
        const sId = String(m.senderId || m.senderCode || '').toLowerCase();
        return sId && sId !== myId && sId !== myCode;
      });
      if (otherMsg) partnerId = otherMsg.senderId || otherMsg.senderCode;
    }
  }

  // 3. Look up in employees list
  if (partnerId) {
    const pStr = String(partnerId).toLowerCase();
    const partnerEmp = (employees || []).find(e => {
      return (
        String(e._id || '').toLowerCase() === pStr ||
        String(e.employeeCode || '').toLowerCase() === pStr ||
        (e.email && String(e.email).toLowerCase() === pStr)
      );
    });

    if (partnerEmp) {
      return {
        _id: partnerEmp._id,
        employeeCode: partnerEmp.employeeCode,
        name: partnerEmp.name,
        avatar: partnerEmp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        role: partnerEmp.role || 'Team Member',
        department: partnerEmp.department || 'General',
        email: partnerEmp.email,
        isOnline: true
      };
    }
  }

  // 4. Fallback: If conv.participant is not me, use conv.participant metadata
  const isParticipantMe =
    (myId && String(conv.participantId || '').toLowerCase() === myId) ||
    (myCode && String(conv.participantCode || '').toLowerCase() === myCode) ||
    (myEmail && String(conv.participantEmail || '').toLowerCase() === myEmail) ||
    (myName && String(conv.participantName || '').toLowerCase() === myName);

  if (!isParticipantMe && conv.participantName) {
    return {
      _id: conv.participantId || 'emp_partner',
      employeeCode: conv.participantCode || '',
      name: conv.participantName,
      avatar: conv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      role: conv.participantRole || 'Team Member',
      department: conv.participantDepartment || 'General',
      email: conv.participantEmail || '',
      isOnline: true
    };
  }

  // 5. If conv.participant was me, try creator
  if (conv.createdByName && String(conv.createdByName).toLowerCase() !== myName) {
    return {
      _id: conv.createdBy || 'emp_creator',
      employeeCode: conv.creatorCode || '',
      name: conv.createdByName,
      avatar: conv.creatorAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
      role: conv.creatorRole || 'Administrator',
      department: conv.creatorDepartment || 'Management',
      email: '',
      isOnline: true
    };
  }

  return {
    _id: conv.participantId || 'unknown',
    name: conv.participantName || 'Colleague',
    avatar: conv.participantAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    role: conv.participantRole || 'Team Member',
    department: conv.participantDepartment || 'General',
    email: '',
    isOnline: true
  };
};

/**
 * Calculate unread messages in a conversation for the active user.
 */
export const getUnreadCountForUser = (conv, currentUser) => {
  if (!conv || !currentUser || !Array.isArray(conv.messages)) return 0;
  const myId = String(currentUser._id || '').toLowerCase();
  const myCode = String(currentUser.employeeCode || '').toLowerCase();
  const myEmail = String(currentUser.email || '').toLowerCase();

  return conv.messages.filter(msg => {
    const sender = String(msg.senderId || '').toLowerCase();
    const senderCode = String(msg.senderCode || '').toLowerCase();
    const senderEmail = String(msg.senderEmail || '').toLowerCase();

    // Ignore messages sent by me
    if ((myId && sender === myId) || (myCode && senderCode === myCode) || (myEmail && senderEmail === myEmail)) {
      return false;
    }

    // Check if my identifier is in readBy list
    const readBy = Array.isArray(msg.readBy) ? msg.readBy.map(s => String(s).toLowerCase()) : [];
    const isRead = (myId && readBy.includes(myId)) || (myCode && readBy.includes(myCode)) || (myEmail && readBy.includes(myEmail));
    return !isRead;
  }).length;
};

/**
 * Play subtle soft chime notification when a new message arrives from another user.
 */
export const playChatNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {
    // AudioContext might be blocked until user interacts, safe to ignore
  }
};
