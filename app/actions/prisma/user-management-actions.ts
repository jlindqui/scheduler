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
              organizationType: true,
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
      organizationType: true,
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
  role: 'Admin' | 'Member'
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
          organizationType: true,
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
  role: 'Admin' | 'Member'
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
          organizationType: true,
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
 */
export async function getUserInvitationDataPrisma(userId: string): Promise<UserInvitationData | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        pendingOrganizationId: true,
        pendingRole: true,
        invitationAcceptedAt: true,
      }
    });
  } catch (error) {
    console.error("Error fetching user invitation data:", error);
    return null;
  }
}

/**
 * Mark user invitation as accepted and set up organization access
 */
export async function acceptUserInvitationPrisma(
  userId: string, 
  organizationId: string
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        invitationAcceptedAt: new Date(),
        currentOrganizationId: organizationId,
        // Clear pending fields after acceptance
        pendingOrganizationId: null,
        pendingRole: null,
        pendingBargainingUnitIds: [],
      }
    });
    return true;
  } catch (error) {
    console.error("Error accepting user invitation:", error);
    return false;
  }
}

/**
 * Create or update user with invitation metadata
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
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      // Update existing user with invitation metadata
      // Always update invitation fields for existing users (they can have multiple pending invitations)
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.title !== undefined && { title: data.title }),
          invitedAt: new Date(),
          invitedBy: data.invitedBy,
          pendingOrganizationId: data.pendingOrganizationId,
          pendingRole: data.pendingRole,
          pendingBargainingUnitIds: data.pendingBargainingUnitIds || [],
          invitationAcceptedAt: null, // Clear previous acceptance status for new invitation
        },
      });
      return { id: existingUser.id, isNewUser: false };
    } else {
      // Create new user with invitation metadata
      const newUser = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          phone: data.phone,
          title: data.title,
          invitedAt: new Date(),
          invitedBy: data.invitedBy,
          pendingOrganizationId: data.pendingOrganizationId,
          pendingRole: data.pendingRole,
          pendingBargainingUnitIds: data.pendingBargainingUnitIds || [],
          invitationAcceptedAt: null, // Explicitly set as pending
        },
      });
      return { id: newUser.id, isNewUser: true };
    }
  } catch (error) {
    console.error("Error creating/updating user with invitation:", error);
    return null;
  }
}

/**
 * Check if user has pending invitation that can be processed
 */
export async function hasPendingInvitationPrisma(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        pendingOrganizationId: true,
        invitationAcceptedAt: true,
      }
    });

    return Boolean(
      user?.emailVerified && 
      user?.pendingOrganizationId && 
      !user?.invitationAcceptedAt
    );
  } catch (error) {
    console.error("Error checking pending invitation:", error);
    return false;
  }
}

// ============================================================================
// STAFF MANAGEMENT FUNCTIONS (for organization staff operations)
// ============================================================================

/**
 * Fetch organization staff with all details including invitation metadata
 * This includes both current members and users with pending invitations
 */
