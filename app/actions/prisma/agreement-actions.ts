'use server';
import { prisma } from '@/app/lib/db';
import { 
  Agreement, 
  AgreementMetadata,
  GrievanceFilingInfo
} from '@/app/lib/definitions';
import { transformAgreement } from '@/app/lib/utils';
import { withAuth } from '@/app/actions/auth';
import { GrievanceStage } from '@prisma/client';

// Internal functions
async function fetchAgreementByIdInternal(id: string, organizationId: string) {
  try {
    const agreement = await prisma.agreement.findUnique({
      where: {
        id,
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
      }
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    return transformAgreement(agreement);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch agreement.');
  }
}

async function fetchAgreementsInternal(organizationId: string) : Promise<Agreement[]> {
  try {
    const agreements = await prisma.agreement.findMany({
      where: {
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

    return agreements.map(transformAgreement);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch agreements.');
  }
}

async function fetchAgreementsPagesInternal(query: string, organizationId: string) {
  const ITEMS_PER_PAGE = 6;

  try {
    const count = await prisma.agreement.count({
      where: {
        organizationId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { source: { contains: query, mode: 'insensitive' } }
        ]
      }
    });

    return Math.ceil(count / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of agreements.');
  }
}

async function fetchFilteredAgreementsInternal(
  query: string,
  currentPage: number,
  organizationId: string
) {
  const ITEMS_PER_PAGE = 6;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const agreements = await prisma.agreement.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { source: { contains: query, mode: 'insensitive' } }
        ]
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
        name: 'asc'
      },
      skip: offset,
      take: ITEMS_PER_PAGE
    });

    return agreements.map(transformAgreement);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch agreements.');
  }
}

async function createAgreementPrismaInternal(
  name: string, 
  organization_id: string, 
  bargainingUnitId: string,
  source: string, 
  vectorId: string, 
  chunkCount: number, 
  pageCount: number, 
  metadata: any,
  effectiveDate: Date,
  expiryDate: Date
) {
  try {
    const agreement = await prisma.agreement.create({
      data: {
        name,
        organization: {
          connect: {
            id: organization_id
          }
        },
        bargainingUnit: {
          connect: {
            id: bargainingUnitId
          }
        },
        source,
        vectorId,
        chunkCount,
        pageCount,
        metadata,
        effectiveDate,
        expiryDate
      }
    });
    return agreement;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to create agreement.');
  }
}

