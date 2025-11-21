'use client';

import { useState } from 'react';
import { processWithdrawal } from '@/app/actions/grievances';

interface WithdrawalFormProps {
  grievanceId: string;
  onClose: () => void;
}

export default function WithdrawalForm({ grievanceId, onClose }: WithdrawalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalDetails, setWithdrawalDetails] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawalDetails.trim()) {
      alert('Please provide withdrawal details');
      return;
    }

    setIsSubmitting(true);
    try {
      await processWithdrawal(grievanceId, withdrawalDetails);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      alert('Failed to process withdrawal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Withdraw Grievance</h2>
        
        <div className="space-y-4">
          <form id="withdrawalForm" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="withdrawal-details" className="block text-sm font-medium text-gray-700 mb-2">
                Withdrawal Details
              </label>
              <textarea
                id="withdrawal-details"
                name="withdrawal-details"
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Please provide details about the withdrawal..."
                value={withdrawalDetails}
                onChange={(e) => setWithdrawalDetails(e.target.value)}
                required
              />
            </div>
          </form>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="withdrawalForm"
              disabled={isSubmitting || !withdrawalDetails.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 