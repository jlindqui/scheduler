import { useQuery } from '@tanstack/react-query';
import { getAllAgreements } from '@/app/actions/agreements';
import { getLatestAgreementByBargainingUnit, getLatestAgreementIdByBargainingUnit } from '@/app/actions/bargaining-unit';
import { Agreement } from '@/app/lib/definitions';

// Get all agreements
export function useAgreements() {
  return useQuery({
    queryKey: ['agreements'],
    queryFn: getAllAgreements,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get latest agreement for a specific bargaining unit
export function useLatestAgreementByBargainingUnit(bargainingUnitId?: string) {
  return useQuery({
    queryKey: ['agreement', 'latest', bargainingUnitId],
    queryFn: () => getLatestAgreementByBargainingUnit(bargainingUnitId!),
    enabled: !!bargainingUnitId, // Only run if bargainingUnitId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get latest agreement ID only (lightweight) for a specific bargaining unit
export function useLatestAgreementIdByBargainingUnit(bargainingUnitId?: string) {
  return useQuery({
    queryKey: ['agreementId', 'latest', bargainingUnitId],
    queryFn: () => getLatestAgreementIdByBargainingUnit(bargainingUnitId!),
    enabled: !!bargainingUnitId, // Only run if bargainingUnitId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get agreement by ID (for when you need a specific agreement)
export function useAgreement(agreementId?: string) {
  return useQuery({
    queryKey: ['agreement', agreementId],
    queryFn: async () => {
      const agreements = await getAllAgreements();
      return agreements.find(a => a.id === agreementId) || null;
    },
    enabled: !!agreementId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
} 