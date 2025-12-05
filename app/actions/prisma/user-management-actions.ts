'use server';

import { requireSuperAdmin } from '@/app/actions/auth';
import { prisma } from '@/app/lib/db';
import { revalidatePath } from 'next/cache';
import { MemberRole } from '@prisma/client';

export async function getAllUsers() {
  await requireSuperAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      createdAt: true,
      currentOrganizationId: true,
      organizations: {
        select: {
          id: true,
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return users;
}

export async function getAllOrganizations() {
  await requireSuperAdmin();

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return organizations;
}

export async function toggleUserSuperAdmin(userId: string, isSuperAdmin: boolean) {
  await requireSuperAdmin();

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isSuperAdmin },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
    },
  });

  revalidatePath('/product/admin/users');
  return updatedUser;
}

export async function addUserToOrganization(
  userId: string,
  organizationId: string,
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
) {
  await requireSuperAdmin();

  // Check if user is already a member
  const existingMembership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (existingMembership) {
    throw new Error('User is already a member of this organization');
  }

  const membership = await prisma.organizationMember.create({
    data: {
      userId,
      organizationId,
      role,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
            },
      },
    },
  });

  revalidatePath('/product/admin/users');
  return membership;
}

export async function updateUserOrganizationRole(
  userId: string,
  organizationId: string,
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
) {
  await requireSuperAdmin();

  const membership = await prisma.organizationMember.update({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    data: { role },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
            },
      },
    },
  });

  revalidatePath('/product/admin/users');
  return membership;
}

export async function removeUserFromOrganization(userId: string, organizationId: string) {
  await requireSuperAdmin();

  await prisma.organizationMember.delete({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  revalidatePath('/product/admin/users');
}

// ============================================================================
// INVITATION-RELATED FUNCTIONS (for staff invitation system)
// ============================================================================

/**
 * Types for invitation operations
 */
export interface UserInvitationData {
  id: string;
  email: string | null;
  emailVerified: boolean;
  pendingOrganizationId: string | null;
  pendingRole: MemberRole | null;
  invitationAcceptedAt: Date | null;
}

/**
 * Get user data needed for invitation processing
 * Note: User invitations not implemented in scheduling system
 */
export async function getUserInvitationDataPrisma(userId: string): Promise<UserInvitationData | null> {
  // Stub - invitations not implemented
  return null;
}

/**
 * Mark user invitation as accepted and set up organization access
 * Note: User invitations not implemented in scheduling system
 */
export async function acceptUserInvitationPrisma(
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Stub - invitations not implemented
  return false;
}

/**
 * Create or update user with invitation metadata
 * Note: User invitations not implemented in scheduling system
 */
export async function createOrUpdateUserWithInvitationPrisma(data: {
  email: string;
  name: string;
  phone?: string;
  title?: string;
  invitedBy?: string;
  pendingOrganizationId: string;
  pendingRole: MemberRole;
  pendingBargainingUnitIds?: string[];
}): Promise<{ id: string; isNewUser: boolean } | null> {
  // Stub - invitations not implemented
  return null;
}

/**
 * Check if user has pending invitation that can be processed
 * Note: User invitations not implemented in scheduling system
 */
export async function hasPendingInvitationPrisma(userId: string): Promise<boolean> {
  // Stub - invitations not implemented
  return false;
}