export async function fetchOrganizationStaffPrisma(organizationId: string) {
  // Get current organization members
  const organizationMembers = await prisma.organizationMember.findMany({
    where: {
      organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          title: true,
          emailVerified: true,
          invitedAt: true,
          invitationAcceptedAt: true,
          bargainingUnits: {
            where: {
              bargainingUnit: {
                organizationId: organizationId,
              },
            },
            include: {
              bargainingUnit: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Get users with pending invitations for this organization
  const pendingInvitations = await prisma.user.findMany({
    where: {
      pendingOrganizationId: organizationId,
      invitationAcceptedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      invitedAt: true,
      invitationAcceptedAt: true,
      pendingRole: true,
      pendingBargainingUnitIds: true,
    },
    orderBy: {
      invitedAt: "asc",
    },
  });


  // Convert pending invitations to the same format as organization members
  const pendingMembers = await Promise.all(
    pendingInvitations.map(async (user) => {
      // Get bargaining unit details for pending assignments
      const bargainingUnits = user.pendingBargainingUnitIds && user.pendingBargainingUnitIds.length > 0
        ? await prisma.bargainingUnit.findMany({
            where: {
              id: { in: user.pendingBargainingUnitIds },
              organizationId,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [];

      return {
        id: `pending-${user.id}`, // Unique ID for pending invitations
        userId: user.id,
        organizationId,
        role: user.pendingRole || 'Member',
        createdAt: user.invitedAt || new Date(),
        updatedAt: user.invitedAt || new Date(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          invitedAt: user.invitedAt,
          invitationAcceptedAt: user.invitationAcceptedAt,
          bargainingUnits: bargainingUnits.map((bu) => ({
            bargainingUnitId: bu.id,
            role: 'Member' as any,
            bargainingUnit: {
              id: bu.id,
              name: bu.name,
            },
          })),
        },
      };
    })
  );

  // Combine current members and pending invitations
  return [...organizationMembers, ...pendingMembers];
}

/**
 * Get organization member by ID (for verification)
 */
export async function getOrganizationMemberPrisma(memberId: string, organizationId: string) {
  try {
    return await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
  } catch (error) {
    console.error("Error fetching organization member:", error);
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmailPrisma(email: string) {
  try {
    return await prisma.user.findUnique({
      where: { email },
    });
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

/**
 * Check if user is already organization member
 */
export async function isUserOrganizationMemberPrisma(userId: string, organizationId: string) {
  try {
    const member = await prisma.organizationMember.findFirst({
      where: { userId, organizationId },
    });
    return !!member;
  } catch (error) {
    console.error("Error checking organization membership:", error);
    return false;
  }
}

/**
 * Add user to organization staff
 */
export async function addUserToOrganizationStaffPrisma(userId: string, organizationId: string, role: MemberRole) {
  try {
    return await prisma.organizationMember.create({
      data: { userId, organizationId, role },
    });
  } catch (error) {
    console.error("Error adding user to organization:", error);
    throw error;
  }
}

/**
 * Validate bargaining units belong to organization
 */
export async function validateBargainingUnitsPrisma(bargainingUnitIds: string[], organizationId: string) {
  try {
    const validBargainingUnits = await prisma.bargainingUnit.findMany({
      where: {
        id: { in: bargainingUnitIds },
        organizationId,
      },
      select: { id: true },
    });

    if (validBargainingUnits.length !== bargainingUnitIds.length) {
      throw new Error("Some bargaining units do not exist or do not belong to your organization.");
    }

    return validBargainingUnits;
  } catch (error) {
    console.error("Error validating bargaining units:", error);
    throw error;
  }
}

/**
 * Add user to bargaining units
 */
export async function addUserToBargainingUnitsPrisma(userId: string, bargainingUnitIds: string[]) {
  try {
    await prisma.bargainingUnitMember.createMany({
      data: bargainingUnitIds.map((bargainingUnitId) => ({
        userId,
        bargainingUnitId,
        role: MemberRole.Member,
      })),
    });
  } catch (error) {
    console.error("Error adding user to bargaining units:", error);
    throw error;
  }
}

export async function updateStaffMemberPrisma(
  memberId: string,
  organizationId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    title?: string;
    role?: MemberRole;
    bargainingUnitIds?: string[];
  }
) {
  // Verify the member belongs to this organization
  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId,
    },
  });

  if (!member) {
    throw new Error("Staff member not found or access denied.");
  }

  // Update organization member role if provided
  if (data.role !== undefined) {
    await prisma.organizationMember.update({
      where: {
        id: memberId,
      },
      data: {
        role: data.role,
      },
    });
  }

  // Update user details if provided
  if (data.name !== undefined || data.email !== undefined || data.phone !== undefined || data.title !== undefined) {
    await prisma.user.update({
      where: {
        id: member.userId,
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.title !== undefined && { title: data.title }),
      },
    });
  }

  // Update bargaining unit assignments if provided
  if (data.bargainingUnitIds !== undefined) {
    // Remove existing bargaining unit memberships for this organization only
    await prisma.bargainingUnitMember.deleteMany({
      where: {
        userId: member.userId,
        bargainingUnit: {
          organizationId: organizationId,
        },
      },
    });

    // Add new bargaining unit memberships
    if (data.bargainingUnitIds.length > 0) {
      await prisma.bargainingUnitMember.createMany({
        data: data.bargainingUnitIds.map((bargainingUnitId) => ({
          userId: member.userId,
          bargainingUnitId,
          role: 'Member', // Default role
        })),
      });
    }
  }

  return member;
}

export async function removeStaffMemberPrisma(memberId: string, organizationId: string) {
  // Verify the member belongs to this organization
  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId,
    },
  });

  if (!member) {
    throw new Error("Staff member not found or access denied.");
  }

  // Remove bargaining unit memberships for this organization only
  await prisma.bargainingUnitMember.deleteMany({
    where: {
      userId: member.userId,
      bargainingUnit: {
        organizationId: organizationId,
      },
    },
  });

  // Remove organization membership
  await prisma.organizationMember.delete({
    where: {
      id: memberId,
    },
  });

  return member;
}

export async function inviteStaffMemberPrisma(
  organizationId: string,
  data: {
    email: string;
    name: string;
    phone?: string;
    title?: string;
    role: 'Admin' | 'Member';
    bargainingUnitIds?: string[];
    invitedBy?: string;
  }
) {
  // Check if user already exists in the system
  const existingUser = await getUserByEmailPrisma(data.email);

  // Check if user is already a member of this organization
  if (existingUser && await isUserOrganizationMemberPrisma(existingUser.id, organizationId)) {
    return {
      success: false,
      message: "This user is already a member of your organization.",
    };
  }

  // Validate bargaining units before storing them
  if (data.bargainingUnitIds && data.bargainingUnitIds.length > 0) {
    await validateBargainingUnitsPrisma(data.bargainingUnitIds, organizationId);
  }

  // Create or update user with invitation metadata
  const userResult = await createOrUpdateUserWithInvitationPrisma({
    email: data.email,
    name: data.name,
    phone: data.phone,
    title: data.title,
    invitedBy: data.invitedBy,
    pendingOrganizationId: organizationId,
    pendingRole: data.role as MemberRole,
    pendingBargainingUnitIds: data.bargainingUnitIds,
  });

  if (!userResult) {
    return {
      success: false,
      message: "Failed to create or update user for invitation.",
    };
  }

  // NOTE: We do NOT add the user to the organization here
  // They will be added when they accept the invitation

  return { 
    success: true,
    message: "Invitation sent successfully. The user will be added to your organization when they accept the invitation.",
    user: userResult,
    isNewUser: userResult.isNewUser,
    pendingBargainingUnitIds: data.bargainingUnitIds
  };
}