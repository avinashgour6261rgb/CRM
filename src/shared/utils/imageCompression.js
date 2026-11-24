/**
 * @file imageCompression.js
 * @description Client-side image auto-compression using offscreen HTML5 <canvas>.
 * Drastically reduces payload size before Base64 conversion to minimize bandwidth and memory usage.
 */

/**
 * Compresses an image File or Blob to a specified max dimension and JPEG quality.
 * Falls back safely to original file if compression fails or for non-image files (PDFs, docs).
 *
 * @param {File|Blob} file - The file to compress
 * @param {Object} options
 * @param {number} [options.maxWidth=1024]
 * @param {number} [options.maxHeight=1024]
 * @param {number} [options.quality=0.72]
 * @returns {Promise<File|Blob>}
 */
export async function compressImageFile(file, { maxWidth = 1024, maxHeight = 1024, quality = 0.72 } = {}) {
  if (!file || !file.type || !file.type.startsWith('image/') || file.type.includes('svg')) {
    return file;
  }

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(file);
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;
        if (!width || !height) {
          return resolve(file);
        }

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name || 'compressed.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.warn('[imageCompression] Canvas compression failed, falling back to original:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses an image and converts it directly to a Base64 data URL.
 *
 * @param {File|Blob} file
 * @param {Object} options
 * @returns {Promise<string>}
 */
export async function fileToCompressedDataUrl(file, options = {}) {
  const compressed = await compressImageFile(file, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(compressed);
  });
}
