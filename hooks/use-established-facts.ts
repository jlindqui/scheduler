'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEstablishedFacts } from '@/app/actions/established-facts';

// Custom hook for established facts with React Query
export function useEstablishedFacts(grievanceId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['established-facts', grievanceId],
    queryFn: () => getEstablishedFacts(grievanceId),
    enabled: enabled && !!grievanceId,
    // Refetch every 30 seconds to catch updates
    refetchInterval: 30000,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
    // Consider data stale after 10 seconds
    staleTime: 10000,
  });
}

// Hook to invalidate/refetch established facts
export function useInvalidateEstablishedFacts() {
  const queryClient = useQueryClient();
  
  return {
    // Invalidate specific grievance facts
    invalidateFacts: (grievanceId: string) => {
      return queryClient.invalidateQueries({
        queryKey: ['established-facts', grievanceId]
      });
    },
    // Invalidate all established facts
    invalidateAllFacts: () => {
      return queryClient.invalidateQueries({
        queryKey: ['established-facts']
      });
    },
    // Manually set facts (optimistic update)
    setFacts: (grievanceId: string, facts: any) => {
      queryClient.setQueryData(['established-facts', grievanceId], facts);
    },
    // Prefetch facts
    prefetchFacts: (grievanceId: string) => {
      return queryClient.prefetchQuery({
        queryKey: ['established-facts', grievanceId],
        queryFn: () => getEstablishedFacts(grievanceId),
      });
    }
  };
}