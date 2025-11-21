'use client';

import { createContext, useContext, ReactNode } from 'react';

interface ModalContextType {
  isOpen: boolean;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

export default function ModalProvider({ children }: { children: ReactNode }) {
  return (
    <ModalContext.Provider value={{ isOpen: false, onClose: () => {} }}>
      {children}
    </ModalContext.Provider>
  );
} 