"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { factsToInsert } from "../lib/utils";
import {
  createEvidencePrisma,
  deleteEvidencePrisma,
  updateEvidencePrisma,
  findExistingEvidencePrisma,
} from "@/app/actions/prisma/evidence-actions";
import { getOrganizationId } from "./organization";
import { storageService } from "@/app/server/services/storage-service";
import { withAuth } from "./auth";
import {
  getFactsWithLLM,
  getSummaryAndEventDateWithLLM,
} from "./llm/analysis";
import {
  fetchEvidenceByGrievanceIdPrisma,
  getEvidencePrisma,
} from "@/app/actions/prisma/evidence-actions";
import { extractTextWithAIVision } from "./llm/evidence-actions";
import { getServerSession } from "@/lib/auth/server-session";

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB to match Next.js server action limit
const MAX_TEXT_LENGTH = 100000; // 100k characters
const CHUNK_SIZE = 50000; // 50k characters per chunk


// Internal implementations

async function createEvidenceInternal(formData: FormData) {
  try {
    const organizationId = await getOrganizationId();
    const name = formData.get("name") as string;
    const text = formData.get("text") as string;
    const source = formData.get("source") as string;
    const type = formData.get("type") as string;
    // caseId removed - cases feature no longer supported
    const grievanceId = formData.get("grievanceId") as string | null;
    const complaintId = formData.get("complaintId") as string | null;

    if ((!grievanceId && !complaintId) || !organizationId || !type) {
      throw new Error("Missing required fields - either grievanceId or complaintId must be provided");
    }

    // This server action only handles text evidence
    if (type !== "Text") {
      throw new Error(
        "This server action only supports text evidence. Use client-side upload for files."
      );
    }

    const textContent = text || source;
    if (!textContent) {
      throw new Error("Text content is required for text evidence");
    }

    if (!name) {
      throw new Error("Name is required for text evidence");
    }
    if (textContent.length > MAX_TEXT_LENGTH) {
      throw new Error(
        `Text length exceeds the maximum limit of ${MAX_TEXT_LENGTH} characters`
      );
    }

    let finalSource = textContent;
    let fileContent = textContent;

    const date = new Date();

    // Include uploader info in facts so UI can display who added it
    const session = await getServerSession();
    const uploaderFacts = session?.user
      ? {
          uploadedBy: session.user.name || "Unknown User",
          uploadedById: session.user.id || "",
          uploadedByEmail: session.user.email || "",
          uploadedAt: date.toISOString(),
        }
      : { uploadedAt: date.toISOString() };

    let facts = uploaderFacts;
    let summary = null;
    let eventDate = null;

    // Only process with LLM if content is within reasonable limits
    if (fileContent.length <= CHUNK_SIZE) {
      try {
        const response = await getSummaryAndEventDateWithLLM(fileContent);
        if (response) {
          summary = response.summary;
          eventDate = response.eventDate;
        }
      } catch (error) {
        console.error("Error processing with LLM:", error);
        // Don't throw error, just log it and continue without summary
      }
    } else {
      // For large text, set a basic summary
      summary = `Large text evidence (${fileContent.length} characters)`;
    }

    // Generate a better name for text evidence if needed
    let finalName = name;
    if (!name || name.trim() === "") {
      try {
        const { generateEvidenceName } = await import("./llm/analysis");
        finalName = await generateEvidenceName(finalSource);
      } catch (error) {
        console.error("Error generating evidence name:", error);
        finalName = "Text Evidence"; // Fallback
      }
    }

    await createEvidencePrisma({
      name: finalName,
      type,
      source: finalSource,
      date,
      facts,
      summary,
      eventDate,
      // caseId removed
      grievanceId: grievanceId || undefined,
      complaintId: complaintId || undefined,
      organizationId,
      extractedText: finalSource,
      status: "completed", // Text evidence is completed immediately
    });
    // Event logging now handled in createEvidencePrisma

    if (grievanceId) {
      revalidatePath(`/product/grievances/${grievanceId}`);
    }

    if (complaintId) {
      revalidatePath(`/product/complaints/${complaintId}`);
    }

    return { message: "Evidence added successfully" };
  } catch (error) {
    console.error("Error creating evidence:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to create evidence");
  }
}

async function deleteEvidenceInternal(evidenceId: string, grievanceId?: string) {
  try {
    const organizationId = await getOrganizationId();
    await deleteEvidencePrisma(evidenceId, organizationId);
    if (grievanceId) {
      revalidatePath(`/product/grievances/${grievanceId}`);
    }
  } catch (error) {
    console.error("Error deleting evidence:", error);
    throw new Error("Failed to delete evidence");
  }
}

