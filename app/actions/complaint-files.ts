"use server";

import { getOrganizationId } from "./organization";
import { 
  createComplaintEvidencePrisma,
  updateComplaintEvidencePrisma,
  deleteComplaintEvidencePrisma,
  getComplaintEvidencePrisma
} from "./prisma/complaint-evidence-actions";
import { withAuth } from "./auth";
import { getServerSession } from "@/lib/auth/server-session";

// Constants
// Removed file limit restriction




// Internal implementation for updating file name
async function updateComplaintFileNameInternal(
  evidenceId: string,
  newName: string
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new Error("User not authenticated");
    }

    const organizationId = await getOrganizationId();
    if (!organizationId) {
      throw new Error("No organization ID found in session");
    }

    // Update the evidence record
    await updateComplaintEvidencePrisma(evidenceId, { name: newName });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating complaint file name:", error);
    throw new Error("Failed to update file name");
  }
}

// Internal implementation for deleting a complaint file
async function deleteComplaintFileInternal(evidenceId: string) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new Error("User not authenticated");
    }

    const organizationId = await getOrganizationId();
    if (!organizationId) {
      throw new Error("No organization ID found in session");
    }

    // First get the evidence to find the complaintId
    const evidence = await getComplaintEvidencePrisma(
      evidenceId,
      organizationId
    );

    // Delete the evidence record using complaint evidence delete function
    await deleteComplaintEvidencePrisma(
      evidence.complaintId!,
      evidenceId,
      organizationId
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting complaint file:", error);
    throw new Error("Failed to delete file");
  }
}

// Exported functions with authentication
export const updateComplaintFileName = withAuth(
  updateComplaintFileNameInternal
);
export const deleteComplaintFile = withAuth(deleteComplaintFileInternal);

// New interface for uploaded file metadata (no File object)
export interface UploadedComplaintFileMetadata {
  id: string;
  name: string;
  filename: string; // The actual filename in storage
  uploadedAt: Date;
  uploadedBy: string;
}

// Internal implementation for saving complaint file metadata after client upload
async function saveComplaintFileMetadataInternal(
  complaintId: string,
  filesMetadata: UploadedComplaintFileMetadata[]
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new Error("User not authenticated");
    }

    const organizationId = await getOrganizationId();
    if (!organizationId) {
      throw new Error("No organization ID found in session");
    }


    // Get current user information
    const currentUser = {
      id: session.user.id,
      name: session.user.name || "Unknown User",
      email: session.user.email || "unknown@example.com",
    };

    const results = await Promise.all(
      filesMetadata.map(async (fileMetadata) => {
        // Store user information in facts JSON field
        const userInfo = {
          uploadedBy: currentUser.name,
          uploadedById: currentUser.id,
          uploadedByEmail: currentUser.email,
          uploadedAt: fileMetadata.uploadedAt.toISOString(),
        };

        // Create evidence record in database with the filename from storage
        const evidence = await createComplaintEvidencePrisma({
          name: fileMetadata.name,
          type: "File",
          source: fileMetadata.filename, // Use the actual storage filename
          date: fileMetadata.uploadedAt,
          facts: userInfo,
          summary: null,
          eventDate: null,
          complaintId,
          organizationId,
        });

        return {
          success: true,
          evidenceId: evidence.id,
          filename: fileMetadata.filename,
          userInfo,
        };
      })
    );

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error("Error saving complaint file metadata:", error);
    throw error;
  }
}

// Export the new metadata-only function
export const saveComplaintFileMetadata = withAuth(
  saveComplaintFileMetadataInternal
);
