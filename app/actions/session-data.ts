'use server';

import { prisma } from '@/app/lib/db';
import { GrievanceEventType } from '@prisma/client';
import { requireAuth } from './auth';

export interface SessionDataEntry {
  id: string;
  eventType: GrievanceEventType;
  grievanceId: string;
  grievanceExternalId: string | null;
  userId: string;
  userName: string | null;
  userEmail: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

export interface SessionDataFilters {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: GrievanceEventType[];
  userId?: string;
  grievanceId?: string;
}

export async function fetchSessionData(
  filters: SessionDataFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ logs: SessionDataEntry[]; total: number; totalPages: number }> {
  try {
    const session = await requireAuth();
    const organizationId = session.user?.organization?.id;

    if (!organizationId) {
      throw new Error('Organization not found');
    }

    // Build where clause
    const where: any = {
      grievance: {
        organizationId,
      },
    };

    if (filters.startDate) {
      where.createdAt = { ...where.createdAt, gte: filters.startDate };
    }

    if (filters.endDate) {
      where.createdAt = { ...where.createdAt, lte: filters.endDate };
    }

    if (filters.eventTypes && filters.eventTypes.length > 0) {
      where.eventType = { in: filters.eventTypes };
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.grievanceId) {
      where.grievanceId = filters.grievanceId;
    }

    // Get total count
    const total = await prisma.grievanceEvent.count({ where });

    // Get paginated logs
    const logs = await prisma.grievanceEvent.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        grievance: {
          select: {
            externalGrievanceId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalPages = Math.ceil(total / pageSize);

    const formattedLogs: SessionDataEntry[] = logs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      grievanceId: log.grievanceId,
      grievanceExternalId: log.grievance.externalGrievanceId,
      userId: log.userId,
      userName: log.user.name,
      userEmail: log.user.email,
      previousValue: log.previousValue,
      newValue: log.newValue,
      createdAt: log.createdAt,
    }));

    return {
      logs: formattedLogs,
      total,
      totalPages,
    };
  } catch (error) {
    console.error('Error fetching session data:', error);
    throw new Error('Failed to fetch session data');
  }
}

export async function getSessionDataStats(organizationId: string) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalEvents, recentEvents, eventsByType] = await Promise.all([
      // Total events
      prisma.grievanceEvent.count({
        where: {
          grievance: { organizationId },
        },
      }),
      // Events in last 30 days
      prisma.grievanceEvent.count({
        where: {
          grievance: { organizationId },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      // Events by type (last 30 days)
      prisma.grievanceEvent.groupBy({
        by: ['eventType'],
        where: {
          grievance: { organizationId },
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
      }),
    ]);

    return {
      totalEvents,
      recentEvents,
      eventsByType: eventsByType.map((e) => ({
        eventType: e.eventType,
        count: e._count,
      })),
    };
  } catch (error) {
    console.error('Error fetching session data stats:', error);
    throw new Error('Failed to fetch session data stats');
  }
}