// createEvidenceFromFact function removed - was case-specific
async function createEvidenceFromFactInternal(
  grievanceId: string,
  factName: string,
  factValue: string
) {
  // This function has been disabled as it was case-specific
  throw new Error("createEvidenceFromFact is no longer supported - cases feature removed");
}

async function processEvidenceInternal(
  grievanceId: string,
  name: string,
  type: string,
  source: string,
  organizationId: string
) {
  const date = new Date();

  try {
    let factInsert = {};
    let summary = null;
    let eventDate = null;

    try {
      const response = await getSummaryAndEventDateWithLLM(source);
      if (response) {
        summary = response.summary;
        eventDate = response.eventDate;
      }
    } catch (error) {
      console.error("Error processing with LLM:", error);
      // Don't throw error, just log it and continue without summary
    }

    await createEvidencePrisma({
      grievanceId,
      name,
      type,
      source,
      date,
      facts: factInsert,
      summary,
      eventDate,
      organizationId,
      extractedText: source,
      status: "completed", // File processing is completed
    });

    // Note: Removed case-specific decision generation logic
    // Note: This function appears to be legacy/unused - event logging removed
    revalidatePath(`/product/grievances/${grievanceId}`);
  } catch (error) {
    console.error("Error processing evidence:", error);
    throw new Error("Failed to process evidence.");
  }
}

async function extractEvidencePdfContentInternal(
  evidenceId: string
): Promise<string | null> {
  try {
    const fileData =
      await storageService.getEvidenceFileForProcessing(evidenceId);
    if (!fileData) return null;

    const pdfBuffer = Buffer.from(fileData);

    // Check if the buffer contains valid PDF header
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    if (pdfHeader !== "%PDF") {
      console.warn(
        `Evidence ${evidenceId}: Invalid PDF file - missing PDF header`
      );
      return null;
    }

    const pdf = require("pdf-parse");
    const data = await pdf(pdfBuffer);
    return data.text || "";
  } catch (error) {
    console.error("Error extracting PDF content:", error);

    // Log more specific error information for debugging
    if (error instanceof Error) {
      if (
        error.message.includes("Invalid PDF") ||
        error.message.includes("InvalidPDFException")
      ) {
        console.warn(
          `Evidence ${evidenceId}: PDF file is corrupted or invalid`
        );
      } else if (error.message.includes("password")) {
        console.warn(
          `Evidence ${evidenceId}: PDF file appears to be password-protected`
        );
      }
    }

    return null; // Return null instead of throwing to allow processing to continue
  }
}

