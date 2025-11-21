'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, User, Send, X } from 'lucide-react';

type FeedbackUser = {
  id: string;
  name: string;
  email: string;
  organization?: {
    id: string;
    name: string;
  };
};

type FeedbackCategory = 'SERIOUS_ERROR' | 'MINOR_ERROR' | 'SUGGESTED_IMPROVEMENT' | 'SOMETHING_ELSE';

type FeedbackFormWidgetProps = {
  user: FeedbackUser;
  defaultFeedback?: string;
  defaultCategory?: FeedbackCategory;
  title?: string;
  saveLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
  initiallyOpen?: boolean;
  position?: "bottom-right" | "bottom-left";
  onOpenChange?: (open: boolean) => void;
  onSave: (payload: { feedback: string; category?: FeedbackCategory; user: FeedbackUser }) => Promise<void> | void;
  submitting?: boolean;
};

// Helper: Generate initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Helper: Click outside detection
// Click outside functionality removed - widget only closes via X button

// Helper: Focus trap
const useFocusTrap = (containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) => {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTab);
    };
  }, [containerRef, isActive]);
};

// Category options with user-friendly labels
const FEEDBACK_CATEGORIES = [
  { value: 'SERIOUS_ERROR', label: 'Serious error' },
  { value: 'MINOR_ERROR', label: 'Minor error' },
  { value: 'SUGGESTED_IMPROVEMENT', label: 'Suggested improvement' },
  { value: 'SOMETHING_ELSE', label: 'Something else' },
] as const;

export default function FeedbackFormWidget({
  user,
  defaultFeedback = '',
  defaultCategory,
  title = 'We value your feedback!',
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  maxLength = 1000,
  initiallyOpen = false,
  position = 'bottom-right',
  onOpenChange,
  onSave,
  submitting = false,
}: FeedbackFormWidgetProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [feedback, setFeedback] = useState(defaultFeedback);
  const [category, setCategory] = useState<FeedbackCategory | undefined>(defaultCategory);
  const [isSaving, setIsSaving] = useState(false);

  const fabRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const hasChanges = feedback !== defaultFeedback || category !== defaultCategory;
  const canSave = hasChanges && !submitting && !isSaving;

  const positionClasses = position === 'bottom-right'
    ? 'bottom-4 right-4'
    : 'bottom-4 left-4';

  const popupPositionClasses = position === 'bottom-right'
    ? 'bottom-16 right-0'
    : 'bottom-16 left-0';

  // Remove click-outside to close functionality
  // Widget should only close when clicking the X button

  useFocusTrap(dialogRef, isOpen);

  const handleToggle = useCallback(() => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  }, [isOpen, onOpenChange]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
    setTimeout(() => fabRef.current?.focus(), 100);
  }, [onOpenChange]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const result = onSave({ feedback, category, user });
      if (result instanceof Promise) {
        await result;
      }
      setFeedback('');
      setCategory(undefined);
      handleClose();
    } catch (error) {
      console.error('Failed to save feedback:', error);
    } finally {
      setIsSaving(false);
    }
  }, [canSave, feedback, category, user, onSave, handleClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  }, [isOpen, handleClose]);

  const handleFabKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  return (
    <>
      {/* Floating Action Button */}
      <Button
        ref={fabRef}
        onClick={handleToggle}
        onKeyDown={handleFabKeyDown}
        className={`fixed ${positionClasses} bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-0 h-12 px-4 rounded-full font-semibold`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Open ${title} form`}
      >
        <MessageSquare className="h-5 w-5 mr-2" />
        <span className="text-sm font-semibold">
          Feedback
        </span>
      </Button>

      {/* Feedback Form Popup */}
      {isOpen && (
        <div
          className={`fixed ${positionClasses} z-50 w-full`}
          onKeyDown={handleKeyDown}
        >
          <Card
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            aria-describedby="feedback-description"
            className={`absolute ${popupPositionClasses} w-full max-w-[26rem] sm:max-w-[28rem] shadow-lg border-0 border-t-4 border-t-blue-500 overflow-hidden`}
          >
            <CardHeader className="pb-4 bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle
                      ref={titleRef}
                      id="feedback-title"
                      className="text-xl font-bold text-gray-900 flex items-center"
                      tabIndex={-1}
                    >
                      <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
                      {title}
                    </CardTitle>
                    <CardDescription className="mt-1 space-y-1">
                      <p className="text-sm font-medium text-gray-700">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      {user.organization && (
                        <p className="text-xs text-gray-500">{user.organization.name}</p>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                  aria-label="Close feedback form"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Category Section */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Category
                  </Label>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={category || ''}
                      onValueChange={(value) => setCategory(value as FeedbackCategory || undefined)}
                      disabled={submitting || isSaving}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Select a category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {FEEDBACK_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Feedback Section */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Feedback <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="feedback-input"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value.slice(0, maxLength))}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Share your thoughts..."
                    className="min-h-[120px] resize-none bg-gray-50 p-4 rounded-lg text-sm"
                    disabled={submitting || isSaving}
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {feedback.length}/{maxLength}
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
                size="sm"
              >
                {cancelLabel}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : saveLabel}
              </Button>
            </div>

            {/* Hidden description for screen readers */}
            <p id="feedback-description" className="sr-only">
              Feedback form for {user.name}. Use Tab to navigate between fields, Escape to close.
            </p>
          </Card>
        </div>
      )}
    </>
  );
}
