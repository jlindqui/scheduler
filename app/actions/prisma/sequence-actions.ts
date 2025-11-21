import { prisma } from "@/app/lib/db";

export interface SequenceType {
  COMPLAINT: "complaint";
  GRIEVANCE: "grievance";
}

/**
 * Get the next sequence number for a given organization and sequence type
 * Uses a transaction to ensure atomicity and prevent duplicate numbers
 */
export async function getNextSequenceNumber(
  organizationId: string,
  sequenceType: "complaint" | "grievance"
): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    // Try to find existing sequence record
    let sequence = await tx.organizationSequence.findUnique({
      where: { organizationId },
    });

    if (!sequence) {
      // Create new sequence record if it doesn't exist
      sequence = await tx.organizationSequence.create({
        data: {
          organizationId,
          complaintNumberSequence: 0,
          grievanceNumberSequence: 0,
        },
      });
    }

    // Increment the appropriate sequence
    const updateData: any = {};
    if (sequenceType === "complaint") {
      updateData.complaintNumberSequence = {
        increment: 1,
      };
    } else if (sequenceType === "grievance") {
      updateData.grievanceNumberSequence = {
        increment: 1,
      };
    }

    // Update the sequence and return the new value
    const updatedSequence = await tx.organizationSequence.update({
      where: { organizationId },
      data: updateData,
    });

    return sequenceType === "complaint"
      ? updatedSequence.complaintNumberSequence
      : updatedSequence.grievanceNumberSequence;
  });
}

/**
 * Generate a formatted complaint number
 * Format: C-###
 */
export async function generateComplaintNumber(
  organizationId: string,
  organizationName?: string
): Promise<string> {
  const sequenceNumber = await getNextSequenceNumber(organizationId, "complaint");
  
  return `C-${sequenceNumber.toString().padStart(3, "0")}`;
}

/**
 * Generate a formatted grievance number
 * Format: G-###
 */
export async function generateGrievanceNumber(
  organizationId: string,
  organizationName?: string
): Promise<string> {
  const sequenceNumber = await getNextSequenceNumber(organizationId, "grievance");
  
  return `G-${sequenceNumber.toString().padStart(3, "0")}`;
}

/**
 * Get current sequence numbers for an organization (for debugging/admin purposes)
 */
export async function getOrganizationSequences(organizationId: string) {
  const sequence = await prisma.organizationSequence.findUnique({
    where: { organizationId },
  });

  return sequence || {
    organizationId,
    complaintNumberSequence: 0,
    grievanceNumberSequence: 0,
  };
} 