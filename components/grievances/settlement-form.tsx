'use client';

import { useState } from 'react';
import { processSettlement } from '@/app/actions/grievances';

interface SettlementFormProps {
  grievanceId: string;
  onClose: () => void;
}

export default function SettlementForm({ grievanceId, onClose }: SettlementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settlementDetails, setSettlementDetails] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementDetails.trim()) {
      alert('Please provide settlement details');
      return;
    }

    setIsSubmitting(true);
    try {
      await processSettlement(grievanceId, settlementDetails);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error processing settlement:', error);
      alert('Failed to process settlement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settle Grievance</h2>
        
        <div className="space-y-4">
          <form id="settlementForm" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="settlement-details" className="block text-sm font-medium text-gray-700 mb-2">
                Settlement Details
              </label>
              <textarea
                id="settlement-details"
                name="settlement-details"
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Please provide details about the settlement..."
                value={settlementDetails}
                onChange={(e) => setSettlementDetails(e.target.value)}
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
              form="settlementForm"
              disabled={isSubmitting || !settlementDetails.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Settlement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 