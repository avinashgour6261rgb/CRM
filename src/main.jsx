import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './shared/styles/index.css';
import { initStorage } from './shared/services/storageService';
import { initKeepAlive } from './shared/services/keepAliveService';

// Automatically recover from stale Vite chunks after production deployments
if (typeof window !== 'undefined') {
  const isChunkError = (msg) => {
    const s = String(msg || '');
    return (
      /Failed to fetch dynamically imported module/i.test(s) ||
      /Importing a module script failed/i.test(s) ||
      /error loading dynamically imported module/i.test(s) ||
      /MIME type of "text\/html"/i.test(s)
    );
  };

  const handleChunkError = () => {
    const lastReload = Number(sessionStorage.getItem('ems_chunk_reload_ts') || 0);
    const now = Date.now();
    // Allow auto-reload once every 15s to prevent infinite reload loops
    if (now - lastReload > 15000) {
      sessionStorage.setItem('ems_chunk_reload_ts', String(now));
      window.location.reload();
    }
  };

  // 1. Vite specific chunk preload error
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Chunk preload error detected after deployment, auto-refreshing...', event);
    event.preventDefault();
    handleChunkError();
  });

  // 2. Global script evaluation error
  window.addEventListener('error', (event) => {
    const msg = event?.message || event?.error?.message || '';
    if (isChunkError(msg)) {
      console.warn('[Vite] Chunk script error caught, auto-refreshing...', msg);
      event.preventDefault();
      handleChunkError();
    }
  });

  // 3. Catch and suppress browser extension message channel disconnects & dynamic import rejections
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || String(event?.reason || '');
    if (isChunkError(msg)) {
      console.warn('[Vite] Dynamic import chunk rejection caught, auto-refreshing...', msg);
      event.preventDefault();
      handleChunkError();
      return;
    }
    if (
      msg.includes('message channel closed before a response was received') ||
      msg.includes('ResizeObserver loop completed with undelivered notifications')
    ) {
      event.preventDefault();
    }
  });
}

// Initialize storage seed data on app start
initStorage();

// Initialize backend keep-alive heartbeat
initKeepAlive();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
