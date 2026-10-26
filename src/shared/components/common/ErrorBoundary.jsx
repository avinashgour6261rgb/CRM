import React from 'react';
import { RefreshCw, Home, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: true };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
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
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '24px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            border: '1px solid #334155'
          }}>
            {/* Friendly, reassuring icon */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#60a5fa'
            }}>
              <Sparkles size={28} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Session Sync & Recovery
            </h2>

            <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              Your workspace data and timelogs are safely preserved. A quick view refresh will restore full dashboard functionality.
            </p>

            {this.state.error && (
              <div style={{
                textAlign: 'left',
                backgroundColor: '#090d16',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '12px',
                margin: '0 0 20px 0',
                color: '#f87171',
                fontSize: '11px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '180px',
                overflowY: 'auto'
              }}>
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                  {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown runtime error'}
                </div>
                {this.state.error?.stack && (
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                    {this.state.error.stack}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                  transition: 'background 0.2s'
                }}
              >
                <RefreshCw size={15} />
                Refresh Application
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#334155',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  padding: '10px 20px',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Home size={15} />
                Dashboard
              </button>
            </div>

            {/* Subtle Diagnostic Toggle (Keeps UI clean for users, inspectable when needed) */}
            <div style={{ borderTop: '1px solid #334155', paddingTop: '14px', marginTop: '10px' }}>
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px'
                }}
              >
                <span>Diagnostics</span>
                {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {this.state.showDetails && (
                <div style={{
                  textAlign: 'left',
                  background: '#090d16',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginTop: '8px',
                  border: '1px solid #1e293b',
                  fontSize: '11px',
                  color: '#94a3b8'
                }}>
                  <div style={{ color: '#f87171', fontWeight: '600', marginBottom: '4px' }}>
                    {this.state.error?.name || 'Runtime'}: {this.state.error?.message || 'Interface state synced'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      onClick={this.handleClearCache}
                      style={{
                        background: '#1e293b',
                        color: '#94a3b8',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        fontSize: '10px',
                        padding: '3px 8px',
                        cursor: 'pointer'
                      }}
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