async function fetchEvidenceByGrievanceIdInternal(grievanceId: string) {
  try {
    const evidence = await fetchEvidenceByGrievanceIdPrisma(grievanceId);

    return evidence.map((ev) => {
      const factsObj = ev.facts_json || {};
      // Ensure all values are strings to match the Evidence type
      const factsMap = new Map(
        Object.entries(factsObj).map(([key, value]) => [key, String(value)])
      );
      return {
        id: ev.id,
        name: ev.name,
        source: ev.source,
        type: ev.type as "Text" | "File",
        grievance_id: ev.grievance_id,
        // case_id removed
        date: ev.date,
        facts: factsMap,
        facts_json: factsObj,
        summary: ev.summary,
        eventDate: ev.eventDate,
        extractedText: ev.extractedText,
      };
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch evidence.");
  }
}

// Internal implementation for reprocessing evidence
async function reprocessEvidenceInternal(evidenceId: string) {
  const organizationId = await getOrganizationId();

  try {
    // Get existing evidence
    const { fetchEvidenceByIdPrisma } = await import(
      "./prisma/evidence-actions"
    );
    const evidence = await fetchEvidenceByIdPrisma(evidenceId, organizationId);

    if (!evidence) {
      throw new Error("Evidence not found");
    }

    let facts = {};
    let summary = null;
    let eventDate = null;
    let sourceContent = evidence.source;

    // For file evidence, re-extract content from S3
    if (evidence.type === "File") {
      try {
        const fileBuffer =
          await storageService.getEvidenceFileForProcessing(evidenceId);

        if (fileBuffer) {
          // Try to extract filename from stored content, or use the stored content as filename
          const fileName = evidence.source.startsWith("From ")
            ? evidence.source.match(/^From ([^:]+):/)?.[1] || "file"
            : evidence.source; // If it's just a filename, use it directly

          if (fileName.toLowerCase().endsWith(".pdf")) {
            const pdf = require("pdf-parse");
            const data = await pdf(fileBuffer);

            // If very little text extracted, try AI vision
            if (data.text.trim().length < 100) {
              try {
                const aiExtractedText =
                  await extractTextWithAIVision(fileBuffer);
                if (
                  aiExtractedText &&
                  aiExtractedText.length > data.text.length
                ) {
                  sourceContent = "From " + fileName + ": " + aiExtractedText;
                } else {
                  sourceContent = "From " + fileName + ": " + data.text;
                }
              } catch (error) {
                console.warn(
                  "AI vision extraction failed, using pdf-parse result:",
                  error
                );
                sourceContent = "From " + fileName + ": " + data.text;
              }
            } else {
              sourceContent = "From " + fileName + ": " + data.text;
            }
          } else {
            const textContent = new TextDecoder().decode(fileBuffer);
            sourceContent = "From " + fileName + ": " + textContent;
          }
        }
      } catch (error) {
        // Fall back to stored content if S3 extraction fails
      }
    }

    // Process for summary and event date only (no individual facts)
    try {
      const response = await getSummaryAndEventDateWithLLM(sourceContent);
      if (response) {
        summary = response.summary;
        eventDate = response.eventDate;
      }
    } catch (error) {
      console.error("Error processing with LLM:", error);
      // Don't throw error, just log it and continue without summary
    }

    // Generate a better name if the current name looks like a filename
    let updatedName = undefined;
    if (
      evidence.name &&
      (evidence.name.includes(".pdf") ||
        evidence.name.includes("-") ||
        evidence.name.length > 30 ||
        evidence.name === evidence.source)
    ) {
      try {
        const { generateEvidenceName } = await import("./llm/analysis");
        updatedName = await generateEvidenceName(sourceContent);
      } catch (error) {
        // If name generation fails, continue without updating the name
      }
    }

    // Update the evidence with new AI analysis
    await updateEvidencePrisma(evidenceId, {
      facts,
      summary,
      eventDate,
      extractedText: sourceContent,
      ...(updatedName && { name: updatedName }),
    });

    // Revalidate the evidence page to show updated data
    if (evidence.grievance_id) {
      revalidatePath(
        `/product/grievances/${evidence.grievance_id}/evidence/${evidenceId}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error reprocessing evidence:", error);
    throw new Error(
      `Failed to reprocess evidence with AI: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Internal implementation for updating evidence name
async function updateEvidenceNameInternal(evidenceId: string, newName: string) {
  const organizationId = await getOrganizationId();

  try {
    const { fetchEvidenceByIdPrisma } = await import(
      "./prisma/evidence-actions"
    );
    const evidence = await fetchEvidenceByIdPrisma(evidenceId, organizationId);

    if (!evidence) {
      throw new Error("Evidence not found");
    }

    await updateEvidencePrisma(evidenceId, {
      name: newName.trim(),
    });

    // Revalidate the evidence page
    if (evidence.grievance_id) {
      revalidatePath(
        `/product/grievances/${evidence.grievance_id}/evidence/${evidenceId}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating evidence name:", error);
    throw new Error("Failed to update evidence name");
  }
}

async function updateEvidenceSummaryInternal(
  evidenceId: string,
  newSummary: string
) {
  const organizationId = await getOrganizationId();

  try {
    const { fetchEvidenceByIdPrisma } = await import(
      "./prisma/evidence-actions"
    );
    const evidence = await fetchEvidenceByIdPrisma(evidenceId, organizationId);

    if (!evidence) {
      throw new Error("Evidence not found");
    }

    await updateEvidencePrisma(evidenceId, {
      summary: newSummary.trim(),
    });

    // Revalidate the evidence page
    if (evidence.grievance_id) {
      revalidatePath(
        `/product/grievances/${evidence.grievance_id}/evidence/${evidenceId}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating evidence summary:", error);
    throw new Error("Failed to update evidence summary");
  }
}

// Minimal server actions for client-side presigned URL uploads

// Create temporary evidence record to get ID
async function createTemporaryEvidenceInternal(
  formData: FormData
): Promise<string> {
  const organizationId = await getOrganizationId();
  const name = formData.get("name") as string;
  const fileName = formData.get("fileName") as string;
  const fileSize = formData.get("fileSize") as string;
  // caseId removed
  const grievanceId = formData.get("grievanceId") as string | null;

  if (!grievanceId || !organizationId || !fileName) {
    throw new Error("Missing required fields");
  }

  // Check file size
  const fileSizeNum = parseInt(fileSize);
  if (fileSizeNum > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    );
  }

  // Create temporary evidence record with processing status
  const tempEvidence = await createEvidencePrisma({
    name: name || fileName,
    type: "File",
    source: fileName, // Temporary, will be updated
    date: new Date(),
    facts: {},
    summary: null,
    eventDate: null,
    // caseId removed
    grievanceId: grievanceId || undefined,
    organizationId,
    status: "processing", // Hidden from users until completed
  });

  return tempEvidence.id;
}

// Process uploaded evidence file (extraction, LLM, etc.)
async function processUploadedEvidenceInternal(
  evidenceId: string,
  filename: string,
  fileType: string
): Promise<void> {
  const organizationId = await getOrganizationId();

  // First, update the evidence record with the correct filename
  // This is necessary because the file was uploaded with a prefixed filename
  await updateEvidencePrisma(evidenceId, {
    source: filename,
  });

  // Extract file content from GCS bucket
  let fileContent = "";
  try {
    // Get the file from GCS using the filename
    const fileBuffer =
      await storageService.getEvidenceFileForProcessing(evidenceId);

    if (!fileBuffer) {
      throw new Error("File not found in storage");
    }

    if (fileType === "application/pdf") {
      const pdf = require("pdf-parse");
      const data = await pdf(fileBuffer);

      // If very little text extracted, try AI vision
      if (data.text.trim().length < 100) {
        try {
          const aiExtractedText = await extractTextWithAIVision(fileBuffer);
          if (aiExtractedText && aiExtractedText.length > data.text.length) {
            fileContent = aiExtractedText;
          } else {
            fileContent = data.text;
          }
        } catch (error) {
          console.warn(
            "AI vision extraction failed, using pdf-parse result:",
            error
          );
          fileContent = data.text;
        }
      } else {
        fileContent = data.text;
      }
    } else {
      // For non-PDF files, convert buffer to text
      fileContent = new TextDecoder().decode(fileBuffer);
    }
  } catch (error) {
    console.error("Error reading file contents from GCS:", error);
    throw new Error(`Error reading file contents from GCS: ${error}`);
  }

  // Process with LLM (existing logic)
  let facts = {};
  let summary = null;
  let eventDate = null;

  if (fileContent.length <= CHUNK_SIZE) {
    try {
      const response = await getSummaryAndEventDateWithLLM(fileContent);
      if (response) {
        summary = response.summary;
        eventDate = response.eventDate;
      }
    } catch (error) {
      console.error("Error processing with LLM:", error);
    }
  } else {
    summary = `Large file evidence (${fileContent.length} characters)`;
  }

  // Generate better name if needed
  const { fetchEvidenceByIdPrisma } = await import("./prisma/evidence-actions");
  const currentEvidence = await fetchEvidenceByIdPrisma(
    evidenceId,
    organizationId
  );

  let finalName = currentEvidence?.name;
  // Generate better name if the current name looks like a filename
  if (finalName && (finalName.includes(".") || finalName === filename)) {
    try {
      const { generateEvidenceName } = await import("./llm/analysis");
      finalName = await generateEvidenceName(fileContent);
    } catch (error) {
      console.error("Error generating evidence name:", error);
    }
  }

  // Update evidence with processed data and mark as completed
  await updateEvidencePrisma(evidenceId, {
    facts,
    summary,
    eventDate,
    name: finalName,
    extractedText: fileContent,
    status: "completed", // Now visible to users
  });

  // Log the evidence addition event for file uploads
  // Note: We need to log here because updateEvidencePrisma doesn't log events
  if (currentEvidence?.grievance_id) {
    try {
      const { logGrievanceEvent } = await import("@/app/lib/grievance-events");
      await logGrievanceEvent(
        currentEvidence.grievance_id,
        "EVIDENCE_ADDED",
        null,
        finalName || filename
      );
    } catch (error) {
      console.error("Failed to log EVIDENCE_ADDED event:", error);
    }
    revalidatePath(`/product/grievances/${currentEvidence.grievance_id}`);
  }
}

// Evidence file retrieval for client viewing (PDF viewer, etc.)
async function getEvidenceFileInternal(
  evidenceId: string
): Promise<Uint8Array> {
  // Use the specialized method that handles evidence source properly
  const buffer = await storageService.getEvidenceFileForProcessing(evidenceId);

  if (!buffer) throw new Error("Evidence file not found in storage");
  return buffer;
}

// ========== EXPORTED WRAPPED VERSIONS ==========

export const createEvidence = withAuth(createEvidenceInternal);
export const deleteEvidence = withAuth(deleteEvidenceInternal);
export const createEvidenceFromFact = withAuth(createEvidenceFromFactInternal);
export const processEvidence = withAuth(processEvidenceInternal);
export const extractEvidencePdfContent = withAuth(
  extractEvidencePdfContentInternal
);
export const fetchEvidenceByGrievanceId = withAuth(
  fetchEvidenceByGrievanceIdInternal
);
export const reprocessEvidence = withAuth(reprocessEvidenceInternal);
export const updateEvidenceName = withAuth(updateEvidenceNameInternal);
export const updateEvidenceSummary = withAuth(updateEvidenceSummaryInternal);
export const createTemporaryEvidence = withAuth(
  createTemporaryEvidenceInternal
);
export const processUploadedEvidence = withAuth(
  processUploadedEvidenceInternal
);
export const getEvidenceFileAction = withAuth(getEvidenceFileInternal);
