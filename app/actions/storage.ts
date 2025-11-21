"use server";

import { storageService } from "@/app/server/services/storage-service";
import { withAuth } from "@/app/actions/auth";
import {
  STORAGE_BUCKETS,
  StorageEntityType,
} from "../server/services/storage-config";
import { getOrganizationId } from "./organization";

// Server action to generate presigned URL for uploads
async function getUploadPresignedUrlActionInternal(
  entityType: StorageEntityType,
  filename: string,
  contentType: string
): Promise<string> {
  try {
    const orgId = await getOrganizationId();
    return await storageService.generateUploadUrl(
      STORAGE_BUCKETS.FOR_ALL,
      `${orgId}/${entityType}/${filename}`,
      contentType
    ); // Uses default 3600 seconds
  } catch (error) {
    console.error("Failed to generate upload URL:", error);
    throw new Error("Failed to generate upload URL");
  }
}

// Server action to generate presigned URL for downloads
async function getDownloadPresignedUrlActionInternal(
  entityType: StorageEntityType,
  filename: string
): Promise<string> {
  try {
    const orgId = await getOrganizationId();
    return await storageService.generateDownloadUrl(
      STORAGE_BUCKETS.FOR_ALL,
      `${orgId}/${entityType}/${filename}`
    );
  } catch (error) {
    console.error("Failed to generate download URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

// Export wrapped functions with authentication
export const getUploadPresignedUrlAction = withAuth(
  getUploadPresignedUrlActionInternal
);
export const getDownloadPresignedUrlAction = withAuth(
  getDownloadPresignedUrlActionInternal
);
