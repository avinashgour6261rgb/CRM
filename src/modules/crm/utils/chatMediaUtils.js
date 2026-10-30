/**
 * @file chatMediaUtils.js
 * @description Utilities for processing chat attachments (photos, videos, documents),
 * client-side image compression, and file download helpers.
 */

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
 * Reduces high-res photos (>10MB) to lightweight ~150-300KB JPEGs
 * so local storage never exceeds quota while maintaining crisp quality.
 */
export const compressImage = (file, maxDimension = 1280, quality = 0.78) => {
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
        resolve({
          dataUrl,
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
 * Process any file (photo, video, document) into a chat attachment payload.
 */
export const processFileForChat = async (file) => {
  const category = getFileCategory(file.name, file.type);
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
        sizeBytes: compressed.sizeBytes,
        sizeFormatted: formatFileSize(compressed.sizeBytes),
        width: compressed.width,
        height: compressed.height
      };
    } catch {
      // Fallback to raw dataUrl if compression fails
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
 * Trigger browser file download from DataURL
 */
export const downloadChatAttachment = (attachment) => {
  if (!attachment || !attachment.dataUrl) return;
  const link = document.createElement('a');
  link.href = attachment.dataUrl;
  link.download = attachment.name || `attachment_${Date.now()}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
