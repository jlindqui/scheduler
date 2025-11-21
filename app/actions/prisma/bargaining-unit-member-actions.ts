'use server';

import { prisma } from '@/app/lib/db';
import { BargainingUnitMember, MemberRole } from '@prisma/client';

export type BargainingUnitMemberWithUser = BargainingUnitMember & {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export type UserWithBargainingUnits = {
  id: string;
  name: string | null;
  email: string | null;
  bargainingUnits: Array<{
    id: string;
    bargainingUnitId: string;
    role: MemberRole;
    bargainingUnit: {
      id: string;
      name: string;
    };
  }>;
};

export async function fetchBargainingUnitMembersPrisma(
  bargainingUnitId: string,
  organizationId: string
): Promise<BargainingUnitMemberWithUser[]> {
  // Verify the bargaining unit belongs to the organization
  const bargainingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id: bargainingUnitId,
      organizationId
    }
  });

  if (!bargainingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  const members = await prisma.bargainingUnitMember.findMany({
    where: {
      bargainingUnitId
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  return members;
}

export async function fetchAvailableUsersForBargainingUnitPrisma(
  bargainingUnitId: string,
  organizationId: string
): Promise<Array<{ id: string; name: string | null; email: string | null }>> {
  // Verify the bargaining unit belongs to the organization
  const bargainingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id: bargainingUnitId,
      organizationId
    }
  });

  if (!bargainingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  // Get all organization members who are not already in this bargaining unit
  // Exclude Admin users since they automatically have access to all bargaining units
  const availableUsers = await prisma.user.findMany({
    where: {
      organizations: {
        some: {
          organizationId,
          role: MemberRole.Member // Only show Members, not Admins
        }
      },
      bargainingUnits: {
        none: {
          bargainingUnitId
        }
      }
    },
    select: {
      id: true,
      name: true,
      email: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  return availableUsers;
}

export async function addUserToBargainingUnitPrisma(
  userId: string,
  bargainingUnitId: string,
  organizationId: string,
  role: MemberRole = MemberRole.Member
): Promise<BargainingUnitMember> {
  // Verify the bargaining unit belongs to the organization
  const bargainingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id: bargainingUnitId,
      organizationId
    }
  });

  if (!bargainingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  // Verify the user is a member of the organization
  const organizationMember = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId
    }
  });

  if (!organizationMember) {
    throw new Error('User is not a member of this organization.');
  }

  // Check if user is an Admin - Admins automatically have access to all bargaining units
  if (organizationMember.role === MemberRole.Admin) {
    throw new Error('Admin users automatically have access to all bargaining units and do not need to be explicitly added.');
  }

  // Check if user is already a member of this bargaining unit
  const existingMember = await prisma.bargainingUnitMember.findFirst({
    where: {
      userId,
      bargainingUnitId
    }
  });

  if (existingMember) {
    throw new Error('User is already a member of this bargaining unit.');
  }

  const member = await prisma.bargainingUnitMember.create({
    data: {
      userId,
      bargainingUnitId,
      role
    }
  });

  return member;
}

export async function removeUserFromBargainingUnitPrisma(
  userId: string,
  bargainingUnitId: string,
  organizationId: string
): Promise<void> {
  // Verify the bargaining unit belongs to the organization
  const bargainingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id: bargainingUnitId,
      organizationId
    }
  });

  if (!bargainingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  // Find and delete the membership
  const member = await prisma.bargainingUnitMember.findFirst({
    where: {
      userId,
      bargainingUnitId
    }
  });

  if (!member) {
    throw new Error('User is not a member of this bargaining unit.');
  }

  await prisma.bargainingUnitMember.delete({
    where: {
      id: member.id
    }
  });
}

export async function updateBargainingUnitMemberRolePrisma(
  userId: string,
  bargainingUnitId: string,
  organizationId: string,
  role: MemberRole
): Promise<BargainingUnitMember> {
  // Verify the bargaining unit belongs to the organization
  const bargainingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id: bargainingUnitId,
      organizationId
    }
  });

  if (!bargainingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  // Find and update the membership
  const member = await prisma.bargainingUnitMember.findFirst({
    where: {
      userId,
      bargainingUnitId
    }
  });

  if (!member) {
    throw new Error('User is not a member of this bargaining unit.');
  }

  const updatedMember = await prisma.bargainingUnitMember.update({
    where: {
      id: member.id
    },
    data: {
      role
    }
  });

  return updatedMember;
}