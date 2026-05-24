import React, { createContext, useState, useContext, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

export const DialogContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    resolve: null,
  });

  const confirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback((result) => {
    setDialogState((prev) => {
      if (prev.resolve) prev.resolve(result);
      return { ...prev, isOpen: false };
    });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      {dialogState.isOpen && (
        <ConfirmDialog
          title={dialogState.title}
          message={dialogState.message}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      )}
    </DialogContext.Provider>
  );
};
