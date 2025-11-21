// lib/organization-session-plugin.ts
import { BetterAuthPlugin } from "better-auth";
import { customSession } from "better-auth/plugins";
import { prisma } from "../../app/lib/db";
import { getOrganizationsForEmail } from "@/app/lib/auth-db-actions";
import { Organization } from "@/app/lib/definitions";

export const organizationSessionPlugin = customSession(
  async ({ user, session }) => {
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

          // Fetch user's super admin status
          const userData = await prisma.user.findUnique({
            where: { email: user.email },
            select: { isSuperAdmin: true },
          });
          const isSuperAdmin = userData?.isSuperAdmin || false;

          return {
            user: {
              ...user,
              organization: organization as Organization & {
                members: Array<{
                  role: "Admin" | "Member";
                  userId: string;
                }>;
              },
              isSuperAdmin: isSuperAdmin,
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
  }
) satisfies BetterAuthPlugin;
