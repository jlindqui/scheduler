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
import { ScenarioDocument } from './scenario-document';

export interface PageSelections {
  coverPage: boolean;
  scenarioDescription: boolean;
  relevantProvisions: boolean;
  assessment: boolean;
}

interface PrintScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: string;
  agreementName: string;
  relevantAgreementSections: string;
  analysis: string;
}

export function PrintScenarioModal({
  isOpen,
  onClose,
  scenario,
  agreementName,
  relevantAgreementSections,
  analysis,
}: PrintScenarioModalProps) {
  const [pageSelections, setPageSelections] = useState<PageSelections>({
    coverPage: true,
    scenarioDescription: true,
    relevantProvisions: !!relevantAgreementSections,
    assessment: !!analysis,
  });

  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const generatedDate = new Date();

  const handleClose = () => {
    onClose();
  };

  const togglePage = (page: keyof PageSelections) => {
    setPageSelections(prev => ({ ...prev, [page]: !prev[page] }));
  };

  const handlePreview = async () => {
    if (isGeneratingPreview) return;

    setIsGeneratingPreview(true);
    try {
      // Generate PDF blob and open in new tab
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <ScenarioDocument
          scenario={scenario}
          agreementName={agreementName}
          relevantAgreementSections={relevantAgreementSections}
          analysis={analysis}
          generatedDate={generatedDate}
          pageSelections={pageSelections}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const fileName = `Rough_Justice_Scenario_${new Date().toISOString().split('T')[0]}.pdf`;

  const getPageLabel = (key: keyof PageSelections): string => {
    const labels: Record<keyof PageSelections, string> = {
      coverPage: 'Cover Page',
      scenarioDescription: 'Scenario Description',
      relevantProvisions: 'Relevant Agreement Provisions',
      assessment: 'Assessment & Analysis',
    };
    return labels[key];
  };

  const getPageDescription = (key: keyof PageSelections): string => {
    const descriptions: Record<keyof PageSelections, string> = {
      coverPage: 'Professional cover page with title, generation date, and agreement name',
      scenarioDescription: 'The scenario description and collective agreement details',
      relevantProvisions: 'Relevant sections from the collective agreement',
      assessment: 'AI-generated assessment, analysis, and recommendations',
    };
    return descriptions[key];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Scenario Analysis
          </DialogTitle>
          <DialogDescription>
            Generate a PDF document for your scenario analysis
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
            {/* Cover Page */}
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
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

            {/* Scenario Description */}
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
              <Checkbox
                id="scenarioDescription"
                checked={pageSelections.scenarioDescription}
                onCheckedChange={() => togglePage('scenarioDescription')}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="scenarioDescription" className="text-sm font-medium text-gray-900 cursor-pointer">
                  {getPageLabel('scenarioDescription')}
                </label>
                <p className="text-xs text-gray-600 mt-0.5">
                  {getPageDescription('scenarioDescription')}
                </p>
              </div>
            </div>

            {/* Relevant Agreement Provisions */}
            {relevantAgreementSections && (
              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                <Checkbox
                  id="relevantProvisions"
                  checked={pageSelections.relevantProvisions}
                  onCheckedChange={() => togglePage('relevantProvisions')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="relevantProvisions" className="text-sm font-medium text-gray-900 cursor-pointer">
                    {getPageLabel('relevantProvisions')}
                  </label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {getPageDescription('relevantProvisions')}
                  </p>
                </div>
              </div>
            )}

            {/* Assessment */}
            {analysis && (
              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                <Checkbox
                  id="assessment"
                  checked={pageSelections.assessment}
                  onCheckedChange={() => togglePage('assessment')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="assessment" className="text-sm font-medium text-gray-900 cursor-pointer">
                    {getPageLabel('assessment')}
                  </label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {getPageDescription('assessment')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <span className="text-xs font-medium text-gray-600">Agreement</span>
              <p className="text-sm font-semibold text-gray-900">{agreementName}</p>
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
              document={
                <ScenarioDocument
                  scenario={scenario}
                  agreementName={agreementName}
                  relevantAgreementSections={relevantAgreementSections}
                  analysis={analysis}
                  generatedDate={generatedDate}
                  pageSelections={pageSelections}
                />
              }
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
