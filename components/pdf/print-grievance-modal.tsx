"use client";

import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GrievanceDocument } from './grievance-document';
import { Evidence, Grievor, WorkInformation } from '@/app/lib/definitions';

export interface PageSelections {
  coverPage: boolean;
  tableOfContents: boolean;
  organizationInfo: boolean;
  grievanceDetails: boolean;
  workInfoStatement: boolean;
  aiSummary: boolean;
  evidenceTimeline: boolean;
  collectiveAgreement: boolean;
  notes: boolean;
  resolution: boolean;
}

export interface GrievanceNote {
  id: string;
  grievanceId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface PrintGrievanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  grievanceId: string;
  externalGrievanceId?: string | null;
  grievanceType: 'INDIVIDUAL' | 'GROUP' | 'POLICY';
  category?: string | null;
  status: string;
  filedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  statement?: string;
  articlesViolated?: string | null;
  settlementDesired?: string;
  grievors?: Grievor[];
  workInformation?: WorkInformation;
  evidence?: Evidence[];
  bargainingUnit: string;
  organizationName?: string;
  organizationType?: string | null;
  userTimezone?: string | null;
  logoUrl?: string;
  currentStep?: string | null;
  aiSummary?: string | null;
  establishedFacts?: string | null;
  collectiveAgreement?: {
    id: string;
    name: string;
    effectiveDate: Date;
    expiryDate: Date;
  } | null;
  notes?: GrievanceNote[];
  resolutionDetails?: {
    resolutionType?: string;
    resolutionDate?: string;
    outcomes?: string;
    details?: string;
  } | null;
}

