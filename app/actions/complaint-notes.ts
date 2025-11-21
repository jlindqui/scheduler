"use server";

import { prisma } from "@/app/lib/db";
import { getServerSession } from "@/lib/auth/server-session";
import { getOrganizationId } from "@/app/actions/organization";

export interface ComplaintNoteWithUser {
  id: string;
  complaintId: string;
  userId: string;
  title: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

// Create a new complaint note
export async function createComplaintNote(
  complaintId: string,
  content: string
): Promise<ComplaintNoteWithUser> {
  const session = await getServerSession();
  const organizationId = await getOrganizationId();

  if (!session?.user?.id || !organizationId) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the complaint exists and belongs to the organization
    const complaint = await prisma.complaint.findFirst({
      where: {
        id: complaintId,
        organizationId: organizationId,
      },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    // Create the note
    const note = await prisma.complaintNote.create({
      data: {
        complaintId: complaintId,
        userId: session.user.id,
        title: null,
        content: content,
      } as any,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return note as ComplaintNoteWithUser;
  } catch (error) {
    console.error("Error creating complaint note:", error);
    throw new Error("Failed to create complaint note");
  }
}

// Fetch all notes for a complaint
export async function fetchComplaintNotes(
  complaintId: string
): Promise<ComplaintNoteWithUser[]> {
  const organizationId = await getOrganizationId();

  if (!organizationId) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the complaint exists and belongs to the organization
    const complaint = await prisma.complaint.findFirst({
      where: {
        id: complaintId,
        organizationId: organizationId,
      },
    });

    if (!complaint) {
      throw new Error("Complaint not found");
    }

    // Fetch all notes for the complaint
    const notes = await prisma.complaintNote.findMany({
      where: {
        complaintId: complaintId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return notes as ComplaintNoteWithUser[];
  } catch (error) {
    console.error("Error fetching complaint notes:", error);
    throw new Error("Failed to fetch complaint notes");
  }
}

// Update a complaint note
export async function updateComplaintNote(
  noteId: string,
  content: string,
  title?: string
): Promise<ComplaintNoteWithUser> {
  const session = await getServerSession();
  const organizationId = await getOrganizationId();

  if (!session?.user?.id || !organizationId) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the note exists and belongs to the user
    const existingNote = await prisma.complaintNote.findFirst({
      where: {
        id: noteId,
        userId: session.user.id,
        complaint: {
          organizationId: organizationId,
        },
      },
    });

    if (!existingNote) {
      throw new Error("Note not found or unauthorized");
    }

    // Update the note
    const updatedNote = await prisma.complaintNote.update({
      where: {
        id: noteId,
      },
      data: {
        content: content,
        title: title !== undefined ? title : undefined,
      } as any,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedNote as ComplaintNoteWithUser;
  } catch (error) {
    console.error("Error updating complaint note:", error);
    throw new Error("Failed to update complaint note");
  }
}

// Delete a complaint note
export async function deleteComplaintNote(noteId: string): Promise<void> {
  const session = await getServerSession();
  const organizationId = await getOrganizationId();

  if (!session?.user?.id || !organizationId) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the note exists and belongs to the user
    const existingNote = await prisma.complaintNote.findFirst({
      where: {
        id: noteId,
        userId: session.user.id,
        complaint: {
          organizationId: organizationId,
        },
      },
    });

    if (!existingNote) {
      throw new Error("Note not found or unauthorized");
    }

    // Delete the note
    await prisma.complaintNote.delete({
      where: {
        id: noteId,
      },
    });
  } catch (error) {
    console.error("Error deleting complaint note:", error);
    throw new Error("Failed to delete complaint note");
  }
}


