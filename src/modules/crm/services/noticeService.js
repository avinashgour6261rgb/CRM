/**
 * @file noticeService.js
 * @description Enterprise CRM Notices data service with API calls & reliable offline storage fallback.
 */

import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { API_BASE } from '../../../shared/config/apiConfig';

async function fetchWithFallback(url, options = {}, fallbackFn) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // Fallback on timeout or network error
  }

  return await fallbackFn();
}

export const noticeService = {
  async getNotices() {
    return fetchWithFallback(`${API_BASE}/notices`, { method: 'GET' }, async () => {
      return getCollection(KEYS.NOTICES) || [];
    });
  },

  async addNotice(noticeData, currentUser) {
    const fallbackFn = async () => {
      const currentList = getCollection(KEYS.NOTICES) || [];
      const newNotice = {
        _id: `not_${Date.now()}`,
        title: noticeData.title,
        description: noticeData.description,
        shortDescription: noticeData.shortDescription || (noticeData.description ? noticeData.description.slice(0, 100) + '...' : ''),
        fullContent: noticeData.fullContent || noticeData.description,
        category: noticeData.category || 'Company Notice',
        priority: noticeData.priority || 'medium',
        isImportant: !!noticeData.isImportant,
        targetAudience: noticeData.targetAudience || 'All Employees',
        postedBy: currentUser?.name || 'HR Admin',
        postedById: currentUser?._id || '',
        postedByRole: currentUser?.role || 'Administrator',
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        createdAt: new Date().toISOString()
      };
      currentList.unshift(newNotice);
      saveCollection(KEYS.NOTICES, currentList);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
      return newNotice;
    };

    return fetchWithFallback(`${API_BASE}/notices`, {
      method: 'POST',
      body: JSON.stringify(noticeData)
    }, fallbackFn);
  },

  async updateNotice(noticeId, updateData) {
    const fallbackFn = async () => {
      const currentList = getCollection(KEYS.NOTICES) || [];
      const idx = currentList.findIndex(n => String(n._id || n.id) === String(noticeId));
      if (idx !== -1) {
        currentList[idx] = { ...currentList[idx], ...updateData, updatedAt: new Date().toISOString() };
        saveCollection(KEYS.NOTICES, currentList);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
        return currentList[idx];
      }
      return null;
    };

    return fetchWithFallback(`${API_BASE}/notices/${noticeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    }, fallbackFn);
  },

  async deleteNotice(noticeId) {
    const fallbackFn = async () => {
      const currentList = getCollection(KEYS.NOTICES) || [];
      const filtered = currentList.filter(n => String(n._id || n.id) !== String(noticeId));
      saveCollection(KEYS.NOTICES, filtered);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
      return true;
    };

    return fetchWithFallback(`${API_BASE}/notices/${noticeId}`, {
      method: 'DELETE'
    }, fallbackFn);
  }
};
