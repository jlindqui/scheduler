import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllGrievances,
  fetchGrievanceDetails,
  updateGrievanceStatus,
  updateGrievanceCategory,
  updateGrievanceAgreement,
  updateGrievanceAssignee,
  updateGrievanceField,
} from "@/app/actions/grievances";
import {
  fetchGrievanceAgreement,
} from "@/app/actions/grievances";
import { fetchEvidenceByGrievanceId } from "@/app/actions/evidence";
import { GrievanceListItem } from "@/app/lib/definitions";
import { useSession } from "@/lib/auth/use-auth-session";

// Query keys
export const grievanceKeys = {
  all: ["grievances"] as const,
  lists: () => [...grievanceKeys.all, "list"] as const,
  list: (organizationId: string) =>
    [...grievanceKeys.lists(), organizationId] as const,
  details: () => [...grievanceKeys.all, "detail"] as const,
  detail: (id: string) => [...grievanceKeys.details(), id] as const,
  evidence: (grievanceId: string) =>
    [...grievanceKeys.all, "evidence", grievanceId] as const,
  agreement: (grievanceId: string) =>
    [...grievanceKeys.all, "agreement", grievanceId] as const,
};

// Get all grievances (for admin dashboard)
export function useAllGrievances() {
  const { data: session } = useSession();
  const organizationId = session?.user?.organization?.id;

  return useQuery({
    queryKey: grievanceKeys.list(organizationId || ""),
    queryFn: () => fetchAllGrievances(),
    enabled: !!organizationId, // Only fetch if user has organization
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get list of grievances for an organization
export function useGrievances(organizationId?: string) {
  return useQuery({
    queryKey: grievanceKeys.list(organizationId || ""),
    queryFn: () => fetchAllGrievances(),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get details for a specific grievance
export function useGrievanceDetails(grievanceId?: string) {
  return useQuery({
    queryKey: grievanceKeys.detail(grievanceId || ""),
    queryFn: () => fetchGrievanceDetails(grievanceId!),
    enabled: !!grievanceId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get evidence for a grievance
export function useGrievanceEvidence(grievanceId?: string) {
  return useQuery({
    queryKey: grievanceKeys.evidence(grievanceId || ""),
    queryFn: () => fetchEvidenceByGrievanceId(grievanceId!),
    enabled: !!grievanceId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Get agreement for a grievance
export function useGrievanceAgreement(grievanceId?: string) {
  return useQuery({
    queryKey: grievanceKeys.agreement(grievanceId || ""),
    queryFn: () => fetchGrievanceAgreement(grievanceId!),
    enabled: !!grievanceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}


// MUTATIONS

// Update grievance status
export function useUpdateGrievanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => updateGrievanceStatus(formData),
    onSuccess: (data, variables) => {
      const grievanceId = variables.get("grievance_id") as string;

      // Invalidate and refetch affected queries
      queryClient.invalidateQueries({
        queryKey: grievanceKeys.detail(grievanceId),
      });
      queryClient.invalidateQueries({ queryKey: grievanceKeys.lists() });
    },
  });
}

// Update grievance category
export function useUpdateGrievanceCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => updateGrievanceCategory(formData),
    onMutate: async (formData) => {
      const grievanceId = formData.get("grievance_id") as string;
      const newCategory = formData.get("category") as string;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: grievanceKeys.detail(grievanceId),
      });

      // Snapshot previous value
      const previousDetails = queryClient.getQueryData(
        grievanceKeys.detail(grievanceId)
      );

      // Optimistically update
      queryClient.setQueryData(
        grievanceKeys.detail(grievanceId),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            grievanceDetails: {
              ...old.grievanceDetails,
              category: newCategory || null,
            },
          };
        }
      );

      return { previousDetails };
    },
    onError: (err, variables, context) => {
      const grievanceId = variables.get("grievance_id") as string;
      // Rollback on error
      if (context?.previousDetails) {
        queryClient.setQueryData(
          grievanceKeys.detail(grievanceId),
          context.previousDetails
        );
      }
    },
    onSettled: (data, error, variables) => {
      const grievanceId = variables.get("grievance_id") as string;
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: grievanceKeys.detail(grievanceId),
      });
      queryClient.invalidateQueries({ queryKey: grievanceKeys.lists() });
    },
  });
}

// Update grievance agreement
export function useUpdateGrievanceAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => updateGrievanceAgreement(formData),
    onMutate: async (formData) => {
      const grievanceId = formData.get("grievance_id") as string;
      const newAgreementId = formData.get("agreement_id") as string;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: grievanceKeys.detail(grievanceId),
      });

      // Snapshot previous value
      const previousDetails = queryClient.getQueryData(
        grievanceKeys.detail(grievanceId)
      );

      // Optimistically update
      queryClient.setQueryData(
        grievanceKeys.detail(grievanceId),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            grievanceDetails: {
              ...old.grievanceDetails,
              agreementId: newAgreementId || null,
            },
          };
        }
      );

      return { previousDetails };
    },
    onError: (err, variables, context) => {
      const grievanceId = variables.get("grievance_id") as string;
      // Rollback on error
      if (context?.previousDetails) {
        queryClient.setQueryData(
          grievanceKeys.detail(grievanceId),
          context.previousDetails
        );
      }
    },
    onSettled: (data, error, variables) => {
      const grievanceId = variables.get("grievance_id") as string;
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: grievanceKeys.detail(grievanceId),
      });
      queryClient.invalidateQueries({ queryKey: grievanceKeys.lists() });
    },
  });
}

// Update grievance assignee
export function useUpdateGrievanceAssignee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      grievanceId,
      assignedToId,
    }: {
      grievanceId: string;
      assignedToId: string | null;
    }) => updateGrievanceAssignee({ grievanceId, assignedToId }),
    onMutate: async ({ grievanceId, assignedToId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: grievanceKeys.detail(grievanceId),
      });

      // Snapshot previous value
      const previousDetails = queryClient.getQueryData(
        grievanceKeys.detail(grievanceId)
      );

      // Optimistically update
      queryClient.setQueryData(
        grievanceKeys.detail(grievanceId),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            grievanceDetails: {
              ...old.grievanceDetails,
              assignedToId: assignedToId || null,
            },
          };
        }
      );

      return { previousDetails };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousDetails) {
        queryClient.setQueryData(
          grievanceKeys.detail(variables.grievanceId),
          context.previousDetails
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: grievanceKeys.detail(variables.grievanceId),
      });
      queryClient.invalidateQueries({ queryKey: grievanceKeys.lists() });
    },
  });
}

// Update grievance field (statement, settlement, etc.)
export function useUpdateGrievanceField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      grievanceId,
      field,
      value,
    }: {
      grievanceId: string;
      field: "statement" | "articlesViolated" | "settlementDesired";
      value: string;
    }) => updateGrievanceField(grievanceId, field, value),
    onSuccess: (data, variables) => {
      // Invalidate and refetch affected queries
      queryClient.invalidateQueries({
        queryKey: grievanceKeys.detail(variables.grievanceId),
      });
      queryClient.invalidateQueries({ queryKey: grievanceKeys.lists() });
    },
  });
}

// Hook to get organization ID from session
export function useOrganizationId() {
  const { data: session } = useSession();
  return session?.user?.organization?.id;
}
