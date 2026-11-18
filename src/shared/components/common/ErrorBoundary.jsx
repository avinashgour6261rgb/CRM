import React from 'react';
import { RefreshCw, Home, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false, isChunkError: false };
  }

  static isChunkError(error) {
    const msg = error?.message || String(error || '');
    return (
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Importing a module script failed/i.test(msg) ||
      /error loading dynamically imported module/i.test(msg) ||
      /MIME type of "text\/html"/i.test(msg)
    );
  }

  static getDerivedStateFromError(error) {
    const isChunk = ErrorBoundary.isChunkError(error);
    if (isChunk && typeof window !== 'undefined') {
      const lastReload = Number(sessionStorage.getItem('ems_chunk_reload_ts') || 0);
      const now = Date.now();
      if (now - lastReload > 15000) {
        sessionStorage.setItem('ems_chunk_reload_ts', String(now));
        window.location.reload();
      }
    }
    return { hasError: true, isChunkError: isChunk, error };
  }

  componentDidCatch(error, errorInfo) {
    const isChunk = ErrorBoundary.isChunkError(error);
    if (isChunk) {
      console.warn('ErrorBoundary intercepted deployment chunk discrepancy:', error?.message);
    } else {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    this.setState({ errorInfo, isChunkError: isChunk });
    try {
      localStorage.setItem('ems_last_boundary_error', JSON.stringify({
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        time: new Date().toISOString()
      }));
    } catch {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  handleClearCache = () => {
    try {
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.isChunkError;
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 font-sans">
          <div className="max-w-[500px] w-full bg-slate-800 rounded-2xl p-8 sm:p-9 text-center shadow-2xl ring-1 ring-white/10 border border-slate-700">
            {/* Friendly, reassuring icon */}
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5 text-blue-400">
              <Sparkles size={28} />
            </div>

            <h2 className="text-xl font-bold m-0 mb-2 text-slate-50 tracking-tight">
              {isChunk ? 'New Update Available' : 'Session Sync & Recovery'}
            </h2>

            <p className="text-[13.5px] text-slate-400 leading-relaxed m-0 mb-6">
              {isChunk
                ? 'Inforag Management System has been updated with the latest enhancements. A quick refresh will load the latest version. All your active shifts, timers, and data are safely preserved.'
                : 'Your workspace data and timelogs are safely preserved. A quick view refresh will restore full dashboard functionality.'}
            </p>

            <div className="flex gap-2.5 justify-center flex-wrap mb-[18px]">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0 py-2.5 px-[22px] rounded-[9px] text-[13px] font-semibold cursor-pointer shadow-md shadow-blue-600/35 transition-colors"
              >
                <RefreshCw size={15} />
                {isChunk ? 'Update & Refresh Now' : 'Refresh Application'}
              </button>

              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-50 border border-slate-600 py-2.5 px-5 rounded-[9px] text-[13px] font-semibold cursor-pointer transition-colors"
              >
                <Home size={15} />
                Dashboard
              </button>
            </div>

            {/* Subtle Diagnostic Toggle (Keeps UI clean for users, inspectable when needed) */}
            <div className="border-t border-slate-700 pt-3.5 mt-2.5">
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="bg-transparent border-0 text-slate-400 hover:text-slate-300 text-[11px] cursor-pointer inline-flex items-center gap-1 py-1 px-2 transition-colors"
              >
                <span>Diagnostics</span>
                {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {this.state.showDetails && (
                <div className="text-left bg-slate-950 p-2.5 px-3 rounded-lg mt-2 border border-slate-800 text-[11px] text-slate-400">
                  <div className="text-red-400 font-semibold mb-1">
                    {this.state.error?.name || 'Runtime'}: {this.state.error?.message || 'Interface state synced'}
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={this.handleClearCache}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded text-[10px] py-1 px-2 cursor-pointer transition-colors"
                    >
                      Clear Cache & Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
