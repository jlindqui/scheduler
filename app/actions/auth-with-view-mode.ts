import { SessionError } from "@/app/lib/error-handling";
import {
  type ViewMode,
  getEffectiveRole,
} from "@/app/contexts/ViewModeContext";
import { getServerSession } from "@/lib/auth/server-session";

/**
 * Server-side auth check that respects view mode for client-initiated actions
 * For server actions that need to respect the client's view mode selection
 */
export async function requireAuthWithViewMode(viewMode?: ViewMode) {
  const session = await getServerSession();

  // Check for authentication
  if (!session?.user) {
    throw new SessionError("Authentication required");
  }

  // Check for organization
  if (!session.user.organization) {
    throw new SessionError("Organization access required");
  }

  // Get actual user role
  const actualUserRole = session.user.organization.members?.find(
    (member: { role: string; userId: string }) =>
      member.userId === session.user.id
  )?.role as "Admin" | "Member" | undefined;

  // If no view mode specified, use regular auth
  if (!viewMode || !session.user.isSuperAdmin) {
    // Check if user is a member of the organization
    const isMember = session.user.organization.members?.some(
      (member: { role: string; userId: string }) =>
        member.userId === session.user.id
    );

    if (!isMember) {
      throw new SessionError("You are not a member of this organization");
    }

    return {
      session,
      isSuperAdmin: session.user.isSuperAdmin,
      userRole: actualUserRole,
      organization: session.user.organization,
    };
  }

  // Apply view mode logic for super admins
  const { isSuperAdmin: effectiveIsSuperAdmin, userRole: effectiveUserRole } =
    getEffectiveRole(session.user.isSuperAdmin, actualUserRole, viewMode);

  return {
    session,
    isSuperAdmin: effectiveIsSuperAdmin,
    userRole: effectiveUserRole,
    organization: session.user.organization,
    actualIsSuperAdmin: session.user.isSuperAdmin,
    actualUserRole,
    viewMode,
  };
}

/**
 * Server-side org admin check that respects view mode
 */
export async function requireOrgAdminWithViewMode(viewMode?: ViewMode) {
  const auth = await requireAuthWithViewMode(viewMode);

  // Super admins (actual or simulated) can manage organization
  if (auth.isSuperAdmin || auth.userRole === "Admin") {
    return auth;
  }

  throw new SessionError("Organization admin access required");
}

/**
 * Server-side super admin check - only for actual super admins viewing as super admin
 */
export async function requireSuperAdminWithViewMode(viewMode?: ViewMode) {
  const session = await getServerSession();

  // Check for authentication
  if (!session?.user) {
    throw new SessionError("Authentication required");
  }

  // Must be actual super admin
  if (!session.user.isSuperAdmin) {
    throw new SessionError("Super admin access required");
  }

  // If view mode is specified and it's not super_admin, deny access
  if (viewMode && viewMode !== "super_admin") {
    throw new SessionError("Super admin access required");
  }

  return {
    session,
    isSuperAdmin: true,
    userRole: undefined,
    organization: session.user.organization,
    actualIsSuperAdmin: true,
    viewMode: viewMode || "super_admin",
  };
}