async function saveAgreementGrievanceInfoInternal(
  agreementId: string, 
  response: GrievanceFilingInfo
): Promise<GrievanceFilingInfo> {
  try {
    // Define the step type
    type GrievanceStep = {
      stepNumber: number;
      description: string;
      timeLimit: string;
      timeLimitDays: number;
      isCalendarDays: boolean;
      requiredParticipants: string[];
      requiredDocuments: string[];
      notes?: string;
    };

    type GrievanceType = {
      description: string;
      steps: GrievanceStep[];
    };

    // Helper function to parse and validate grievance data
    function parseGrievanceData(data: string | GrievanceType): GrievanceType {
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          // Validate the parsed data has the required structure
          if (!parsed.description || !Array.isArray(parsed.steps)) {
            throw new Error('Invalid grievance data structure');
          }
          return {
            description: parsed.description,
            steps: parsed.steps.map((step: any) => ({
              stepNumber: Number(step.stepNumber),
              description: String(step.description),
              timeLimit: String(step.timeLimit),
              timeLimitDays: Number(step.timeLimitDays),
              isCalendarDays: Boolean(step.isCalendarDays),
              requiredParticipants: Array.isArray(step.requiredParticipants) 
                ? step.requiredParticipants.map(String)
                : [],
              requiredDocuments: Array.isArray(step.requiredDocuments)
                ? step.requiredDocuments.map(String)
                : [],
              notes: step.notes ? String(step.notes) : undefined
            }))
          };
        } catch (e) {
          console.error('Error parsing grievance data:', e);
          throw new Error('Failed to parse grievance data');
        }
      }
      // If it's already an object, validate its structure
      if (!data.description || !Array.isArray(data.steps)) {
        throw new Error('Invalid grievance data structure');
      }
      return data;
    }

    // Validate the response structure
    if (!response.filingPeriod || 
        typeof response.individualGrievance !== 'object' ||
        typeof response.groupGrievance !== 'object' ||
        typeof response.policyGrievance !== 'object') {
      throw new Error('Invalid response structure');
    }

    // Parse and validate all grievance data
    const parsedResponse: GrievanceFilingInfo = {
      filingPeriod: response.filingPeriod,
      individualGrievance: parseGrievanceData(response.individualGrievance),
      groupGrievance: parseGrievanceData(response.groupGrievance),
      policyGrievance: parseGrievanceData(response.policyGrievance)
    };

    // Convert the parsed response to a plain object for Prisma's JSON field
    const jsonData = {
      grievanceFilingInfo: {
        filingPeriod: parsedResponse.filingPeriod,
        individualGrievance: {
          description: parsedResponse.individualGrievance.description,
          steps: parsedResponse.individualGrievance.steps.map(step => ({
            stepNumber: step.stepNumber,
            description: step.description,
            timeLimit: step.timeLimit,
            timeLimitDays: step.timeLimitDays,
            isCalendarDays: step.isCalendarDays,
            requiredParticipants: step.requiredParticipants,
            requiredDocuments: step.requiredDocuments,
            notes: step.notes
          }))
        },
        groupGrievance: {
          description: parsedResponse.groupGrievance.description,
          steps: parsedResponse.groupGrievance.steps.map(step => ({
            stepNumber: step.stepNumber,
            description: step.description,
            timeLimit: step.timeLimit,
            timeLimitDays: step.timeLimitDays,
            isCalendarDays: step.isCalendarDays,
            requiredParticipants: step.requiredParticipants,
            requiredDocuments: step.requiredDocuments,
            notes: step.notes
          }))
        },
        policyGrievance: {
          description: parsedResponse.policyGrievance.description,
          steps: parsedResponse.policyGrievance.steps.map(step => ({
            stepNumber: step.stepNumber,
            description: step.description,
            timeLimit: step.timeLimit,
            timeLimitDays: step.timeLimitDays,
            isCalendarDays: step.isCalendarDays,
            requiredParticipants: step.requiredParticipants,
            requiredDocuments: step.requiredDocuments,
            notes: step.notes
          }))
        }
      }
    };

    await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        metadata: jsonData
      }
    }); 
    return parsedResponse;
  } catch (error) {
    console.error('Error saving agreement grievance info:', error);
    throw new Error('Failed to save agreement grievance information');
  }
}

async function getAgreementGrievanceInfoInternal(
  agreementId: string
): Promise<GrievanceFilingInfo | null> {
  try {
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      select: { metadata: true }
    });

    const metadata = agreement?.metadata as AgreementMetadata | null;
    return metadata?.grievanceFilingInfo || null;
  } catch (error) {
    console.error('Error getting agreement grievance info:', error);
    throw new Error('Failed to get agreement grievance information');
  }
}

async function saveAgreementStepTemplatesInternal(
  agreementId: string,
  templates: {
    type: 'INDIVIDUAL' | 'GROUP' | 'POLICY';
    steps: Array<{
      stepNumber: number;
      stage?: 'INFORMAL' | 'FORMAL' | 'ARBITRATION'; // Stage determined by AI
      description: string;
      timeLimit: string;
      timeLimitDays: number;
      isCalendarDays: boolean;
      requiredParticipants: string[];
      requiredDocuments: string[];
      notes?: string;
    }>;
  }[]
) {
  try {
    // Use a transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Delete existing templates for this agreement
      await tx.agreementStepTemplate.deleteMany({
        where: {
          agreementId: agreementId
        }
      });

      // Create new templates
      for (const template of templates) {
        for (const step of template.steps) {
          // Use the AI-determined stage, defaulting to FORMAL if not provided
          const stage = step.stage || 'FORMAL';

          await tx.agreementStepTemplate.create({
            data: {
              agreementId: agreementId,
              type: template.type,
              stepNumber: step.stepNumber,
              description: step.description,
              timeLimit: step.timeLimit,
              timeLimitDays: step.timeLimitDays,
              isCalendarDays: step.isCalendarDays,
              requiredParticipants: step.requiredParticipants,
              requiredDocuments: step.requiredDocuments,
              notes: step.notes,
              stage: stage
            }
          });
        }
      }
    });
  } catch (error) {
    console.error('Error saving agreement step templates:', error);
    throw new Error('Failed to save agreement step templates');
  }
}