export function PrintGrievanceModal({
  isOpen,
  onClose,
  ...documentProps
}: PrintGrievanceModalProps) {
  const [pageSelections, setPageSelections] = useState<PageSelections>({
    coverPage: true,
    tableOfContents: false,
    organizationInfo: !!documentProps.organizationName,
    grievanceDetails: true,
    workInfoStatement: true,
    aiSummary: !!documentProps.aiSummary,
    evidenceTimeline: !!documentProps.evidence && documentProps.evidence.length > 0,
    collectiveAgreement: !!documentProps.collectiveAgreement,
    notes: !!documentProps.notes && documentProps.notes.length > 0,
    resolution: !!documentProps.resolutionDetails?.outcomes,
  });

  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Page order for reordering (excludes cover and TOC)
  const [pageOrder, setPageOrder] = useState<Array<keyof PageSelections>>([
    'organizationInfo',
    'grievanceDetails',
    'workInfoStatement',
    'aiSummary',
    'evidenceTimeline',
    'collectiveAgreement',
    'notes',
    'resolution',
  ]);

  const handleClose = () => {
    onClose();
  };

  const togglePage = (page: keyof PageSelections) => {
    setPageSelections(prev => ({ ...prev, [page]: !prev[page] }));
  };

  const movePageUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...pageOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setPageOrder(newOrder);
    }
  };

  const movePageDown = (index: number) => {
    if (index < pageOrder.length - 1) {
      const newOrder = [...pageOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setPageOrder(newOrder);
    }
  };

  const handlePreview = async () => {
    if (isGeneratingPreview) return;

    setIsGeneratingPreview(true);
    try {
      // Generate PDF blob and open in new tab
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <GrievanceDocument {...documentProps} pageSelections={pageSelections} pageOrder={pageOrder} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const fileName = `Grievance_${documentProps.externalGrievanceId || documentProps.grievanceId}_${new Date().toISOString().split('T')[0]}.pdf`;

  const getPageLabel = (key: keyof PageSelections): string => {
    const labels: Record<keyof PageSelections, string> = {
      coverPage: 'Cover Page',
      tableOfContents: 'Table of Contents',
      organizationInfo: 'Organization Information',
      grievanceDetails: 'Grievance Details',
      workInfoStatement: 'Grievance Statement',
      aiSummary: 'AI-Generated Summary',
      evidenceTimeline: 'Evidence & Facts',
      collectiveAgreement: 'Collective Agreement',
      notes: 'Internal Notes',
      resolution: 'Resolution Details',
    };
    return labels[key];
  };

  const getPageDescription = (key: keyof PageSelections): string => {
    const descriptions: Record<keyof PageSelections, string> = {
      coverPage: 'Professional cover page with case number, bargaining unit logo, and document type',
      tableOfContents: 'Automatically generated table of contents based on selected pages',
      organizationInfo: 'Organization name and type information',
      grievanceDetails: 'Case information, type, status, filing date, and grievor information',
      workInfoStatement: 'Work information, statement of grievance, articles violated, and settlement desired',
      aiSummary: 'AI-powered analysis and summary of the grievance case',
      evidenceTimeline: `Established facts and chronological timeline of all evidence (${documentProps.evidence?.length || 0} items)`,
      collectiveAgreement: 'Collective agreement name and effective dates',
      notes: `Internal notes from team members (${documentProps.notes?.length || 0} notes)`,
      resolution: 'Resolution type, date, and outcomes of the grievance',
    };
    return descriptions[key];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Grievance Document
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive PDF document for Case #{documentProps.externalGrievanceId || documentProps.grievanceId}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 px-6 space-y-6 overflow-y-auto max-h-[calc(90vh-250px)]">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    Select pages to include in your PDF
                  </h4>
                  <p className="text-xs text-blue-700">
                    Choose which sections you want to include in the generated document
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Fixed Pages</h4>

              {/* Cover Page */}
              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="coverPage"
                  checked={pageSelections.coverPage}
                  onCheckedChange={() => togglePage('coverPage')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="coverPage" className="text-sm font-medium text-gray-900 cursor-pointer">
                    {getPageLabel('coverPage')}
                  </label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {getPageDescription('coverPage')}
                  </p>
                </div>
              </div>

              {/* Table of Contents */}
              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="tableOfContents"
                  checked={pageSelections.tableOfContents}
                  onCheckedChange={() => togglePage('tableOfContents')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="tableOfContents" className="text-sm font-medium text-gray-900 cursor-pointer">
                    {getPageLabel('tableOfContents')}
                  </label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {getPageDescription('tableOfContents')}
                  </p>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-900 mb-3 mt-6">
                Content Pages
                <span className="text-xs font-normal text-gray-600 ml-2">(Reorderable - use arrows to rearrange)</span>
              </h4>

              {/* Dynamic reorderable pages */}
              {pageOrder.map((pageKey, index) => {
                // Skip pages that don't have content
                if (pageKey === 'organizationInfo' && !documentProps.organizationName) return null;
                if (pageKey === 'aiSummary' && !documentProps.aiSummary) return null;
                if (pageKey === 'evidenceTimeline' && (!documentProps.evidence || documentProps.evidence.length === 0)) return null;
                if (pageKey === 'collectiveAgreement' && !documentProps.collectiveAgreement) return null;
                if (pageKey === 'notes' && (!documentProps.notes || documentProps.notes.length === 0)) return null;
                if (pageKey === 'resolution' && !documentProps.resolutionDetails?.outcomes) return null;

                return (
                  <div key={pageKey} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <Checkbox
                      id={pageKey}
                      checked={pageSelections[pageKey]}
                      onCheckedChange={() => togglePage(pageKey)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor={pageKey} className="text-sm font-medium text-gray-900 cursor-pointer">
                        {getPageLabel(pageKey)}
                      </label>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {getPageDescription(pageKey)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => movePageUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => movePageDown(index)}
                        disabled={index === pageOrder.length - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <span className="text-xs font-medium text-gray-600">Case Number</span>
                <p className="text-sm font-semibold text-gray-900">{documentProps.externalGrievanceId || documentProps.grievanceId}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">Type</span>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {documentProps.grievanceType.toLowerCase()}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">Bargaining Unit</span>
                <p className="text-sm font-semibold text-gray-900">{documentProps.bargainingUnit}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">Status</span>
                <p className="text-sm font-semibold text-gray-900">{documentProps.status}</p>
              </div>
            </div>
          </div>

        <DialogFooter className="flex justify-between items-center gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={isGeneratingPreview}
            >
              {isGeneratingPreview ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Preview in New Tab
                </>
              )}
            </Button>
            <PDFDownloadLink
              key={JSON.stringify(pageSelections)}
              document={<GrievanceDocument {...documentProps} pageSelections={pageSelections} pageOrder={pageOrder} />}
              fileName={fileName}
            >
              {({ loading }) => (
                <Button
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </>
                  )}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
