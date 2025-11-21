'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateEmail } from '@/app/actions/llm/email-generation';
import { addDays, addBusinessDays } from 'date-fns';
import { formatSmartDate } from '@/lib/utils';
import type { Grievor, WorkInformation, EstablishedFacts } from '@/app/lib/definitions';
import type { GrievanceStep, GrievanceStatus } from '@prisma/client';

interface StepTemplate {
  stepNumber: number;
  name: string | null;
  description: string;
  timeLimit: string;
  timeLimitDays: number;
  isCalendarDays: boolean;
  requiredParticipants: string[];
  requiredDocuments: string[];
  notes?: string | null;
}

interface EmailsTabProps {
  grievanceId: string;
  statement: string;
  grievors: Grievor[];
  workInformation: WorkInformation;
  articlesViolated: string;
  settlementDesired: string;
  organizationType: "HR" | "Union" | "Local" | "LAW_FIRM";
  currentStatus: GrievanceStatus;
  establishedFacts: string | null;
  userName?: string;
  externalGrievanceId: string | null;
  currentStep?: GrievanceStep | null;
  availableSteps?: StepTemplate[];
}

export default function EmailsTab({
  grievanceId,
  statement,
  grievors,
  workInformation,
  articlesViolated,
  settlementDesired,
  organizationType,
  currentStatus,
  establishedFacts,
  userName,
  externalGrievanceId,
  currentStep,
  availableSteps,
}: EmailsTabProps) {
  const [customContext, setCustomContext] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailContent, setEmailContent] = useState('');

  const handleGenerateEmail = async (emailType: 'step_meeting' | 'follow_up' | 'information_request' | 'status_update') => {
    setIsGeneratingEmail(true);
    setEmailContent('');

    try {
      // Prepare step information if available
      let stepInfo = null;
      if (currentStep && availableSteps) {
        const currentStepTemplate = availableSteps.find(s => s.stepNumber === currentStep.stepNumber);
        const nextStepTemplate = availableSteps.find(s => s.stepNumber === currentStep.stepNumber + 1);

        if (currentStepTemplate) {
          // Calculate deadline if applicable
          let deadline = undefined;
          if (currentStepTemplate.timeLimitDays > 0) {
            const endDate = currentStepTemplate.isCalendarDays
              ? addDays(currentStep.createdAt, currentStepTemplate.timeLimitDays)
              : addBusinessDays(currentStep.createdAt, currentStepTemplate.timeLimitDays);
            deadline = formatSmartDate(endDate);
          }

          stepInfo = {
            currentStepNumber: currentStep.stepNumber,
            currentStepName: currentStepTemplate.name ?? undefined,
            currentStepStage: currentStep.stage,
            currentStepDescription: currentStepTemplate.description,
            currentStepDeadline: deadline,
            requiredParticipants: currentStepTemplate.requiredParticipants,
            requiredDocuments: currentStepTemplate.requiredDocuments,
            nextStepNumber: nextStepTemplate?.stepNumber,
            nextStepName: nextStepTemplate?.name ?? undefined,
          };
        }
      }

      const result = await generateEmail({
        grievanceId,
        emailType,
        statement,
        grievors,
        workInformation,
        articlesViolated,
        settlementDesired,
        organizationType,
        currentStatus,
        establishedFacts,
        customContext: customContext.trim() || undefined,
        userName,
        externalGrievanceId,
        stepInfo: stepInfo
      });

      if (result.success) {
        setEmailContent(result.content || '');
      } else {
        console.error('Email generation failed:', result.error);
        // Could show error toast here
      }
    } catch (error) {
      console.error('Error generating email:', error);
      // Could show error toast here
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!emailContent) return;

    try {
      await navigator.clipboard.writeText(emailContent);
      // Could show success toast here
    } catch (error) {
      console.error('Failed to copy email:', error);
      // Could show error toast here
    }
  };
  return (
    <Card className="shadow-lg border border-gray-200 overflow-hidden">
      <CardHeader className="pb-4 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <CardTitle className="text-xl font-bold text-gray-900">
            Draft Email
          </CardTitle>
        </div>
        <CardDescription>
          Type any context below, then click a button to generate the email.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Custom Context Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Additional Context (Optional)
          </label>
          <textarea
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            placeholder="Add any specific details, deadlines, or context that should be included in the email..."
            className="w-full h-20 text-sm border border-gray-200 rounded p-3 resize-none outline-none focus:border-blue-300"
            disabled={isGeneratingEmail}
          />
          <div className="text-xs text-gray-500">
            This information will be included when generating the email to make it more specific to your needs.
          </div>
        </div>

        {/* Email Template Selection */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto p-4 text-left flex flex-col items-start gap-2"
            onClick={() => handleGenerateEmail('step_meeting')}
            disabled={isGeneratingEmail}
          >
            <div className="font-medium">Step Meeting Request</div>
            <div className="text-xs text-gray-600">Invite parties to a grievance step meeting</div>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 text-left flex flex-col items-start gap-2"
            onClick={() => handleGenerateEmail('follow_up')}
            disabled={isGeneratingEmail}
          >
            <div className="font-medium">Follow-up</div>
            <div className="text-xs text-gray-600">Follow up on pending actions or responses</div>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 text-left flex flex-col items-start gap-2"
            onClick={() => handleGenerateEmail('information_request')}
            disabled={isGeneratingEmail}
          >
            <div className="font-medium">Information Request</div>
            <div className="text-xs text-gray-600">Request additional documents or details</div>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 text-left flex flex-col items-start gap-2"
            onClick={() => handleGenerateEmail('status_update')}
            disabled={isGeneratingEmail}
          >
            <div className="font-medium">General</div>
            <div className="text-xs text-gray-600">Provide any instructions in the context field above</div>
          </Button>
        </div>

        {/* Email Preview/Editor Area */}
        <div className="border rounded-lg bg-white">
          {isGeneratingEmail ? (
            <div className="p-8 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm">Generating email...</span>
              </div>
            </div>
          ) : emailContent ? (
            <div className="p-3">
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                className="w-full h-80 text-sm bg-white border border-gray-200 rounded p-3 resize-none outline-none focus:border-blue-300"
                placeholder="Email content will appear here..."
              />
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-sm text-gray-600">
                Select a template above to generate an email draft
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {emailContent && (
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setEmailContent('');
                setCustomContext('');
              }}
            >
              Clear
            </Button>
            <Button
              onClick={handleCopyEmail}
              disabled={!emailContent || isGeneratingEmail}
            >
              Copy to Clipboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
