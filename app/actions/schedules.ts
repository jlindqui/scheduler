'use server';

import { prisma } from '@/app/lib/db';
import { Schedule, ScheduleStatus } from '@/app/lib/definitions';

// ============================================================================
// SCHEDULE QUERIES
// ============================================================================

export async function getUpcomingSchedules(
  organizationId: string,
  limit: number = 6
): Promise<Schedule[]> {
  const now = new Date();

  const schedules = await prisma.schedule.findMany({
    where: {
      organizationId,
      endDate: {
        gte: now,
      },
    },
    orderBy: {
      startDate: 'asc',
    },
    take: limit,
  });

  return schedules.map(s => ({
    ...s,
    status: s.status as ScheduleStatus,
  }));
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  const schedule = await prisma.schedule.findUnique({
    where: { id },
  });

  if (!schedule) return null;

  return {
    ...schedule,
    status: schedule.status as ScheduleStatus,
  };
}

export async function getSchedulesWithPreferencesForEmployee(
  organizationId: string,
  employeeProfileId: string
) {
  const schedules = await getUpcomingSchedules(organizationId, 6);

  const schedulesWithPreferences = await Promise.all(
    schedules.map(async (schedule) => {
      const preferences = await prisma.schedulePreference.findMany({
        where: {
          scheduleId: schedule.id,
          employeeProfileId,
        },
      });

      return {
        schedule,
        preferencesCount: preferences.length,
        hasSubmittedPreferences: preferences.length > 0,
      };
    })
  );

  return schedulesWithPreferences;
}

// ============================================================================
// SCHEDULE MANAGEMENT (for admins/managers)
// ============================================================================

export async function createSchedule(data: {
  name: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  preferencesDueDate?: Date;
  createdBy: string;
  notes?: string;
}): Promise<Schedule> {
  const schedule = await prisma.schedule.create({
    data: {
      name: data.name,
      organizationId: data.organizationId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'PREFERENCE_COLLECTION',
      preferencesDueDate: data.preferencesDueDate ?? null,
      createdBy: data.createdBy,
      notes: data.notes ?? null,
    },
  });

  return {
    ...schedule,
    status: schedule.status as ScheduleStatus,
  };
}

export async function updateScheduleStatus(
  id: string,
  status: ScheduleStatus
): Promise<Schedule> {
  const schedule = await prisma.schedule.update({
    where: { id },
    data: { status },
  });

  return {
    ...schedule,
    status: schedule.status as ScheduleStatus,
  };
}

export async function publishSchedule(id: string): Promise<Schedule> {
  const schedule = await prisma.schedule.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  return {
    ...schedule,
    status: schedule.status as ScheduleStatus,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function isScheduleInPreferenceCollectionPhase(scheduleId: string): Promise<boolean> {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    select: { status: true },
  });

  return schedule?.status === 'PREFERENCE_COLLECTION';
}

export async function getSchedulePreferenceDeadline(scheduleId: string): Promise<Date | null> {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    select: { preferencesDueDate: true },
  });

  return schedule?.preferencesDueDate ?? null;
}
