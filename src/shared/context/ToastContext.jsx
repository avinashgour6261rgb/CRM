import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((input, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    let text = '';
    let toastType = type;

    if (input && typeof input === 'object') {
      if (input.message && typeof input.message === 'string') {
        text = input.title ? `${input.title}: ${input.message}` : input.message;
      } else if (input.title && typeof input.title === 'string') {
        text = input.title;
      } else if (input instanceof Error) {
        text = input.message || 'An unexpected error occurred';
      } else {
        text = JSON.stringify(input);
      }
      if (input.type) toastType = input.type;
    } else {
      text = String(input || 'Action completed');
    }

    setToasts(prev => [...prev, { id, message: text, type: toastType }]);

    if (duration) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-[18px] py-3 rounded-lg bg-slate-900 text-white shadow-xl text-[13px] font-medium min-w-[280px] max-w-[420px] animate-fade-in ${
              toast.type === 'success'
                ? 'border-l-4 border-emerald-500'
                : toast.type === 'error'
                ? 'border-l-4 border-red-500'
                : 'border-l-4 border-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-red-400 shrink-0" />}
            {toast.type === 'info' && <Info size={18} className="text-blue-400 shrink-0" />}
            <span className="flex-1">{typeof toast.message === 'string' ? toast.message : String(toast.message || '')}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="bg-transparent border-0 text-slate-400 hover:text-white cursor-pointer flex p-0.5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
