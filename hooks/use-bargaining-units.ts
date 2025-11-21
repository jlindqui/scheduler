import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchBargainingUnits,
  fetchBargainingUnitsWithStats,
} from "@/app/actions/bargaining-unit";
import { useSession } from "@/lib/auth/use-auth-session";

// Query keys
export const bargainingUnitKeys = {
  all: ["bargaining-units"] as const,
  lists: () => [...bargainingUnitKeys.all, "list"] as const,
  list: (organizationId: string) =>
    [...bargainingUnitKeys.lists(), organizationId] as const,
  stats: (organizationId: string) =>
    [...bargainingUnitKeys.all, "stats", organizationId] as const,
};

// Get bargaining units for an organization
export function useBargainingUnits() {
  const { data: session } = useSession();
  const organizationId = session?.user?.organization?.id;

  return useQuery({
    queryKey: bargainingUnitKeys.list(organizationId || ""),
    queryFn: () => fetchBargainingUnits(),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get bargaining units with statistics
export function useBargainingUnitsWithStats() {
  const { data: session } = useSession();
  const organizationId = session?.user?.organization?.id;

  return useQuery({
    queryKey: bargainingUnitKeys.stats(organizationId || ""),
    queryFn: () => fetchBargainingUnitsWithStats(),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
