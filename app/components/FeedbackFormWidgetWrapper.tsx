'use client';

import { useCallback, memo } from 'react';
import FeedbackFormWidget from './FeedbackFormWidget';
import { createFeedback } from '@/app/actions/feedback';

interface FeedbackUser {
  id: string;
  name: string;
  email: string;
  organization?: {
    id: string;
    name: string;
  };
}

interface FeedbackFormWidgetWrapperProps {
  user: FeedbackUser;
}

const FeedbackFormWidgetWrapper = memo(function FeedbackFormWidgetWrapper({ user }: FeedbackFormWidgetWrapperProps) {
  const handleSaveFeedback = useCallback(async (payload: {
    feedback: string;
    category?: 'SERIOUS_ERROR' | 'MINOR_ERROR' | 'SUGGESTED_IMPROVEMENT' | 'SOMETHING_ELSE';
    user: FeedbackUser
  }) => {
    try {
      await createFeedback({
        feedback: payload.feedback,
        category: payload.category,
        organizationId: payload.user.organization?.id,
      });
    } catch (error) {
      console.error('Failed to save feedback:', error);
      throw error;
    }
  }, []); // No dependencies as it uses stable imports

  return (
    <FeedbackFormWidget
      user={user}
      onSave={handleSaveFeedback}
    />
  );
});

export default FeedbackFormWidgetWrapper;