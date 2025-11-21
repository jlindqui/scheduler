"use server";

import { prisma } from "../../lib/db";
import { getOrganizationId } from "../organization";
import { withAuth } from "../auth";
import { differenceInCalendarDays, differenceInBusinessDays } from "date-fns";

export interface StepDurationData {
  grievanceId: string;
  grievanceNumber: string;
  bargainingUnitName: string;
  stepName: string;
  stepNumber: number;
  durationDays: number;
  isBusinessDays: boolean;
  expectedDurationDays: number;
  isOverdue: boolean;
  overdueByDays: number;
  startDate: Date;
  endDate: Date | null; // null if still in this step
  grievanceStatus: string;
  grievanceCurrentStepNumber: number | null;
}

export interface BargainingUnitStepReport {
  bargainingUnitId: string;
  bargainingUnitName: string;
  stepReports: {
    stepName: string;
    stepNumber: number;
    totalGrievances: number;
    averageDurationDays: number;
    expectedDurationDays: number;
    overdueCount: number;
    overduePercentage: number;
    onTimeCount: number;
    onTimePercentage: number;
    maxDurationDays: number;
    minDurationDays: number;
    settledCount: number;
    withdrawnCount: number;
  }[];
}

async function calculateStepDurationsInternal(startDate?: Date, endDate?: Date, grievanceType?: string) {
  const organizationId = await getOrganizationId();
  console.log("Organization ID:", organizationId);

  // Build date filter for grievance creation date
  const grievanceDateFilter = startDate && endDate ? {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  } : {};

  // Build type filter
  const typeFilter = grievanceType ? {
    type: grievanceType as any,
  } : {};

  // Get all step outcomes to track when steps were completed
  const stepOutcomes = await prisma.grievanceStepOutcome.findMany({
    where: {
      grievance: {
        organizationId: organizationId,
        ...grievanceDateFilter,
        ...typeFilter,
      },
    },
    include: {
      grievance: {
        include: {
          agreement: {
            include: {
              bargainingUnit: true,
            },
          },
        },
      },
    },
    orderBy: [
      { grievanceId: "asc" },
      { stepNumber: "asc" },
      { completedDate: "asc" },
    ],
  });

  console.log("Found step outcomes:", stepOutcomes.length);

  // Deduplicate step outcomes - keep only the latest outcome per grievance per step
  const deduplicatedOutcomes = new Map<string, typeof stepOutcomes[0]>();
  for (const outcome of stepOutcomes) {
    const key = `${outcome.grievanceId}-${outcome.stepNumber}`;
    const existing = deduplicatedOutcomes.get(key);
    // Keep the most recent completed date
    if (!existing || outcome.completedDate > existing.completedDate) {
      deduplicatedOutcomes.set(key, outcome);
    }
  }
  const uniqueStepOutcomes = Array.from(deduplicatedOutcomes.values());
  console.log("After deduplication:", uniqueStepOutcomes.length);

  // Get all grievances to track current step durations
  const activeGrievances = await prisma.grievance.findMany({
    where: {
      organizationId: organizationId,
      status: "ACTIVE",
      currentStepNumber: { not: null },
      ...grievanceDateFilter,
      ...typeFilter,
    },
    include: {
      agreement: {
        include: {
          bargainingUnit: true,
        },
      },
      steps: {
        orderBy: { stepNumber: "asc" },
      },
    },
  });

  console.log("Found active grievances:", activeGrievances.length);

  // Get step templates for expected durations and names
  const stepTemplates = await prisma.agreementStepTemplate.findMany({
    where: {
      agreement: {
        organizationId: organizationId,
      },
    },
    include: {
      agreement: true,
    },
  });

  const stepDurations: StepDurationData[] = [];

  // Process completed steps from step outcomes
  for (const outcome of uniqueStepOutcomes) {
    const grievance = outcome.grievance;
    if (!grievance || !grievance.agreement) continue;

    // Find the step template for this step
    const stepTemplate = stepTemplates.find(
      (template: any) =>
        template.agreement.id === grievance.agreementId &&
        template.stepNumber === outcome.stepNumber &&
        template.type === grievance.type
    );

    if (!stepTemplate) {
      console.log(`No template found for step ${outcome.stepNumber} in agreement ${grievance.agreementId}`);
      continue;
    }

    // Find when this step started (previous step's completion or grievance creation)
    const previousOutcome = uniqueStepOutcomes.find(
      (o) => o.grievanceId === outcome.grievanceId && o.stepNumber === outcome.stepNumber - 1
    );
    const startDate = previousOutcome?.completedDate || grievance.createdAt;
    const endDate = outcome.completedDate;

    const expectedDurationDays = stepTemplate.timeLimitDays;
    const isBusinessDays = !stepTemplate.isCalendarDays;

    const durationDays = isBusinessDays
      ? differenceInBusinessDays(endDate, startDate)
      : differenceInCalendarDays(endDate, startDate);

    const isOverdue = durationDays > expectedDurationDays;
    const overdueByDays = Math.max(0, durationDays - expectedDurationDays);

    stepDurations.push({
      grievanceId: outcome.grievanceId,
      grievanceNumber: (grievance as any).grievanceNumber || outcome.grievanceId,
      bargainingUnitName: grievance.agreement.bargainingUnit?.name || "Unknown",
      stepName: stepTemplate.name || `Step ${outcome.stepNumber}`,
      stepNumber: outcome.stepNumber,
      durationDays,
      isBusinessDays,
      expectedDurationDays,
      isOverdue,
      overdueByDays,
      startDate,
      endDate,
      grievanceStatus: grievance.status,
      grievanceCurrentStepNumber: grievance.currentStepNumber,
    });
  }

  // Process current steps for active grievances
  for (const grievance of activeGrievances) {
    if (!grievance.currentStepNumber || !grievance.agreement) continue;

    // Find the step template for the current step
    const stepTemplate = stepTemplates.find(
      (template: any) =>
        template.agreement.id === grievance.agreementId &&
        template.stepNumber === grievance.currentStepNumber &&
        template.type === grievance.type
    );

    if (!stepTemplate) {
      console.log(`No template found for current step ${grievance.currentStepNumber} in agreement ${grievance.agreementId}`);
      continue;
    }

    // Find when this step started (previous step's completion or grievance creation)
    const previousStepOutcome = await prisma.grievanceStepOutcome.findFirst({
      where: {
        grievanceId: grievance.id,
        stepNumber: grievance.currentStepNumber - 1,
      },
      orderBy: { completedDate: "desc" },
    });

    const startDate = previousStepOutcome?.completedDate || grievance.createdAt;
    const now = new Date();

    const expectedDurationDays = stepTemplate.timeLimitDays;
    const isBusinessDays = !stepTemplate.isCalendarDays;

    const durationDays = isBusinessDays
      ? differenceInBusinessDays(now, startDate)
      : differenceInCalendarDays(now, startDate);

    const isOverdue = durationDays > expectedDurationDays;
    const overdueByDays = Math.max(0, durationDays - expectedDurationDays);

    stepDurations.push({
      grievanceId: grievance.id,
      grievanceNumber: (grievance as any).grievanceNumber || grievance.id,
      bargainingUnitName: grievance.agreement.bargainingUnit?.name || "Unknown",
      stepName: stepTemplate.name || `Step ${grievance.currentStepNumber}`,
      stepNumber: grievance.currentStepNumber,
      durationDays,
      isBusinessDays,
      expectedDurationDays,
      isOverdue,
      overdueByDays,
      startDate,
      endDate: null, // Still in progress
      grievanceStatus: grievance.status,
      grievanceCurrentStepNumber: grievance.currentStepNumber,
    });
  }

  return stepDurations;
}

