'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';

export type ViewMode = 'super_admin' | 'org_admin' | 'member';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isViewingAs: (mode: ViewMode) => boolean;
  showGlobalSettings: boolean;
  setShowGlobalSettings: (show: boolean) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

interface ViewModeProviderProps {
  children: ReactNode;
  isSuperAdmin?: boolean;
}

export function ViewModeProvider({ children, isSuperAdmin = false }: ViewModeProviderProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('super_admin');
  const [showGlobalSettings, setShowGlobalSettings] = useState<boolean>(true);

  const isViewingAs = useCallback((mode: ViewMode): boolean => {
    if (!isSuperAdmin) {
      return false;
    }
    return viewMode === mode;
  }, [isSuperAdmin, viewMode]);

  const contextValue: ViewModeContextType = useMemo(() => ({
    viewMode: isSuperAdmin ? viewMode : 'member',
    setViewMode: isSuperAdmin ? setViewMode : () => {},
    isViewingAs,
    showGlobalSettings: isSuperAdmin ? showGlobalSettings : false,
    setShowGlobalSettings: isSuperAdmin ? setShowGlobalSettings : () => {},
  }), [isSuperAdmin, viewMode, isViewingAs, showGlobalSettings, setViewMode, setShowGlobalSettings]);

  return (
    <ViewModeContext.Provider value={contextValue}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

export function getEffectiveRole(
  actualIsSuperAdmin: boolean,
  actualUserRole: 'Admin' | 'Member' | undefined,
  viewMode: ViewMode
): { isSuperAdmin: boolean; userRole: 'Admin' | 'Member' | undefined } {
  if (!actualIsSuperAdmin) {
    return { isSuperAdmin: false, userRole: actualUserRole };
  }

  switch (viewMode) {
    case 'super_admin':
      return { isSuperAdmin: true, userRole: actualUserRole };
    case 'org_admin':
      return { isSuperAdmin: false, userRole: 'Admin' };
    case 'member':
      return { isSuperAdmin: false, userRole: 'Member' };
    default:
      return { isSuperAdmin: true, userRole: actualUserRole };
  }
}