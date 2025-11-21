'use client';

import { ViewModeProvider } from '@/app/contexts/ViewModeContext';
import { ReactNode, memo } from 'react';

interface ViewModeProviderWrapperProps {
  children: ReactNode;
  isSuperAdmin: boolean;
}

const ViewModeProviderWrapper = memo(function ViewModeProviderWrapper({ children, isSuperAdmin }: ViewModeProviderWrapperProps) {
  return (
    <ViewModeProvider isSuperAdmin={isSuperAdmin}>
      {children}
    </ViewModeProvider>
  );
});

export default ViewModeProviderWrapper;