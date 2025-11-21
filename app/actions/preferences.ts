'use server';

import { prisma } from '@/app/lib/db';
import {
  GeneralPreference,
  SchedulePreference,
  ConstraintType
} from '@/app/lib/definitions';

// ============================================================================
// GENERAL PREFERENCES
// ============================================================================

export async function getGeneralPreferences(employeeProfileId: string): Promise<GeneralPreference[]> {
  const preferences = await prisma.generalPreference.findMany({
    where: { employeeProfileId },
    orderBy: { createdAt: 'desc' },
  });

  return preferences.map(p => ({
    ...p,
    constraintType: p.constraintType as ConstraintType,
    parameters: p.parameters as Record<string, any>,
  }));
}

export async function createGeneralPreference(data: {
  employeeProfileId: string;
  constraintType: ConstraintType;
  description: string;
  parameters: Record<string, any>;
}): Promise<GeneralPreference> {
  const preference = await prisma.generalPreference.create({
    data: {
      employeeProfileId: data.employeeProfileId,
      constraintType: data.constraintType,
      description: data.description,
      parameters: data.parameters,
      isActive: true,
    },
  });

  return {
    ...preference,
    constraintType: preference.constraintType as ConstraintType,
    parameters: preference.parameters as Record<string, any>,
  };
}

export async function updateGeneralPreference(
  id: string,
  data: {
    description?: string;
    parameters?: Record<string, any>;
    isActive?: boolean;
  }
): Promise<GeneralPreference> {
  const preference = await prisma.generalPreference.update({
    where: { id },
    data,
  });

  return {
    ...preference,
    constraintType: preference.constraintType as ConstraintType,
    parameters: preference.parameters as Record<string, any>,
  };
}

export async function deleteGeneralPreference(id: string): Promise<void> {
  await prisma.generalPreference.delete({
    where: { id },
  });
}

export async function toggleGeneralPreference(id: string): Promise<GeneralPreference> {
  const current = await prisma.generalPreference.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error('Preference not found');
  }

  const updated = await prisma.generalPreference.update({
    where: { id },
    data: { isActive: !current.isActive },
  });

  return {
    ...updated,
    constraintType: updated.constraintType as ConstraintType,
    parameters: updated.parameters as Record<string, any>,
  };
}

// ============================================================================
// SCHEDULE PREFERENCES
// ============================================================================

export async function getSchedulePreferences(
  employeeProfileId: string,
  scheduleId: string
): Promise<SchedulePreference[]> {
  const preferences = await prisma.schedulePreference.findMany({
    where: {
      employeeProfileId,
      scheduleId,
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return preferences.map(p => ({
    ...p,
    constraintType: p.constraintType as ConstraintType,
    parameters: p.parameters as Record<string, any>,
  }));
}

export async function createSchedulePreference(data: {
  employeeProfileId: string;
  scheduleId: string;
  constraintType: ConstraintType;
  description: string;
  parameters: Record<string, any>;
  priority?: number;
  notes?: string;
}): Promise<SchedulePreference> {
  const preference = await prisma.schedulePreference.create({
    data: {
      employeeProfileId: data.employeeProfileId,
      scheduleId: data.scheduleId,
      constraintType: data.constraintType,
      description: data.description,
      parameters: data.parameters,
      priority: data.priority ?? 5,
      notes: data.notes ?? null,
    },
  });

  return {
    ...preference,
    constraintType: preference.constraintType as ConstraintType,
    parameters: preference.parameters as Record<string, any>,
  };
}

export async function updateSchedulePreference(
  id: string,
  data: {
    description?: string;
    parameters?: Record<string, any>;
    priority?: number;
    notes?: string;
  }
): Promise<SchedulePreference> {
  const preference = await prisma.schedulePreference.update({
    where: { id },
    data,
  });

  return {
    ...preference,
    constraintType: preference.constraintType as ConstraintType,
    parameters: preference.parameters as Record<string, any>,
  };
}

export async function deleteSchedulePreference(id: string): Promise<void> {
  await prisma.schedulePreference.delete({
    where: { id },
  });
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function getEmployeePreferencesSummary(employeeProfileId: string) {
  const [generalPreferences, schedulePreferencesCount] = await Promise.all([
    prisma.generalPreference.count({
      where: { employeeProfileId, isActive: true },
    }),
    prisma.schedulePreference.groupBy({
      by: ['scheduleId'],
      where: { employeeProfileId },
      _count: true,
    }),
  ]);

  return {
    activeGeneralPreferences: generalPreferences,
    schedulesWithPreferences: schedulePreferencesCount.length,
  };
}

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

export async function getAllGeneralPreferences(organizationId: string) {
  const preferences = await prisma.generalPreference.findMany({
    where: {
      employeeProfile: {
        organizationId,
      },
      isActive: true,
    },
    include: {
      employeeProfile: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [
      { employeeProfileId: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return preferences.map(p => ({
    id: p.id,
    employeeProfileId: p.employeeProfileId,
    employeeName: p.employeeProfile.user.name || p.employeeProfile.user.email,
    constraintType: p.constraintType as ConstraintType,
    description: p.description,
    parameters: p.parameters as Record<string, any>,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function getAllSchedulePreferences(organizationId: string, scheduleId: string) {
  const preferences = await prisma.schedulePreference.findMany({
    where: {
      scheduleId,
      employeeProfile: {
        organizationId,
      },
    },
    include: {
      employeeProfile: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [
      { employeeProfileId: 'asc' },
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return preferences.map(p => ({
    id: p.id,
    employeeProfileId: p.employeeProfileId,
    employeeName: p.employeeProfile.user.name || p.employeeProfile.user.email,
    scheduleId: p.scheduleId,
    constraintType: p.constraintType as ConstraintType,
    description: p.description,
    parameters: p.parameters as Record<string, any>,
    priority: p.priority,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}
