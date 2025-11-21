'use server';
import { prisma } from '@/app/lib/db';
import { Evidence } from '@/app/lib/definitions';
import { withAuth } from '@/app/actions/auth';

// Internal implementations
// fetchEvidenceByCaseIdPrisma removed - cases feature no longer supported
async function fetchEvidenceByCaseIdPrismaInternal() {
  throw new Error('fetchEvidenceByCaseId is no longer supported - cases feature removed');
}

async function fetchEvidenceByIdPrismaInternal(id: string, organizationId: string): Promise<Evidence> {
  try {
    const evidence = await prisma.evidence.findUnique({
      where: { id },
      include: {
        grievance: {
          select: {
            organizationId: true
          }
        },
        complaint: {
          select: {
            organizationId: true
          }
        },
        incident: {
          select: {
            organizationId: true
          }
        }
      }
    });

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Check if the evidence belongs to the organization
    const belongsToOrg = evidence.grievance?.organizationId === organizationId || 
                        evidence.complaint?.organizationId === organizationId ||
                        evidence.incident?.organizationId === organizationId;

    if (!belongsToOrg) {
      throw new Error('Evidence not found');
    }

    const factsObj = evidence.facts as Record<string, string> || {};

    // Transform the evidence into the expected format
    const transformedEvidence: Evidence = {
      id: evidence.id,
      name: evidence.name,
      type: evidence.type as 'Text' | 'File',
      source: evidence.source,
      status: evidence.status,
      date: evidence.date.toISOString(),
      eventDate: evidence.eventDate?.toISOString() || null,
      summary: evidence.summary,
      facts: new Map(Object.entries(factsObj)),
      facts_json: factsObj,
      // case_id removed
      grievance_id: evidence.grievanceId || undefined
    };

    return transformedEvidence;
  } catch (error: unknown) {
    console.error('Error fetching evidence:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw new Error('Failed to fetch evidence');
  }
}

async function fetchEvidenceByGrievanceIdPrismaInternal(grievanceId: string): Promise<Evidence[]> {
  try {
    // First verify the grievance exists and get the organization for security
    const grievance = await prisma.grievance.findUnique({
      where: { id: grievanceId },
      select: { organizationId: true }
    });
    
    if (!grievance) {
      throw new Error('Grievance not found');
    }
    
    const evidence = await prisma.evidence.findMany({
      where: {
        grievanceId,
        status: {
          not: "deleted"
        }
      }
    });

    return evidence.map(ev => {
      const factsObj = ev.facts as Record<string, string> || {};
      return {
        id: ev.id,
        name: ev.name,
        source: ev.source,
        type: ev.type as 'Text' | 'File',
        status: ev.status,
        grievance_id: ev.grievanceId || undefined,
        date: ev.date.toISOString(),
        facts: new Map(Object.entries(factsObj)),
        facts_json: factsObj,
        summary: ev.summary,
        eventDate: ev.eventDate?.toISOString() || null,
        extractedText: ev.extractedText
      };
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    throw new Error('Failed to fetch evidence');
  }
}

async function getEvidenceInternal(evidenceId: string, organizationId: string) {
  try {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        grievance: {
          select: {
            organizationId: true
          }
        }
      }
    });

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Check if the evidence belongs to the organization through grievance
    const belongsToOrg = evidence.grievance?.organizationId === organizationId;

    if (!belongsToOrg) {
      throw new Error('Evidence not found');
    }

    return evidence;
  } catch (error) {
    console.error('Error fetching evidence:', error);
    throw new Error('Failed to fetch evidence');
  }
}

