'use client';

import React, { useState } from 'react';
import { addDays, addBusinessDays, format } from 'date-fns';
import { formatSmartDate, formatSmartDateTime } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AgreementSelector from '@/components/grievances/agreement-selector';
import DisciplineCacheViewer from '@/components/grievances/discipline-cache-viewer';
import { fetchGrievanceNotes } from '@/app/actions/grievances';
import { regenerateAISummary, generateGrievanceAssessment } from '@/app/actions/grievances';
import { generateAssessmentPDF } from '@/app/actions/llm/assessment-pdf';
import type {
  Grievor,
  WorkInformation,
  Agreement,
  GrievanceListItem,
  GrievanceDetail,
  AgreementStepTemplate,
} from '@/app/lib/definitions';
import type { GrievanceStatus, GrievanceStep } from '@prisma/client';

interface OverviewTabProps {
  grievanceId: string;
  grievance: GrievanceDetail;
  grievanceDetails: GrievanceListItem;
  agreements: Agreement[];
  currentAgreement: Agreement | null;
  currentStep?: GrievanceStep | null;
  availableSteps?: AgreementStepTemplate[];
  aiSummary?: string | null;
  assessment?: string | null;
  assessmentGeneratedAt?: Date | null;
  effectiveIsSuperAdmin: boolean;
  onTimelineModalOpen: () => void;
  onWithdrawalFormOpen: () => void;
  onSettlementFormOpen: () => void;
  onNextStepFormOpen: () => void;
  onCostModalOpen: () => void;
  onPrintModalOpen: (notes: any[]) => void;
  onShowNotification: (message: string) => void;
}

