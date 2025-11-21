'use server';
import { prisma } from '@/app/lib/db';
import { BargainingUnit } from '@prisma/client';
import { transformAgreement } from '@/app/lib/utils';

export type BargainingUnitWithStats = BargainingUnit & {
  stats: {
    grievances: number;
    complaints: number;
    agreements: number;
    agreementsWithoutTemplates: number;
    members: number;
    total: number;
  };
};

export async function fetchBargainingUnitsPrisma(organizationId: string, userId?: string, userRole?: string): Promise<BargainingUnit[]> {
  let whereClause: any = {
    organizationId
  };

  // If user is a Member (not Admin), only show bargaining units they're assigned to
  if (userRole === 'Member' && userId) {
    whereClause = {
      organizationId,
      members: {
        some: {
          userId: userId
        }
      }
    };
  }

  const bargainingUnits = await prisma.bargainingUnit.findMany({
    where: whereClause,
    orderBy: {
      name: 'asc'
    }
  });

  return bargainingUnits;
}

export async function fetchBargainingUnitsWithAgreementsPrisma(organizationId: string, userId?: string, userRole?: string): Promise<BargainingUnit[]> {
  let whereClause: any = {
    organizationId,
    agreements: {
      some: {} // Only include bargaining units that have at least one agreement
    }
  };

  // If user is a Member (not Admin), only show bargaining units they're assigned to
  if (userRole === 'Member' && userId) {
    whereClause = {
      organizationId,
      members: {
        some: {
          userId: userId
        }
      },
      agreements: {
        some: {} // Only include bargaining units that have at least one agreement
      }
    };
  }

  const bargainingUnits = await prisma.bargainingUnit.findMany({
    where: whereClause,
    orderBy: {
      name: 'asc'
    }
  });

  return bargainingUnits;
}

export async function fetchBargainingUnitsWithStatsPrisma(organizationId: string, userId?: string, userRole?: string): Promise<BargainingUnitWithStats[]> {
  let whereClause: any = {
    organizationId
  };

  // If user is a Member (not Admin), only show bargaining units they're assigned to
  if (userRole === 'Member' && userId) {
    whereClause = {
      organizationId,
      members: {
        some: {
          userId: userId
        }
      }
    };
  }

  const bargainingUnits = await prisma.bargainingUnit.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          grievances: true,
          complaints: true,
          agreements: true,
          members: true
        }
      },
      agreements: {
        select: {
          id: true,
          _count: {
            select: {
              stepTemplates: true
            }
          }
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return bargainingUnits.map(unit => {
    const agreementsWithoutTemplates = unit.agreements.filter(a => a._count.stepTemplates === 0).length;
    return {
      ...unit,
      stats: {
        grievances: unit._count.grievances,
        complaints: unit._count.complaints,
        agreements: unit._count.agreements,
        agreementsWithoutTemplates,
        members: unit._count.members,
        total: unit._count.grievances + unit._count.complaints + unit._count.agreements + unit._count.members
      }
    };
  });
}

export async function fetchBargainingUnitByIdPrisma(id: string, organizationId: string, userId?: string, userRole?: string): Promise<BargainingUnit | null> {
  let whereClause: any = {
    id,
    organizationId
  };

  // If user is a Member (not Admin), only allow access to bargaining units they're assigned to
  if (userRole === 'Member' && userId) {
    whereClause = {
      id,
      organizationId,
      members: {
        some: {
          userId: userId
        }
      }
    };
  }

  const bargainingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id,
      organizationId
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true
        }
      },
      updater: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return bargainingUnit;
}

export async function createBargainingUnitPrisma(
  name: string,
  description: string | undefined,
  organizationId: string,
  createdBy: string,
  unionContactName?: string | null,
  unionContactEmail?: string | null,
  unionContactPhone?: string | null,
  logoFilename?: string | null
): Promise<BargainingUnit> {
  const bargainingUnit = await prisma.bargainingUnit.create({
    data: {
      name,
      description,
      organizationId,
      createdBy,
      lastUpdatedBy: createdBy, // Set initial lastUpdatedBy to creator
      unionContactName,
      unionContactEmail,
      unionContactPhone,
      logoFilename
    }
  });

  return bargainingUnit;
}

