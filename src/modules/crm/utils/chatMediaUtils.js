/**
 * @file chatMediaUtils.js
 * @description Utilities for processing chat attachments (photos, videos, documents),
 * client-side image compression + lightweight thumbnail generation, lazy HD media fetching,
 * and file download helpers.
 */

import { API_BASE, getAuthHeaders } from '../../../shared/config/apiConfig';

const mediaMemoryCache = new Map();
const mediaInFlight = new Map();

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const getFileCategory = (filename = '', mimeType = '') => {
  const mime = (mimeType || '').toLowerCase();
  const ext = filename.split('.').pop().toLowerCase();

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return 'audio';
  }
  return 'document';
};

/**
 * Client-side canvas image downscaler:
 * Produces a crisp compressed JPEG (~40-90KB) AND a tiny preview thumbnail (~4-8KB)
 * so chat lists load 20x faster and localStorage never bloats.
 */
export const compressImage = (file, maxDimension = 1080, quality = 0.74) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Generate tiny fast-loading preview thumbnail (max 220px, ~4-8KB)
        const thumbMax = 220;
        let tw = img.width;
        let th = img.height;
        if (tw > thumbMax || th > thumbMax) {
          if (tw > th) {
            th = Math.max(1, Math.round((th * thumbMax) / tw));
            tw = thumbMax;
          } else {
            tw = Math.max(1, Math.round((tw * thumbMax) / th));
            th = thumbMax;
          }
        }
        const tCanvas = document.createElement('canvas');
        tCanvas.width = tw;
        tCanvas.height = th;
        tCanvas.getContext('2d').drawImage(img, 0, 0, tw, th);
        const thumbDataUrl = tCanvas.toDataURL('image/jpeg', 0.62);

        resolve({
          dataUrl,
          thumbDataUrl,
          width,
          height,
          sizeBytes: Math.round((dataUrl.length * 3) / 4)
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export const readFileAsDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
};

/**
 * Lazy-fetch full attachment media on demand from MongoDB and cache in memory.
 */
export const fetchChatAttachmentMedia = async (conversationId, attachmentId) => {
  if (!conversationId || !attachmentId) return '';
  const cacheKey = `${conversationId}::${attachmentId}`;
  if (mediaMemoryCache.has(cacheKey)) return mediaMemoryCache.get(cacheKey);
  if (mediaInFlight.has(cacheKey)) return mediaInFlight.get(cacheKey);

  const promise = (async () => {
    try {
      const res = await fetch(
        `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/attachments/${encodeURIComponent(attachmentId)}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const json = await res.json();
        const url = json?.data?.dataUrl || '';
        if (url) mediaMemoryCache.set(cacheKey, url);
        return url;
      }
    } catch (_) {}
    return '';
  })().finally(() => {
    mediaInFlight.delete(cacheKey);
  });

  mediaInFlight.set(cacheKey, promise);
  return promise;
};

/**
 * Process any file (photo, video, document) into a chat attachment payload.
 */
export const processFileForChat = async (file) => {
  const category = getFileCategory(file.name, file.type);
  if (category !== 'image' && file.size > 6 * 1024 * 1024) {
    throw new Error('File exceeds 6 MB limit. Please choose a smaller file.');
  }
  const basePayload = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: file.name,
    category,
    mimeType: file.type || 'application/octet-stream',
    originalSize: file.size,
    sizeFormatted: formatFileSize(file.size)
  };

  if (category === 'image') {
    try {
      const compressed = await compressImage(file);
      return {
        ...basePayload,
        dataUrl: compressed.dataUrl,
        thumbDataUrl: compressed.thumbDataUrl,
        sizeBytes: compressed.sizeBytes,
        sizeFormatted: formatFileSize(compressed.sizeBytes),
        width: compressed.width,
        height: compressed.height
      };
    } catch {
      const rawDataUrl = await readFileAsDataUrl(file);
      return {
        ...basePayload,
        dataUrl: rawDataUrl,
        sizeBytes: file.size
      };
    }
  }

  // Videos & Documents
  const rawDataUrl = await readFileAsDataUrl(file);
  return {
    ...basePayload,
    dataUrl: rawDataUrl,
    sizeBytes: file.size
  };
};

/**
 * Trigger browser file download from DataURL (auto-fetches full media if lazy-stripped)
 */
export const downloadChatAttachment = async (attachment, conversationId) => {
  if (!attachment) return;
  let href = attachment.dataUrl;
  if (!href && attachment.hasFullMedia) {
    href = await fetchChatAttachmentMedia(conversationId || attachment.conversationId, attachment.id);
  }
  if (!href) href = attachment.thumbDataUrl;
  if (!href) return;
  const link = document.createElement('a');
  link.href = href;
  link.download = attachment.name || `attachment_${Date.now()}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

