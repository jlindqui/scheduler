'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PDFViewer from '@/app/ui/components/pdf-viewer';
import { Agreement, WithAgreement } from '@/app/lib/definitions';

/**
 * Generic Agreement Tab Props
 * Works with any entity type that has an agreement (Grievance, Complaint, Incident)
 */
interface AgreementTabProps<T extends { id: string }> {
  /** The entity with agreement (must have id and agreement) */
  entity: WithAgreement<T>;

  /** Type of entity for display purposes */
  entityType: 'grievance' | 'complaint' | 'incident';

  /** Action to fetch the agreement PDF file */
  onFetchAgreementFile: (source: string) => Promise<ArrayBuffer | Buffer | null>;

  /** Optional: Custom title for the card */
  title?: string;

  /** Optional: Custom description */
  description?: string;

  /** Optional: Custom empty state message */
  emptyStateMessage?: string;
}

/**
 * Generic Agreement Tab Component
 *
 * @example
 * // For Grievances
 * <AgreementTab
 *   entity={grievance}
 *   entityType="grievance"
 *   onFetchAgreementFile={getAgreementFile}
 * />
 *
 * // For Complaints
 * <AgreementTab
 *   entity={complaint}
 *   entityType="complaint"
 *   onFetchAgreementFile={getAgreementFile}
 * />
 */
export default function AgreementTab<T extends { id: string }>({
  entity,
  entityType,
  onFetchAgreementFile,
  title = 'Collective Agreement',
  description,
  emptyStateMessage = 'Select a collective agreement in the Overview tab to view it here',
}: AgreementTabProps<T>) {
  const [agreementPdfUrl, setAgreementPdfUrl] = useState<string | null>(null);
  const [isLoadingAgreementPdf, setIsLoadingAgreementPdf] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const currentAgreement = entity.agreement;

  // Auto-load PDF when component mounts or currentAgreement changes
  useEffect(() => {
    let isCancelled = false;

    const loadPdf = async () => {
      // Only load if we don't already have a URL and there's a source
      if (!currentAgreement?.source || agreementPdfUrl) return;

      setIsLoadingAgreementPdf(true);
      setLoadError(false);

      try {
        const blob = await onFetchAgreementFile(currentAgreement.source);
        if (!isCancelled && blob) {
          const pdfBlob = new Blob([new Uint8Array(blob)], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(pdfBlob);
          setAgreementPdfUrl(url);
        }
      } catch (error) {
        console.error('Error loading agreement PDF:', error);
        if (!isCancelled) {
          setLoadError(true);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAgreementPdf(false);
        }
      }
    };

    loadPdf();

    // Cleanup function to revoke the object URL when component unmounts
    return () => {
      isCancelled = true;
    };
  }, [currentAgreement?.source, agreementPdfUrl, onFetchAgreementFile]);

  // Cleanup PDF URL only when component unmounts completely
  useEffect(() => {
    return () => {
      if (agreementPdfUrl) {
        URL.revokeObjectURL(agreementPdfUrl);
      }
    };
  }, [agreementPdfUrl]);

  return (
    <Card className="shadow-lg border border-gray-200 overflow-hidden">
      <CardHeader className="pb-4 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <CardTitle className="text-xl font-bold text-gray-900">
            {title}
          </CardTitle>
        </div>
        <CardDescription>
          {description || currentAgreement?.name || 'No collective agreement selected'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center p-6">
        {currentAgreement?.source ? (
          isLoadingAgreementPdf ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <svg className="animate-spin h-12 w-12 mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600">Loading agreement...</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <svg className="w-16 h-16 mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Failed to load agreement
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                There was an error loading the PDF. Please try again later.
              </p>
            </div>
          ) : agreementPdfUrl ? (
            <PDFViewer
              pdfUrl={agreementPdfUrl}
              onDownload={() => {
                const link = document.createElement('a');
                link.href = agreementPdfUrl;
                link.download = currentAgreement.name + '.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            />
          ) : null
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg
              className="w-16 h-16 mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No collective agreement
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {emptyStateMessage}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
