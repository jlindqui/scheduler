"use server";

import { revalidatePath } from "next/cache";
import { ComplaintType } from "@prisma/client";
import { getOrganizationId } from "./organization";
import { getServerSession } from "@/lib/auth/server-session";

// Import Prisma client
import { prisma } from "@/app/lib/db";

// Types
export interface ComplaintListItem {
  id: string;
  complaintNumber: string | null;
  type: ComplaintType;
  category: string | null;
  bargainingUnitId: string;
  bargainingUnit: {
    id: string;
    name: string;
  } | null;
  agreement: {
    id: string;
    name: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  lastUpdatedById: string | null;
  lastUpdatedBy: {
    id: string;
    name: string | null;
  } | null;
  issue: string | null;
  settlementDesired: string | null;
  resolution: string | null;
  supportingDocuments: string[];
    articlesViolated: string[];
  status: string;
  grievanceId: string | null;
  agreementId: string | null;
  // Employee information
  complainantFirstName: string | null;
  complainantLastName: string | null;
  complainantEmail: string | null;
  complainantPhone: string | null;
  complainantPosition: string | null;
  complainantDepartment: string | null;
  complainantSupervisor: string | null;
  employees: any | null;
  organizationId: string;
}

// Fetch all complaints for an organization
export async function fetchAllComplaints(statusFilter?: string): Promise<ComplaintListItem[]> {
  const organizationId = await getOrganizationId();
  
  if (!organizationId) {
    return [];
  }

  try {
    const whereClause: any = {
      organizationId: organizationId,
    };

    // Add status filter if provided
    if (statusFilter && statusFilter !== "all") {
      whereClause.status = statusFilter;
    } else {
      // By default, exclude DELETED complaints unless specifically requested
      whereClause.status = {
        not: "DELETED"
      };
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      include: {
        bargainingUnit: {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return complaints as unknown as ComplaintListItem[];
  } catch (error) {
    console.error("Error fetching complaints:", error);
    throw new Error("Failed to fetch complaints");
  }
}

// Fetch a single complaint by ID
export async function fetchComplaintById(id: string): Promise<ComplaintListItem | null> {
  const organizationId = await getOrganizationId();
  
  if (!organizationId) {
    return null;
  }

  try {
    const complaint = await prisma.complaint.findFirst({
      where: {
        id: id,
        organizationId: organizationId,
      },
      include: {
        bargainingUnit: {
          select: {
            id: true,
            name: true,
          },
        },
        agreement: {
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
        evidence: {
          select: {
            id: true,
            name: true,
            source: true,
            type: true,
            date: true,
            summary: true,
          },
        },
      },
    });

    if (!complaint) {
      return null;
    }

    // Find the grievance that was created from this complaint
    const grievance = await prisma.grievance.findFirst({
      where: {
        sourceComplaintId: id,
        organizationId: organizationId,
      },
      select: {
        id: true,
      },
    });

    // Add the grievanceId to the complaint object
    const complaintWithGrievance = {
      ...complaint,
      grievanceId: grievance?.id || null,
    };

    return complaintWithGrievance as unknown as ComplaintListItem | null;
  } catch (error) {
    console.error("Error fetching complaint:", error);
    throw new Error("Failed to fetch complaint");
  }
}

// Create a new complaint
export async function createComplaint(formData: FormData) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();
  
  if (!organizationId || !session?.user?.id) {
    throw new Error("Missing required fields");
  }

  try {
    // Generate the next complaint number using the sequence
    const complaintNumber = await getNextComplaintNumber();
    
    const complaintData = {
      organizationId,
      complaintNumber: complaintNumber,
      type: formData.get("type") as ComplaintType,
      category: formData.get("category") as string || null,
      bargainingUnitId: formData.get("bargainingUnitId") as string,
      agreementId: formData.get("agreementId") as string || null,
      issue: formData.get("issue") as string || null,
      settlementDesired: formData.get("settlementDesired") as string || null,
      resolution: null, // New complaints don't have resolution
      supportingDocuments: (formData.get("supportingDocuments") as string || "").split(",").filter(Boolean),
      articlesViolated: (formData.get("articlesViolated") as string || "").split(",").filter(Boolean),
      status: formData.get("status") as string || "OPEN",
      // Employee information
      complainantFirstName: formData.get("complainantFirstName") as string || null,
      complainantLastName: formData.get("complainantLastName") as string || null,
      complainantEmail: formData.get("complainantEmail") as string || null,
      complainantPhone: formData.get("complainantPhone") as string || null,
      complainantPosition: formData.get("complainantPosition") as string || null,
      complainantDepartment: formData.get("complainantDepartment") as string || null,
      complainantSupervisor: formData.get("complainantSupervisor") as string || null,
      employees: formData.get("employees") ? JSON.parse(formData.get("employees") as string) : null,
      lastUpdatedById: session.user.id,
    };

    const complaint = await prisma.complaint.create({
      data: complaintData,
    });

    revalidatePath("/product/complaints");
    return complaint;
  } catch (error) {
    console.error("Error creating complaint:", error);
    throw new Error("Failed to create complaint");
  }
}

// Update a complaint
export async function updateComplaint(id: string, formData: FormData) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();
  
  if (!organizationId || !session?.user?.id) {
    throw new Error("Missing required fields");
  }

  try {
    // Build update data object with only provided fields
    const updateData: any = {
      lastUpdatedById: session.user.id,
    };

    // Only add fields to update if they exist in formData
    if (formData.has("complaintNumber")) {
      updateData.complaintNumber = formData.get("complaintNumber") as string || null;
    }
    if (formData.has("type")) {
      updateData.type = formData.get("type") as ComplaintType;
    }
    if (formData.has("category")) {
      updateData.category = formData.get("category") as string || null;
    }
    if (formData.has("bargainingUnitId")) {
      updateData.bargainingUnitId = formData.get("bargainingUnitId") as string;
    }
    if (formData.has("agreementId")) {
      updateData.agreementId = formData.get("agreementId") as string || null;
    }
    if (formData.has("issue")) {
      updateData.issue = formData.get("issue") as string || null;
    }
    if (formData.has("settlementDesired")) {
      updateData.settlementDesired = formData.get("settlementDesired") as string || null;
    }
    if (formData.has("resolution")) {
      updateData.resolution = formData.get("resolution") as string || null;
    }
    if (formData.has("supportingDocuments")) {
      updateData.supportingDocuments = (formData.get("supportingDocuments") as string || "").split(",").filter(Boolean);
    }
    if (formData.has("articlesViolated")) {
      updateData.articlesViolated = (formData.get("articlesViolated") as string || "").split(",").filter(Boolean);
    }
    if (formData.has("status")) {
      updateData.status = formData.get("status") as string || "OPEN";
    }
    
    // Employee information
    if (formData.has("complainantFirstName")) {
      updateData.complainantFirstName = formData.get("complainantFirstName") as string || null;
    }
    if (formData.has("complainantLastName")) {
      updateData.complainantLastName = formData.get("complainantLastName") as string || null;
    }
    if (formData.has("complainantEmail")) {
      updateData.complainantEmail = formData.get("complainantEmail") as string || null;
    }
    if (formData.has("complainantPhone")) {
      updateData.complainantPhone = formData.get("complainantPhone") as string || null;
    }
    if (formData.has("complainantPosition")) {
      updateData.complainantPosition = formData.get("complainantPosition") as string || null;
    }
    if (formData.has("complainantDepartment")) {
      updateData.complainantDepartment = formData.get("complainantDepartment") as string || null;
    }
    if (formData.has("complainantSupervisor")) {
      updateData.complainantSupervisor = formData.get("complainantSupervisor") as string || null;
    }
    if (formData.has("employees")) {
      updateData.employees = formData.get("employees") ? JSON.parse(formData.get("employees") as string) : null;
    }

    const complaint = await prisma.complaint.update({
      where: {
        id: id,
        organizationId: organizationId,
      },
      data: updateData,
    });

    revalidatePath("/product/complaints");
    revalidatePath(`/product/complaints/${id}`);
    return complaint;
  } catch (error) {
    console.error("Error updating complaint:", error);
    throw new Error("Failed to update complaint");
  }
}

// Delete a complaint
export async function deleteComplaint(id: string) {
  const organizationId = await getOrganizationId();
  
  if (!organizationId) {
    throw new Error("Missing required fields");
  }

  try {
    await prisma.complaint.delete({
      where: {
        id: id,
        organizationId: organizationId,
      },
    });

    revalidatePath("/product/complaints");
  } catch (error) {
    console.error("Error deleting complaint:", error);
    throw new Error("Failed to delete complaint");
  }
}

// Mark complaints as deleted (soft delete)
export async function deleteComplaints(ids: string[]) {
  const organizationId = await getOrganizationId();
  
  if (!organizationId) {
    throw new Error("Missing required fields");
  }

  if (!ids || ids.length === 0) {
    throw new Error("No complaints selected for deletion");
  }

  try {
    // Use a transaction to ensure all updates succeed or none do
    await prisma.$transaction(async (tx) => {
      // First, get the current status of each complaint to store as previous status
      const complaints = await tx.complaint.findMany({
        where: {
          id: {
            in: ids,
          },
          organizationId: organizationId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      // Update all complaints that belong to the organization to status "DELETED"
      // and store their previous status
      for (const complaint of complaints) {
        await tx.complaint.update({
          where: {
            id: complaint.id,
          },
          data: {
            status: "DELETED",
            previousStatus: complaint.status,
          },
        });
      }

      // Check if all complaints were actually updated
      if (complaints.length !== ids.length) {
        throw new Error(`Only ${complaints.length} out of ${ids.length} complaints were marked as deleted. Some complaints may not exist or you may not have permission to modify them.`);
      }
    });

    revalidatePath("/product/complaints");
    return { success: true, deletedCount: ids.length };
  } catch (error) {
    console.error("Error marking complaints as deleted:", error);
    throw new Error("Failed to mark complaints as deleted");
  }
}

// Undelete complaints (restore previous status)
export async function undeleteComplaints(ids: string[]) {
  const organizationId = await getOrganizationId();
  
  if (!organizationId) {
    throw new Error("Missing required fields");
  }

  if (!ids || ids.length === 0) {
    throw new Error("No complaints selected for undeletion");
  }

  try {
    let restoredCount = 0;
    
    // Use a transaction to ensure all updates succeed or none do
    await prisma.$transaction(async (tx) => {
      // Get the complaints with their previous status
      const complaints = await tx.complaint.findMany({
        where: {
          id: {
            in: ids,
          },
          organizationId: organizationId,
          status: "DELETED", // Only undelete complaints that are currently deleted
        },
        select: {
          id: true,
          previousStatus: true,
        },
      });

      // Restore each complaint to its previous status
      for (const complaint of complaints) {
        // If no previous status was stored, default to "OPEN"
        const statusToRestore = complaint.previousStatus || "OPEN";
        
        await tx.complaint.update({
          where: {
            id: complaint.id,
          },
          data: {
            status: statusToRestore,
            previousStatus: null, // Clear the previous status
          },
        });
      }

      // Check if all complaints were actually updated
      if (complaints.length !== ids.length) {
        throw new Error(`Only ${complaints.length} out of ${ids.length} complaints were restored. Some complaints may not exist, may not be deleted, or you may not have permission to modify them.`);
      }
      
      // Set the restored count
      restoredCount = complaints.length;
    });

    revalidatePath("/product/complaints");
    return { success: true, restoredCount: restoredCount };
  } catch (error) {
    console.error("Error restoring complaints:", error);
    throw new Error("Failed to restore complaints");
  }
}

// Reopen a single complaint (set status to OPEN)
export async function reopenComplaint(id: string) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();
  
  if (!organizationId || !session?.user?.id) {
    throw new Error("Missing required fields");
  }

  try {
    const complaint = await prisma.complaint.update({
      where: {
        id: id,
        organizationId: organizationId,
        status: "DELETED", // Only reopen complaints that are currently deleted
      },
      data: {
        status: "OPEN",
        previousStatus: null, // Clear the previous status since we're setting to OPEN
        lastUpdatedById: session.user.id,
      },
    });

    revalidatePath("/product/complaints");
    revalidatePath(`/product/complaints/${id}`);
    return complaint;
  } catch (error) {
    console.error("Error reopening complaint:", error);
    throw new Error("Failed to reopen complaint");
  }
}

// Reopen complaints (set status to OPEN)
export async function reopenComplaints(ids: string[]) {
  const organizationId = await getOrganizationId();
  
  if (!organizationId) {
    throw new Error("Missing required fields");
  }

  if (!ids || ids.length === 0) {
    throw new Error("No complaints selected for reopening");
  }

  try {
    let reopenedCount = 0;
    
    // Use a transaction to ensure all updates succeed or none do
    await prisma.$transaction(async (tx) => {
      // Update all complaints that belong to the organization to status "OPEN"
      const updateResult = await tx.complaint.updateMany({
        where: {
          id: {
            in: ids,
          },
          organizationId: organizationId,
          status: "DELETED", // Only reopen complaints that are currently deleted
        },
        data: {
          status: "OPEN",
          previousStatus: null, // Clear the previous status since we're setting to OPEN
        },
      });

      // Check if all complaints were actually updated
      if (updateResult.count !== ids.length) {
        throw new Error(`Only ${updateResult.count} out of ${ids.length} complaints were reopened. Some complaints may not exist, may not be deleted, or you may not have permission to modify them.`);
      }
      
      // Set the reopened count
      reopenedCount = updateResult.count;
    });

    revalidatePath("/product/complaints");
    return { success: true, reopenedCount: reopenedCount };
  } catch (error) {
    console.error("Error reopening complaints:", error);
    throw new Error("Failed to reopen complaints");
  }
}

// Archive complaints (mark as grieved)
export async function archiveComplaints(ids: string[]) {
  const organizationId = await getOrganizationId();
  
  if (!organizationId) {
    throw new Error("Missing required fields");
  }

  if (!ids || ids.length === 0) {
    throw new Error("No complaints selected for archiving");
  }

  try {
    // Use a transaction to ensure all updates succeed or none do
    await prisma.$transaction(async (tx) => {
      // Update all complaints that belong to the organization to status "GRIEVED"
      const updateResult = await tx.complaint.updateMany({
        where: {
          id: {
            in: ids,
          },
          organizationId: organizationId,
        },
        data: {
          status: "GRIEVED",
        },
      });

      // Check if all complaints were actually updated
      if (updateResult.count !== ids.length) {
        throw new Error(`Only ${updateResult.count} out of ${ids.length} complaints were marked as grieved. Some complaints may not exist or you may not have permission to modify them.`);
      }
    });

    revalidatePath("/product/complaints");
    return { success: true, archivedCount: ids.length };
  } catch (error) {
    console.error("Error marking complaints as grieved:", error);
    throw new Error("Failed to mark complaints as grieved");
  }
}

// Update complaint field
export async function updateComplaintField(
  id: string,
  field: string,
  value: any
) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();
  
  if (!organizationId || !session?.user?.id) {
    throw new Error("Missing required fields");
  }

  try {
    const updateData: any = {
      [field]: value,
      lastUpdatedById: session.user.id,
    };

    const complaint = await prisma.complaint.update({
      where: {
        id: id,
        organizationId: organizationId,
      },
      data: updateData,
    });

    revalidatePath("/product/complaints");
    revalidatePath(`/product/complaints/${id}`);
    return complaint;
  } catch (error) {
    console.error("Error updating complaint field:", error);
    throw new Error("Failed to update complaint field");
  }
}

// Get next complaint number for organization
export async function getNextComplaintNumber(): Promise<string> {
  const organizationId = await getOrganizationId();
  
  if (!organizationId) {
    throw new Error("Missing organization ID");
  }

  try {
    // Get or create organization sequence
    const sequence = await prisma.organizationSequence.upsert({
      where: {
        organizationId: organizationId,
      },
      update: {
        complaintNumberSequence: {
          increment: 1,
        },
      },
      create: {
        organizationId: organizationId,
        complaintNumberSequence: 1,
      },
    });

    return `C-${sequence.complaintNumberSequence.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error("Error getting next complaint number:", error);
    throw new Error("Failed to get next complaint number");
  }
}

// Update complaint status - commented out until Prisma client is regenerated
// export async function updateComplaintStatus(id: string, status: string) {
//   const organizationId = await getOrganizationId();
//   const session = await getServerSession();

//   if (!organizationId || !session?.user?.id) {
//     throw new Error("Missing required fields");
//   }

//   try {
//     const complaint = await prisma.complaint.update({
//       where: {
//         id: id,
//         organizationId: organizationId,
//       },
//       data: {
//         status: status as any, // Using any for now until Prisma client is regenerated
//         lastUpdatedById: session.user.id,
//       },
//     });

//     revalidatePath("/product/complaints");
//     revalidatePath(`/product/complaints/${id}`);
//     return complaint;
//   } catch (error) {
//     console.error("Error updating complaint status:", error);
//     throw new Error("Failed to update complaint status");
//   }
// }

// Duplicate a complaint with all its files and notes
export async function duplicateComplaintWithFilesAndNotes(complaintId: string): Promise<ComplaintListItem> {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();
  
  if (!organizationId || !session?.user?.id) {
    throw new Error("Missing required fields");
  }

  try {
    // Get the original complaint with all its relations
    const originalComplaint = await prisma.complaint.findFirst({
      where: {
        id: complaintId,
        organizationId: organizationId,
      },
      include: {
        evidence: true,
        complaintNotes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!originalComplaint) {
      throw new Error("Complaint not found");
    }

    // Generate new complaint number
    const complaintNumber = await getNextComplaintNumber();

    // Create the new complaint
    const newComplaint = await prisma.complaint.create({
      data: {
        organizationId: organizationId,
        complaintNumber: complaintNumber,
        type: originalComplaint.type,
        category: originalComplaint.category,
        agreementId: originalComplaint.agreementId,
        bargainingUnitId: originalComplaint.bargainingUnitId,
        issue: originalComplaint.issue,
        settlementDesired: originalComplaint.settlementDesired,
        // Don't copy resolution - new complaint should start fresh
        notes: originalComplaint.notes, // Copy the old notes field for now
        supportingDocuments: originalComplaint.supportingDocuments,
        articlesViolated: originalComplaint.articlesViolated,
        // Employee information
        complainantFirstName: originalComplaint.complainantFirstName,
        complainantLastName: originalComplaint.complainantLastName,
        complainantEmail: originalComplaint.complainantEmail,
        complainantPhone: originalComplaint.complainantPhone,
        complainantPosition: originalComplaint.complainantPosition,
        complainantDepartment: originalComplaint.complainantDepartment,
        complainantSupervisor: originalComplaint.complainantSupervisor,
        employees: originalComplaint.employees || undefined,
        lastUpdatedById: session.user.id,
        status: "OPEN", // New complaint starts as OPEN
      },
    });

    // Copy all evidence files
    if (originalComplaint.evidence && originalComplaint.evidence.length > 0) {
      for (const evidence of originalComplaint.evidence) {
        await prisma.evidence.create({
          data: {
            complaint: {
              connect: { id: newComplaint.id }
            },
            name: evidence.name,
            source: evidence.source,
            type: evidence.type,
            date: evidence.date,
            facts: evidence.facts || undefined,
            summary: evidence.summary,
            extractedText: evidence.extractedText,
          },
        });
      }
    }

    // Copy all complaint notes
    if (originalComplaint.complaintNotes && originalComplaint.complaintNotes.length > 0) {
      for (const note of originalComplaint.complaintNotes) {
        await prisma.complaintNote.create({
          data: {
            complaintId: newComplaint.id,
            userId: session.user.id, // New note creator is the current user
            content: note.content, // Copy the note content as-is without prefix
          },
        });
      }
    }

    // Fetch the new complaint with all its relations for return
    const newComplaintWithRelations = await prisma.complaint.findFirst({
      where: {
        id: newComplaint.id,
      },
      include: {
        bargainingUnit: {
          select: {
            id: true,
            name: true,
          }
        },
        agreement: {
          select: {
            id: true,
            name: true,
          }
        },
        lastUpdatedBy: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });

    revalidatePath("/product/complaints");
    return newComplaintWithRelations as unknown as ComplaintListItem;
  } catch (error) {
    console.error("Error duplicating complaint:", error);
    throw new Error("Failed to duplicate complaint");
  }
}

// Search complaints
export async function searchComplaints(query: string): Promise<ComplaintListItem[]> {
  const organizationId = await getOrganizationId();
  
  if (!organizationId) {
    return [];
  }

  try {
    const complaints = await prisma.complaint.findMany({
      where: {
        organizationId: organizationId,
        OR: [
          {
            complaintNumber: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            category: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            issue: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            settlementDesired: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        bargainingUnit: {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return complaints as unknown as ComplaintListItem[];
  } catch (error) {
    console.error("Error searching complaints:", error);
    throw new Error("Failed to search complaints");
  }
}

// Convert complaint to grievance
export async function convertComplaintToGrievance(complaintId: string) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();
  
  if (!organizationId || !session?.user?.id) {
    throw new Error("Missing required fields");
  }

  try {
    // First, check if a grievance already exists for this complaint
    const existingGrievance = await prisma.grievance.findFirst({
      where: {
        sourceComplaintId: complaintId,
        organizationId: organizationId,
      },
    });

    if (existingGrievance) {
      // If grievance already exists, redirect to it (idempotent)
      return { grievanceId: existingGrievance.id, isNew: false };
    }

    // Fetch the complaint with all necessary data
    const complaint = await prisma.complaint.findFirst({
      where: {
        id: complaintId,
        organizationId: organizationId,
      },
      include: {
        bargainingUnit: true,
        agreement: true,
        evidence: true,
      },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    if (!complaint.agreementId) {
      throw new Error("Complaint must have an associated collective agreement to convert to grievance");
    }

    // Create grievors array from complaint data
    const grievors = [];
    if (complaint.type === "INDIVIDUAL") {
      // Single complainant
      grievors.push({
        memberNumber: "",
        lastName: complaint.complainantLastName || "",
        firstName: complaint.complainantFirstName || "",
        address: "",
        city: "",
        postalCode: "",
        email: complaint.complainantEmail || "",
        phoneNumber: complaint.complainantPhone || "",
      });
    } else if (complaint.type === "GROUP" && complaint.employees) {
      // Group complainants
      const employees = Array.isArray(complaint.employees) ? complaint.employees : [];
      employees.forEach((employee: any) => {
        grievors.push({
          memberNumber: "",
          lastName: employee.lastName || "",
          firstName: employee.firstName || "",
          address: "",
          city: "",
          postalCode: "",
          email: employee.email || "",
          phoneNumber: employee.phoneNumber || "",
        });
      });
    }

    // Create work information
    const workInformation = {
      employer: "",
      supervisor: complaint.complainantSupervisor || "",
      jobTitle: complaint.complainantPosition || "",
      workLocation: complaint.complainantDepartment || "",
      employmentStatus: "",
    };

    // Convert complaint type to grievance type
    const grievanceType = complaint.type === "POLICY" ? "POLICY" : 
                         complaint.type === "GROUP" ? "GROUP" : "INDIVIDUAL";

    // Create the grievance
    const grievance = await prisma.grievance.create({
      data: {
        organizationId: complaint.organizationId,
        bargainingUnitId: complaint.bargainingUnitId,
        agreementId: complaint.agreementId,
        category: complaint.category,
        type: grievanceType,
        status: "ACTIVE",
        creatorId: session.user.id,
        lastUpdatedById: session.user.id,
        sourceComplaintId: complaintId,
        filedAt: new Date(),
        report: {
          create: {
            grievors: grievors as any,
            workInformation: workInformation as any,
            statement: complaint.issue || "",
            settlementDesired: complaint.settlementDesired || "",
            articlesViolated: complaint.articlesViolated?.join(", ") || null,
          },
        },
      },
      include: {
        report: true,
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Copy evidence from complaint to grievance
    if (complaint.evidence && complaint.evidence.length > 0) {
      await prisma.evidence.updateMany({
        where: {
          complaintId: complaintId,
        },
        data: {
          grievanceId: grievance.id,
          complaintId: null, // Remove the complaint association
        },
      });
    }

    // Update complaint status to indicate it's been converted
    await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: "GRIEVED" },
    });

    // Log the event
    await prisma.grievanceEvent.create({
      data: {
        grievanceId: grievance.id,
        userId: session.user.id,
        eventType: "CREATED",
        previousValue: null,
        newValue: `Converted from complaint ${complaint.complaintNumber || complaintId}`,
      },
    });

    revalidatePath("/product/complaints");
    revalidatePath("/product/grievances");

    return { grievanceId: grievance.id, isNew: true };
  } catch (error) {
    console.error("Error converting complaint to grievance:", error);
    throw new Error("Failed to convert complaint to grievance");
  }
}
