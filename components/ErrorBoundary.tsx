import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and prevent blank screens
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔴 React Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    // Clear error state and try to re-render
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    // Full page reload
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-mc-obsidian flex items-center justify-center p-4">
          <div className="bg-mc-ui-bg-dark border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-ui-border-dark border-r-mc-ui-border-dark p-6 max-w-lg w-full">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💥</span>
              <h2 className="text-mc-redstone text-sm uppercase">Something Went Wrong</h2>
            </div>
            
            {/* Error message */}
            <div className="bg-mc-obsidian border-2 border-mc-ui-border-dark p-3 mb-4">
              <p className="text-mc-text-light text-[10px] break-all">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            
            {/* Help text */}
            <p className="text-mc-text-dark text-[9px] mb-4">
              This might be a temporary issue with the Linera blockchain connection. 
              Try the options below:
            </p>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 mc-btn bg-mc-emerald hover:bg-mc-emerald-dark text-mc-ui-bg-dark py-2 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-emerald-dark border-r-mc-emerald-dark text-[10px] font-bold"
              >
                🔄 Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 mc-btn bg-mc-diamond hover:bg-mc-diamond-dark text-mc-ui-bg-dark py-2 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-diamond-dark border-r-mc-diamond-dark text-[10px] font-bold"
              >
                ↻ Reload Page
              </button>
            </div>
            
            {/* Technical details (collapsed) */}
            {this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-mc-text-dark text-[9px] cursor-pointer hover:text-mc-text-light">
                  📋 Technical Details
                </summary>
                <pre className="mt-2 bg-mc-obsidian border border-mc-ui-border-dark p-2 text-[8px] text-mc-text-dark overflow-auto max-h-32">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