async function getAgreementStepTemplatesInternal(agreementId: string) {
  try {
    const templates = await prisma.agreementStepTemplate.findMany({
      where: {
        agreementId: agreementId
      },
      select: {
        type: true,
        stepNumber: true,
        name: true,
        stage: true,
        description: true,
        timeLimit: true,
        timeLimitDays: true,
        isCalendarDays: true,
        requiredParticipants: true,
        requiredDocuments: true,
        notes: true
      },
      orderBy: [
        { type: 'asc' },
        { stage: 'asc' }, // Order by stage (INFORMAL -> FORMAL -> ARBITRATION)
        { stepNumber: 'asc' }
      ]
    });

    // Group templates by type
    const groupedTemplates = templates.reduce<Record<string, any[]>>((acc, template) => {
      const type = template.type.toLowerCase();
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        stepNumber: template.stepNumber,
        name: template.name,
        stage: template.stage,
        description: template.description,
        timeLimit: template.timeLimit,
        timeLimitDays: template.timeLimitDays,
        isCalendarDays: template.isCalendarDays,
        requiredParticipants: template.requiredParticipants,
        requiredDocuments: template.requiredDocuments,
        notes: template.notes
      });
      return acc;
    }, {});

    return {
      individualGrievance: {
        description: 'Individual Grievance Process',
        steps: groupedTemplates['individual'] || []
      },
      groupGrievance: {
        description: 'Group Grievance Process',
        steps: groupedTemplates['group'] || []
      },
      policyGrievance: {
        description: 'Policy Grievance Process',
        steps: groupedTemplates['policy'] || []
      }
    };
  } catch (error) {
    console.error('Error fetching agreement step templates:', error);
    throw new Error('Failed to fetch agreement step templates');
  }
}

async function checkAgreementStepTemplatesExistInternal(agreementId: string) {
  try {
    const count = await prisma.agreementStepTemplate.count({
      where: {
        agreementId: agreementId
      }
    });
    return count > 0;
  } catch (error) {
    console.error('Error checking agreement step templates:', error);
    throw new Error('Failed to check agreement step templates');
  }
}

async function deleteAgreementStepTemplatesInternal(agreementId: string) {
  try {
    await prisma.agreementStepTemplate.deleteMany({
      where: {
        agreementId: agreementId
      }
    });
  } catch (error) {
    console.error('Error deleting agreement step templates:', error);
    throw new Error('Failed to delete agreement step templates');
  }
}

async function updateAgreementMetadataInternal(agreementId: string, metadata: any) {
  try {
    await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        metadata: metadata
      }
    });
  } catch (error) {
    console.error('Error updating agreement metadata:', error);
    throw new Error('Failed to update agreement metadata');
  }
}

