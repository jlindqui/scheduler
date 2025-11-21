import { SessionError } from "@/app/lib/error-handling";
import { getServerSession } from "@/lib/auth/server-session";

/**
 * Validates authentication and organization access for server actions
 * @throws {SessionError} If user is not authenticated or lacks organization access
 */
export async function requireAuth() {
  const session = await getServerSession();

  // Check for authentication
  if (!session?.user) {
    throw new SessionError("Authentication required");
  }

  // Check for organization
  if (!session.user.organization) {
    throw new SessionError("Organization access required");
  }

  // Check if user is a member of the organization
  const isMember = session.user.organization.members?.some(
    (member: { role: string; userId: string }) =>
      member.userId === session.user.id
  );

  if (!isMember) {
    throw new SessionError("You are not a member of this organization");
  }

  return session;
}

/**
 * Validates super admin access for server actions
 * @throws {SessionError} If user is not authenticated or not a super admin
 */
export async function requireSuperAdmin() {
  const session = await getServerSession();

  // Check for authentication
  if (!session?.user) {
    throw new SessionError("Authentication required");
  }

  // Check for super admin access
  if (!session.user.isSuperAdmin) {
    throw new SessionError("Super admin access required");
  }

  return session;
}

/**
 * Wraps server actions with authentication
 * @param action The server action to wrap
 * @returns A wrapped version of the action that includes auth checks
 */
export function withAuth<T extends (...args: any[]) => Promise<any>>(
  action: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    await requireAuth();
    return action(...args);
  };
}

/**
 * Validates organization admin access (or super admin) for server actions
 * @throws {SessionError} If user is not authenticated or not an org admin/super admin
 */
export async function requireOrgAdmin() {
  const session = await getServerSession();

  // Check for authentication
  if (!session?.user) {
    throw new SessionError("Authentication required");
  }

  // Super admins can manage any organization
  if (session.user.isSuperAdmin) {
    return session;
  }

  // Check for organization
  if (!session.user.organization) {
    throw new SessionError("Organization access required");
  }

  // Check if user is an admin of their organization
  const isOrgAdmin = session.user.organization.members?.some(
    (member: { role: string; userId: string }) =>
      member.userId === session.user.id && member.role === "Admin"
  );

  if (!isOrgAdmin) {
    throw new SessionError("Organization admin access required");
  }

  return session;
}

/**
 * Wraps server actions with super admin authentication
 * @param action The server action to wrap
 * @returns A wrapped version of the action that includes super admin checks
 */
export function withSuperAdmin<T extends (...args: any[]) => Promise<any>>(
  action: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    await requireSuperAdmin();
    return action(...args);
  };
}

/**
 * Wraps server actions with organization admin authentication
 * @param action The server action to wrap
 * @returns A wrapped version of the action that includes org admin checks
 */
export function withOrgAdmin<T extends (...args: any[]) => Promise<any>>(
  action: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    await requireOrgAdmin();
    return action(...args);
  };
}
