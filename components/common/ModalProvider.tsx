import React, { useState, useCallback, createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import Button from './Button';

interface ModalOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

type ModalContextType = (options: ModalOptions) => void;

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

const Modal: React.FC<ModalOptions & { hideModal: () => void }> = ({ title, message, onConfirm, onCancel, hideModal }) => {
  const handleConfirm = () => {
    onConfirm();
    hideModal();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    hideModal();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 animate-fade-in-fast" onClick={handleCancel}>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button onClick={handleCancel} variant="secondary">Cancel</Button>
          <Button onClick={handleConfirm} variant="danger">Confirm</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalOptions | null>(null);

  const showModal = useCallback((options: ModalOptions) => {
    setModal(options);
  }, []);

  const hideModal = useCallback(() => {
    setModal(null);
  }, []);

  return (
    <ModalContext.Provider value={showModal}>
      {children}
      {modal && <Modal {...modal} hideModal={hideModal} />}
    </ModalContext.Provider>
  );
};

const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in-fast {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fade-in-fast {
    animation: fade-in-fast 0.2s ease-out forwards;
  }
`;
document.head.appendChild(style);
