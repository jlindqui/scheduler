'use client';

import { useState } from 'react';
import { Agreement } from '@/app/lib/definitions';
import { useUpdateGrievanceAgreement } from '@/hooks/use-grievances';

interface AgreementSelectorProps {
  grievanceId: string;
  agreements: Agreement[];
  currentAgreementId: string | undefined;
}

export default function AgreementSelector({ 
  grievanceId, 
  agreements, 
  currentAgreementId 
}: AgreementSelectorProps) {
  const [selectedAgreementId, setSelectedAgreementId] = useState(currentAgreementId || '');
  const updateAgreementMutation = useUpdateGrievanceAgreement();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgreementId = e.target.value;
    
    // Optimistic UI update
    setSelectedAgreementId(newAgreementId);
    
    // Create form data
    const formData = new FormData();
    formData.append('grievance_id', grievanceId);
    formData.append('agreement_id', newAgreementId);
    
    try {
      // Use React Query mutation - it handles optimistic updates automatically
      await updateAgreementMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Error updating agreement:', error);
      // Revert the optimistic update on error
      setSelectedAgreementId(currentAgreementId || '');
    }
  };

  return (
    <select
      id="agreement_id"
      name="agreement_id"
      className="text-sm text-gray-500 rounded-lg px-2 py-1 pr-8 border border-gray-200 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
      value={selectedAgreementId}
      onChange={handleChange}
      disabled={updateAgreementMutation.isPending}
    >
      <option value="" disabled>Choose a collective agreement</option>
      {agreements.map((agreement: Agreement) => (
        <option 
          key={agreement.id} 
          value={agreement.id}
        >
          {agreement.name}
        </option>
      ))}
    </select>
  );
} 