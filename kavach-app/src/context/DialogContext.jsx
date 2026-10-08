import { createContext, useState, useContext, useCallback, useRef } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

// eslint-disable-next-line react-refresh/only-export-components
export const DialogContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useConfirm must be used within a DialogProvider');
  return context;
};

// confirm(title, message, { confirmLabel, destructive }) → Promise<boolean>
export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((title, message, options = {}) => {
    resolveRef.current?.(false); // settle any dialog that is being replaced
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ title, message, ...options });
    });
  }, []);

  const close = useCallback((result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          destructive={dialog.destructive}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      )}
    </DialogContext.Provider>
  );
};
