import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrganizationUsers,
  fetchUsersNotInAnyOrganization,
  fetchUserOrganizations,
} from "@/app/actions/organization";
import { useSession } from "@/lib/auth/use-auth-session";

// Query keys
export const organizationKeys = {
  all: ["organizations"] as const,
  users: () => [...organizationKeys.all, "users"] as const,
  organizationUsers: (orgId: string) =>
    [...organizationKeys.users(), "organization", orgId] as const,
  unassignedUsers: () => [...organizationKeys.users(), "unassigned"] as const,
  userOrganizations: () =>
    [...organizationKeys.all, "user-organizations"] as const,
};

// Get users in an organization
export function useOrganizationUsers() {
  const { data: session } = useSession();
  const organizationId = session?.user?.organization?.id;

  return useQuery({
    queryKey: organizationKeys.organizationUsers(organizationId || ""),
    queryFn: () => fetchOrganizationUsers(),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get users not in any organization
export function useUnassignedUsers() {
  return useQuery({
    queryKey: organizationKeys.unassignedUsers(),
    queryFn: () => fetchUsersNotInAnyOrganization(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get user organizations
export function useUserOrganizations() {
  return useQuery({
    queryKey: organizationKeys.userOrganizations(),
    queryFn: () => fetchUserOrganizations(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Combined hook for organizations page
export function useOrganizationsPageData() {
  const orgUsers = useOrganizationUsers();
  const unassignedUsers = useUnassignedUsers();
  const userOrganizations = useUserOrganizations();

  return {
    organizationUsers: orgUsers,
    unassignedUsers,
    userOrganizations,
    isLoading:
      orgUsers.isLoading ||
      unassignedUsers.isLoading ||
      userOrganizations.isLoading,
    isError:
      orgUsers.isError || unassignedUsers.isError || userOrganizations.isError,
    error: orgUsers.error || unassignedUsers.error || userOrganizations.error,
  };
}