export default function OverviewTab({
  grievanceId,
  grievance,
  grievanceDetails,
  agreements,
  currentAgreement,
  currentStep,
  availableSteps,
  aiSummary,
  assessment,
  assessmentGeneratedAt,
  effectiveIsSuperAdmin,
  onTimelineModalOpen,
  onWithdrawalFormOpen,
  onSettlementFormOpen,
  onNextStepFormOpen,
  onCostModalOpen,
  onPrintModalOpen,
  onShowNotification,
}: OverviewTabProps) {
  const [isOriginalInfoExpanded, setIsOriginalInfoExpanded] = useState(false);
  const [isGrievanceExpanded, setIsGrievanceExpanded] = useState(() => {
    return grievanceDetails.status === ("ACTIVE" as GrievanceStatus);
  });
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleRegenerateSummary = async () => {
    if (isRegeneratingSummary) return;

    setIsRegeneratingSummary(true);
    try {
      const result = await regenerateAISummary(grievanceId);
      if (result.success) {
        onShowNotification("AI summary regenerated successfully");
        // The page will automatically reload due to revalidatePath in the server action
      } else {
        onShowNotification(result.error || "Failed to regenerate summary");
      }
    } catch (error) {
      console.error("Failed to regenerate summary:", error);
      onShowNotification("Failed to regenerate summary");
    } finally {
      setIsRegeneratingSummary(false);
    }
  };

  const handlePrintClick = async () => {
    try {
      const notes = await fetchGrievanceNotes(grievanceId);
      onPrintModalOpen(notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      onPrintModalOpen([]);
    }
  };

  const handleGenerateAssessment = async () => {
    if (isGeneratingAssessment) return;

    setIsGeneratingAssessment(true);
    try {
      const result = await generateGrievanceAssessment(grievanceId);
      if (result.success) {
        onShowNotification("Assessment generated successfully");
        // The page will automatically reload due to revalidatePath in the server action
      } else {
        onShowNotification("Failed to generate assessment");
      }
    } catch (error) {
      console.error("Failed to generate assessment:", error);
      onShowNotification("Failed to generate assessment");
    } finally {
      setIsGeneratingAssessment(false);
    }
  };

  const handlePrintAssessment = async () => {
    if (isGeneratingPDF || !assessment || !assessmentGeneratedAt) return;

    setIsGeneratingPDF(true);
    try {
      const result = await generateAssessmentPDF({
        grievanceId,
        assessment,
        assessmentGeneratedAt,
      });

      if (!result.success || !result.pdfBase64) {
        throw new Error(result.error || 'Failed to generate PDF');
      }

      // Convert base64 to blob and create download link
      const byteCharacters = atob(result.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Create a download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `grievance-assessment-${grievanceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onShowNotification("Assessment PDF downloaded successfully");
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      onShowNotification("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <>
      {/* Grievance Overview Card - Key information at a glance */}
      <Card className="shadow-lg border-0 border-t-4 border-t-slate-500 overflow-hidden">
        <CardHeader className="pb-4 bg-slate-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Grievance Overview</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-4">
                <span>Filed on {grievance.filedAt ? formatSmartDate(new Date(grievance.filedAt)) : "Unknown"}</span>
                {grievanceDetails.category && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                    {grievanceDetails.category}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <AgreementSelector
                grievanceId={grievanceId}
                agreements={agreements}
                currentAgreementId={currentAgreement?.id}
              />

              {/* Tools Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                    Tools
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Actions Section */}
                  {grievanceDetails.status === ("ACTIVE" as GrievanceStatus) && (
                    <>
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>

                      {/* Next Step */}
                      {currentStep &&
                        availableSteps &&
                        availableSteps.some(
                          (step) => step.stepNumber === currentStep.stepNumber + 1
                        ) && (
                          <DropdownMenuItem onClick={onNextStepFormOpen}>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            Next Step
                          </DropdownMenuItem>
                        )}

                      <DropdownMenuItem onClick={onSettlementFormOpen}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Settle Grievance
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={onWithdrawalFormOpen}
                        className="text-destructive focus:text-destructive"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Withdraw Grievance
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuLabel>Management</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleGenerateAssessment} disabled={isGeneratingAssessment}>
                    {isGeneratingAssessment ? (
                      <>
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Assess Grievance
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrintClick}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCostModalOpen}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Cost Estimation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Metadata row */}
          <div className="border-b border-gray-200 pb-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 font-medium">Bargaining Unit:</span>
                <div className="mt-1 font-semibold text-gray-900">
                  {grievanceDetails.bargainingUnit.name}
                </div>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Type:</span>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 capitalize">
                    {grievance.type.toLowerCase()}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Category:</span>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 capitalize">
                    {grievance.category || "Not categorized"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Status:</span>
                <div className="mt-1">
                  <button
                    onClick={onTimelineModalOpen}
                    className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium cursor-pointer bg-gray-100 text-gray-800 hover:bg-gray-200 hover:shadow-md transition-all duration-200"
                    title="Click to view timeline"
                  >
                    {currentStep ? (
                      <>
                        {(() => {
                          // Show current step name if available
                          if (availableSteps) {
                            const stepTemplate = availableSteps.find(
                              (step) => step.stepNumber === currentStep.stepNumber
                            );
                            if (stepTemplate?.name) {
                              return stepTemplate.name;
                            }
                          }
                          // Fallback to grievanceDetails.currentStep or Step X
                          return (
                            grievanceDetails.currentStep ||
                            `Step ${currentStep.stepNumber}`
                          );
                        })()}
                        {availableSteps && (() => {
                          const stepTemplate = availableSteps.find(
                            (step) => step.stepNumber === currentStep.stepNumber
                          );
                          if (!stepTemplate) return null;

                          // For 0-day timelines, don't show anything
                          if (stepTemplate.timeLimitDays === 0) {
                            return null;
                          }

                          const endDate = stepTemplate.isCalendarDays
                            ? addDays(currentStep.createdAt, stepTemplate.timeLimitDays)
                            : addBusinessDays(currentStep.createdAt, stepTemplate.timeLimitDays);
                          const today = new Date();
                          const todayStart = new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            today.getDate()
                          );
                          const endDateStart = new Date(
                            endDate.getFullYear(),
                            endDate.getMonth(),
                            endDate.getDate()
                          );
                          const isOverdue = endDateStart < todayStart;
                          return (
                            <span className={`ml-1 ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                              • Due {formatSmartDate(endDate)}
                            </span>
                          );
                        })()}
                      </>
                    ) : (
                      grievanceDetails.status
                    )}
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Original Grievance Information */}
          {(grievance.report?.statement || grievance.report?.articlesViolated || grievance.report?.settlementDesired) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsOriginalInfoExpanded(!isOriginalInfoExpanded)}
                className="flex items-center justify-between w-full text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors duration-200"
              >
                <span className="text-sm font-medium text-gray-600">Original Grievance Details</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    isOriginalInfoExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOriginalInfoExpanded && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Statement */}
                  {grievance.report?.statement && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Statement of Grievance
                      </h4>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {grievance.report.statement}
                      </p>
                    </div>
                  )}

                  {/* Articles Violated */}
                  {grievance.report?.articlesViolated && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                        Articles Violated
                      </h4>
                      <p className="text-sm text-blue-900">
                        {grievance.report.articlesViolated}
                      </p>
                    </div>
                  )}

                  {/* Settlement Desired */}
                  {grievance.report?.settlementDesired && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
                        Settlement Desired
                      </h4>
                      <p className="text-sm text-green-900 whitespace-pre-wrap">
                        {grievance.report.settlementDesired}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>

      {/* AI Summary Card */}
      {aiSummary && (
        <Card className="shadow-lg border border-gray-200 overflow-hidden">
          <CardHeader className="pb-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl font-bold text-gray-900">
                  AI Summary
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegenerateSummary();
                  }}
                  disabled={isRegeneratingSummary}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  title="Regenerate summary with current evidence"
                >
                  {isRegeneratingSummary ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
                    </>
                  )}
                </button>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setIsGrievanceExpanded(!isGrievanceExpanded)}
                >
                  {isGrievanceExpanded ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </CardHeader>
          {isGrievanceExpanded && (
            <CardContent className="p-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {aiSummary}
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Assessment Card */}
      {assessment && (
        <Card className="shadow-lg border-0 border-t-4 border-t-blue-600 overflow-hidden">
          <CardHeader className="pb-4 bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl font-bold text-gray-900">
                  Grievance Assessment
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {assessmentGeneratedAt && (
                  <span className="text-xs text-gray-500">
                    Generated {formatSmartDateTime(assessmentGeneratedAt)}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintAssessment();
                  }}
                  disabled={isGeneratingPDF}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  title="Download assessment as PDF"
                >
                  {isGeneratingPDF ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Print PDF
                    </>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateAssessment();
                  }}
                  disabled={isGeneratingAssessment}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  title="Regenerate assessment with current evidence"
                >
                  {isGeneratingAssessment ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsGrievanceExpanded(!isGrievanceExpanded)}
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  <svg
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isGrievanceExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </CardHeader>
          {isGrievanceExpanded && (
            <CardContent className="p-6">
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="prose prose-base max-w-none
                  prose-headings:font-bold prose-headings:text-slate-900 prose-headings:mb-3 prose-headings:mt-6
                  prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                  prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-4
                  prose-strong:text-slate-900 prose-strong:font-semibold
                  prose-ul:my-4 prose-ul:text-slate-700 prose-li:my-2
                  prose-ol:my-4 prose-ol:text-slate-700">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-900 mb-4 mt-6 first:mt-0 border-b border-slate-300 pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold text-blue-900 mb-3 mt-6 first:mt-0" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-800 mb-3 mt-4 first:mt-0" {...props} />,
                      p: ({node, ...props}) => <p className="text-slate-700 leading-relaxed mb-4" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 my-4 space-y-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-4 space-y-2" {...props} />,
                      li: ({node, ...props}) => <li className="text-slate-700" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                    }}
                  >
                    {assessment}
                  </ReactMarkdown>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Outcomes Card */}
      {(grievanceDetails.resolutionDetails?.outcomes ||
        grievanceDetails.resolutionDetails?.details) && (
        <Card className="shadow-lg border-0 border-t-4 border-t-green-500 overflow-hidden">
          <CardHeader className="pb-4 bg-green-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900">
                Resolution
              </CardTitle>
              <div className="flex items-center gap-2">
                {grievanceDetails.resolutionDetails.resolutionType && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
                    ${
                      grievanceDetails.resolutionDetails
                        .resolutionType === "SETTLED"
                        ? "bg-green-100 text-green-800"
                        : grievanceDetails.resolutionDetails
                              .resolutionType === "WITHDRAWN"
                          ? "bg-yellow-100 text-yellow-800"
                          : grievanceDetails.resolutionDetails
                                .resolutionType === "RESOLVED_ARBITRATION"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {grievanceDetails.resolutionDetails.resolutionType.replace(
                      /_/g,
                      " "
                    )}
                  </span>
                )}
                {grievanceDetails.resolutionDetails.resolutionDate && (
                  <span className="text-sm text-gray-600">
                    {format(
                      new Date(
                        grievanceDetails.resolutionDetails.resolutionDate
                      ),
                      "MMM d, yyyy"
                    )}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-700">
                {grievanceDetails.resolutionDetails.outcomes ||
                  grievanceDetails.resolutionDetails.details}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Super Admin Only: Discipline Cache Data */}
      {effectiveIsSuperAdmin && (
        <DisciplineCacheViewer grievanceId={grievanceId} />
      )}
    </>
  );
}