async function saveGrievanceTimelineInternal(agreementId: string, data: {
  type: any; // GrievanceType
  steps: Array<{
    stepNumber: number;
    name?: string;
    stage?: GrievanceStage;
    description: string;
    timeLimit: string;
    timeLimitDays: number;
    isCalendarDays: boolean;
    requiredParticipants: string[];
    requiredDocuments: string[];
    notes?: string;
  }>;
}) {
  try {
    // First, get the organization ID from the agreement
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      select: { organizationId: true }
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or update the timeline using upsert
      const timeline = await tx.grievanceTimeline.upsert({
        where: {
          agreementId_type: {
            agreementId: agreementId,
            type: data.type
          }
        },
        update: {
          updatedAt: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          agreementId: agreementId,
          type: data.type,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      if (!timeline) {
        throw new Error('Failed to create timeline');
      }

      // 2. Save the steps directly to the AgreementStepTemplate table
      // First, delete existing templates for this type
      await tx.agreementStepTemplate.deleteMany({
        where: {
          agreementId: agreementId,
          type: data.type
        }
      });

      // Sort steps by stage first, then by stepNumber to ensure correct display order
      const stageOrder = { 'INFORMAL': 1, 'FORMAL': 2, 'ARBITRATION': 3 };
      const sortedSteps = [...data.steps].sort((a, b) => {
        const aStage = a.stage || 'FORMAL';
        const bStage = b.stage || 'FORMAL';
        const stageComparison = stageOrder[aStage] - stageOrder[bStage];
        if (stageComparison !== 0) return stageComparison;
        return a.stepNumber - b.stepNumber;
      });

      // Renumber steps sequentially based on the sorted order
      sortedSteps.forEach((step, index) => {
        step.stepNumber = index + 1;
      });

      // Then insert the new steps with corrected step numbers
      for (const step of sortedSteps) {
        // Determine the stage based on step number and description if not provided
        let stage: GrievanceStage = step.stage || 'FORMAL';

        if (!step.stage) {
          const description = step.description.toLowerCase();
          if (description.includes('informal') ||
              description.includes('discussion') ||
              description.includes('supervisor') ||
              description.includes('manager')) {
            stage = 'INFORMAL';
          } else if (description.includes('arbitration')) {
            stage = 'ARBITRATION';
          } else {
            stage = 'FORMAL';
          }
        }

        await tx.agreementStepTemplate.create({
          data: {
            id: crypto.randomUUID(),
            agreementId: agreementId,
            type: data.type,
            stepNumber: step.stepNumber,
            name: step.name || null,
            stage: stage,
            description: step.description,
            timeLimit: step.timeLimit,
            timeLimitDays: step.timeLimitDays,
            isCalendarDays: step.isCalendarDays,
            requiredParticipants: step.requiredParticipants,
            requiredDocuments: step.requiredDocuments,
            notes: step.notes,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      // 3. Return the updated timeline
      return tx.grievanceTimeline.findUnique({
        where: { id: timeline.id }
      });
    });

    if (!result) {
      throw new Error('Failed to save timeline');
    }

    // Transform the data to match the expected format
    return {
      ...result,
      steps: data.steps
    };
  } catch (error) {
    console.error('Error saving grievance timeline:', error);
    throw new Error('Failed to save grievance timeline');
  }
}

async function getGrievanceTimelinesInternal(agreementId: string) {
  try {
    const timelines = await prisma.grievanceTimeline.findMany({
      where: {
        agreementId
      },
      include: {
        grievances: {
          include: {
            steps: {
              orderBy: {
                stepNumber: 'asc'
              }
            }
          }
        }
      }
    });

    // Transform the data to match the expected format
    return timelines.map(timeline => ({
      ...timeline,
      steps: timeline.grievances.flatMap(grievance => 
        grievance.steps.map(step => {
          const notes = step.notes ? JSON.parse(step.notes) : {};
          return {
            stepNumber: step.stepNumber,
            description: notes.description || '',
            timeLimit: notes.timeLimit || '',
            timeLimitDays: notes.timeLimitDays || 0,
            isCalendarDays: notes.isCalendarDays || false,
            requiredParticipants: notes.requiredParticipants || [],
            requiredDocuments: notes.requiredDocuments || [],
            notes: notes.notes,
            status: step.status,
            dueDate: step.dueDate,
            completedDate: step.completedDate
          };
        })
      )
    }));
  } catch (error) {
    console.error('Error fetching grievance timelines:', error);
    throw new Error('Failed to fetch grievance timelines');
  }
}

async function deleteAgreementPrismaInternal(agreementId: string) {
  try {
    // Get organization ID from the current session
    const { getOrganizationId } = await import('../organization');
    const organizationId = await getOrganizationId();

    // First, check if the agreement exists and belongs to the organization
    const agreement = await prisma.agreement.findUnique({
      where: {
        id: agreementId,
        organizationId: organizationId
      }
    });

    if (!agreement) {
      throw new Error('Agreement not found or does not belong to organization');
    }

    // Check if there are any grievances using this agreement
    const grievancesUsingAgreement = await prisma.grievance.findFirst({
      where: {
        agreementId: agreementId
      }
    });

    if (grievancesUsingAgreement) {
      throw new Error('Cannot delete agreement: There are grievances associated with this agreement. Please reassign or delete those grievances first.');
    }

    // Delete in a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete agreement step templates
      await tx.agreementStepTemplate.deleteMany({
        where: {
          agreementId: agreementId
        }
      });

      // Delete grievance timelines
      await tx.grievanceTimeline.deleteMany({
        where: {
          agreementId: agreementId
        }
      });

      // Delete the agreement itself
      await tx.agreement.delete({
        where: {
          id: agreementId,
          organizationId: organizationId
        }
      });
    });

    return { success: true, message: 'Agreement deleted successfully' };
  } catch (error) {
    console.error('Error deleting agreement:', error);
    throw error;
  }
}

async function updateAgreementVectorIdInternal(agreementId: string, vectorId: string, chunkCount?: number, pageCount?: number) {
  try {
    await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        vectorId,
        ...(chunkCount !== undefined && { chunkCount }),
        ...(pageCount !== undefined && { pageCount })
      }
    });
  } catch (error) {
    console.error('Error updating agreement vector ID:', error);
    throw new Error('Failed to update agreement vector ID');
  }
}

