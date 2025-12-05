import "server-only";

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { getEvidencePrisma } from "@/app/actions/prisma/evidence-actions"; // Removed - not needed for scheduling
import { getOrganizationId } from "@/app/actions/organization";
import { STORAGE_BUCKETS, StorageEntityType } from "./storage-config";

/**
 * Storage Service
 * Handles all server-side storage operations including file processing and management
 * Runs on the server only - combines GCS client setup with storage operations
 */
export class StorageService {
  private client: S3Client;

  constructor() {
    if (!process.env.GCS_ACCESS_KEY_ID || !process.env.GCS_SECRET_ACCESS_KEY) {
      throw new Error("GCS HMAC credentials are not configured");
    }

    this.client = new S3Client({
      endpoint: "https://storage.googleapis.com",
      region: "auto", // GCS doesn't use regions in the same way
      credentials: {
        accessKeyId: process.env.GCS_ACCESS_KEY_ID,
        secretAccessKey: process.env.GCS_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // Required for GCS S3 compatibility
    });
  }

  /**
   * Get the raw S3Client instance for direct operations
   */
  getClient(): S3Client {
    return this.client;
  }

  /**
   * Generate a presigned URL for uploading
   */
  async generateUploadUrl(
    bucket: string,
    key: string,
    contentType?: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this.client, command, { expiresIn: 3600 });
    } catch (error) {
      console.error(
        `Failed to generate upload URL for ${bucket}/${key}:`,
        error
      );
      throw new Error("Storage service temporarily unavailable");
    }
  }

  /**
   * Generate a presigned URL for downloading
   */
  async generateDownloadUrl(bucket: string, key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn: 3600 });
    } catch (error) {
      console.error(
        `Failed to generate download URL for ${bucket}/${key}:`,
        error
      );
      throw new Error("Storage service temporarily unavailable");
    }
  }

  /**
   * Get a file for server-side processing
   */
  async getFileForProcessing(
    entityType: StorageEntityType,
    filename: string
  ): Promise<Buffer> {
    try {
      const orgId = await getOrganizationId();
      const command = new GetObjectCommand({
        Bucket: STORAGE_BUCKETS.FOR_ALL,
        Key: `${orgId}/${entityType}/${filename}`,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error("File not found");
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`Failed to get file ${entityType}/${filename}:`, error);
      if (error instanceof Error && error.message === "File not found") {
        throw error; // Re-throw file not found errors as-is
      }
      throw new Error("Storage service temporarily unavailable");
    }
  }

  /**
   * Get evidence file for processing (with evidence ID lookup)
   * NOTE: This method is from the old grievance system and is not used in scheduling
   */
  async getEvidenceFileForProcessing(evidenceId: string): Promise<Buffer> {
    // const organizationId = await getOrganizationId();
    // const evidence = await getEvidencePrisma(evidenceId, organizationId);

    // if (!evidence || !evidence.source) {
    //   throw new Error("Evidence file not found");
    // }

    // // The evidence.source field contains the complete filename with ID prefix
    // return await this.getFileForProcessing("evidence", evidence.source);
    throw new Error("This method is not implemented for the scheduling system");
  }

  /**
   * Save a file to storage
   */
  async saveFile(
    entityType: StorageEntityType,
    filename: string,
    buffer: Buffer,
    contentType?: string
  ): Promise<void> {
    try {
      const orgId = await getOrganizationId();
      const command = new PutObjectCommand({
        Bucket: STORAGE_BUCKETS.FOR_ALL,
        Key: `${orgId}/${entityType}/${filename}`,
        Body: buffer,
        ContentType: contentType,
      });

      await this.client.send(command);
    } catch (error) {
      console.error(`Failed to save file ${entityType}/${filename}:`, error);
      throw new Error("Storage service temporarily unavailable");
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      console.error(`Failed to delete file ${bucket}/${key}:`, error);
      throw new Error("Storage service temporarily unavailable");
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(bucket: string, key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
