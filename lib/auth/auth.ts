import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { customSession } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../../app/lib/db";
import {
  getOrganizationsForEmail,
  setUserCurrentOrganization,
} from "@/app/lib/auth-db-actions";
import { routeProtectionPlugin } from "./auth-protection-plugin";
import { createOrganizationPrisma } from "@/app/actions/prisma/organization-actions";
import { 
  getUserInvitationDataPrisma, 
  acceptUserInvitationPrisma, 
  hasPendingInvitationPrisma 
} from "@/app/actions/prisma/user-management-actions";
// import { OrganizationType } from "@prisma/client"; // Removed - not in schema
import {
  sendNewUserEmailAlert,
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "./emails";

// Keep the same session configuration as NextAuth
const SESSION_CONFIG = {
  // 24 hours - good balance for HR/legal applications with sensitive data
  // Consider shorter (8-12 hours) for high-security environments
  // Consider longer (7 days) only for low-risk applications
  expiresIn: 24 * 60 * 60, // 24 hours in seconds

  // Refresh token every hour to keep sessions active
  // This ensures active users don't get logged out unexpectedly
  updateAge: 60 * 60, // 1 hour in seconds

  // Alternative configurations for different security levels:
  // High Security: expiresIn: 8 * 60 * 60 (8 hours), updateAge: 30 * 60 (30 minutes)
  // Standard: expiresIn: 24 * 60 * 60 (24 hours), updateAge: 60 * 60 (1 hour) - CURRENT
  // Relaxed: expiresIn: 7 * 24 * 60 * 60 (7 days), updateAge: 4 * 60 * 60 (4 hours) - NOT RECOMMENDED for sensitive data
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Explicit base URL for Better Auth
  baseURL: process.env.NEXTAUTH_URL || 'http://localhost:3000',

  // Add trusted origins
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.NEXTAUTH_URL,
    process.env.BETTER_AUTH_URL,
  ].filter(Boolean) as string[],

  // Add secret to avoid warnings during build
  secret: process.env.BETTER_AUTH_SECRET || 'temp-secret-for-build',

  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID || 'placeholder',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || 'placeholder',
      enabled: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendResetPasswordEmail(user.name, user.email, url);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }) => {
      await sendVerificationEmail(user.name, user.email, url);
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour
  },

  user: {
    additionalFields: {
      currentOrganizationId: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      isSuperAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },

  advanced: {
    database: {
      generateId: () => {
        return crypto.randomUUID();
      },
    },
  },

  session: {
    expiresIn: SESSION_CONFIG.expiresIn,
    updateAge: SESSION_CONFIG.updateAge,
  },

  // Replaces NextAuth's signIn callback
  databaseHooks: {
    user: {
      create: {
        after: async (user, ctx) => {
          try {
            if (
              process.env.APP_SUPERADMIN_EMAILS?.split(",")
                .map((e) => e.trim())
                .includes(user.email)
            ) {
              console.log(
                `Creating super admin org for new user: ${user.email}`
              );
              await createOrganizationPrisma(
                "Super Admin Org",
                user.id
              );

              // Mark user as super admin
              await prisma.user.update({
                where: { id: user.id },
                data: { isSuperAdmin: true },
              });

              // Set initial current organization for the super admin
              if (user.email) {
                await setUserCurrentOrganization(user.id, user.email);
              }
            } else {
              await sendNewUserEmailAlert(user.name, user.email);
            }
          } catch (error) {
            console.error("Error during user creation in auth:", error);
          }
        },
      },
      update: {
        after: async (user, ctx) => {
          try {
            // Check if user has pending invitation that can be processed
            if (await hasPendingInvitationPrisma(user.id)) {
              const fullUser = await getUserInvitationDataPrisma(user.id);
              
              if (fullUser?.pendingOrganizationId) {
                console.log(`Processing pending invitation for user: ${fullUser.email}`);
                
                // Mark invitation as accepted
                const success = await acceptUserInvitationPrisma(user.id, fullUser.pendingOrganizationId);
                
                if (success && fullUser.email) {
                  // Set the current organization
                  await setUserCurrentOrganization(user.id, fullUser.email);
                  console.log(`Invitation accepted for user: ${fullUser.email}`);
                }
              }
            }
          } catch (error) {
            console.error("Error processing invitation acceptance:", error);
          }
        },
      },
    },
    session: {
      create: {
        after: async (session, ctx) => {
          try {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { id: true, email: true, currentOrganizationId: true },
            });
            if (!user?.email) {
              console.error("User has no email");
              return;
            }
            const organizations = await getOrganizationsForEmail(user.email);
            if (!organizations || organizations.length === 0) {
              console.error("User has no organization access");
              return;
            }

            // Set the user's current organization if they don't have one
            if (!user.currentOrganizationId) {
              await setUserCurrentOrganization(session.userId, user.email);
            }
          } catch (error) {
            console.error("Error during user session creation:", error);
          }
        },
      },
    },
  },

  // Replaces NextAuth's jwt and session callbacks
  plugins: [
    customSession(async ({ user, session }) => {
      // This combines the logic from both jwt and session callbacks
      if (user) {
        if (user.email) {
          try {
            const organizations = await getOrganizationsForEmail(user.email);
            let organization = null;
            if (organizations && organizations.length > 0) {
              // The updated getOrganizationsForEmail now returns the user's current organization first
              organization = organizations[0];
            }

            // Fetch user's additional data
            const userData = await prisma.user.findUnique({
              where: { email: user.email },
              select: {
                isSuperAdmin: true,
                phone: true,
                timezone: true,
              },
            });
            const isSuperAdmin = userData?.isSuperAdmin || false;

            return {
              user: {
                ...user,
                organization,
                isSuperAdmin,
                phone: userData?.phone || undefined,
                timezone: userData?.timezone || undefined,
              },
              session,
            };
          } catch (error) {
            console.error("Error fetching organizations:", error);
            return {
              user: {
                ...user,
                organization: null,
                isSuperAdmin: false,
              },
              session,
            };
          }
        }
      }

      return {
        user: {
          ...user,
          organization: null,
          isSuperAdmin: false,
        },
        session,
      };
    }),
    routeProtectionPlugin(),
  ],
});

// Helper function to update user's current organization
// This replaces the session update trigger logic from NextAuth
export async function updateUserOrganization(
  userId: string,
  organizationId: string
) {
  try {
    // Verify user has access to this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new APIError("FORBIDDEN", {
        message: "User does not have access to this organization",
      });
    }

    // Update user's current organization
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { currentOrganizationId: organizationId },
      include: {
        currentOrganization: {
          include: {
            members: {
              where: { userId },
              select: { role: true },
            },
          },
        },
      },
    });

    return updatedUser;
  } catch (error) {
    console.error("Error updating user organization:", error);
    throw error;
  }
}

export type Session = typeof auth.$Infer.Session;
