'use client';

import React from 'react';
import { Grievor, GrievanceWithEvidence } from '@/app/lib/definitions';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EstablishedFacts from '@/components/grievances/established-facts';
import DownloadAllEvidenceButton from '@/components/grievances/download-all-evidence-button';
import InlineEvidenceUpload from '@/components/grievances/inline-evidence-upload';
import { deleteGrievanceEvidence } from '@/app/actions/grievances';
import GenericEvidenceTab from '@/components/shared/evidence-tab';

interface EstablishedFactsType {
  id: string;
  grievanceId: string;
  facts: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EvidenceTabProps {
  grievance: GrievanceWithEvidence;
  statement: string;
  grievors: Grievor[];
  workInformation: any;
  articlesViolated?: string;
  settlementDesired?: string;
  initialEstablishedFacts?: EstablishedFactsType | null;
  grievanceType?: string;
  onShowNotification: (message: string) => void;
}

/**
 * Grievance-specific Evidence Tab
 * Wraps the generic EvidenceTab with grievance-specific components and actions
 */
export default function EvidenceTab({
  grievance,
  statement,
  grievors,
  workInformation,
  articlesViolated,
  settlementDesired,
  initialEstablishedFacts,
  grievanceType,
  onShowNotification,
}: EvidenceTabProps) {
  const handleEvidenceAdded = () => {
    onShowNotification("Evidence added successfully");
  };

  return (
    <GenericEvidenceTab
      entity={grievance}
      entityType="grievance"
      onShowNotification={onShowNotification}
      onDeleteEvidence={deleteGrievanceEvidence}
      analysisComponent={
        <>
          <CardHeader className="pb-4 bg-gray-50 border-b">
            <CardTitle className="text-xl font-bold text-gray-900">
              Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <EstablishedFacts
              grievanceId={grievance.id}
              statement={statement}
              evidence={grievance.evidence}
              grievors={grievors}
              workInformation={workInformation}
              articlesViolated={articlesViolated}
              settlementDesired={settlementDesired}
              initialFacts={initialEstablishedFacts}
              grievanceType={grievanceType}
              showButtonsAtBottom={true}
            />
          </CardContent>
        </>
      }
      downloadComponent={
        <DownloadAllEvidenceButton
          grievanceId={grievance.id}
          evidenceCount={grievance.evidence.length}
        />
      }
      uploadComponent={
        <InlineEvidenceUpload
          grievanceId={grievance.id}
          onEvidenceAdded={handleEvidenceAdded}
        />
      }
    />
  );
}
