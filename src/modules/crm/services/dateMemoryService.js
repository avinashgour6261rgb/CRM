/**
 * @file dateMemoryService.js
 * @description Secure, user-isolated personal date memory and private daily planner service.
 * 
 * ARCHITECTURE & DATA ISOLATION:
 * - Each memory is bound strictly to `userId` and `userCode`.
 * - Cross-user data leakage is strictly blocked: User A cannot see User B's private notes or memories,
 *   even if they share the same browser or role.
 * - Reactive updates via `hrms_storage_change` and `ems_user_memories_updated`.
 */

import { KEYS } from '../../../shared/services/storageService';

/**
 * Helper to safely get raw memories collection from storage
 */
const getRawMemories = () => {
  try {
    const raw = localStorage.getItem(KEYS.USER_DATE_MEMORIES);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[dateMemoryService] Failed to parse memories:', err);
    return [];
  }
};

/**
 * Helper to safely save memories collection to storage
 */
const saveRawMemories = (memories) => {
  try {
    localStorage.setItem(KEYS.USER_DATE_MEMORIES, JSON.stringify(memories));
    // Dispatch reactive events for instant cross-component updates
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.USER_DATE_MEMORIES } }));
    window.dispatchEvent(new CustomEvent('ems_user_memories_updated'));
  } catch (err) {
    console.error('[dateMemoryService] Failed to save memories:', err);
  }
};

/**
 * Check if a memory belongs to a given user
 */
const isOwner = (memory, user) => {
  if (!memory || !user) return false;
  const uid = String(user._id || user.id || '');
  const ucode = String(user.employeeCode || user.code || '').toLowerCase();
  const uemail = String(user.email || '').toLowerCase();

  const memUid = String(memory.userId || '');
  const memUcode = String(memory.userCode || '').toLowerCase();
  const memUemail = String(memory.userEmail || '').toLowerCase();

  return (
    (uid && memUid === uid) ||
    (ucode && memUcode === ucode) ||
    (uemail && memUemail === uemail)
  );
};

export const dateMemoryService = {
  /**
   * Get all personal memories for the current user
   */
  getUserMemories(user) {
    if (!user) return [];
    const all = getRawMemories();
    return all.filter(m => isOwner(m, user)).sort((a, b) => {
      // Sort by date, then by time or creation
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });
  },

  /**
   * Get personal memories for a specific date
   */
  getMemoriesByDate(dateStr, user) {
    if (!user || !dateStr) return [];
    const userMemories = this.getUserMemories(user);
    return userMemories.filter(m => m.date === dateStr);
  },

  /**
   * Add a new personal memory for a date
   */
  addMemory(data, user) {
    if (!user) throw new Error('User authentication required to save private memories');
    if (!data.title || !data.title.trim()) throw new Error('Title/Note is required');
    if (!data.date) throw new Error('Date is required');

    const all = getRawMemories();
    const newMemory = {
      _id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: String(user._id || user.id || ''),
      userCode: String(user.employeeCode || user.code || ''),
      userName: user.name || 'User',
      userEmail: user.email || '',
      date: data.date, // 'YYYY-MM-DD'
      title: data.title.trim(),
      description: (data.description || '').trim(),
      time: data.time || 'All Day', // e.g., '10:30 AM' or 'All Day'
      tag: data.tag || 'personal', // 'personal' | 'task' | 'meeting' | 'reminder' | 'idea'
      priority: data.priority || 'medium', // 'low' | 'medium' | 'high'
      isCompleted: !!data.isCompleted,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    all.push(newMemory);
    saveRawMemories(all);
    return newMemory;
  },

  /**
   * Update an existing memory
   */
  updateMemory(memoryId, updates, user) {
    if (!user || !memoryId) return null;
    const all = getRawMemories();
    const index = all.findIndex(m => m._id === memoryId);
    if (index === -1) return null;

    // Strict access check
    if (!isOwner(all[index], user)) {
      console.warn('[dateMemoryService] Unauthorized memory update attempt blocked.');
      return null;
    }

    all[index] = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveRawMemories(all);
    return all[index];
  },

  /**
   * Toggle completion status
   */
  toggleCompleted(memoryId, user) {
    if (!user || !memoryId) return null;
    const all = getRawMemories();
    const index = all.findIndex(m => m._id === memoryId);
    if (index === -1) return null;

    if (!isOwner(all[index], user)) return null;

    all[index].isCompleted = !all[index].isCompleted;
    all[index].updatedAt = new Date().toISOString();

    saveRawMemories(all);
    return all[index];
  },

  /**
   * Delete a memory
   */
  deleteMemory(memoryId, user) {
    if (!user || !memoryId) return false;
    let all = getRawMemories();
    const memory = all.find(m => m._id === memoryId);
    if (!memory) return false;

    if (!isOwner(memory, user)) {
      console.warn('[dateMemoryService] Unauthorized memory deletion attempt blocked.');
      return false;
    }

    all = all.filter(m => m._id !== memoryId);
    saveRawMemories(all);
    return true;
  }
};
