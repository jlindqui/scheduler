"use client";

import { useSession } from "@/lib/auth/use-auth-session";
import { useViewMode, getEffectiveRole } from "@/app/contexts/ViewModeContext";

export function useAuthWithViewMode() {
  const { data: session } = useSession();
  const { viewMode } = useViewMode();

  if (!session?.user) {
    return {
      session: null,
      user: null,
      isSuperAdmin: false,
      userRole: undefined,
      organization: null,
    };
  }

  // Get actual user role from organization membership
  const actualUserRole = session.user.organization?.members?.find(
    (member: { role: string; userId: string }) =>
      member.userId === session.user.id
  )?.role as "Admin" | "Member" | undefined;

  // Calculate effective role based on view mode
  const { isSuperAdmin: effectiveIsSuperAdmin, userRole: effectiveUserRole } =
    getEffectiveRole(
      session.user.isSuperAdmin || false,
      actualUserRole,
      viewMode
    );

  return {
    session,
    user: session.user,
    isSuperAdmin: effectiveIsSuperAdmin,
    userRole: effectiveUserRole,
    organization: session.user.organization,
    actualIsSuperAdmin: session.user.isSuperAdmin,
    actualUserRole,
    viewMode,
  };
}

export function useRequireAuth() {
  const auth = useAuthWithViewMode();

  if (!auth.session?.user) {
    throw new Error("Authentication required");
  }

  if (!auth.organization) {
    throw new Error("Organization access required");
  }

  return auth;
}

export function useRequireOrgAdmin() {
  const auth = useRequireAuth();

  // Super admins (actual or simulated) can access org admin features
  if (auth.isSuperAdmin || auth.userRole === "Admin") {
    return auth;
  }

  throw new Error("Organization admin access required");
}

export function useRequireSuperAdmin() {
  const auth = useRequireAuth();

  // Only actual super admins viewing as super admin can access super admin features
  if (auth.actualIsSuperAdmin && auth.viewMode === "super_admin") {
    return auth;
  }

  throw new Error("Super admin access required");
}
