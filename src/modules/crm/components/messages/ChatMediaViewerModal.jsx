/**
 * @file ChatMediaViewerModal.jsx
 * @description Fullscreen Lightbox & Media Viewer for Photos, Videos, and Documents shared in Chat.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Video,
  Image as ImageIcon,
  ExternalLink,
  FileSpreadsheet,
  FileCode,
  Archive
} from 'lucide-react';
import { downloadChatAttachment } from '../../utils/chatMediaUtils';

export const ChatMediaViewerModal = ({ isOpen, attachment, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [attachment, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !attachment) return null;

  const { name, category, dataUrl, sizeFormatted, mimeType } = attachment;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const getDocIcon = () => {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText size={48} className="text-red-500" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={48} className="text-emerald-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText size={48} className="text-blue-500" />;
    if (['zip', 'rar', '7z', 'tar'].includes(ext)) return <Archive size={48} className="text-amber-500" />;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py'].includes(ext)) return <FileCode size={48} className="text-purple-500" />;
    return <FileText size={48} className="text-slate-400" />;
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/85 backdrop-blur-md flex flex-col justify-between p-4 select-none animate-fadeIn">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 text-white px-5 py-3 rounded-xl border border-slate-800 shadow-xl z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
            {category === 'image' && <ImageIcon size={18} className="text-sky-400" />}
            {category === 'video' && <Video size={18} className="text-purple-400" />}
            {category === 'document' && <FileText size={18} className="text-amber-400" />}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate max-w-[280px] sm:max-w-md">{name}</div>
            <div className="text-xs text-slate-400">{sizeFormatted} • {category.toUpperCase()}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {category === 'image' && (
            <>
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer transition-colors border-0"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer transition-colors border-0"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer transition-colors border-0"
                title="Rotate"
              >
                <RotateCw size={16} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => downloadChatAttachment(attachment)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors border-0 shadow-sm"
          >
            <Download size={14} />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors border-0"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden my-3">
        {category === 'image' && (
          <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-4">
            <img
              src={dataUrl}
              alt={name}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out'
              }}
              className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}

        {category === 'video' && (
          <div className="max-w-4xl w-full flex items-center justify-center p-4">
            <video
              controls
              autoPlay
              playsInline
              src={dataUrl}
              className="max-h-[75vh] max-w-full rounded-xl shadow-2xl bg-black border border-slate-800"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {category === 'document' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full flex flex-col items-center text-center shadow-2xl">
            <div className="w-20 h-20 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-4 border border-slate-700">
              {getDocIcon()}
            </div>
            <h3 className="text-base font-bold text-white mb-1 break-all">{name}</h3>
            <p className="text-xs text-slate-400 mb-6">{sizeFormatted} • {mimeType || 'Document file'}</p>

            <button
              type="button"
              onClick={() => downloadChatAttachment(attachment)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm cursor-pointer shadow-lg shadow-blue-600/30 transition-all border-0"
            >
              <Download size={16} />
              <span>Download Document</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-500 py-1">
        Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Esc</kbd> or click Close to return to chat
      </div>
    </div>
  );
};
