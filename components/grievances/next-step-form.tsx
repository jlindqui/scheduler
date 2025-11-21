'use client';

import { useState } from 'react';
import { advanceToNextStep } from '@/app/actions/grievances';
import { GrievanceStage } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NextStepFormProps {
  open: boolean;
  grievanceId: string;
  currentStepNumber: number;
  currentStepStage: GrievanceStage;
  availableSteps: Array<{
    stepNumber: number;
    description: string;
    name?: string;
  }>;
  onClose: () => void;
}

export default function NextStepForm({
  open,
  grievanceId,
  currentStepNumber,
  currentStepStage,
  availableSteps,
  onClose
}: NextStepFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingIssues, setRemainingIssues] = useState('');

  // Find the next step
  const currentStep = availableSteps.find(step => step.stepNumber === currentStepNumber);
  const nextStep = availableSteps.find(step => step.stepNumber === currentStepNumber + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remainingIssues.trim()) {
      alert('Please provide details about the remaining issues or outcomes');
      return;
    }

    if (!nextStep) {
      alert('No next step available');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the new advanceToNextStep function
      await advanceToNextStep(grievanceId, remainingIssues);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error advancing to next step:', error);
      alert('Failed to advance to next step. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!nextStep) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Next Step Available</DialogTitle>
            <DialogDescription>
              This grievance has completed all available steps in the process.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Advance to Next Step</DialogTitle>
          <DialogDescription>
            Complete the current step and advance to the next step in the grievance process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">Advancing to:</p>
            <p className="text-sm text-blue-700 font-semibold">{nextStep.name}</p>
          </div>

          <form id="nextStepForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="remaining-issues" className="text-sm font-medium text-gray-900 mb-2 block">
                Remaining Issues <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="remaining-issues"
                name="remaining-issues"
                rows={5}
                placeholder="Please provide details about the outcomes of this step or any remaining issues..."
                value={remainingIssues}
                onChange={(e) => setRemainingIssues(e.target.value)}
                required
              />
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="nextStepForm"
            disabled={isSubmitting || !remainingIssues.trim()}
          >
            {isSubmitting ? 'Processing...' : 'Advance to Next Step'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 