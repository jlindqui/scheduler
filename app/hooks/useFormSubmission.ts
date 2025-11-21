'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { handleClientError, ActionResult } from '@/app/lib/error-handling';
import { useSessionContext } from '@/app/components/SessionProvider';

interface UseFormSubmissionOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  redirectTo?: string;
  resetForm?: boolean;
}

export function useFormSubmission<T = any>(
  action: (...args: any[]) => Promise<ActionResult<T>>,
  options: UseFormSubmissionOptions = {}
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refreshSession } = useSessionContext();

  const submit = useCallback(async (...args: any[]) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await action(...args);

      if (!result.success) {
        // Handle different error types
        if (result.shouldRedirect && result.redirectTo) {
          if (result.code === 'SESSION_EXPIRED') {
            console.log('Session expired, redirecting to login...');
            setTimeout(() => {
              router.push(result.redirectTo!);
            }, 1500);
          } else {
            router.push(result.redirectTo);
          }
          return;
        }

        // Set error for display
        const errorMessage = result.error || 'An unexpected error occurred';
        setError(errorMessage);
        
        if (options.onError) {
          options.onError(errorMessage);
        }
        return;
      }

      // Success handling
      if (options.onSuccess) {
        options.onSuccess(result.data);
      }

      if (options.redirectTo) {
        router.push(options.redirectTo);
      }

      return result.data;

    } catch (error: any) {
      console.error('Form submission error:', error);
      
      // Handle session-related errors
      if (error?.message?.includes('session') || 
          error?.message?.includes('organization') ||
          error?.message?.includes('authenticated')) {
        
        console.log('Session issue detected, attempting to refresh...');
        
        try {
          await refreshSession();
          console.log('Session refreshed, please try again.');
        } catch (refreshError) {
          console.error('Session refresh failed, redirecting to login...');
          router.push('/login');
        }
        return;
      }

      // Generic error handling
      const errorMessage = error?.message || 'An unexpected error occurred';
      setError(errorMessage);
      
      if (options.onError) {
        options.onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [action, options, router, refreshSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submit,
    isSubmitting,
    error,
    clearError,
  };
}

// Specialized hook for form data submissions
export function useFormDataSubmission<T = any>(
  action: (formData: FormData) => Promise<ActionResult<T>>,
  options: UseFormSubmissionOptions = {}
) {
  const baseSubmission = useFormSubmission(action, options);

  const submitForm = useCallback(async (
    event: React.FormEvent<HTMLFormElement> | FormData
  ) => {
    let formData: FormData;

    if (event instanceof FormData) {
      formData = event;
    } else {
      event.preventDefault();
      formData = new FormData(event.currentTarget);
    }

    const result = await baseSubmission.submit(formData);
    
    // Reset form if successful and resetForm option is true
    if (result && options.resetForm && !(event instanceof FormData)) {
      (event.target as HTMLFormElement).reset();
    }

    return result;
  }, [baseSubmission, options.resetForm]);

  return {
    ...baseSubmission,
    submitForm,
  };
}

// Hook for handling server actions that don't return ActionResult
export function useLegacyFormSubmission(
  action: (...args: any[]) => Promise<any>,
  options: UseFormSubmissionOptions = {}
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refreshSession } = useSessionContext();

  const submit = useCallback(async (...args: any[]) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await action(...args);

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      if (options.redirectTo) {
        router.push(options.redirectTo);
      }

      return result;

    } catch (error: any) {
      console.error('Legacy form submission error:', error);
      handleClientError(error, setError);
      
      if (options.onError) {
        options.onError(error?.message || 'An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [action, options, router, refreshSession]);

  return {
    submit,
    isSubmitting,
    error,
    clearError: () => setError(null),
  };
} 