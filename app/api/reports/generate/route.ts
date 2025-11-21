import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { GrievanceStatus } from "@prisma/client";
import { getServerSession } from "@/lib/auth/server-session";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.organization?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startDate, endDate, grievanceType, status, bargainingUnit } =
      await request.json();
    const organizationId = session.user.organization.id;

    const start = new Date(startDate);
    const end = new Date(endDate);

    return await generateGrievances(
      organizationId,
      start,
      end,
      grievanceType,
      status,
      bargainingUnit
    );
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function generateGrievances(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  grievanceType?: string,
  status?: string,
  bargainingUnit?: string
) {
  const whereClause: any = {
    organizationId,
    filedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Only add type filter if a specific type is selected
  if (grievanceType && grievanceType !== "ALL") {
    whereClause.type = grievanceType;
  }

  // Add status filter if specified
  if (status && status !== "ALL") {
    if (status === "RESOLVED") {
      // All statuses except ACTIVE
      whereClause.status = { not: "ACTIVE" };
    } else {
      whereClause.status = status as GrievanceStatus;
    }
  }

  // Add bargaining unit filter if specified
  if (bargainingUnit && bargainingUnit !== "ALL") {
    whereClause.bargainingUnitId = bargainingUnit;
  }

  const grievances = await prisma.grievance.findMany({
    where: whereClause,
    include: {
      report: true,
      bargainingUnit: {
        select: {
          name: true,
        },
      },
      assignedTo: {
        select: {
          name: true,
        },
      },
      creator: {
        select: {
          name: true,
        },
      },
      steps: {
        where: {
          status: "PENDING",
        },
        orderBy: {
          stepNumber: "asc",
        },
        take: 1,
      },
    },
  });

  const grievancesData = [];

  for (const grievance of grievances) {
    // Get grievor name
    let grievorName = "Unknown Grievor";
    if (grievance.report?.grievors) {
      try {
        const grievors = Array.isArray(grievance.report.grievors)
          ? grievance.report.grievors
          : JSON.parse(grievance.report.grievors as string);
        if (grievors && grievors.length > 0) {
          const grievor = grievors[0];
          grievorName =
            grievor.firstName && grievor.lastName
              ? `${grievor.firstName} ${grievor.lastName}`
              : grievor.firstName ||
                grievor.lastName ||
                grievor.name ||
                grievor.fullName ||
                "Unknown Grievor";
        }
      } catch (error) {
        console.error(
          "Error parsing grievors for grievance:",
          grievance.id,
          error
        );
      }
    }

    // Get current step info
    const currentStep =
      grievance.steps.length > 0
        ? `Step ${grievance.steps[0].stepNumber}`
        : "No pending steps";
    const isOverdue =
      grievance.steps.length > 0 && new Date() > grievance.steps[0].dueDate;

    // Calculate cost variance
    const estimatedCost = grievance.estimatedCost
      ? Number(grievance.estimatedCost)
      : 0;
    const actualCost = grievance.actualCost ? Number(grievance.actualCost) : 0;
    const costVariance = actualCost - estimatedCost;

    // Parse resolution details
    let resolutionDate = null;
    let resolutionStatus = null;

    if (grievance.resolutionDetails) {
      try {
        const resolution =
          typeof grievance.resolutionDetails === "string"
            ? JSON.parse(grievance.resolutionDetails)
            : grievance.resolutionDetails;

        resolutionDate = resolution.resolutionDate || null;
        resolutionStatus = resolution.resolutionType || "ACTIVE";
      } catch (error) {
        console.error("Error parsing resolution details:", error);
      }
    }

    // If no resolution details, set status to ACTIVE
    if (!resolutionStatus) {
      resolutionStatus = "ACTIVE";
    }

    grievancesData.push({
      id: grievance.id,
      filedAt: grievance.filedAt || grievance.createdAt,
      status: grievance.status,
      type: grievance.type || "INDIVIDUAL",
      category: grievance.category || "Uncategorized",
      stage: grievance.currentStage || "UNKNOWN",
      lastUpdated: grievance.updatedAt,
      grievorName,
      bargainingUnitName: grievance.bargainingUnit?.name || "Unknown Unit",
      assignedTo: grievance.assignedTo?.name || "Unassigned",
      creator: grievance.creator?.name || "Unknown",
      currentStep,
      isOverdue,
      estimatedCost: grievance.estimatedCost
        ? Number(grievance.estimatedCost)
        : null,
      actualCost: grievance.actualCost ? Number(grievance.actualCost) : null,
      costVariance,
      resolutionDate,
      resolutionStatus,
    });
  }

  return NextResponse.json({
    grievances: grievancesData,
  });
}
