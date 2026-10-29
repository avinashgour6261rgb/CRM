/**
 * @file ticketService.js
 * @description Enterprise CRM Tickets data service with API calls & reliable offline storage fallback.
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
    // API offline or route not ready — fallback to reactive storage
  }

  return await fallbackFn();
}

export const ticketService = {
  async getTickets() {
    return fetchWithFallback(`${API_BASE}/tickets`, { method: 'GET' }, async () => {
      return getCollection(KEYS.TICKETS) || [];
    });
  },

  async createTicket(ticketData, currentUser) {
    const fallbackFn = async () => {
      const currentList = getCollection(KEYS.TICKETS) || [];
      const newTicket = {
        _id: `tkt_${Date.now()}`,
        ticketCode: `TKT-${String(currentList.length + 1).padStart(3, '0')}`,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority || 'medium',
        status: 'open',
        category: ticketData.category || 'General Support',
        requestedBy: currentUser?.name || 'Employee',
        requestedById: currentUser?._id || '',
        requestedByAvatar: currentUser?.avatar || '',
        requestedByRole: currentUser?.role || 'Team Member',
        requestedOn: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        createdAt: new Date().toISOString(),
        replies: []
      };
      currentList.unshift(newTicket);
      saveCollection(KEYS.TICKETS, currentList);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      return newTicket;
    };

    return fetchWithFallback(`${API_BASE}/tickets`, {
      method: 'POST',
      body: JSON.stringify(ticketData)
    }, fallbackFn);
  },

  async replyTicket(ticketId, message, currentUser) {
    const fallbackFn = async () => {
      const currentList = getCollection(KEYS.TICKETS) || [];
      const idx = currentList.findIndex(t => String(t._id || t.id) === String(ticketId));
      if (idx !== -1) {
        const replyObj = {
          _id: `rep_${Date.now()}`,
          author: currentUser?.name || 'User',
          authorAvatar: currentUser?.avatar || '',
          authorRole: currentUser?.role || 'Team Member',
          message: message,
          createdAt: new Date().toISOString(),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
        currentList[idx].replies = currentList[idx].replies || [];
        currentList[idx].replies.push(replyObj);
        currentList[idx].updatedAt = new Date().toISOString();
        saveCollection(KEYS.TICKETS, currentList);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
        return currentList[idx];
      }
      return null;
    };

    return fetchWithFallback(`${API_BASE}/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message })
    }, fallbackFn);
  },

  async updateTicketStatus(ticketId, status) {
    const fallbackFn = async () => {
      const currentList = getCollection(KEYS.TICKETS) || [];
      const idx = currentList.findIndex(t => String(t._id || t.id) === String(ticketId));
      if (idx !== -1) {
        currentList[idx].status = status;
        currentList[idx].updatedAt = new Date().toISOString();
        saveCollection(KEYS.TICKETS, currentList);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
        return currentList[idx];
      }
      return null;
    };

    return fetchWithFallback(`${API_BASE}/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }, fallbackFn);
  },

  async deleteTicket(ticketId) {
    const fallbackFn = async () => {
      const currentList = getCollection(KEYS.TICKETS) || [];
      const filtered = currentList.filter(t => String(t._id || t.id) !== String(ticketId));
      saveCollection(KEYS.TICKETS, filtered);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      return true;
    };

    return fetchWithFallback(`${API_BASE}/tickets/${ticketId}`, {
      method: 'DELETE'
    }, fallbackFn);
  }
};
