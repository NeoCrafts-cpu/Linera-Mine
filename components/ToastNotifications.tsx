import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 8000 });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message, duration: 6000 });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          border: 'border-mc-emerald',
          bg: 'bg-mc-emerald/20',
          icon: '✅',
          iconBg: 'bg-mc-emerald',
          title: 'text-mc-emerald'
        };
      case 'error':
        return {
          border: 'border-red-500',
          bg: 'bg-red-500/20',
          icon: '❌',
          iconBg: 'bg-red-500',
          title: 'text-red-400'
        };
      case 'warning':
        return {
          border: 'border-mc-gold',
          bg: 'bg-mc-gold/20',
          icon: '⚠️',
          iconBg: 'bg-mc-gold',
          title: 'text-mc-gold'
        };
      case 'info':
      default:
        return {
          border: 'border-mc-diamond',
          bg: 'bg-mc-diamond/20',
          icon: 'ℹ️',
          iconBg: 'bg-mc-diamond',
          title: 'text-mc-diamond'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div 
      className={`
        pointer-events-auto max-w-sm w-80 bg-mc-ui-bg-dark border-4 ${styles.border} ${styles.bg}
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        animate-slide-in
      `}
      style={{
        animation: isExiting ? 'none' : 'slideInRight 0.3s ease-out'
      }}
    >
      {/* Progress bar */}
      <div 
        className={`h-1 ${styles.iconBg} animate-shrink`}
        style={{
          animation: `shrink ${toast.duration || 5000}ms linear forwards`
        }}
      />
      
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <span className="text-lg flex-shrink-0">{styles.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`${styles.title} text-sm font-bold mb-1`} style={{textShadow: '1px 1px #1B1B2F'}}>
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-mc-text-dark text-[10px] break-words">{toast.message}</p>
          )}
        </div>

        {/* Close button */}
        <button 
          onClick={handleClose}
          className="text-mc-text-dark hover:text-mc-text-light transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

// Add keyframes to index.html or use inline styles
export const ToastStyles = `
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
`;

export default ToastProvider;
