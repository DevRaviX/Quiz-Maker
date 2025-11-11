import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import ReactDOM from 'react-dom';
import CheckIcon from '../icons/CheckIcon';
import XMarkIcon from '../icons/XMarkIcon';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

type ToastContextType = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast: React.FC<ToastMessage & { onDismiss: (id: number) => void }> = ({ id, message, type, onDismiss }) => {
  // Fix: useEffect was used without being imported.
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const baseClasses = 'flex items-center w-full max-w-xs p-4 my-2 text-white rounded-lg shadow-lg';
  const typeClasses = {
    success: 'bg-green-600 dark:bg-green-700',
    error: 'bg-red-600 dark:bg-red-700',
    warning: 'bg-yellow-500 dark:bg-yellow-600',
    info: 'bg-blue-600 dark:bg-blue-700',
  };
  const Icon = {
    success: <CheckIcon className="h-5 w-5"/>,
    error: <XMarkIcon className="h-5 w-5"/>,
    warning: <span className="text-xl font-bold">!</span>,
    info: <span className="text-xl font-bold">i</span>,
  }

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-black/20">
        {Icon[type]}
      </div>
      <div className="ml-3 text-sm font-normal">{message}</div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 p-1.5 inline-flex h-8 w-8 rounded-lg hover:bg-black/20 focus:ring-2 focus:ring-white"
        onClick={() => onDismiss(id)}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <XMarkIcon className="w-5 h-5"/>
      </button>
    </div>
  );
};


const ToastContainer: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => {
  return ReactDOM.createPortal(
    <div className="fixed top-5 right-5 z-[100]">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
};


export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};
