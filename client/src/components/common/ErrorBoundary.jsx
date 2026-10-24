import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React ErrorBoundary error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--spatial-bg-app, #080c16)', color: 'var(--spatial-text-body, #cbd5e1)' }}
        >
          <div
            className="max-w-md w-full rounded-2xl shadow-2xl p-6 sm:p-8 text-center border"
            style={{
              backgroundColor: 'var(--spatial-bg-card, #0e1526)',
              borderColor: 'var(--spatial-border, rgba(255,255,255,0.08))',
            }}
          >
            <div className="w-16 h-16 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 tracking-tight" style={{ color: 'var(--spatial-text-title, #f8fafc)' }}>
              Something went wrong
            </h2>
            <p className="mb-4 text-xs sm:text-sm" style={{ color: 'var(--spatial-text-muted, #94a3b8)' }}>
              An unexpected error occurred while rendering this view.
            </p>
            {this.state.error && (
              <div className="text-left bg-rose-950/30 border border-rose-500/30 rounded-xl p-3.5 my-4 font-mono text-xs text-rose-300 overflow-x-auto max-h-52">
                <div className="font-bold mb-1 text-rose-200">{this.state.error.message || String(this.state.error)}</div>
                {this.state.error.stack && (
                  <div className="text-[10px] text-rose-400 opacity-80 whitespace-pre-wrap">{this.state.error.stack}</div>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="spatial-btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoDashboard}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer active:scale-95 transition-colors"
                style={{
                  backgroundColor: 'var(--spatial-bg-card-subtle, #111a2e)',
                  borderColor: 'var(--spatial-border, rgba(255,255,255,0.08))',
                  color: 'var(--spatial-text-title, #f8fafc)',
                }}
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
