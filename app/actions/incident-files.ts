"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "./auth";
import { getOrganizationId } from "./organization";

// Simple in-memory storage for incident files (temporary until database implementation)
const incidentFilesStorage = new Map<string, IncidentFile[]>();

export interface IncidentFile {
  id: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  incidentId: string;
}

// Internal implementations
async function uploadIncidentFilesInternal(
  incidentId: string,
  files: Array<{
    file: File;
    name: string;
    uploadedAt: Date;
    uploadedBy: string;
  }>
) {
  console.log("=== UPLOAD FUNCTION CALLED ===");
  console.log("incidentId:", incidentId);
  console.log("files:", files);

  const organizationId = await getOrganizationId();

  try {
    console.log(
      "Starting upload for incident:",
      incidentId,
      "with",
      files.length,
      "files"
    );

    const uploadedFiles: IncidentFile[] = [];

    for (const fileData of files) {
      console.log("Uploading file:", fileData.name);

      try {
        // Upload file to S3
        // const s3Key = await uploadIncidentFileInternal(fileData.file, incidentId);
        // console.log('S3 upload successful, key:', s3Key);

        // Create file record
        const fileRecord: IncidentFile = {
          id: `${Date.now()}-${Math.random()}`,
          name: fileData.name,
          originalName: fileData.file.name,
          type: fileData.file.type,
          size: fileData.file.size,
          uploadedAt: fileData.uploadedAt,
          uploadedBy: fileData.uploadedBy,
          incidentId: incidentId,
        };

        console.log("Created file record:", fileRecord);
        uploadedFiles.push(fileRecord);
      } catch (fileError) {
        console.error(
          "Error uploading individual file:",
          fileData.name,
          fileError
        );
        // Continue with other files even if one fails
      }
    }

    if (uploadedFiles.length > 0) {
      // Store file metadata in memory
      const existingFiles = incidentFilesStorage.get(incidentId) || [];
      const updatedFiles = [...existingFiles, ...uploadedFiles];
      incidentFilesStorage.set(incidentId, updatedFiles);

      console.log(
        "Stored files in memory. Total files for incident:",
        updatedFiles.length
      );
    }

    revalidatePath(`/product/incidents/${incidentId}`);
    return { success: true, files: uploadedFiles };
  } catch (error) {
    console.error("Error uploading incident files:", error);
    return { success: false, error: "Failed to upload files" };
  }
}

async function getIncidentFilesInternal(
  incidentId: string
): Promise<IncidentFile[]> {
  try {
    // Get files from in-memory storage
    const files = incidentFilesStorage.get(incidentId) || [];
    console.log(
      "Retrieved files for incident",
      incidentId,
      ":",
      files.length,
      "files"
    );
    return files;
  } catch (error) {
    console.error("Error fetching incident files:", error);
    return [];
  }
}

async function deleteIncidentFileInternal(incidentId: string, fileId: string) {
  try {
    // Remove file from in-memory storage
    const existingFiles = incidentFilesStorage.get(incidentId) || [];
    const updatedFiles = existingFiles.filter((file) => file.id !== fileId);
    incidentFilesStorage.set(incidentId, updatedFiles);

    // TODO: Also delete from S3 in a real implementation

    revalidatePath(`/product/incidents/${incidentId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting incident file:", error);
    return { success: false, error: "Failed to delete file" };
  }
}

// New interface for uploaded file metadata (no File object)
export interface UploadedIncidentFileMetadata {
  id: string;
  name: string;
  filename: string; // The actual filename in storage
  originalName: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  incidentId: string;
}

// Internal implementation for saving incident file metadata after client upload
async function saveIncidentFileMetadataInternal(
  incidentId: string,
  filesMetadata: UploadedIncidentFileMetadata[]
) {
  try {
    const organizationId = await getOrganizationId();
    
    console.log('Saving incident file metadata for incident:', incidentId);
    
    const uploadedFiles: IncidentFile[] = [];
    
    for (const fileMetadata of filesMetadata) {
      // Create file record (currently in-memory, but could be database later)
      const fileRecord: IncidentFile = {
        id: fileMetadata.id,
        name: fileMetadata.name,
        originalName: fileMetadata.originalName,
        type: fileMetadata.type,
        size: fileMetadata.size,
        uploadedAt: fileMetadata.uploadedAt,
        uploadedBy: fileMetadata.uploadedBy,
        incidentId: incidentId
      };
      
      console.log('Created file record:', fileRecord);
      uploadedFiles.push(fileRecord);
    }
    
    if (uploadedFiles.length > 0) {
      // Store file metadata in memory
      const existingFiles = incidentFilesStorage.get(incidentId) || [];
      const updatedFiles = [...existingFiles, ...uploadedFiles];
      incidentFilesStorage.set(incidentId, updatedFiles);
      
      console.log('Stored files in memory. Total files for incident:', updatedFiles.length);
    }
    
    revalidatePath(`/product/incidents/${incidentId}`);
    return { success: true, files: uploadedFiles };
  } catch (error) {
    console.error('Error saving incident file metadata:', error);
    throw error;
  }
}

// Exported wrapped versions
export const uploadIncidentFiles = withAuth(uploadIncidentFilesInternal);
export const getIncidentFiles = withAuth(getIncidentFilesInternal);
export const deleteIncidentFile = withAuth(deleteIncidentFileInternal);
export const saveIncidentFileMetadata = withAuth(saveIncidentFileMetadataInternal);
