'use server';

import { prisma } from '@/app/lib/db';
import { ConstraintType } from '@/app/lib/definitions';

// ============================================================================
// MANAGER GENERAL PREFERENCES
// ============================================================================

export async function getManagerGeneralPreferences(organizationId: string) {
  const preferences = await prisma.managerGeneralPreference.findMany({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return preferences.map(p => ({
    ...p,
    constraintType: p.constraintType as ConstraintType,
    parameters: p.parameters as Record<string, any>,
  }));
}

export async function createManagerGeneralPreference(data: {
  organizationId: string;
  constraintType: ConstraintType;
  description: string;
  parameters: Record<string, any>;
}) {
  const preference = await prisma.managerGeneralPreference.create({
    data: {
      organizationId: data.organizationId,
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

export async function updateManagerGeneralPreference(
  id: string,
  data: {
    description?: string;
    parameters?: Record<string, any>;
    isActive?: boolean;
  }
) {
  const preference = await prisma.managerGeneralPreference.update({
    where: { id },
    data,
  });

  return {
    ...preference,
    constraintType: preference.constraintType as ConstraintType,
    parameters: preference.parameters as Record<string, any>,
  };
}

export async function deleteManagerGeneralPreference(id: string) {
  await prisma.managerGeneralPreference.delete({
    where: { id },
  });
}

// ============================================================================
// MANAGER SCHEDULE PREFERENCES
// ============================================================================

export async function getManagerSchedulePreferences(
  organizationId: string,
  scheduleId: string
) {
  const preferences = await prisma.managerSchedulePreference.findMany({
    where: {
      organizationId,
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

export async function createManagerSchedulePreference(data: {
  organizationId: string;
  scheduleId: string;
  constraintType: ConstraintType;
  description: string;
  parameters: Record<string, any>;
  priority?: number;
  notes?: string;
}) {
  const preference = await prisma.managerSchedulePreference.create({
    data: {
      organizationId: data.organizationId,
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

export async function updateManagerSchedulePreference(
  id: string,
  data: {
    description?: string;
    parameters?: Record<string, any>;
    priority?: number;
    notes?: string;
  }
) {
  const preference = await prisma.managerSchedulePreference.update({
    where: { id },
    data,
  });

  return {
    ...preference,
    constraintType: preference.constraintType as ConstraintType,
    parameters: preference.parameters as Record<string, any>,
  };
}

export async function deleteManagerSchedulePreference(id: string) {
  await prisma.managerSchedulePreference.delete({
    where: { id },
  });
}
