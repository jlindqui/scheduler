'use client';

import React, { useMemo } from 'react';
import { Agreement } from '@/app/lib/definitions';
import { getAgreementFile } from '@/app/actions/agreements';
import GenericAgreementTab from '@/components/shared/agreement-tab';

interface AgreementTabProps {
  currentAgreement: Agreement | null;
}

/**
 * Grievance-specific Agreement Tab
 * Wraps the generic AgreementTab with grievance-specific configuration
 */
export default function AgreementTab({
  currentAgreement,
}: AgreementTabProps) {
  // Create a mock entity with agreement for the generic component
  // This allows us to use the WithAgreement pattern while maintaining backward compatibility
  const entityWithAgreement = useMemo(() => ({
    id: 'grievance', // Not used by the generic component
    agreement: currentAgreement,
  }), [currentAgreement]);

  return (
    <GenericAgreementTab
      entity={entityWithAgreement}
      entityType="grievance"
      onFetchAgreementFile={getAgreementFile}
    />
  );
}