async function createEvidencePrismaInternal(data: {
  name: string;
  type: string;
  source: string;
  date: Date;
  eventDate?: Date | null;
  facts: any;
  summary?: string | null;
  extractedText?: string | null;
  caseId?: string;
  grievanceId?: string;
  complaintId?: string;
  organizationId: string;
  status?: string;
}) {
  try {
    const evidence = await prisma.evidence.create({
      data: {
        name: data.name,
        type: data.type,
        source: data.source,
        date: data.date,
        eventDate: data.eventDate,
        facts: data.facts,
        summary: data.summary,
        extractedText: data.extractedText,
        status: data.status || "processing", // Default to processing if not specified
        ...(data.caseId && { caseId: data.caseId }),
        ...(data.grievanceId && { grievanceId: data.grievanceId }),
        ...(data.complaintId && { complaintId: data.complaintId })
      }
    });

    // Log EVIDENCE_ADDED event for grievances when status is "completed"
    // (Don't log for temporary "processing" records)
    if (data.grievanceId && data.status === "completed") {
      try {
        const { logGrievanceEvent } = await import("@/app/lib/grievance-events");
        await logGrievanceEvent(
          data.grievanceId,
          "EVIDENCE_ADDED",
          null,
          data.name
        );
      } catch (error) {
        // Don't fail evidence creation if event logging fails
        console.error("Failed to log EVIDENCE_ADDED event:", error);
      }
    }

    return evidence;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to create evidence.');
  }
}

async function deleteEvidencePrismaInternal(id: string, organizationId: string) {
  try {
    // First check if evidence exists and belongs to this organization
    const evidence = await prisma.evidence.findUnique({
      where: { id },
      include: {
        grievance: {
          select: { organizationId: true }
        },
        complaint: {
          select: { organizationId: true }
        },
        incident: {
          select: { organizationId: true }
        }
      }
    });

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Check organization access
    const belongsToOrg = evidence.grievance?.organizationId === organizationId ||
                        evidence.complaint?.organizationId === organizationId ||
                        evidence.incident?.organizationId === organizationId;
    
    if (!belongsToOrg) {
      throw new Error('Access denied');
    }

    // Soft delete by updating status to "deleted"
    await prisma.evidence.update({
      where: { id },
      data: { status: "deleted" }
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to delete evidence.');
  }
}

async function deleteGrievanceEvidencePrismaInternal(grievanceId: string, evidenceId: string, organizationId: string) {
  try {
    await prisma.evidence.update({
      where: {
        id: evidenceId,
        grievanceId,
        grievance: {
          organizationId
        }
      },
      data: { status: "deleted" }
    });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    throw new Error('Failed to delete evidence');
  }
}

async function updateEvidencePrismaInternal(id: string, data: {
  source?: string;
  facts?: any;
  summary?: string | null;
  eventDate?: Date | null;
  name?: string;
  extractedText?: string | null;
  status?: string;
}) {
  try {
    return await prisma.evidence.update({
      where: { id },
      data
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to update evidence.');
  }
}

async function findExistingEvidencePrismaInternal(grievanceId: string, name: string, type: string) {
  try {
    return await prisma.evidence.findFirst({
      where: {
        grievanceId,
        name,
        type
      }
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to find existing evidence.');
  }
}

// updateCaseStatusPrisma removed - cases feature no longer supported
async function updateCaseStatusPrismaInternal() {
  throw new Error('updateCaseStatusPrisma is no longer supported - cases feature removed');
}

// Exported wrapped versions
export const fetchEvidenceByCaseIdPrisma = withAuth(fetchEvidenceByCaseIdPrismaInternal);
export const fetchEvidenceByIdPrisma = withAuth(fetchEvidenceByIdPrismaInternal);
export const fetchEvidenceByGrievanceIdPrisma = withAuth(fetchEvidenceByGrievanceIdPrismaInternal);
export const getEvidencePrisma = withAuth(getEvidenceInternal);
export const createEvidencePrisma = withAuth(createEvidencePrismaInternal);
export const deleteEvidencePrisma = withAuth(deleteEvidencePrismaInternal);
export const deleteGrievanceEvidencePrisma = withAuth(deleteGrievanceEvidencePrismaInternal);
export const updateEvidencePrisma = withAuth(updateEvidencePrismaInternal);
export const findExistingEvidencePrisma = withAuth(findExistingEvidencePrismaInternal);
export const updateCaseStatusPrisma = withAuth(updateCaseStatusPrismaInternal); 