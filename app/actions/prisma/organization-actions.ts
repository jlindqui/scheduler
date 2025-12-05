'use server';
import { prisma } from '@/app/lib/db';
// import { OrganizationType } from '@prisma/client'; // Removed - not in schema

export async function fetchOrganizationUsersPrisma(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const usersWithRoles = members.map(member => ({
    ...member.user,
    role: member.role
  }));
  
  return usersWithRoles;
}

export async function findUserByEmailPrisma(email: string) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

export async function findOrganizationMemberPrisma(organizationId: string, userId: string) {
  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId
    }
  });

  return existingMember;
}

export async function createOrganizationMemberPrisma(organizationId: string, userId: string, role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' = 'EMPLOYEE') {
  await prisma.organizationMember.create({
    data: {
      organizationId,
      userId,
      role
    }
  });
}

export async function deleteOrganizationMemberPrisma(organizationId: string, userId: string) {
  await prisma.organizationMember.deleteMany({
    where: {
      organizationId,
      userId
    }
  });
}

export async function fetchUsersNotInAnyOrganizationPrisma() {
  // First get all users who are in any organization
  const usersInOrgs = await prisma.organizationMember.findMany({
    select: {
      userId: true
    }
  });

  const userIdsInOrgs = usersInOrgs.map(member => member.userId);

  // Then get all users who are not in that list
  const users = await prisma.user.findMany({
    where: {
      id: {
        notIn: userIdsInOrgs
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  
  return users;
}

export async function createOrganizationPrisma(name: string, userId: string) {
  // Create the organization
  // Generate a slug from the name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
    },
  });

  // Add the current user as an admin member
  await prisma.organizationMember.create({
    data: {
      userId,
      organizationId: organization.id,
      role: 'ADMIN',
    },
  });

  // Update the user's current organization ID
  await prisma.user.update({
    where: { id: userId },
    data: { currentOrganizationId: organization.id },
  });

  return organization;
}

export async function fetchUserOrganizationsPrisma(userId: string, currentOrgId?: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId,
    },
    include: {
      organization: true,
    },
    orderBy: {
      organization: {
        name: 'asc',
      },
    },
  });

  return memberships.map(membership => ({
    id: membership.organization.id,
    name: membership.organization.name,
    role: membership.role,
    isCurrent: membership.organization.id === currentOrgId,
  }));
}

export async function findOrganizationMembershipPrisma(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  return membership;
}

export async function updateUserOrganizationPrisma(userId: string, organizationId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { currentOrganizationId: organizationId },
  });
} 