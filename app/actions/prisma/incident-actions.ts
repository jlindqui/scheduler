'use server';

import { prisma } from '@/app/lib/db';
import { Prisma } from '@prisma/client';
import { withAuth } from '@/app/actions/auth';

// Use Prisma's built-in type inference for better type safety
type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: {
    assignedTo: {
      select: {
        id: true;
        name: true;
        email: true;
        image: true;
      };
    };
    creator: {
      select: {
        id: true;
        name: true;
      };
    };
    lastUpdatedBy: {
      select: {
        id: true;
        name: true;
      };
    };
    organization: {
      select: {
        id: true;
        name: true;
      };
    };
    agreement: {
      select: {
        id: true;
        name: true;
      };
    };
    evidence: true;
  };
}>;

export interface IncidentListItem {
  id: string;
  category: string | null;
  status: string;
  filedAt: Date | null;
  description: string | null;
  bargainingUnit: string | null;
  employees: any;
  organizationId: string;
  creatorId: string | null;
  lastUpdatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  creator: {
    id: string;
    name: string | null;
  } | null;
}

export async function fetchIncidentsPrisma(organizationId: string): Promise<IncidentListItem[]> {
  try {
    const incidents = await prisma.incident.findMany({
      where: {
        organizationId,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        lastUpdatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        filedAt: 'desc',
      },
    });

    return incidents.map(incident => ({
      id: incident.id,
      category: incident.category,
      status: incident.status,
      filedAt: incident.filedAt,
      description: incident.description,
      bargainingUnit: incident.bargainingUnit,
      employees: incident.employees || [],
      organizationId: incident.organizationId,
      creatorId: incident.creator?.id || null,
      lastUpdatedById: incident.lastUpdatedBy?.id || null,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      assignedTo: incident.assignedTo,
      creator: incident.creator,
    }));
  } catch (error) {
    console.error('Error fetching incidents:', error);
    throw new Error('Failed to fetch incidents');
  }
}

export async function fetchIncidentByIdPrisma(id: string, organizationId: string): Promise<IncidentWithRelations | null> {
  try {
    const incident = await prisma.incident.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        lastUpdatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        agreement: {
          select: {
            id: true,
            name: true,
          },
        },
        evidence: true,
      },
    });

    return incident;
  } catch (error) {
    console.error('Error fetching incident by ID:', error);
    throw new Error('Failed to fetch incident');
  }
}

export async function createIncidentPrisma(data: {
  organizationId: string;
  category?: string;
  description?: string;
  bargainingUnit?: string;
  employees?: any;
  creatorId?: string;
  agreementId?: string;
  status?: string;
}): Promise<IncidentWithRelations> {
  try {
    const incident = await prisma.incident.create({
      data: {
        organizationId: data.organizationId,
        category: data.category,
        description: data.description,
        bargainingUnit: data.bargainingUnit,
        employees: data.employees || [],
        creatorId: data.creatorId,
        agreementId: data.agreementId,
        status: (data.status as any) || 'ACTIVE',
        filedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        lastUpdatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        agreement: {
          select: {
            id: true,
            name: true,
          },
        },
        evidence: true,
      },
    });

    return incident;
  } catch (error) {
    console.error('Error creating incident:', error);
    throw new Error('Failed to create incident');
  }
}

export async function updateIncidentPrisma(
  id: string,
  organizationId: string,
  data: {
    category?: string;
    description?: string;
    bargainingUnit?: string;
    employees?: any;
    lastUpdatedById?: string;
    agreementId?: string;
    status?: string;
  }
): Promise<IncidentWithRelations> {
  try {
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.bargainingUnit !== undefined) updateData.bargainingUnit = data.bargainingUnit;
    if (data.employees !== undefined) updateData.employees = data.employees;
    if (data.lastUpdatedById !== undefined) updateData.lastUpdatedById = data.lastUpdatedById;
    if (data.agreementId !== undefined) updateData.agreementId = data.agreementId;
    if (data.status !== undefined) updateData.status = data.status;

    const incident = await prisma.incident.update({
      where: {
        id,
        organizationId,
      },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        lastUpdatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        agreement: {
          select: {
            id: true,
            name: true,
          },
        },
        evidence: true,
      },
    });

    return incident;
  } catch (error) {
    console.error('Error updating incident:', error);
    throw new Error('Failed to update incident');
  }
}

export async function deleteIncidentPrisma(id: string, organizationId: string): Promise<void> {
  try {
    await prisma.incident.delete({
      where: {
        id,
        organizationId,
      },
    });
  } catch (error) {
    console.error('Error deleting incident:', error);
    throw new Error('Failed to delete incident');
  }
}

export async function updateIncidentStatusPrisma(
  id: string,
  organizationId: string,
  status: string,
  lastUpdatedById?: string
): Promise<IncidentWithRelations> {
  try {
    const incident = await prisma.incident.update({
      where: {
        id,
        organizationId,
      },
      data: {
        status: status as any,
        lastUpdatedById,
        updatedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        lastUpdatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        agreement: {
          select: {
            id: true,
            name: true,
          },
        },
        evidence: true,
      },
    });

    return incident;
  } catch (error) {
    console.error('Error updating incident status:', error);
    throw new Error('Failed to update incident status');
  }
}

export async function updateIncidentAssigneePrisma(
  id: string,
  organizationId: string,
  assignedToId: string | null,
  lastUpdatedById: string
): Promise<IncidentWithRelations> {
  try {
    const incident = await prisma.incident.update({
      where: {
        id,
        organizationId,
      },
      data: {
        assignedToId,
        lastUpdatedById,
        updatedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        lastUpdatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        agreement: {
          select: {
            id: true,
            name: true,
          },
        },
        evidence: true,
      },
    });

    return incident;
  } catch (error) {
    console.error('Error updating incident assignee:', error);
    throw new Error('Failed to update incident assignee');
  }
}