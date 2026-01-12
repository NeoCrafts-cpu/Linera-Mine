
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Global error handlers to prevent unhandled errors from crashing the app
window.addEventListener('error', (event) => {
  // Check for WASM/Linera errors
  if (event.message?.includes('RuntimeError: unreachable') || 
      event.message?.includes('wasm') ||
      event.message?.includes('linera')) {
    console.warn('⚠️ Caught WASM error, preventing crash:', event.message);
    event.preventDefault();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Check for WASM/Linera promise rejections
  const reason = String(event.reason);
  if (reason.includes('RuntimeError: unreachable') || 
      reason.includes('wasm') ||
      reason.includes('panicked')) {
    console.warn('⚠️ Caught unhandled WASM promise rejection:', reason);
    event.preventDefault();
    return;
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
