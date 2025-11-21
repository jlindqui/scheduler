"use server";

import { prisma } from "@/app/lib/db";
import { withAuth } from '@/app/actions/auth';
import { GrievanceListItem, Grievor, WorkInformation, ResolutionDetails } from "@/app/lib/definitions";
import { 
  GrievanceSearchFilters, 
  buildGrievanceWhereClause, 
  buildGrievanceOrderBy 
} from "@/app/lib/grievance-search";

interface SearchResult {
  grievances: GrievanceListItem[];
  totalCount: number;
  filteredCount: number; // count after applying filters
}

// Search JSON content in GrievanceReport using raw SQL
async function searchJSONContent(
  organizationId: string, 
  searchTerm: string
): Promise<string[]> {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }

    const results = await prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT g.id 
      FROM "Grievance" g
      INNER JOIN "GrievanceReport" gr ON g.id = gr."grievanceId"
      WHERE g."organizationId" = ${organizationId}
      AND (
        gr."grievors"::text ILIKE ${`%${searchTerm}%`} OR
        gr."workInformation"::text ILIKE ${`%${searchTerm}%`}
      )
    `;

    return results.map(r => r.id);
  } catch (error) {
    console.warn('JSON content search failed, continuing without it:', error);
    return [];
  }
}

async function searchGrievancesInternal(
  organizationId: string,
  filters: GrievanceSearchFilters,
  page: number = 1,
  pageSize: number = 20,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  currentUserId?: string
): Promise<SearchResult> {
  try {
    // Build the where clause
    let where = buildGrievanceWhereClause(organizationId, filters, currentUserId);
    
    // If there's a search term, also search JSON content
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const jsonMatchIds = await searchJSONContent(organizationId, filters.searchTerm.trim());
      
      // If we found JSON matches, add them to the OR conditions
      if (jsonMatchIds.length > 0) {
        // Ensure we have an OR array
        if (!where.OR) {
          where.OR = [];
        }
        
        // Add the JSON search results as an OR condition
        where.OR.push({
          id: { in: jsonMatchIds }
        });
      }
    }
    
    // Build the order by clause
    const orderBy = buildGrievanceOrderBy(sortBy, sortOrder);

    // Get both filtered data and counts in parallel
    const [grievances, totalCount, filteredCount] = await Promise.all([
      // Get paginated results
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
          // Get full report structure as required by GrievanceListItem
          report: {
            select: {
              id: true,
              grievors: true,
              workInformation: true,
              statement: true,
              settlementDesired: true,
              articlesViolated: true,
            },
          },
          resolutionDetails: true,
          // Get the last event for activity display
          events: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1,
            select: {
              eventType: true,
              createdAt: true,
              previousValue: true,
              newValue: true,
              user: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
        },
        orderBy,
      }),
      
      // Get total count (all grievances in organization)
      prisma.grievance.count({
        where: { organizationId }
      }),
      
      // Get filtered count (grievances matching current filters)
      prisma.grievance.count({
        where
      })
    ]);

    // Batch fetch all creator events in one query (same as original function)
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
      // Create a proper currentStep identifier if we have step information
      let currentStep = null;
      if (grievance.currentStepNumber) {
        currentStep = `Step ${grievance.currentStepNumber}`;
      } else if (grievance.currentStage) {
        currentStep = grievance.currentStage;
      }
      
      // Get the last event if it exists
      const lastEvent = grievance.events && grievance.events.length > 0 ? grievance.events[0] : null;

      return {
        ...grievance,
        creator,
        currentStep,
        filedAt: grievance.filedAt || grievance.createdAt,
        lastEvent: lastEvent ? {
          eventType: lastEvent.eventType,
          createdAt: lastEvent.createdAt,
          previousValue: lastEvent.previousValue,
          newValue: lastEvent.newValue,
          user: lastEvent.user,
        } : null,
        lastUpdatedBy: grievance.lastUpdatedBy ? {
          ...grievance.lastUpdatedBy,
          date: grievance.updatedAt,
        } : null,
        report: grievance.report ? {
          ...grievance.report,
          grievors: grievance.report.grievors as unknown as Grievor[],
          workInformation: grievance.report.workInformation as unknown as WorkInformation,
        } : null,
        resolutionDetails: grievance.resolutionDetails as unknown as ResolutionDetails,
      };
    });

    return { 
      grievances: grievancesWithCreator, 
      totalCount,
      filteredCount
    };
  } catch (error) {
    console.error("Error in searchGrievancesInternal:", error);
    throw error;
  }
}

// Advanced search with stage filtering (requires additional logic)
async function searchGrievancesWithStageInternal(
  organizationId: string,
  filters: GrievanceSearchFilters,
  page: number = 1,
  pageSize: number = 20,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  currentUserId?: string
): Promise<SearchResult> {
  // Get the search results
  const baseResult = await searchGrievancesInternal(
    organizationId, 
    filters,
    page, 
    pageSize, 
    sortBy, 
    sortOrder, 
    currentUserId
  );

  return baseResult;

  // TODO: Implement stage filtering by fetching current step info
  // For now, return unfiltered results
  // This will be enhanced when we have better step template integration
  
  return baseResult;
}

export const searchGrievances = withAuth(searchGrievancesInternal);
export const searchGrievancesWithStage = withAuth(searchGrievancesWithStageInternal);