import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Top-level error boundary. Prevents a single component crash from
 * white-screening the whole app and offers recovery paths.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('TownPulse render error:', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4"
        >
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center space-y-4">
            <div className="inline-flex bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 p-3 rounded-2xl">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              An unexpected error interrupted this page. Your saved places and
              listings are safe — try reloading, or head back to the directory.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 rounded-xl p-2.5 font-mono break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition hover:scale-105 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition"
              >
                <Home className="w-3.5 h-3.5" />
                Directory Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