export async function updateBargainingUnitPrisma(
  id: string,
  name: string,
  description: string | null,
  organizationId: string,
  lastUpdatedBy: string,
  unionContactName?: string | null,
  unionContactEmail?: string | null,
  unionContactPhone?: string | null,
  logoFilename?: string | null
): Promise<BargainingUnit> {
  // Verify the bargaining unit belongs to the user's organization
  const existingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id,
      organizationId
    }
  });

  if (!existingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  // Build update data object, only including provided fields
  const updateData: any = {
    name,
    description,
    lastUpdatedBy
  };

  // Only update union contact fields if they are provided
  if (unionContactName !== undefined) updateData.unionContactName = unionContactName;
  if (unionContactEmail !== undefined) updateData.unionContactEmail = unionContactEmail;
  if (unionContactPhone !== undefined) updateData.unionContactPhone = unionContactPhone;
  if (logoFilename !== undefined) updateData.logoFilename = logoFilename;

  const bargainingUnit = await prisma.bargainingUnit.update({
    where: { id },
    data: updateData
  });

  return bargainingUnit;
}

export async function deleteBargainingUnitPrisma(id: string, organizationId: string): Promise<void> {
  // Verify the bargaining unit belongs to the user's organization
  const existingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id,
      organizationId
    }
  });

  if (!existingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  // Check if the bargaining unit has associated records
  const [grievanceCount, agreementCount] = await Promise.all([
    prisma.grievance.count({ where: { bargainingUnitId: id } }),
    prisma.agreement.count({ where: { bargainingUnitId: id } })
  ]);

  const totalAssociatedRecords = grievanceCount + agreementCount;
  
  if (totalAssociatedRecords > 0) {
    throw new Error(
      `Cannot delete bargaining unit. It has ${totalAssociatedRecords} associated records (${grievanceCount} grievances, ${agreementCount} agreements).`
    );
  }

  // Remove all staff members from the bargaining unit first
  await prisma.bargainingUnitMember.deleteMany({
    where: { bargainingUnitId: id }
  });

  // Now delete the bargaining unit
  await prisma.bargainingUnit.delete({
    where: { id }
  });
}

export async function getBargainingUnitStatsPrisma(id: string, organizationId: string) {
  // Verify the bargaining unit belongs to the user's organization
  const existingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id,
      organizationId
    }
  });

  if (!existingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  const [grievanceCount, agreementCount] = await Promise.all([
    prisma.grievance.count({ where: { bargainingUnitId: id } }),
    prisma.agreement.count({ where: { bargainingUnitId: id } })
  ]);

  return {  
    grievances: grievanceCount,
    agreements: agreementCount,
    total: grievanceCount + agreementCount
  };
}

export async function getLatestAgreementByBargainingUnitPrisma(bargainingUnitId: string, organizationId: string) {
  // Verify the bargaining unit belongs to the user's organization
  const existingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id: bargainingUnitId,
      organizationId
    }
  });

  if (!existingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  // Get the latest agreement based on effective date
  const latestAgreement = await prisma.agreement.findFirst({
    where: {
      bargainingUnitId,
      organizationId
    },
    include: {
      bargainingUnit: {
        select: {
          id: true,
          name: true,
          description: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: {
      effectiveDate: 'desc'
    }
  });

  console.log('📄 Server: Agreement query result:', latestAgreement ? { 
    id: latestAgreement.id, 
    name: latestAgreement.name,
    bargainingUnitId: latestAgreement.bargainingUnitId,
    organizationId: latestAgreement.organizationId
  } : 'null');

  return latestAgreement ? transformAgreement(latestAgreement) : null;
}

export async function getLatestAgreementIdByBargainingUnitPrisma(bargainingUnitId: string, organizationId: string): Promise<string | null> {
  // Verify the bargaining unit belongs to the user's organization
  const existingUnit = await prisma.bargainingUnit.findFirst({
    where: {
      id: bargainingUnitId,
      organizationId
    }
  });

  if (!existingUnit) {
    throw new Error('Bargaining unit not found or access denied.');
  }

  // Get only the ID of the latest agreement - much faster query
  const latestAgreement = await prisma.agreement.findFirst({
    where: {
      bargainingUnitId,
      organizationId
    },
    select: {
      id: true
    },
    orderBy: {
      effectiveDate: 'desc'
    }
  });

  return latestAgreement?.id || null;
} 