async function generateBargainingUnitStepReportInternal(startDate?: Date, endDate?: Date, grievanceType?: string) {
  const stepDurations = await calculateStepDurationsInternal(startDate, endDate, grievanceType);

  // Group by bargaining unit and step
  const reportData = stepDurations.reduce((acc, duration) => {
    const unitKey = `${duration.bargainingUnitName}`;
    const stepKey = `${duration.stepName}-${duration.stepNumber}`;

    if (!acc[unitKey]) {
      acc[unitKey] = {};
    }
    if (!acc[unitKey][stepKey]) {
      acc[unitKey][stepKey] = [];
    }

    acc[unitKey][stepKey].push(duration);
    return acc;
  }, {} as Record<string, Record<string, StepDurationData[]>>);

  const reports: BargainingUnitStepReport[] = [];

  for (const [unitName, steps] of Object.entries(reportData)) {
    const stepReports = Object.entries(steps).map(([stepKey, durations]) => {
      const firstDuration = durations[0];
      const totalGrievances = durations.length;
      const overdueCount = durations.filter(d => d.isOverdue).length;
      const onTimeCount = totalGrievances - overdueCount;

      const totalDuration = durations.reduce((sum, d) => sum + d.durationDays, 0);
      const averageDurationDays = Math.round(totalDuration / totalGrievances);

      const maxDurationDays = Math.max(...durations.map(d => d.durationDays));
      const minDurationDays = Math.min(...durations.map(d => d.durationDays));

      // Count settled and withdrawn at this step
      // A grievance is "settled at this step" if its status is SETTLED and currentStepNumber matches this step
      const settledCount = durations.filter(d =>
        d.grievanceStatus === 'SETTLED' && d.grievanceCurrentStepNumber === firstDuration.stepNumber
      ).length;

      const withdrawnCount = durations.filter(d =>
        d.grievanceStatus === 'WITHDRAWN' && d.grievanceCurrentStepNumber === firstDuration.stepNumber
      ).length;

      return {
        stepName: firstDuration.stepName,
        stepNumber: firstDuration.stepNumber,
        totalGrievances,
        averageDurationDays,
        expectedDurationDays: firstDuration.expectedDurationDays,
        overdueCount,
        overduePercentage: Math.round((overdueCount / totalGrievances) * 100),
        onTimeCount,
        onTimePercentage: Math.round((onTimeCount / totalGrievances) * 100),
        maxDurationDays,
        minDurationDays,
        settledCount,
        withdrawnCount,
      };
    });

    reports.push({
      bargainingUnitId: "unknown", // Would need to add this if needed
      bargainingUnitName: unitName,
      stepReports: stepReports.sort((a, b) => a.stepNumber - b.stepNumber),
    });
  }

  return reports.sort((a, b) => a.bargainingUnitName.localeCompare(b.bargainingUnitName));
}

