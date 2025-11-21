"use server";
import { prisma } from "@/app/lib/db";
import {
  GrievanceListItem,
  Grievor,
  WorkInformation,
  ResolutionDetails,
} from "@/app/lib/definitions";
import { OptimizedGrievanceListItem } from "./types";
import {
  GrievanceStatus,
  GrievanceStage,
  GrievanceEventType,
  MeetingType,
  Prisma,
} from "@prisma/client";
import { withAuth } from "@/app/actions/auth";
import { getServerSession } from "@/lib/auth/server-session";
import { generateGrievanceNumber } from "./sequence-actions";
import { indexGrievance } from "@/app/actions/grievances/grievance-search";

// Use Prisma's built-in type inference for better type safety
type GrievanceWithRelations = Prisma.GrievanceGetPayload<{
  include: {
    report: true;
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
    bargainingUnit: {
      select: {
        id: true;
        name: true;
        description: true;
        organizationId: true;
        createdAt: true;
        updatedAt: true;
        logoFilename: true;
      };
    };
  };
}> & {
  complaintNumber?: string | null;
};

// Add new types for step operations
type GrievanceStepWithDetails = {
  id: string;
  grievanceId: string;
  stepNumber: number;
  stage: GrievanceStage;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "EXTENDED";
  dueDate: Date;
  completedDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StepTemplate = {
  stepNumber: number;
  name?: string;
  stage: string;
  description: string;
  timeLimit: string;
  timeLimitDays: number;
  isCalendarDays: boolean;
  requiredParticipants: string[];
  requiredDocuments: string[];
  notes?: string;
};

// Transformation functions removed - using Prisma types directly

export async function toGrievanceListItem(
  grievance: GrievanceWithRelations
): Promise<GrievanceListItem> {
  // Parse the JSON fields safely
  const grievors = grievance.report?.grievors
    ? ((Array.isArray(grievance.report.grievors)
        ? grievance.report.grievors
        : typeof grievance.report.grievors === "string"
          ? JSON.parse(grievance.report.grievors)
          : []) as Grievor[])
    : [];

  const workInformation = grievance.report?.workInformation
    ? ((typeof grievance.report.workInformation === "string"
        ? JSON.parse(grievance.report.workInformation)
        : grievance.report.workInformation) as WorkInformation)
    : {
        employer: "",
        supervisor: "",
        jobTitle: "",
        workLocation: "",
        employmentStatus: "",
      };

  // Parse resolution details if present
  let parsedResolutionDetails: ResolutionDetails | null = null;
  if (grievance.resolutionDetails) {
    try {
      const parsed =
        typeof grievance.resolutionDetails === "string"
          ? JSON.parse(grievance.resolutionDetails)
          : grievance.resolutionDetails;
      // Validate the shape of resolution details
      if (
        parsed &&
        typeof parsed === "object" &&
        "resolutionType" in parsed &&
        "resolutionDate" in parsed &&
        "resolvedBy" in parsed &&
        "details" in parsed
      ) {
        parsedResolutionDetails = parsed as ResolutionDetails;
      }
    } catch (e) {
      console.error("Error parsing resolution details:", e);
    }
  }

  const report = grievance.report
    ? {
        grievors,
        workInformation,
        statement: grievance.report.statement,
        settlementDesired: grievance.report.settlementDesired,
        articlesViolated: grievance.report.articlesViolated,
      }
    : null;

  // Convert type from database to UI type
  const type =
    grievance.type === "INDIVIDUAL" ||
    grievance.type === "GROUP" ||
    grievance.type === "POLICY"
      ? grievance.type
      : null;

  // Ensure bargainingUnit exists since it's required by the database
  if (!grievance.bargainingUnit) {
    throw new Error(`Bargaining unit not found for grievance ${grievance.id}`);
  }

  return {
    id: grievance.id,
    status: grievance.status,
    category: grievance.category,
    type,
    currentStep: grievance.currentStepNumber
      ? `Step ${grievance.currentStepNumber}`
      : null,
    createdAt: grievance.createdAt,
    updatedAt: grievance.updatedAt,
    filedAt: grievance.filedAt || new Date(), // Provide default value for null
    organizationId: grievance.organizationId,
    bargainingUnitId: grievance.bargainingUnitId,
    agreementId: grievance.agreementId,
    assignedToId: grievance.assignedToId,
    assignedTo: grievance.assignedTo
      ? {
          id: grievance.assignedTo.id,
          name: grievance.assignedTo.name,
        }
      : null,
    creator: grievance.creator
      ? {
          id: grievance.creator.id,
          name: grievance.creator.name,
        }
      : null,
    lastUpdatedBy: grievance.lastUpdatedBy
      ? {
          id: grievance.lastUpdatedBy.id,
          name: grievance.lastUpdatedBy.name,
          date: grievance.updatedAt,
        }
      : null,
    estimatedCost: grievance.estimatedCost
      ? Number(grievance.estimatedCost)
      : null,
    actualCost: grievance.actualCost ? Number(grievance.actualCost) : null,
    complaintNumber: grievance.complaintNumber,
    bargainingUnit: {
      id: grievance.bargainingUnit.id,
      name: grievance.bargainingUnit.name,
      description: grievance.bargainingUnit.description,
      organizationId: grievance.bargainingUnit.organizationId,
      createdAt: grievance.bargainingUnit.createdAt,
      updatedAt: grievance.bargainingUnit.updatedAt,
      logoFilename: grievance.bargainingUnit.logoFilename,
    },
    report,
    resolutionDetails: parsedResolutionDetails,
  };
}

// Optimized fetch for list view - only fetches fields actually displayed
interface GrievanceFilters {
  searchTerm?: string;
  bargainingUnitFilter?: string;
  typeFilter?: "ALL" | "INDIVIDUAL" | "GROUP" | "POLICY";
  statusFilter?: "ACTIVE" | "COMPLETED";
  assignedToFilter?: string;
}

async function fetchGrievancesWithCountInternal(
  organizationId: string,
  page: number = 1,
  pageSize: number = 20,
  filters: GrievanceFilters = {}
): Promise<{ grievances: OptimizedGrievanceListItem[], totalCount: number }> {
  try {
    const where = {
      organizationId,
    };

    // Get both data and total count in parallel
    const [grievances, totalCount] = await Promise.all([
      prisma.grievance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          status: true,
          category: true,
          currentStage: true,
          currentStepNumber: true,
          filedAt: true,
          createdAt: true,
          updatedAt: true,
          complaintNumber: true,
          bargainingUnitId: true,
          assignedToId: true,
          organizationId: true,
          agreementId: true,
          resolutionDetails: true,
          // Only select minimal user info needed for display
          assignedTo: {
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
          bargainingUnit: {
            select: {
              id: true,
              name: true,
              description: true,
              organizationId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          // Only fetch grievors for list view (statement, workInformation, etc. not needed)
          report: {
            select: {
              id: true,
              grievors: true, // Only field needed for list display
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.grievance.count({ where })
    ]);

    // Batch fetch all creator events in one query
    const grievanceIds = grievances.map(g => g.id);
    const creatorEvents = await prisma.grievanceEvent.findMany({
      where: {
        grievanceId: { in: grievanceIds },
        eventType: "CREATED",
      },
      select: {
        grievanceId: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create a map for quick lookups
    const creatorMap = new Map();
    creatorEvents.forEach(event => {
      creatorMap.set(event.grievanceId, event.user);
    });

    // Add creator info and current step to each grievance
    const grievancesWithCreator = grievances.map(grievance => {
      const creator = creatorMap.get(grievance.id);
      return {
        ...grievance,
        creator,
        currentStep: grievance.currentStage || null,
        filedAt: grievance.filedAt || grievance.createdAt, // Fallback to createdAt if filedAt is null
        lastUpdatedBy: grievance.lastUpdatedBy ? {
          ...grievance.lastUpdatedBy,
          date: grievance.updatedAt, // Add the date field required by GrievanceListItem
        } : null,
      };
    });

    return { grievances: grievancesWithCreator, totalCount };
  } catch (error) {
    console.error("Error in fetchGrievancesWithCountInternal:", error);
    throw error;
  }
}

async function fetchGrievancesListOptimizedInternal(
  organizationId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<GrievanceListItem[]> {
  try {
    // Single query with only necessary fields for list view + pagination
    const grievances = await prisma.grievance.findMany({
      where: {
        organizationId,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        status: true,
        category: true,
        currentStage: true,
        currentStepNumber: true,
        filedAt: true,
        createdAt: true,
        updatedAt: true,
        complaintNumber: true,
        bargainingUnitId: true,
        assignedToId: true,
        organizationId: true,
        agreementId: true,
        // Only select minimal user info needed for display
        assignedTo: {
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
        bargainingUnit: {
          select: {
            id: true,
            name: true,
          },
        },
        // Only get grievors names from report (not full JSON)
        report: {
          select: {
            id: true,
            grievors: true, // We'll parse just the names
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Batch fetch all creator events in one query
    const grievanceIds = grievances.map(g => g.id);
    const creatorEvents = await prisma.grievanceEvent.findMany({
      where: {
        grievanceId: { in: grievanceIds },
        eventType: "CREATED",
      },
      select: {
        grievanceId: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create a map for quick lookup
    const creatorMap = new Map(
      creatorEvents.map(event => [event.grievanceId, event.user])
    );

    // Transform to list items with minimal processing
    return grievances.map(grievance => {
      // Parse only grievors names (not full report)
      const grievors = grievance.report?.grievors
        ? (Array.isArray(grievance.report.grievors)
            ? grievance.report.grievors
            : typeof grievance.report.grievors === "string"
              ? JSON.parse(grievance.report.grievors)
              : [])
        : [];

      return {
        id: grievance.id,
        type: grievance.type,
        status: grievance.status,
        category: grievance.category,
        currentStage: grievance.currentStage,
        currentStep: grievance.currentStepNumber
          ? `Step ${grievance.currentStepNumber}`
          : null,
        currentStepNumber: grievance.currentStepNumber,
        filedAt: grievance.filedAt,
        createdAt: grievance.createdAt,
        updatedAt: grievance.updatedAt,
        organizationId: grievance.organizationId,
        bargainingUnitId: grievance.bargainingUnitId,
            agreementId: grievance.agreementId,
        assignedToId: grievance.assignedToId,
        assignedTo: grievance.assignedTo,
        creator: creatorMap.get(grievance.id) || null,
        lastUpdatedBy: grievance.lastUpdatedBy
          ? {
              id: grievance.lastUpdatedBy.id,
              name: grievance.lastUpdatedBy.name,
              date: grievance.updatedAt,
            }
          : null,
        complaintNumber: grievance.complaintNumber,
        bargainingUnit: {
          id: grievance.bargainingUnit.id,
          name: grievance.bargainingUnit.name,
          description: null, // Not needed for list view
          organizationId: grievance.organizationId,
          createdAt: grievance.createdAt,
          updatedAt: grievance.updatedAt,
        },
        report: grievance.report
          ? {
              id: grievance.report.id,
              grievors: grievors,
              // Minimal report data for list view
              workInformation: null,
              meetingDetails: null,
              resolutionDetails: null,
              violationDetails: null,
            }
          : null,
        resolutionDetails: null, // Not displayed in list view
        estimatedCost: null, // Not displayed in list view
        actualCost: null, // Not displayed in list view
      } as GrievanceListItem;
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch grievances.");
  }
}

async function fetchGrievanceByIdPrismaInternal(
  id: string,
  organizationId: string
): Promise<GrievanceWithRelations> {
  try {
    const [grievance, createdEvent] = await Promise.all([
      prisma.grievance.findUnique({
        where: {
          id,
          organizationId,
        },
        include: {
          report: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          bargainingUnit: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      }),
      prisma.grievanceEvent.findFirst({
        where: {
          grievanceId: id,
          eventType: "CREATED",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    if (!grievance) {
      throw new Error("Grievance not found");
    }

    const grievanceWithCreator = {
      ...grievance,
      estimatedCost: grievance.estimatedCost
        ? Number(grievance.estimatedCost)
        : null,
      actualCost: grievance.actualCost ? Number(grievance.actualCost) : null,
      creator: createdEvent?.user || null,
    } as GrievanceWithRelations;

    return grievanceWithCreator;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch grievance.");
  }
}

async function fetchGrievanceAgreementPrismaInternal(
  grievanceId: string,
  organizationId: string
) {
  try {
    // Find the grievance
    const grievance = await prisma.grievance.findUnique({
      where: {
        id: grievanceId,
        organizationId,
      },
    });

    if (!grievance) {
      throw new Error("Grievance not found");
    }

    // Use type assertion to access agreementId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grievanceAny = grievance as any;
    if (grievanceAny.agreementId) {
      const agreement = await prisma.agreement.findUnique({
        where: {
          id: grievanceAny.agreementId,
        },
        include: {
          bargainingUnit: {
            select: {
              id: true,
              name: true,
              description: true,
              organizationId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
      return agreement;
    }

    // Fallback to the old method for backward compatibility
    if (grievance.status && grievance.status.startsWith("Agreement:")) {
      const agreementName = grievance.status.replace("Agreement:", "").trim();

      // Find the agreement by name
      const agreement = await prisma.agreement.findFirst({
        where: {
          name: agreementName,
          organizationId,
        },
        include: {
          bargainingUnit: {
            select: {
              id: true,
              name: true,
              description: true,
              organizationId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return agreement;
    }

    return null;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch grievance agreement.");
  }
}

async function fetchGrievanceListItemByIdPrismaInternal(
  id: string
): Promise<GrievanceListItem> {
  const grievance = await prisma.grievance.findUnique({
    where: { id },
    include: {
      report: true,
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
      bargainingUnit: {
        select: {
          id: true,
          name: true,
          description: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          logoFilename: true,
        },
      },
    },
  });

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  return toGrievanceListItem(grievance);
}

async function fetchGrievanceTableByIdPrismaInternal(
  id: string,
  organizationId: string
) {
  try {
    const grievance = await prisma.grievance.findUnique({
      where: {
        id,
        organizationId,
      },
      include: {
        report: true,
      },
    });

    if (!grievance) {
      throw new Error("Grievance not found");
    }

    const grievors = grievance.report?.grievors
      ? (JSON.parse(JSON.stringify(grievance.report.grievors)) as Grievor[])
      : [];

    return {
      id: grievance.id,
      status: grievance.status,
      createdAt: grievance.createdAt,
      updatedAt: grievance.updatedAt,
      organizationId: grievance.organizationId,
      report: grievance.report
        ? {
            grievors,
          }
        : null,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch grievance.");
  }
}

async function createGrievancePrismaInternal(
  organizationId: string,
  grievors: Grievor[],
  workInformation: WorkInformation,
  statement: string,
  settlementDesired: string,
  bargainingUnitId: string,
  articlesViolated?: string | null,
  category?: string | null,
  filedAt?: Date | null,
  type: "INDIVIDUAL" | "GROUP" | "POLICY" = "INDIVIDUAL",
  agreementId?: string | null,
  stage: "INFORMAL" | "FORMAL" = "INFORMAL",
  externalGrievanceId?: string | null
): Promise<GrievanceWithRelations> {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Verify that the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new Error(
        `User with ID ${userId} not found in database. Please log out and log back in.`
      );
    }

    if (!agreementId) {
      throw new Error("Collective agreement is required");
    }

    if (!bargainingUnitId) {
      throw new Error("Bargaining unit is required");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get the selected agreement
      const agreement = await tx.agreement.findUnique({
        where: { id: agreementId },
      });

      if (!agreement) {
        throw new Error("Selected agreement not found");
      }

      // Get the step templates from the agreement for the specified type and stage
      let stepTemplates = await tx.agreementStepTemplate.findMany({
        where: {
          agreementId: agreement.id,
          type: type,
          stage: stage,
        },
        select: {
          stepNumber: true,
          description: true,
          timeLimit: true,
          timeLimitDays: true,
          isCalendarDays: true,
          requiredParticipants: true,
          requiredDocuments: true,
          notes: true,
        },
        orderBy: {
          stepNumber: "asc",
        },
      });

      // If no step templates found for the specific stage, try to find any step templates for this type
      // and use the lowest step number, then manually set the stage
      if (!stepTemplates || stepTemplates.length === 0) {
        const allStepTemplates = await tx.agreementStepTemplate.findMany({
          where: {
            agreementId: agreement.id,
            type: type,
          },
          select: {
            stepNumber: true,
            description: true,
            timeLimit: true,
            timeLimitDays: true,
            isCalendarDays: true,
            requiredParticipants: true,
            requiredDocuments: true,
            notes: true,
          },
          orderBy: {
            stepNumber: "asc",
          },
        });

        if (!allStepTemplates || allStepTemplates.length === 0) {
          throw new Error(
            `No grievance steps are set up for ${type} grievance type in this bargaining unit. Please contact your administrator to configure the grievance process.`
          );
        }

        // Use the lowest step number and manually set the stage
        stepTemplates = [allStepTemplates[0]];
      }

      // Find the lowest step number within the selected stage
      const template = stepTemplates[0]; // Already ordered by stepNumber asc, so first is lowest

      // Get organization name for complaint number generation
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });

      // Generate complaint number
      const complaintNumber = await generateGrievanceNumber(
        organizationId,
        organization?.name
      );

      // Create the grievance with category, type, and stage included
      const grievance = await tx.grievance.create({
        data: {
          status: "ACTIVE",
          organizationId,
          bargainingUnitId: bargainingUnitId,
          category: category || null,
          type,
          filedAt: filedAt || new Date(),
          creatorId: userId,
          lastUpdatedById: userId,
          currentStepNumber: template.stepNumber, // Use the found step number
          currentStage: stage, // Use the selected stage
          agreementId: agreement.id, // Use the selected agreement
          assignedToId: null, // Initialize as null
          complaintNumber, // Add the generated complaint number
          externalGrievanceId: externalGrievanceId || null, // Add the external grievance ID
          report: {
            create: {
              grievors: grievors as unknown as Prisma.InputJsonValue,
              workInformation:
                workInformation as unknown as Prisma.InputJsonValue,
              statement,
              settlementDesired,
              articlesViolated: articlesViolated || null,
            },
          },
        },
        include: {
          report: true,
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          bargainingUnit: {
            select: {
              id: true,
              name: true,
              description: true,
              organizationId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      // Create the initial step with the found step number and stage
      await tx.grievanceStep.create({
        data: {
          grievanceId: grievance.id,
          stepNumber: template.stepNumber,
          stage: stage,
          status: "PENDING",
          dueDate: template.timeLimitDays === 0
            ? new Date() // For 0-day timelines, set to today (no actual deadline)
            : new Date(Date.now() + template.timeLimitDays * 24 * 60 * 60 * 1000),
          notes: template.description,
        },
      });

      // Create a CREATED event
      await tx.grievanceEvent.create({
        data: {
          grievanceId: grievance.id,
          userId,
          eventType: "CREATED",
        },
      });


      return grievance;
    });

    return result as GrievanceWithRelations;
  } catch (error) {
    console.error("Error creating grievance:", error);
    throw error;
  }
}

async function updateGrievanceStatusPrismaInternal(
  grievanceId: string,
  organizationId: string,
  status: string,
  stage: GrievanceStage | null,
  outcomes: string | null,
  resolutionDetails: ResolutionDetails | null
) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    let updatedResolutionDetails: ResolutionDetails | null = resolutionDetails;

    // If we have outcomes but no resolution details, create a new resolution details object
    if (outcomes && !updatedResolutionDetails) {
      updatedResolutionDetails = {
        resolutionType: status as ResolutionDetails["resolutionType"],
        resolutionDate: new Date().toISOString(),
        resolvedBy: userId || "",
        details: outcomes,
        outcomes,
      };
    }
    // If we have both outcomes and resolution details, merge them
    else if (outcomes && updatedResolutionDetails) {
      updatedResolutionDetails = {
        ...updatedResolutionDetails,
        outcomes,
        resolutionDate: new Date().toISOString(),
      };
    }

    // Update using Prisma's type-safe update with new stage type
    const result = await prisma.grievance.update({
      where: {
        id: grievanceId,
        organizationId,
      },
      data: {
        status: status as GrievanceStatus,
        currentStage: stage,
        lastUpdatedById: userId,
        ...(updatedResolutionDetails !== undefined && {
          resolutionDetails: updatedResolutionDetails as Prisma.InputJsonValue,
        }),
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
    });

    if (!result) {
      throw new Error("Failed to fetch updated grievance");
    }

    return {
      success: true,
      grievance: toGrievanceListItem(result as GrievanceWithRelations),
    };
  } catch (error) {
    console.error("Error updating grievance status:", error);
    throw new Error("Failed to update grievance status");
  }
}

async function updateGrievanceAgreementPrismaInternal(
  grievanceId: string,
  agreementId: string,
  organizationId: string
) {
  try {
    // First verify the agreement exists and belongs to the organization
    const agreement = await prisma.agreement.findUnique({
      where: {
        id: agreementId,
        organizationId,
      },
    });

    if (!agreement) {
      throw new Error("Agreement not found or does not belong to organization");
    }

    // Then update the grievance
    await prisma.grievance.update({
      where: {
        id: grievanceId,
        organizationId,
      },
      data: {
        agreementId,
      },
    });
  } catch (error) {
    console.error("Error updating grievance agreement:", error);
    throw new Error("Failed to update grievance agreement");
  }
}

async function clearGrievanceAgreementPrismaInternal(
  grievanceId: string,
  organizationId: string
) {
  try {
    await prisma.grievance.update({
      where: {
        id: grievanceId,
        organizationId,
      },
      data: {
        agreementId: null,
      },
    });
  } catch (error) {
    console.error("Error clearing grievance agreement:", error);
    throw new Error("Failed to clear grievance agreement");
  }
}

async function updateGrievanceCategoryPrismaInternal(
  grievanceId: string,
  category: string | null,
  organizationId: string
) {
  try {
    await prisma.grievance.update({
      where: {
        id: grievanceId,
        organizationId,
      },
      data: {
        category,
      },
    });
  } catch (error) {
    console.error("Error updating grievance category:", error);
    throw new Error("Failed to update grievance category");
  }
}

async function deleteGrievancePrismaInternal(
  id: string,
  organizationId: string
) {
  try {
    // Use a transaction to ensure all operations complete or none do
    await prisma.$transaction(async (tx) => {
      // First delete any associated evidence
      await tx.evidence.deleteMany({
        where: {
          grievanceId: id,
          grievance: {
            organizationId,
          },
        },
      });

      // Delete any associated grievance events
      await tx.grievanceEvent.deleteMany({
        where: {
          grievanceId: id,
          grievance: {
            organizationId,
          },
        },
      });


      // Then delete the associated report
      await tx.grievanceReport.deleteMany({
        where: {
          grievanceId: id,
          grievance: {
            organizationId,
          },
        },
      });

      // Finally delete the grievance itself
      await tx.grievance.delete({
        where: {
          id,
          organizationId,
        },
      });
    });
  } catch (error) {
    console.error("Error deleting grievance:", error);
    throw new Error("Failed to delete grievance");
  }
}

async function fetchFilteredGrievancesPrismaInternal(
  organizationId: string,
  query?: string | null | number,
  currentPage?: number,
  itemsPerPage?: number
) {
  // Convert query to string if it's a number, or use empty string if null/undefined
  const queryString = query != null ? String(query) : "";
  const normalizedQuery = queryString.toUpperCase();

  try {
    // Helper function to check if a string is a valid GrievanceStatus
    const isValidGrievanceStatus = (
      status: string
    ): status is GrievanceStatus => {
      return Object.values(GrievanceStatus).includes(status as GrievanceStatus);
    };

    // Get all status values that contain the query string (case insensitive)
    const matchingStatuses = Object.values(GrievanceStatus).filter((status) =>
      status.toLowerCase().includes(queryString.toLowerCase())
    ) as GrievanceStatus[];

    const where: Prisma.GrievanceWhereInput = {
      organizationId,
      OR: queryString
        ? [
            // Status exact match if it's a valid status
            ...(isValidGrievanceStatus(normalizedQuery)
              ? [{ status: normalizedQuery as GrievanceStatus }]
              : []),
            // Status partial match using array of matching statuses
            ...(matchingStatuses.length > 0
              ? [{ status: { in: matchingStatuses } }]
              : []),
            // Category search
            {
              category: {
                contains: queryString,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            // Assignee name search
            {
              assignedTo: {
                name: {
                  contains: queryString,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // Creator name search
            {
              creator: {
                name: {
                  contains: queryString,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // Last updated by name search
            {
              lastUpdatedBy: {
                name: {
                  contains: queryString,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // Grievors search - using string_contains for JSON field
            {
              report: {
                grievors: {
                  string_contains: queryString,
                },
              },
            },
          ]
        : undefined,
    };

    const [grievances, total] = await Promise.all([
      prisma.grievance.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:
          currentPage && itemsPerPage
            ? (currentPage - 1) * itemsPerPage
            : undefined,
        take: itemsPerPage,
        include: {
          report: true,
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
          bargainingUnit: {
            select: {
              id: true,
              name: true,
              description: true,
              organizationId: true,
              createdAt: true,
              updatedAt: true,
              logoFilename: true,
            },
          },
        },
      }),
      prisma.grievance.count({ where }),
    ]);

    // Transform the grievances to include lastUpdatedBy with date from updatedAt
    const transformedGrievances = grievances.map((grievance) => {
      // Ensure bargainingUnit exists since it's required by the database
      if (!grievance.bargainingUnit) {
        throw new Error(
          `Bargaining unit not found for grievance ${grievance.id}`
        );
      }

      return {
        ...grievance,
        lastUpdatedBy: grievance.lastUpdatedBy
          ? {
              id: grievance.lastUpdatedBy.id,
              name: grievance.lastUpdatedBy.name,
              date: grievance.updatedAt,
            }
          : null,
        bargainingUnit: {
          id: grievance.bargainingUnit.id,
          name: grievance.bargainingUnit.name,
          description: grievance.bargainingUnit.description,
          organizationId: grievance.bargainingUnit.organizationId,
          createdAt: grievance.bargainingUnit.createdAt,
          updatedAt: grievance.bargainingUnit.updatedAt,
          logoFilename: grievance.bargainingUnit.logoFilename,
        },
      };
    });

    const result = {
      grievances: await Promise.all(
        transformedGrievances.map(toGrievanceListItem)
      ),
      total,
    };

    return result;
  } catch (error) {
    console.error("Error fetching filtered grievances:", error);
    throw error;
  }
}

async function fetchGrievancesPagesPrismaInternal(
  query: string,
  organizationId: string
) {
  const ITEMS_PER_PAGE = 6;
  const queryString = query;

  try {
    // Helper function to check if a string is a valid GrievanceStatus
    const isValidGrievanceStatus = (
      status: string
    ): status is GrievanceStatus => {
      return Object.values(GrievanceStatus).includes(status as GrievanceStatus);
    };

    // Get all status values that contain the query string (case insensitive)
    const matchingStatuses = Object.values(GrievanceStatus).filter((status) =>
      status.toLowerCase().includes(queryString.toLowerCase())
    ) as GrievanceStatus[];

    const where: Prisma.GrievanceWhereInput = {
      organizationId,
      OR: queryString
        ? [
            // Status exact match if it's a valid status
            ...(isValidGrievanceStatus(queryString.toUpperCase())
              ? [{ status: queryString.toUpperCase() as GrievanceStatus }]
              : []),
            // Status partial match using array of matching statuses
            ...(matchingStatuses.length > 0
              ? [{ status: { in: matchingStatuses } }]
              : []),
            // Category search
            {
              category: {
                contains: queryString,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            // Assignee name search
            {
              assignedTo: {
                name: {
                  contains: queryString,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // Grievors search - using string_contains for JSON field
            {
              report: {
                grievors: {
                  string_contains: queryString,
                },
              },
            },
          ]
        : undefined,
    };

    const count = await prisma.grievance.count({ where });

    return Math.ceil(count / ITEMS_PER_PAGE);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of grievances.");
  }
}

async function updateGrievanceAssigneePrismaInternal(
  grievanceId: string,
  assignedToId: string | null,
  userId: string
) {
  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    select: { assignedToId: true },
  });

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  const previousAssigneeId = grievance.assignedToId;

  const updatedGrievance = await prisma.grievance.update({
    where: { id: grievanceId },
    data: { assignedToId },
  });

  // Log the event
  await prisma.grievanceEvent.create({
    data: {
      grievanceId,
      userId,
      eventType: "ASSIGNEE_CHANGED",
      previousValue: previousAssigneeId || "",
      newValue: assignedToId || "",
    },
  });

  return updatedGrievance;
}

async function updateGrievanceFieldPrismaInternal(
  grievanceId: string,
  field: "statement" | "articlesViolated" | "settlementDesired",
  value: string
) {
  // Get current values before update
  const currentGrievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    include: { report: true },
  });

  if (!currentGrievance?.report) {
    throw new Error("Grievance report not found");
  }

  // Update the report
  const updatedGrievance = await prisma.grievance.update({
    where: { id: grievanceId },
    data: {
      report: {
        update: {
          [field]: value,
        },
      },
    },
    include: { report: true },
  });

  return {
    grievance: updatedGrievance,
    previousValue: currentGrievance.report[field] || undefined,
    newValue: value,
  };
}

async function getCurrentGrievanceAssigneePrismaInternal(grievanceId: string) {
  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    select: { assignedToId: true },
  });

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  return grievance.assignedToId;
}

async function getCurrentGrievanceReportPrismaInternal(grievanceId: string) {
  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    include: { report: true },
  });

  if (!grievance?.report) {
    throw new Error("Grievance report not found");
  }

  return grievance.report;
}

async function getCurrentGrievanceAgreementPrismaInternal(grievanceId: string) {
  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    select: { agreementId: true },
  });

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  return grievance.agreementId;
}

async function getCurrentGrievanceCategoryPrismaInternal(grievanceId: string) {
  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    select: { category: true },
  });

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  return grievance.category;
}

async function getCurrentGrievanceStatusPrismaInternal(grievanceId: string) {
  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    select: { status: true },
  });

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  return grievance.status;
}



async function fetchGrievanceStepsPrismaInternal(
  grievanceId: string
): Promise<StepTemplate[]> {
  try {
    // First get the grievance to get the agreement and type
    const grievance = await prisma.grievance.findUnique({
      where: { id: grievanceId },
      select: { agreementId: true, type: true },
    });

    if (!grievance?.agreementId || !grievance.type) {
      throw new Error("Grievance not found or missing agreement/type");
    }

    // Get the step templates from the agreement
    const stepTemplates = await prisma.agreementStepTemplate.findMany({
      where: {
        agreementId: grievance.agreementId,
        type: grievance.type,
      },
      select: {
        stepNumber: true,
        name: true,
        stage: true,
        description: true,
        timeLimit: true,
        timeLimitDays: true,
        isCalendarDays: true,
        requiredParticipants: true,
        requiredDocuments: true,
        notes: true,
      },
      orderBy: {
        stepNumber: "asc",
      },
    });

    // Transform the templates to match the StepTemplate type
    const transformedSteps = stepTemplates.map(
      (template): StepTemplate => ({
        stepNumber: template.stepNumber,
        name: template.name || undefined, // Handle null values
        stage: template.stage || "FORMAL", // Provide fallback to FORMAL
        description: template.description,
        timeLimit: template.timeLimit,
        timeLimitDays: template.timeLimitDays,
        isCalendarDays: template.isCalendarDays,
        requiredParticipants: template.requiredParticipants,
        requiredDocuments: template.requiredDocuments,
        notes: template.notes || undefined,
      })
    );

    return transformedSteps;
  } catch (error) {
    console.error("Error fetching grievance steps:", error);
    throw new Error("Failed to fetch grievance steps");
  }
}

async function updateGrievanceStepPrismaInternal(
  stepId: string,
  data: {
    status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "EXTENDED";
    notes?: string;
    completedDate?: Date | null;
  }
): Promise<GrievanceStepWithDetails> {
  try {
    const step = await prisma.grievanceStep.update({
      where: { id: stepId },
      data: {
        ...data,
        // If status is being set to COMPLETED and no completedDate is provided, set it to now
        completedDate:
          data.status === "COMPLETED" && !data.completedDate
            ? new Date()
            : data.completedDate,
        // If status is being changed from COMPLETED to something else, clear the completedDate
        ...(data.status && data.status !== "COMPLETED"
          ? { completedDate: null }
          : {}),
      },
    });

    return step;
  } catch (error) {
    console.error("Error updating grievance step:", error);
    throw new Error("Failed to update grievance step");
  }
}

async function createGrievanceStepPrismaInternal(
  grievanceId: string,
  data: {
    stepNumber: number;
    stage: GrievanceStage;
    dueDate: Date;
    notes?: string;
  }
): Promise<GrievanceStepWithDetails> {
  try {
    const step = await prisma.grievanceStep.create({
      data: {
        grievanceId,
        ...data,
        status: "PENDING",
      },
    });

    return step;
  } catch (error) {
    console.error("Error creating grievance step:", error);
    throw new Error("Failed to create grievance step");
  }
}

async function getCurrentGrievanceStepPrismaInternal(
  grievanceId: string
): Promise<GrievanceStepWithDetails | null> {
  try {
    const grievance = await prisma.grievance.findUnique({
      where: { id: grievanceId },
      select: { currentStepNumber: true },
    });

    if (!grievance?.currentStepNumber) {
      return null;
    }

    const step = await prisma.grievanceStep.findFirst({
      where: {
        grievanceId,
        stepNumber: grievance.currentStepNumber,
      },
    });

    return step;
  } catch (error) {
    console.error("Error getting current grievance step:", error);
    throw new Error("Failed to get current grievance step");
  }
}

async function fetchGrievanceEvidencePrismaInternal(grievanceId: string) {
  try {
    const evidence = await prisma.evidence.findMany({
      where: { grievanceId },
      orderBy: { date: "asc" },
    });
    return evidence;
  } catch (error) {
    console.error("Error fetching grievance evidence:", error);
    throw new Error("Failed to fetch grievance evidence");
  }
}




async function createGrievanceEventPrismaInternal(
  grievanceId: string,
  userId: string,
  eventType: string,
  newValue?: string
) {
  try {
    await prisma.grievanceEvent.create({
      data: {
        grievanceId,
        userId,
        eventType: eventType as GrievanceEventType,
        newValue: newValue || null,
      },
    });
  } catch (error) {
    console.error("Error creating grievance event:", error);
    throw new Error("Failed to create grievance event");
  }
}



async function fetchGrievanceStepInfoPrismaInternal(grievanceId: string) {
  try {
    // First get the current step number and agreement ID
    const grievance = await prisma.grievance.findUnique({
      where: { id: grievanceId },
      select: {
        currentStepNumber: true,
        agreementId: true,
        type: true,
      },
    });

    if (
      !grievance?.currentStepNumber ||
      !grievance.agreementId ||
      !grievance.type
    ) {
      return null;
    }

    // Get the current step
    const currentStep = await prisma.grievanceStep.findFirst({
      where: {
        grievanceId,
        stepNumber: grievance.currentStepNumber,
      },
      select: {
        createdAt: true,
      },
    });

    if (!currentStep) {
      return null;
    }

    // Get the step template
    const stepTemplate = await prisma.agreementStepTemplate.findFirst({
      where: {
        agreementId: grievance.agreementId,
        stepNumber: grievance.currentStepNumber,
        type: grievance.type,
      },
      select: {
        name: true,
        timeLimitDays: true,
        isCalendarDays: true,
      },
    });

    if (!stepTemplate) {
      return null;
    }

    return {
      stepName: stepTemplate.name,
      timeLimitDays: stepTemplate.timeLimitDays,
      isCalendarDays: stepTemplate.isCalendarDays,
      createdAt: currentStep.createdAt,
    };
  } catch (error) {
    console.error("Error fetching grievance step info:", error);
    return null;
  }
}

async function fetchMultipleGrievanceStepInfoPrismaInternal(
  grievanceIds: string[]
) {
  try {
    // Get all grievances with their current step info in a single query
    const grievances = await prisma.grievance.findMany({
      where: {
        id: { in: grievanceIds },
        currentStepNumber: { not: null },
        agreementId: { not: null },
      },
      select: {
        id: true,
        currentStepNumber: true,
        agreementId: true,
        type: true,
      },
    });

    // Get all current and next step templates in a single query
    const stepTemplates = await prisma.agreementStepTemplate.findMany({
      where: {
        OR: grievances.flatMap((g) => [
          {
            agreementId: g.agreementId!,
            stepNumber: g.currentStepNumber!,
            type: g.type!,
          },
          {
            agreementId: g.agreementId!,
            stepNumber: g.currentStepNumber! + 1,
            type: g.type!,
          },
        ]),
      },
      select: {
        agreementId: true,
        stepNumber: true,
        type: true,
        name: true,
        stage: true,
        timeLimitDays: true,
        isCalendarDays: true,
      },
    });

    // Get all current steps in a single query
    const currentSteps = await prisma.grievanceStep.findMany({
      where: {
        grievanceId: { in: grievanceIds },
        stepNumber: {
          in: grievances.map((g) => g.currentStepNumber!),
        },
      },
      select: {
        grievanceId: true,
        createdAt: true,
      },
    });

    // Create maps for quick lookup
    const templateMap = new Map();
    stepTemplates.forEach((t) => {
      templateMap.set(`${t.agreementId}-${t.stepNumber}-${t.type}`, t);
    });

    const stepMap = new Map();
    currentSteps.forEach((s) => {
      stepMap.set(s.grievanceId, s);
    });

    // Build the result
    const result: Record<
      string,
      {
        stepName?: string;
        stage?: string;
        timeLimitDays: number;
        isCalendarDays: boolean;
        createdAt: Date;
        nextStepName?: string;
      }
    > = {};

    for (const grievance of grievances) {
      const templateKey = `${grievance.agreementId}-${grievance.currentStepNumber}-${grievance.type}`;
      const nextTemplateKey = `${grievance.agreementId}-${grievance.currentStepNumber! + 1}-${grievance.type}`;
      const template = templateMap.get(templateKey);
      const nextTemplate = templateMap.get(nextTemplateKey);
      const step = stepMap.get(grievance.id);

      if (template && step) {
        result[grievance.id] = {
          stepName: template.name,
          stage: template.stage,
          timeLimitDays: template.timeLimitDays,
          isCalendarDays: template.isCalendarDays,
          createdAt: step.createdAt,
          nextStepName: nextTemplate?.name,
        };
      }
    }

    return result;
  } catch (error) {
    console.error("Error fetching multiple grievance step info:", error);
    return {};
  }
}

// Note-related functions
type GrievanceNoteWithUser = {
  id: string;
  grievanceId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

async function createGrievanceNotePrismaInternal(
  grievanceId: string,
  userId: string,
  content: string
): Promise<GrievanceNoteWithUser> {
  try {
    const note = await prisma.grievanceNote.create({
      data: {
        grievanceId,
        userId,
        content,
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

    // Index grievance for semantic search after note creation
    try {
      await indexGrievance(grievanceId);
    } catch (error) {
      console.error("Failed to index grievance for search:", error);
    }

    return note;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to create grievance note.");
  }
}

async function fetchGrievanceNotesPrismaInternal(
  grievanceId: string
): Promise<GrievanceNoteWithUser[]> {
  try {
    const notes = await prisma.grievanceNote.findMany({
      where: { grievanceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return notes;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch grievance notes.");
  }
}

async function updateGrievanceNotePrismaInternal(
  noteId: string,
  userId: string,
  content: string
): Promise<GrievanceNoteWithUser> {
  try {
    const note = await prisma.grievanceNote.update({
      where: {
        id: noteId,
        userId, // Ensure user can only update their own notes
      },
      data: { content },
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

    // Index grievance for semantic search after note update
    try {
      await indexGrievance(note.grievanceId);
    } catch (error) {
      console.error("Failed to index grievance for search:", error);
    }

    return note;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update grievance note.");
  }
}

async function deleteGrievanceNotePrismaInternal(
  noteId: string,
  userId: string
): Promise<void> {
  try {
    await prisma.grievanceNote.delete({
      where: {
        id: noteId,
        userId, // Ensure user can only delete their own notes
      },
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to delete grievance note.");
  }
}

async function getGrievanceNotePrismaInternal(
  noteId: string
): Promise<{ grievanceId: string; content: string } | null> {
  try {
    const note = await prisma.grievanceNote.findUnique({
      where: { id: noteId },
      select: { grievanceId: true, content: true },
    });
    return note;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to get grievance note.");
  }
}

async function updateGrievanceCostPrismaInternal(
  grievanceId: string,
  field: "estimatedCost" | "actualCost",
  value: number | null
): Promise<void> {
  try {
    await prisma.grievance.update({
      where: { id: grievanceId },
      data: {
        [field]: value,
      },
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update grievance cost.");
  }
}

async function updateGrievanceAISummaryPrismaInternal(
  grievanceId: string,
  aiSummary: string
): Promise<void> {
  try {
    await prisma.grievance.update({
      where: { id: grievanceId },
      data: { aiSummary },
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update grievance AI summary.");
  }
}

async function updateGrievanceAssessmentPrismaInternal(
  grievanceId: string,
  assessment: string
): Promise<void> {
  try {
    await prisma.grievance.update({
      where: { id: grievanceId },
      data: {
        assessment,
        assessmentGeneratedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update grievance assessment.");
  }
}

async function getGrievanceBasicInfoPrismaInternal(
  grievanceId: string,
  organizationId: string
): Promise<{
  id: string;
  currentStepNumber: number | null;
  currentStage: GrievanceStage | null;
} | null> {
  try {
    const grievance = await prisma.grievance.findUnique({
      where: {
        id: grievanceId,
        organizationId,
      },
      select: {
        id: true,
        currentStepNumber: true,
        currentStage: true,
      },
    });
    return grievance;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to get grievance basic info.");
  }
}

async function updateGrievanceCurrentStepPrismaInternal(
  grievanceId: string,
  organizationId: string,
  currentStepNumber: number,
  lastUpdatedById: string
): Promise<void> {
  try {
    await prisma.grievance.update({
      where: {
        id: grievanceId,
        organizationId,
      },
      data: {
        currentStepNumber,
        lastUpdatedById,
      },
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to update grievance current step.");
  }
}

async function getGrievanceCurrentStepNumberPrismaInternal(
  grievanceId: string
): Promise<number | null> {
  try {
    const grievance = await prisma.grievance.findUnique({
      where: { id: grievanceId },
      select: { currentStepNumber: true },
    });
    return grievance?.currentStepNumber || null;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to get grievance current step number.");
  }
}

// Export wrapped versions
export const fetchGrievancesPrisma = withAuth(fetchGrievancesListOptimizedInternal);
export const fetchGrievanceByIdPrisma = withAuth(
  fetchGrievanceByIdPrismaInternal
);
export const fetchGrievanceAgreementPrisma = withAuth(
  fetchGrievanceAgreementPrismaInternal
);
export const fetchGrievanceListItemByIdPrisma = withAuth(
  fetchGrievanceListItemByIdPrismaInternal
);
export const fetchGrievanceTableByIdPrisma = withAuth(
  fetchGrievanceTableByIdPrismaInternal
);
export const createGrievancePrisma = withAuth(createGrievancePrismaInternal);
export const updateGrievanceStatusPrisma = withAuth(
  updateGrievanceStatusPrismaInternal
);
export const updateGrievanceAgreementPrisma = withAuth(
  updateGrievanceAgreementPrismaInternal
);
export const clearGrievanceAgreementPrisma = withAuth(
  clearGrievanceAgreementPrismaInternal
);
export const updateGrievanceCategoryPrisma = withAuth(
  updateGrievanceCategoryPrismaInternal
);
export const deleteGrievancePrisma = withAuth(deleteGrievancePrismaInternal);
export const fetchFilteredGrievancesPrisma = withAuth(
  fetchFilteredGrievancesPrismaInternal
);
export const fetchGrievancesPagesPrisma = withAuth(
  fetchGrievancesPagesPrismaInternal
);
export const updateGrievanceAssigneePrisma = withAuth(
  updateGrievanceAssigneePrismaInternal
);
export const updateGrievanceFieldPrisma = withAuth(
  updateGrievanceFieldPrismaInternal
);
export const getCurrentGrievanceAssigneePrisma = withAuth(
  getCurrentGrievanceAssigneePrismaInternal
);
export const getCurrentGrievanceReportPrisma = withAuth(
  getCurrentGrievanceReportPrismaInternal
);
export const getCurrentGrievanceAgreementPrisma = withAuth(
  getCurrentGrievanceAgreementPrismaInternal
);
export const getCurrentGrievanceCategoryPrisma = withAuth(
  getCurrentGrievanceCategoryPrismaInternal
);
export const getCurrentGrievanceStatusPrisma = withAuth(
  getCurrentGrievanceStatusPrismaInternal
);
export const fetchGrievanceStepsPrisma = withAuth(
  fetchGrievanceStepsPrismaInternal
);
export const updateGrievanceStepPrisma = withAuth(
  updateGrievanceStepPrismaInternal
);
export const createGrievanceStepPrisma = withAuth(
  createGrievanceStepPrismaInternal
);
export const getCurrentGrievanceStepPrisma = withAuth(
  getCurrentGrievanceStepPrismaInternal
);
export const fetchGrievanceEvidencePrisma = withAuth(
  fetchGrievanceEvidencePrismaInternal
);
export const createGrievanceEventPrisma = withAuth(
  createGrievanceEventPrismaInternal
);
export const fetchGrievanceStepInfoPrisma = withAuth(
  fetchGrievanceStepInfoPrismaInternal
);
export const fetchMultipleGrievanceStepInfoPrisma = withAuth(
  fetchMultipleGrievanceStepInfoPrismaInternal
);
export const createGrievanceNotePrisma = withAuth(
  createGrievanceNotePrismaInternal
);
export const fetchGrievanceNotesPrisma = withAuth(
  fetchGrievanceNotesPrismaInternal
);
export const updateGrievanceNotePrisma = withAuth(
  updateGrievanceNotePrismaInternal
);
export const deleteGrievanceNotePrisma = withAuth(
  deleteGrievanceNotePrismaInternal
);
export const getGrievanceNotePrisma = withAuth(
  getGrievanceNotePrismaInternal
);
export const updateGrievanceCostPrisma = withAuth(
  updateGrievanceCostPrismaInternal
);
export const updateGrievanceAISummaryPrisma = withAuth(
  updateGrievanceAISummaryPrismaInternal
);
export const updateGrievanceAssessmentPrisma = withAuth(
  updateGrievanceAssessmentPrismaInternal
);
export const getGrievanceBasicInfoPrisma = withAuth(
  getGrievanceBasicInfoPrismaInternal
);
export const updateGrievanceCurrentStepPrisma = withAuth(
  updateGrievanceCurrentStepPrismaInternal
);
export const getGrievanceCurrentStepNumberPrisma = withAuth(
  getGrievanceCurrentStepNumberPrismaInternal
);
export const fetchGrievancesListOptimizedPrisma = withAuth(
  fetchGrievancesListOptimizedInternal
);
export const fetchGrievancesWithCountPrisma = withAuth(
  fetchGrievancesWithCountInternal
);

// Step Outcome Functions
async function createGrievanceStepOutcomePrismaInternal(
  grievanceId: string,
  stepNumber: number,
  stage: string,
  outcomes: string,
  completedBy: string
) {
  try {
    const stepOutcome = await prisma.grievanceStepOutcome.create({
      data: {
        grievanceId,
        stepNumber,
        stage: stage as any,
        outcomes,
        completedBy,
      },
      include: {
        completedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return stepOutcome;
  } catch (error) {
    console.error("Database Error:", error);
    throw error;
  }
}

async function fetchGrievanceStepOutcomesPrismaInternal(grievanceId: string) {
  try {
    const stepOutcomes = await prisma.grievanceStepOutcome.findMany({
      where: { grievanceId },
      include: {
        completedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        completedDate: 'asc',
      },
    });

    return stepOutcomes;
  } catch (error) {
    console.error("Database Error:", error);
    throw error;
  }
}

async function updateGrievanceStepOutcomePrismaInternal(
  stepOutcomeId: string,
  outcomes: string
) {
  try {
    const stepOutcome = await prisma.grievanceStepOutcome.update({
      where: { id: stepOutcomeId },
      data: { outcomes },
      include: {
        completedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return stepOutcome;
  } catch (error) {
    console.error("Database Error:", error);
    throw error;
  }
}

async function deleteGrievanceStepOutcomePrismaInternal(stepOutcomeId: string) {
  try {
    await prisma.grievanceStepOutcome.delete({
      where: { id: stepOutcomeId },
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw error;
  }
}

// Export the step outcome functions
export const createGrievanceStepOutcomePrisma = withAuth(
  createGrievanceStepOutcomePrismaInternal
);
export const fetchGrievanceStepOutcomesPrisma = withAuth(
  fetchGrievanceStepOutcomesPrismaInternal
);
export const updateGrievanceStepOutcomePrisma = withAuth(
  updateGrievanceStepOutcomePrismaInternal
);
export const deleteGrievanceStepOutcomePrisma = withAuth(
  deleteGrievanceStepOutcomePrismaInternal
);
