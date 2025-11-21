import { getServerSession } from "@/lib/auth/server-session";

export class SessionError extends Error {
  constructor(message: string = "Session expired or invalid") {
    super(message);
    this.name = "SessionError";
  }
}

export class OrganizationError extends Error {
  constructor(message: string = "No organization access") {
    super(message);
    this.name = "OrganizationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export interface ErrorResult {
  success: false;
  error: string;
  code?: string;
  shouldRedirect?: boolean;
  redirectTo?: string;
}

export interface SuccessResult<T = any> {
  success: true;
  data: T;
}

export type ActionResult<T = any> = ErrorResult | SuccessResult<T>;

/**
 * Wraps server actions with consistent error handling
 */
export function withErrorHandling<T extends any[], R>(
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<ActionResult<R>> => {
    try {
      const result = await action(...args);
      return { success: true, data: result };
    } catch (error) {
      console.error("Server action error:", error);

      if (error instanceof SessionError) {
        return {
          success: false,
          error: error.message,
          code: "SESSION_EXPIRED",
          shouldRedirect: true,
          redirectTo: "/login",
        };
      }

      if (error instanceof OrganizationError) {
        return {
          success: false,
          error: error.message,
          code: "NO_ORGANIZATION",
          shouldRedirect: true,
          redirectTo: "/no-organization",
        };
      }

      if (error instanceof AuthorizationError) {
        return {
          success: false,
          error: error.message,
          code: "UNAUTHORIZED",
        };
      }

      // Handle common error patterns
      if (error instanceof Error) {
        if (error.message.includes("No organization ID found")) {
          return {
            success: false,
            error: "Your session has expired. Please log in again.",
            code: "SESSION_EXPIRED",
            shouldRedirect: true,
            redirectTo: "/login",
          };
        }

        if (error.message.includes("Not authenticated")) {
          return {
            success: false,
            error: "Authentication required. Please log in.",
            code: "NOT_AUTHENTICATED",
            shouldRedirect: true,
            redirectTo: "/login",
          };
        }

        return {
          success: false,
          error: error.message,
          code: "UNKNOWN_ERROR",
        };
      }

      return {
        success: false,
        error: "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
      };
    }
  };
}

/**
 * Enhanced session validation with better error messages
 */
export async function getUserOrgFromSession() {
  const session = await getServerSession();

  if (!session?.user) {
    throw new SessionError("Your session has expired. Please log in again.");
  }

  if (!session.user.organization?.id) {
    throw new OrganizationError(
      "No organization access found. Please contact your administrator."
    );
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organization.id,
    userRole:
      session.user.organization.members?.find(
        (member: any) => member.userId === session.user.id
      )?.role || "Member",
  };
}

/**
 * Client-side error handler for form submissions
 */
export function handleClientError(
  error: any,
  setError: (error: string) => void
) {
  console.error("Client error:", error);

  if (
    error?.code === "SESSION_EXPIRED" ||
    error?.code === "NOT_AUTHENTICATED"
  ) {
    // Redirect to login
    window.location.href = "/login";
    return;
  }

  if (error?.code === "NO_ORGANIZATION") {
    window.location.href = "/no-organization";
    return;
  }

  // Set user-friendly error message
  const message =
    error?.error || error?.message || "An unexpected error occurred";
  setError(message);
}

/**
 * Retry mechanism for failed operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry session/auth errors
      if (
        error instanceof SessionError ||
        error instanceof OrganizationError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}
