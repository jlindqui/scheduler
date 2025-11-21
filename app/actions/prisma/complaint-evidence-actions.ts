'use server';
import { prisma } from '@/app/lib/db';
import { Evidence } from '@/app/lib/definitions';
import { withAuth } from '@/app/actions/auth';

// Internal implementations
async function fetchEvidenceByComplaintIdPrismaInternal(complaintId: string): Promise<Evidence[]> {
  try {
    const evidence = await prisma.evidence.findMany({
      where: {
        complaintId,
        status: {
          not: "deleted"
        }
      },
      include: {
        complaint: {
          select: {
            organizationId: true
          }
        }
      },
      orderBy: {
        date: 'desc' // Most recent first
      }
    });

    return evidence.map(ev => {
      const factsObj = ev.facts as Record<string, string> || {};
      return {
        id: ev.id,
        name: ev.name,
        source: ev.source,
        type: ev.type as 'Text' | 'File',
        complaint_id: ev.complaintId || undefined,
        // case_id removed
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
    console.error('Error fetching complaint evidence:', error);
    throw new Error('Failed to fetch evidence');
  }
}

async function createComplaintEvidencePrismaInternal(data: {
  name: string;
  type: string;
  source: string;
  date: Date;
  eventDate?: Date | null;
  facts: any;
  summary?: string | null;
  extractedText?: string | null;
  complaintId: string;
  organizationId: string;
}) {
  try {
    return await prisma.evidence.create({
      data: {
        name: data.name,
        type: data.type,
        source: data.source,
        date: data.date,
        eventDate: data.eventDate,
        facts: data.facts,
        summary: data.summary,
        extractedText: data.extractedText,
        complaintId: data.complaintId
      }
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to create evidence.');
  }
}

async function deleteComplaintEvidencePrismaInternal(complaintId: string, evidenceId: string, organizationId: string) {
  try {
    await prisma.evidence.delete({
      where: {
        id: evidenceId,
        complaintId,
        complaint: {
          organizationId
        }
      }
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to delete evidence.');
  }
}

async function updateComplaintEvidencePrismaInternal(id: string, data: {
  source?: string;
  facts?: any;
  summary?: string | null;
  eventDate?: Date | null;
  name?: string;
  extractedText?: string | null;
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

async function getComplaintEvidencePrismaInternal(evidenceId: string, organizationId: string) {
  try {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        complaint: {
          select: {
            organizationId: true
          }
        }
      }
    });

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Check if the evidence belongs to the organization through complaint
    const belongsToOrg = evidence.complaint?.organizationId === organizationId;

    if (!belongsToOrg) {
      throw new Error('Evidence not found');
    }

    return evidence;
  } catch (error) {
    console.error('Error fetching evidence:', error);
    throw new Error('Failed to fetch evidence');
  }
}

// Exported functions with authentication
export const fetchEvidenceByComplaintIdPrisma = withAuth(fetchEvidenceByComplaintIdPrismaInternal);
export const createComplaintEvidencePrisma = withAuth(createComplaintEvidencePrismaInternal);
export const deleteComplaintEvidencePrisma = withAuth(deleteComplaintEvidencePrismaInternal);
export const updateComplaintEvidencePrisma = withAuth(updateComplaintEvidencePrismaInternal);
export const getComplaintEvidencePrisma = withAuth(getComplaintEvidencePrismaInternal);
