import { User } from "@prisma/client";
import { prisma } from "./db";

// Type for better-auth account object
interface BetterAuthAccount {
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  scope?: string;
  password?: string;
}

export async function createUserAccount(
  user: Partial<User>,
  account: BetterAuthAccount
) {
  try {
    // Create or update user, using the ID from the auth provider
    const userResult = await prisma.user.upsert({
      where: { email: user.email! },
      update: {
        name: user.name,
        image: user.image,
        id: user.id!, // Update ID to match auth provider
      },
      create: {
        id: user.id!, // Use ID from auth provider
        name: user.name!,
        email: user.email!,
        image: user.image,
      },
    });

    // Create account if it doesn't exist - using better-auth field names
    await prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: account.providerId, // ✅ Updated field name
          accountId: account.accountId, // ✅ Updated field name
        },
      },
      update: {
        accessToken: account.accessToken, // ✅ Updated field name
        refreshToken: account.refreshToken, // ✅ Updated field name
        idToken: account.idToken, // ✅ Updated field name
        accessTokenExpiresAt: account.accessTokenExpiresAt, // ✅ Updated field name
        refreshTokenExpiresAt: account.refreshTokenExpiresAt, // ✅ Updated field name
        scope: account.scope,
      },
      create: {
        userId: userResult.id,
        accountId: account.accountId, // ✅ Updated field name
        providerId: account.providerId, // ✅ Updated field name
        accessToken: account.accessToken, // ✅ Updated field name
        refreshToken: account.refreshToken, // ✅ Updated field name
        idToken: account.idToken, // ✅ Updated field name
        accessTokenExpiresAt: account.accessTokenExpiresAt, // ✅ Updated field name
        refreshTokenExpiresAt: account.refreshTokenExpiresAt, // ✅ Updated field name
        scope: account.scope,
        password: account.password,
      },
    });

    return userResult;
  } catch (error) {
    console.error("Failed to create user account:", error);
    throw new Error("Failed to create user account.");
  }
}

export async function setUserCurrentOrganization(
  userId: string,
  email: string
) {
  try {
    // Get the user's first organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: {
        user: { email },
      },
      include: {
        organization: true,
      },
      orderBy: {
        organization: {
          name: "asc",
        },
      },
    });

    if (membership) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentOrganizationId: membership.organizationId },
      });
    }
  } catch (error) {
    console.error("Failed to set user current organization:", error);
  }
}

export async function getOrganizationsForEmail(email: string) {
  try {
    // First, get the user to check their current organization ID
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        currentOrganizationId: true,
      },
    });

    // If user doesn't exist yet (during sign-in process), get all organizations directly
    if (!user) {
      const organizations = await prisma.organization.findMany({
        where: {
          members: {
            some: {
              user: {
                email: email,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          members: {
            select: {
              role: true,
              userId: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });
      return organizations;
    }

    // Get all organizations the user is a member of
    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            user: {
              email: email,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        members: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
            userId: true,
          },
        },
      },
    });

    // If user has a current organization ID, find it and put it first
    if (user.currentOrganizationId) {
      const currentOrg = organizations.find(
        (org) => org.id === user.currentOrganizationId
      );
      if (currentOrg) {
        const otherOrgs = organizations.filter(
          (org) => org.id !== user.currentOrganizationId
        );
        return [currentOrg, ...otherOrgs];
      }
    }

    // Fallback: return organizations ordered by name
    const sortedOrgs = organizations.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // If user has organizations but no current org set, update their current org to the first one
    if (sortedOrgs.length > 0 && !user.currentOrganizationId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { currentOrganizationId: sortedOrgs[0].id },
      });
    }

    return sortedOrgs;
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    throw new Error("Failed to fetch organizations.");
  }
}

// Helper function to adapt better-auth session/account data if needed
export function adaptBetterAuthAccount(account: any): BetterAuthAccount {
  return {
    accountId: account.accountId || account.providerAccountId, // fallback for migration
    providerId: account.providerId || account.provider, // fallback for migration
    userId: account.userId,
    accessToken: account.accessToken || account.access_token, // fallback for migration
    refreshToken: account.refreshToken || account.refresh_token, // fallback for migration
    idToken: account.idToken || account.id_token, // fallback for migration
    accessTokenExpiresAt:
      account.accessTokenExpiresAt ||
      (account.expires_at ? new Date(account.expires_at * 1000) : undefined), // fallback for migration
    scope: account.scope,
    password: account.password,
  };
}