async function getOverdueGrievancesByStepInternal() {
  const stepDurations = await calculateStepDurationsInternal();

  // Filter for currently overdue grievances (no end date and overdue)
  const overdueGrievances = stepDurations.filter(
    duration => !duration.endDate && duration.isOverdue
  );

  // Group by bargaining unit and step
  const overdueByUnit = overdueGrievances.reduce((acc, duration) => {
    const unitKey = duration.bargainingUnitName;
    const stepKey = `${duration.stepName} (Step ${duration.stepNumber})`;

    if (!acc[unitKey]) {
      acc[unitKey] = {};
    }
    if (!acc[unitKey][stepKey]) {
      acc[unitKey][stepKey] = [];
    }

    acc[unitKey][stepKey].push({
      grievanceId: duration.grievanceId,
      grievanceNumber: duration.grievanceNumber,
      overdueByDays: duration.overdueByDays,
      expectedDurationDays: duration.expectedDurationDays,
      actualDurationDays: duration.durationDays,
    });

    return acc;
  }, {} as Record<string, Record<string, Array<{
    grievanceId: string;
    grievanceNumber: string;
    overdueByDays: number;
    expectedDurationDays: number;
    actualDurationDays: number;
  }>>>);

  return overdueByUnit;
}

async function getRecentActivityInternal() {
  const organizationId = await getOrganizationId();

  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const [recentGrievances, recentComplaints] = await Promise.all([
    // Recent grievances
    prisma.grievance.findMany({
      where: {
        organizationId: organizationId,
        createdAt: {
          gte: fiveDaysAgo,
        },
      },
      select: {
        id: true,
        createdAt: true,
        report: {
          select: {
            grievors: true,
          },
        },
        agreement: {
          select: {
            bargainingUnit: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    // Recent complaints
    prisma.complaint.findMany({
      where: {
        organizationId: organizationId,
        createdAt: {
          gte: fiveDaysAgo,
        },
      },
      select: {
        id: true,
        createdAt: true,
        complainantFirstName: true,
        complainantLastName: true,
        bargainingUnit: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);


  return {
    grievances: recentGrievances.map((g: any) => ({
      id: g.id,
      createdAt: g.createdAt,
      name: g.report?.grievors?.[0] ? `${g.report.grievors[0].lastName}, ${g.report.grievors[0].firstName}` : 'Unknown',
      bargainingUnitName: g.agreement?.bargainingUnit?.name || 'Unknown',
    })),
    complaints: recentComplaints.map((c: any) => ({
      id: c.id,
      createdAt: c.createdAt,
      name: c.complainantFirstName && c.complainantLastName
        ? `${c.complainantLastName}, ${c.complainantFirstName}`
        : c.complainantFirstName || c.complainantLastName || 'Unknown',
      bargainingUnitName: c.bargainingUnit?.name || 'Unknown',
    })),
  };
}

// Debug function to get raw data
async function getStepReportDebugDataInternal() {
  const organizationId = await getOrganizationId();

  const [stepOutcomes, stepTemplates, activeGrievances] = await Promise.all([
    // Get all step outcomes
    prisma.grievanceStepOutcome.findMany({
      where: {
        grievance: {
          organizationId: organizationId,
        },
      },
      include: {
        grievance: {
          select: {
            id: true,
            type: true,
            agreementId: true,
            currentStepNumber: true,
            createdAt: true,
            agreement: {
              select: {
                id: true,
                name: true,
                bargainingUnit: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { grievanceId: "asc" },
        { stepNumber: "asc" },
      ],
    }),
    // Get all step templates
    prisma.agreementStepTemplate.findMany({
      where: {
        agreement: {
          organizationId: organizationId,
        },
      },
      include: {
        agreement: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { agreementId: "asc" },
        { type: "asc" },
        { stepNumber: "asc" },
      ],
    }),
    // Get active grievances
    prisma.grievance.findMany({
      where: {
        organizationId: organizationId,
        status: "ACTIVE",
        currentStepNumber: { not: null },
      },
      select: {
        id: true,
        type: true,
        agreementId: true,
        currentStepNumber: true,
        createdAt: true,
        agreement: {
          select: {
            id: true,
            name: true,
            bargainingUnit: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    stepOutcomes,
    stepTemplates,
    activeGrievances,
  };
}

export interface ResolutionByStep {
  stepNumber: number;
  count: number;
  percentage: number;
}

export interface ResolutionBreakdown {
  totalResolved: number;
  settled: number;
  settledPercentage: number;
  settledByStep: ResolutionByStep[];
  withdrawn: number;
  withdrawnPercentage: number;
  withdrawnByStep: ResolutionByStep[];
  resolvedArbitration: number;
  resolvedArbitrationPercentage: number;
}

async function getResolutionBreakdownInternal(startDate?: Date, endDate?: Date, grievanceType?: string): Promise<ResolutionBreakdown> {
  const organizationId = await getOrganizationId();

  // Build date filter for grievance creation date
  const grievanceDateFilter = startDate && endDate ? {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  } : {};

  // Build type filter
  const typeFilter = grievanceType ? {
    type: grievanceType as any,
  } : {};

  // Get only resolved grievances (exclude ACTIVE)
  const grievances = await prisma.grievance.findMany({
    where: {
      organizationId: organizationId,
      status: {
        not: 'ACTIVE',
      },
      ...grievanceDateFilter,
      ...typeFilter,
    },
    select: {
      status: true,
      currentStepNumber: true,
    },
  });

  const totalResolved = grievances.length;
  const settledGrievances = grievances.filter(g => g.status === 'SETTLED');
  const withdrawnGrievances = grievances.filter(g => g.status === 'WITHDRAWN');
  const settled = settledGrievances.length;
  const withdrawn = withdrawnGrievances.length;
  const resolvedArbitration = grievances.filter(g => g.status === 'RESOLVED_ARBITRATION').length;

  // Group settled by step
  const settledByStepMap = new Map<number, number>();
  settledGrievances.forEach(g => {
    if (g.currentStepNumber !== null) {
      const count = settledByStepMap.get(g.currentStepNumber) || 0;
      settledByStepMap.set(g.currentStepNumber, count + 1);
    }
  });

  const settledByStep: ResolutionByStep[] = Array.from(settledByStepMap.entries())
    .map(([stepNumber, count]) => ({
      stepNumber,
      count,
      percentage: settled > 0 ? Math.round((count / settled) * 100) : 0,
    }))
    .sort((a, b) => a.stepNumber - b.stepNumber);

  // Group withdrawn by step
  const withdrawnByStepMap = new Map<number, number>();
  withdrawnGrievances.forEach(g => {
    if (g.currentStepNumber !== null) {
      const count = withdrawnByStepMap.get(g.currentStepNumber) || 0;
      withdrawnByStepMap.set(g.currentStepNumber, count + 1);
    }
  });

  const withdrawnByStep: ResolutionByStep[] = Array.from(withdrawnByStepMap.entries())
    .map(([stepNumber, count]) => ({
      stepNumber,
      count,
      percentage: withdrawn > 0 ? Math.round((count / withdrawn) * 100) : 0,
    }))
    .sort((a, b) => a.stepNumber - b.stepNumber);

  return {
    totalResolved,
    settled,
    settledPercentage: totalResolved > 0 ? Math.round((settled / totalResolved) * 100) : 0,
    settledByStep,
    withdrawn,
    withdrawnPercentage: totalResolved > 0 ? Math.round((withdrawn / totalResolved) * 100) : 0,
    withdrawnByStep,
    resolvedArbitration,
    resolvedArbitrationPercentage: totalResolved > 0 ? Math.round((resolvedArbitration / totalResolved) * 100) : 0,
  };
}

export const calculateStepDurations = withAuth(calculateStepDurationsInternal);
export const generateBargainingUnitStepReport = withAuth(generateBargainingUnitStepReportInternal);
export const getOverdueGrievancesByStep = withAuth(getOverdueGrievancesByStepInternal);
export const getRecentActivity = withAuth(getRecentActivityInternal);
export const getStepReportDebugData = withAuth(getStepReportDebugDataInternal);
export const getResolutionBreakdown = withAuth(getResolutionBreakdownInternal);