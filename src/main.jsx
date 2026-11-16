import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './shared/styles/index.css';
import { initStorage } from './shared/services/storageService';

// Catch and suppress browser extension message channel disconnects
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event?.reason?.message && (
      event.reason.message.includes('message channel closed before a response was received') ||
      event.reason.message.includes('ResizeObserver loop completed with undelivered notifications')
    )) {
      event.preventDefault();
    }
  });
}

// Initialize storage seed data on app start
initStorage();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