async function updateAgreementDetailsInternal(
  agreementId: string, 
  organizationId: string,
  data: {
    name?: string;
    effectiveDate?: Date;
    expiryDate?: Date;
  }
) {
  try {
    // Verify the agreement belongs to the user's organization
    const existingAgreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
        organizationId
      }
    });

    if (!existingAgreement) {
      throw new Error('Agreement not found or access denied.');
    }

    const agreement = await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.effectiveDate && { effectiveDate: data.effectiveDate }),
        ...(data.expiryDate && { expiryDate: data.expiryDate })
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
      }
    });

    return transformAgreement(agreement);
  } catch (error) {
    console.error('Error updating agreement details:', error);
    throw new Error('Failed to update agreement details');
  }
}

// Exported wrapped versions
export const fetchAgreementByIdPrisma = withAuth(fetchAgreementByIdInternal);
export const fetchAgreementsPrisma = withAuth(fetchAgreementsInternal);
export const fetchAgreementsPagesPrisma = withAuth(fetchAgreementsPagesInternal);
export const fetchFilteredAgreementsPrisma = withAuth(fetchFilteredAgreementsInternal);
export const createAgreementPrisma = withAuth(createAgreementPrismaInternal);
export const saveAgreementGrievanceInfoPrisma = withAuth(saveAgreementGrievanceInfoInternal);
export const getAgreementGrievanceInfoPrisma = withAuth(getAgreementGrievanceInfoInternal);
export const saveAgreementStepTemplatesPrisma = withAuth(saveAgreementStepTemplatesInternal);
export const getAgreementStepTemplatesPrisma = withAuth(getAgreementStepTemplatesInternal);
export const checkAgreementStepTemplatesExistPrisma = withAuth(checkAgreementStepTemplatesExistInternal);
export const deleteAgreementStepTemplatesPrisma = withAuth(deleteAgreementStepTemplatesInternal);
export const updateAgreementMetadataPrisma = withAuth(updateAgreementMetadataInternal);
export const saveGrievanceTimelinePrisma = withAuth(saveGrievanceTimelineInternal);
export const getGrievanceTimelinesPrisma = withAuth(getGrievanceTimelinesInternal);
export const deleteAgreementPrisma = withAuth(deleteAgreementPrismaInternal);
export const updateAgreementVectorIdPrisma = withAuth(updateAgreementVectorIdInternal);
export const updateAgreementDetailsPrisma = withAuth(updateAgreementDetailsInternal);