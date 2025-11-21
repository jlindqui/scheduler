"use server";

import {
  deleteGrievancePrisma,
  fetchGrievanceAgreementPrisma,
  updateGrievanceAgreementPrisma,
  clearGrievanceAgreementPrisma,
  updateGrievanceCategoryPrisma,
  updateGrievanceStatusPrisma,
  fetchGrievanceByIdPrisma,
  fetchGrievanceListItemByIdPrisma,
  updateGrievanceAssigneePrisma,
  updateGrievanceFieldPrisma,
  getCurrentGrievanceAgreementPrisma,
  getCurrentGrievanceCategoryPrisma,
  getCurrentGrievanceStatusPrisma,
  createGrievancePrisma,
  createGrievanceEventPrisma,
  fetchGrievanceStepInfoPrisma,
  fetchMultipleGrievanceStepInfoPrisma,
  createGrievanceNotePrisma,
  fetchGrievanceNotesPrisma,
  updateGrievanceNotePrisma,
  deleteGrievanceNotePrisma,
  getGrievanceNotePrisma,
  updateGrievanceCostPrisma,
  updateGrievanceAISummaryPrisma,
  updateGrievanceAssessmentPrisma,
  getGrievanceBasicInfoPrisma,
  updateGrievanceCurrentStepPrisma,
  getGrievanceCurrentStepNumberPrisma,
  fetchGrievanceStepsPrisma,
  createGrievanceStepPrisma,
  createGrievanceStepOutcomePrisma,
  fetchGrievanceStepOutcomesPrisma,
} from "@/app/actions/prisma/grievance-actions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Grievor,
  WorkInformation,
  Evidence,
  Agreement,
} from "@/app/lib/definitions";
import { logGrievanceEvent } from "../lib/grievance-events";
import { searchGrievances } from "@/app/actions/prisma/grievance-search";
import { GrievanceSearchFilters, parseSearchParams } from "@/app/lib/grievance-search";
import {
  askLLMAboutIssue,
  analyzeIssueStatement,
} from "@/app/actions/llm/analysis";
import { searchAgreement } from "../actions/agreements";
import { AgreementSearchResult } from "../lib/definitions";
import { format, addDays, addBusinessDays } from "date-fns";
import { generateGrievanceBook as generateGrievanceBookUtil } from "@/app/lib/pdf-utils";

import {
  GrievanceEventType,
  GrievanceStatus,
  GrievanceStage,
} from "@prisma/client";
import { transformAgreement } from "../lib/utils";
import { getUserOrgFromSession, withRetry } from "@/app/lib/error-handling";
import { withAuth } from "./auth";
import { getOrganizationId } from "./organization";
import {
  createEvidencePrisma,
  deleteGrievanceEvidencePrisma,
  fetchEvidenceByIdPrisma,
  fetchEvidenceByGrievanceIdPrisma,
} from "./prisma/evidence-actions";
import { fetchAgreementByIdPrisma } from "./prisma/agreement-actions";
import { GrievanceParserSchema } from "@/app/lib/schemas";
import { generateGrievanceAISummary, parseGrievanceFormWithCategories } from "./llm/grievance-actions";
// Direct prisma import removed - using service layer
import { getServerSession } from "@/lib/auth/server-session";
import { z } from "zod";
import { indexGrievance } from "./grievances/grievance-search";

async function deleteGrievanceWithConfirmationInternal(formData: FormData) {
  const organizationId = await getOrganizationId();
  const id = formData.get("id") as string;

  if (!id) {
    throw new Error("Missing required fields");
  }

  try {
    await deleteGrievancePrisma(id, organizationId);
    revalidatePath("/product/grievances");
  } catch (error) {
    console.error("Error deleting grievance:", error);
    throw new Error("Failed to delete grievance");
  }
}

async function deleteGrievanceWithoutRevalidationInternal(formData: FormData) {
  const organizationId = await getOrganizationId();
  const id = formData.get("id") as string;

  if (!id) {
    throw new Error("Missing required fields");
  }

  try {
    await deleteGrievancePrisma(id, organizationId);
    // No revalidation - client will handle refresh
  } catch (error) {
    console.error("Error deleting grievance:", error);
    throw new Error("Failed to delete grievance");
  }
}

async function deleteGrievanceEvidenceInternal(
  grievanceId: string,
  evidenceId: string
) {
  const organizationId = await getOrganizationId();

  try {
    // Get evidence details before deletion
    const evidence = await fetchEvidenceByIdPrisma(evidenceId, organizationId);

    await deleteGrievanceEvidencePrisma(
      grievanceId,
      evidenceId,
      organizationId
    );

    // Log the evidence removal event
    await logGrievanceEvent(
      grievanceId,
      "EVIDENCE_REMOVED",
      evidence.name,
      null
    );

    revalidatePath(`/product/grievances/${grievanceId}`);
  } catch (error) {
    console.error("Error deleting evidence:", error);
    throw new Error("Failed to delete evidence");
  }
  redirect(`/product/grievances/${grievanceId}`);
}

async function fetchAgreementByIdInternal(id: string) {
  const organizationId = await getOrganizationId();
  return fetchAgreementByIdPrisma(id, organizationId);
}

async function fetchGrievanceAgreementInternal(
  grievanceId: string
): Promise<Agreement | null> {
  const organizationId = await getOrganizationId();
  const rawAgreement = await fetchGrievanceAgreementPrisma(
    grievanceId,
    organizationId
  );
  return rawAgreement ? transformAgreement(rawAgreement) : null;
}

async function updateGrievanceAgreementInternal(formData: FormData) {
  const organizationId = await getOrganizationId();

  const grievanceId = formData.get("grievance_id") as string;
  const agreementId = formData.get("agreement_id") as string | null;

  if (!grievanceId) {
    throw new Error("Missing required grievance ID");
  }

  try {
    // Get current agreement before update
    const currentAgreementId =
      await getCurrentGrievanceAgreementPrisma(grievanceId);

    if (agreementId) {
      await updateGrievanceAgreementPrisma(
        grievanceId,
        agreementId,
        organizationId
      );
    } else {
      // Handle null agreement case - clear the agreement
      await clearGrievanceAgreementPrisma(grievanceId, organizationId);
    }

    // Log the agreement change event
    await logGrievanceEvent(
      grievanceId,
      "AGREEMENT_CHANGED",
      currentAgreementId || null,
      agreementId || null
    );

    // First revalidate the path to clear the cache
    revalidatePath(`/product/grievances/${grievanceId}`);
  } catch (error) {
    console.error("Error updating grievance agreement:", error);
    throw new Error("Failed to update grievance agreement");
  }
}

async function updateGrievanceCategoryInternal(formData: FormData) {
  const organizationId = await getOrganizationId();

  const grievanceId = formData.get("grievance_id") as string;
  const category = formData.get("category") as string | null;

  if (!grievanceId) {
    throw new Error("Missing required grievance ID");
  }

  try {
    // Get current category before update
    const currentCategory =
      await getCurrentGrievanceCategoryPrisma(grievanceId);

    await updateGrievanceCategoryPrisma(grievanceId, category, organizationId);

    // Log the category change event
    await logGrievanceEvent(
      grievanceId,
      "CATEGORY_CHANGED",
      currentCategory || null,
      category || null
    );

    // Revalidate the path to clear the cache
    revalidatePath(`/product/grievances/${grievanceId}`);
  } catch (error) {
    console.error("Error updating grievance category:", error);
    throw new Error("Failed to update grievance category");
  }
}

async function fetchEvidenceByIdInternal(id: string): Promise<Evidence> {
  const organizationId = await getOrganizationId();
  return fetchEvidenceByIdPrisma(id, organizationId);
}

async function updateGrievanceStatusInternal(formData: FormData) {
  // Use enhanced session validation instead of getOrganizationId()
  const { userId, organizationId, userRole } = await getUserOrgFromSession();

  const grievanceId = formData.get("grievance_id") as string;
  const status = formData.get("status") as string;
  const stage = formData.get("currentStage") as string | null;
  const outcomes = formData.get("outcomes") as string | null;
  const resolutionDetails = formData.get("resolution_details") as string | null;
  const remainingIssues = formData.get("remainingIssues") as string | null;

  if (!grievanceId || !status) {
    throw new Error(
      "Missing required fields: grievance_id and status are required"
    );
  }

  // Validate status
  if (!Object.values(GrievanceStatus).includes(status as GrievanceStatus)) {
    throw new Error(
      `Invalid status: ${status}. Must be one of: ${Object.values(GrievanceStatus).join(", ")}`
    );
  }

  // Validate stage if provided
  if (
    stage &&
    !Object.values(GrievanceStage).includes(stage as GrievanceStage)
  ) {
    throw new Error(
      `Invalid stage: ${stage}. Must be one of: ${Object.values(GrievanceStage).join(", ")}`
    );
  }

  // If remainingIssues is provided, use the processRemainingIssues function
  if (remainingIssues && remainingIssues.trim()) {
    const newState = {
      status: status as GrievanceStatus,
      stage: stage as GrievanceStage | null,
    };
    return await processRemainingIssues(grievanceId, newState, remainingIssues);
  }

  // Validate resolution details if provided
  let parsedResolutionDetails = null;
  if (resolutionDetails) {
    try {
      parsedResolutionDetails = JSON.parse(resolutionDetails);
      // If resolvedBy is empty, set it from the session
      if (parsedResolutionDetails && !parsedResolutionDetails.resolvedBy) {
        parsedResolutionDetails.resolvedBy = userId || "";
      }
    } catch (error) {
      throw new Error("Invalid resolution details format");
    }
  }

  // Get current status before update
  const currentStatus = await getCurrentGrievanceStatusPrisma(grievanceId);

  // Update the grievance status and stage with retry mechanism
  const result = await withRetry(async () => {
    return await updateGrievanceStatusPrisma(
      grievanceId,
      organizationId,
      status as GrievanceStatus,
      stage as GrievanceStage | null,
      outcomes,
      parsedResolutionDetails
    );
  });

  if (!result.success) {
    throw new Error("Failed to update grievance status");
  }

  // Log the status change event
  await logGrievanceEvent(
    grievanceId,
    GrievanceEventType.STATUS_CHANGED,
    currentStatus,
    status as GrievanceStatus
  );


  // Revalidate the path to clear the cache
  revalidatePath(`/product/grievances/${grievanceId}`);

  return result;
}

async function updateGrievanceAssigneeInternal({
  grievanceId,
  assignedToId,
}: {
  grievanceId: string;
  assignedToId: string | null;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("No user ID found in session");
  }
  const organizationId = await getOrganizationId();

  // Verify the grievance belongs to the organization
  const grievance = await fetchGrievanceByIdPrisma(grievanceId, organizationId);
  if (!grievance) {
    throw new Error("Grievance not found");
  }

  const updatedGrievance = await updateGrievanceAssigneePrisma(
    grievanceId,
    assignedToId,
    session.user.id
  );

  return updatedGrievance;
}

async function updateGrievanceFieldInternal(
  grievanceId: string,
  field: "statement" | "articlesViolated" | "settlementDesired",
  value: string
) {
  const organizationId = await getOrganizationId();

  // Verify the grievance belongs to the organization
  const grievance = await fetchGrievanceByIdPrisma(grievanceId, organizationId);
  if (!grievance) {
    throw new Error("Grievance not found");
  }

  try {
    const {
      grievance: updatedGrievance,
      previousValue,
      newValue,
    } = await updateGrievanceFieldPrisma(grievanceId, field, value);

    // Log the field change event
    await logGrievanceEvent(
      grievanceId,
      "STATEMENT_UPDATED", // Using this event type for all field updates for now
      previousValue || null,
      newValue || null
    );

    // Revalidate the path to clear the cache
    revalidatePath(`/product/grievances/${grievanceId}`);

    return updatedGrievance;
  } catch (error) {
    console.error("Failed to update grievance field:", error);
    throw new Error("Failed to update grievance field");
  }
}

async function updateGrievanceCostInternal(
  grievanceId: string,
  field: "estimatedCost" | "actualCost",
  value: number | null
) {
  const organizationId = await getOrganizationId();

  // Verify the grievance belongs to the organization
  const grievance = await fetchGrievanceByIdPrisma(grievanceId, organizationId);
  if (!grievance) {
    throw new Error("Grievance not found");
  }

  try {
    // Get the previous value for logging
    const previousValue =
      field === "estimatedCost"
        ? grievance.estimatedCost
        : grievance.actualCost;

    // Update the cost field using service layer
    await updateGrievanceCostPrisma(grievanceId, field, value);

    // Log the cost change event
    await logGrievanceEvent(
      grievanceId,
      "COST_UPDATED",
      previousValue?.toString() || null,
      value?.toString() || null
    );

    // Revalidate the path to clear the cache
    revalidatePath(`/product/grievances/${grievanceId}`);

    // Return the transformed grievance data using existing function
    return await fetchGrievanceByIdPrisma(grievanceId, organizationId);
  } catch (error) {
    console.error("Failed to update grievance cost:", error);
    throw new Error("Failed to update grievance cost");
  }
}

async function askAIAboutGrievanceInternal(question: string, content: string) {
  // No need to verify organization access for this action as it's just using the LLM
  try {
    const llmResponse = await askLLMAboutIssue(question, content);
    return llmResponse;
  } catch (error) {
    console.error("Failed to get AI response:", error);
    throw error;
  }
}

async function fetchGrievanceDetailsInternal(id: string) {
  const organizationId = await getOrganizationId();

  const [grievance, grievanceDetails] = await Promise.all([
    fetchGrievanceByIdPrisma(id, organizationId),
    fetchGrievanceListItemByIdPrisma(id),
  ]);

  if (!grievance || !grievanceDetails) {
    throw new Error("Grievance not found");
  }

  return {
    grievance,
    grievanceDetails,
  };
}

async function fetchAllGrievancesInternal(page: number = 1, pageSize: number = 20) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();
  const currentUserId = session?.user?.id;
  
  // Use searchGrievances with default filters for pagination
  const result = await searchGrievances(
    organizationId,
    { statusFilter: 'ACTIVE' }, // Default to active grievances
    page,
    pageSize,
    'filedAt',
    'desc',
    currentUserId
  );
  
  return result.grievances;
}

async function fetchAllGrievancesWithCountInternal(page: number = 1, pageSize: number = 20) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();
  const currentUserId = session?.user?.id;
  
  // Use searchGrievances with default filters for pagination with count
  return searchGrievances(
    organizationId,
    { statusFilter: 'ACTIVE' }, // Default to active grievances  
    page,
    pageSize,
    'filedAt',
    'desc',
    currentUserId
  );
}

async function searchAllGrievancesInternal(
  searchParams: URLSearchParams
) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();
  const currentUserId = session?.user?.id;
  const params = parseSearchParams(searchParams);
  
  return searchGrievances(
    organizationId,
    params, // filters
    params.page || 1,
    params.pageSize || 20,
    params.sortBy,
    params.sortOrder,
    currentUserId
  );
}

async function checkGrievanceStatusAndNextStepsInternal(grievanceId: string) {
  const organizationId = await getOrganizationId();

  try {
    // Get the grievance details
    const grievance = await fetchGrievanceListItemByIdPrisma(grievanceId);
    if (!grievance) {
      throw new Error("Grievance not found");
    }

    // Get the current agreement
    const currentAgreement =
      await getCurrentGrievanceAgreementPrisma(grievanceId);
    if (!currentAgreement) {
      throw new Error("No agreement found for this grievance");
    }

    // Get the filing date and current status
    const filingDate = new Date(grievance.filedAt);
    filingDate.setHours(0, 0, 0, 0); // Set to midnight to remove time information
    const currentStatus = grievance.status;

    // Format the date for human readability
    const formattedFilingDate = format(filingDate, "MMMM d, yyyy");

    // Convert status to human readable format
    const humanReadableStatus = currentStatus
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    // Get the agreement text for analysis
    const agreement = await fetchAgreementByIdPrisma(
      currentAgreement,
      organizationId
    );
    if (!agreement) {
      throw new Error("Agreement not found");
    }

    try {
      // Search for relevant sections in the agreement
      const searchResults = await searchAgreement(
        "grievance process procedure steps",
        currentAgreement
      );
      const relevantText = searchResults
        .map((r: AgreementSearchResult) => r.text)
        .join("\n\n");

      // Prepare the context for the LLM
      const context = `
        Grievance Information:
        - Filing Date: ${formattedFilingDate}
        - Current Status: ${humanReadableStatus}
        - Agreement: ${agreement.name}

        Agreement Text:
        ${relevantText}
      `;

      // Ask the LLM about next steps
      const question = `Based on the grievance filing date (${formattedFilingDate}) and current status (${humanReadableStatus}), what is the next required action according to the collective agreement? Please provide:
1. The specific next step required
2. The exact deadline by which this step must be completed (calculate the specific date based on the filing date and any time limits in the agreement)
3. Any relevant time limits or deadlines mentioned in the agreement

Format your response with clear sections for each point.`;

      const llmResponse = await askLLMAboutIssue(question, context);

      return {
        filingDate,
        currentStatus: humanReadableStatus,
        nextSteps: llmResponse.response.answer,
      };
    } catch (searchError) {
      console.error("Error searching agreement:", searchError);
      // Return a fallback response when search fails
      return {
        filingDate,
        currentStatus: humanReadableStatus,
        nextSteps:
          "Unable to determine next steps at this time. Please check the agreement manually for grievance procedures and deadlines.",
      };
    }
  } catch (error) {
    console.error("Error checking grievance status:", error);
    throw new Error("Failed to check grievance status and next steps");
  }
}

async function generateGrievanceBookInternal(
  grievanceId: string,
  includeAiSummary: boolean = true,
  selectedEvidenceIds?: string[]
): Promise<string> {
  return await generateGrievanceBookUtil(
    grievanceId,
    includeAiSummary,
    selectedEvidenceIds
  );
}


async function createGrievanceInternal(formData: {
  grievors: any[];
  workInformation: any;
  statement: string;
  settlementDesired: string;
  articlesViolated?: string | null;
  filingDate?: string;
  type: "INDIVIDUAL" | "GROUP" | "POLICY";
  currentStage: "INFORMAL" | "FORMAL";
  uploadedFiles?: Array<{ name: string; fileName: string; uploadedBy: string }>;
  agreementId: string;
  bargainingUnitId: string;
  externalGrievanceId?: string;
}) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new Error("User not authenticated");
    }

    const organizationId = await getOrganizationId();
    if (!organizationId) {
      throw new Error("No organization ID found in session");
    }

    // Analyze the statement to determine the category
    const category = await analyzeIssueStatement(formData.statement);

    // Create the grievance with category, type, and stage included
    const grievance = await createGrievancePrisma(
      organizationId,
      formData.grievors,
      formData.workInformation,
      formData.statement,
      formData.settlementDesired,
      formData.bargainingUnitId,
      formData.articlesViolated,
      category,
      formData.filingDate
        ? new Date(formData.filingDate + "T12:00:00Z")
        : undefined,
      formData.type,
      formData.agreementId,
      formData.currentStage,
      formData.externalGrievanceId || null
    );

    // Files are now handled on the client side after grievance creation
    // This ensures proper file upload to storage using the existing evidence flow

    // Generate AI summary for the grievance
    try {
      const aiSummary = await generateGrievanceAISummary(
        formData.statement,
        formData.articlesViolated || null,
        formData.settlementDesired,
        formData.grievors?.[0],
        formData.workInformation
      );

      // Update the grievance with the AI summary
      if (aiSummary && grievance.id) {
        await updateGrievanceAISummaryPrisma(grievance.id, aiSummary);
      }
    } catch (error) {
      // Log the error but don't fail the grievance creation
      console.error("Failed to generate or save AI summary:", error);
    }

    // Index grievance for semantic search
    try {
      await indexGrievance(grievance.id);
    } catch (error) {
      // Log the error but don't fail the grievance creation
      console.error("Failed to index grievance for search:", error);
    }

    revalidatePath("/product/grievances");
    return { success: true, grievance, grievanceId: grievance.id };
  } catch (error) {
    console.error("Error creating grievance:", error);

    // Return the specific error message instead of a generic one
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create grievance";
    return { success: false, error: errorMessage };
  }
}

async function validateStatusTransitionInternal(
  grievanceId: string,
  newState: { status: GrievanceStatus; stage: GrievanceStage | null },
  formData?: {
    withdrawalDetails?: string;
    settlementDetails?: string;
    remainingIssues?: string;
  }
) {
  // Basic validation for required fields based on status
  if (newState.status === "WITHDRAWN" && !formData?.withdrawalDetails) {
    return {
      isValid: false,
      error: "Withdrawal details are required when withdrawing a grievance",
      requiresForm: "withdrawal",
    };
  }

  if (newState.status === "SETTLED" && !formData?.settlementDetails) {
    return {
      isValid: false,
      error: "Settlement details are required when settling a grievance",
      requiresForm: "settlement",
    };
  }

  if (newState.status === "ACTIVE" && formData?.remainingIssues) {
    return {
      isValid: false,
      error: "Remaining issues are required when moving to active",
      requiresForm: "remainingIssues",
    };
  }

  // All other transitions are allowed for now
  // We can add more validation later based on organization rules
  return { isValid: true };
}

async function processWithdrawalInternal(
  grievanceId: string,
  withdrawalDetails: string
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("No user ID found in session");
  }
  const organizationId = await getOrganizationId();

  // Verify the grievance belongs to the organization
  const grievance = await fetchGrievanceByIdPrisma(grievanceId, organizationId);
  if (!grievance) {
    throw new Error("Grievance not found");
  }

  if (!withdrawalDetails.trim()) {
    throw new Error("Withdrawal details are required");
  }

  // Validate transition
  const validation = await validateStatusTransition(
    grievanceId,
    {
      status: "WITHDRAWN" as GrievanceStatus,
      stage: null, // Withdrawal doesn't have a stage
    },
    { withdrawalDetails }
  );

  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid withdrawal transition");
  }

  // Prepare resolution details
  const resolutionDetails = {
    resolutionType: "WITHDRAWN",
    resolutionDate: new Date().toISOString(),
    resolvedBy: session.user.id,
    details: withdrawalDetails,
    outcomes: withdrawalDetails,
  };

  // Update status
  const formData = new FormData();
  formData.append("grievance_id", grievanceId);
  formData.append("status", "WITHDRAWN");
  formData.append("withdrawal_details", withdrawalDetails);
  formData.append("resolution_details", JSON.stringify(resolutionDetails));

  await updateGrievanceStatus(formData);

  // Log withdrawal
  await logGrievanceEvent(
    grievanceId,
    "GRIEVANCE_WITHDRAWN",
    grievance.status,
    withdrawalDetails
  );
  revalidatePath(`/product/grievances/${grievanceId}`);
}

async function processSettlementInternal(
  grievanceId: string,
  settlementDetails: string
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("No user ID found in session");
  }
  const organizationId = await getOrganizationId();

  // Verify the grievance belongs to the organization
  const grievance = await fetchGrievanceByIdPrisma(grievanceId, organizationId);
  if (!grievance) {
    throw new Error("Grievance not found");
  }

  if (!settlementDetails.trim()) {
    throw new Error("Settlement details are required");
  }

  // Validate transition
  const validation = await validateStatusTransition(
    grievanceId,
    {
      status: "SETTLED" as GrievanceStatus,
      stage: null, // Settlement doesn't have a stage
    },
    { settlementDetails }
  );

  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid settlement transition");
  }

  // Prepare resolution details
  const resolutionDetails = {
    resolutionType: "SETTLED",
    resolutionDate: new Date().toISOString(),
    resolvedBy: session.user.id,
    details: settlementDetails,
    outcomes: settlementDetails,
  };

  // Update status
  const formData = new FormData();
  formData.append("grievance_id", grievanceId);
  formData.append("status", "SETTLED");
  formData.append("settlement_details", settlementDetails);
  formData.append("resolution_details", JSON.stringify(resolutionDetails));

  await updateGrievanceStatus(formData);

  // Log settlement
  await logGrievanceEvent(
    grievanceId,
    "GRIEVANCE_SETTLED",
    grievance.status,
    settlementDetails
  );

  revalidatePath(`/product/grievances/${grievanceId}`);
}

async function processRemainingIssuesInternal(
  grievanceId: string,
  newState: { status: GrievanceStatus; stage: GrievanceStage | null },
  remainingIssues: string
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("No user ID found in session");
  }
  const organizationId = await getOrganizationId();

  // Verify the grievance belongs to the organization
  const grievance = await fetchGrievanceByIdPrisma(grievanceId, organizationId);
  if (!grievance) {
    throw new Error("Grievance not found");
  }

  if (!remainingIssues.trim()) {
    throw new Error("Remaining issues are required");
  }

  // Validate transition with remaining issues in metadata
  const validation = await validateStatusTransition(grievanceId, newState, {
    remainingIssues,
  });
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid status transition");
  }

  try {
    // Get current grievance state to determine which step we're completing
    const currentGrievance = await fetchGrievanceByIdPrisma(
      grievanceId,
      organizationId
    );
    const currentStage = currentGrievance?.currentStage;

    // Get the current step number using service layer
    const currentStepNumber =
      (await getGrievanceCurrentStepNumberPrisma(grievanceId)) || 1;


    // Then update the status to the new stage
    const statusFormData = new FormData();
    statusFormData.append("grievance_id", grievanceId);
    statusFormData.append("status", newState.status);
    if (newState.stage) {
      statusFormData.append("currentStage", newState.stage);
    }
    await updateGrievanceStatus(statusFormData);

    revalidatePath(`/product/grievances/${grievanceId}`);
    return { success: true };
  } catch (error) {
    console.error("Error processing remaining issues:", error);
    throw new Error("Failed to process remaining issues");
  }
}



// Interface for internal parsing
interface ParsedGrievanceDataInternal {
  grievors: Partial<Grievor>[];
  workInformation: Partial<WorkInformation>;
  statement: string;
  settlementDesired: string;
  articlesViolated: string;
  category: string;
}

// Interface for external API (maintaining compatibility with form component)
export interface ParsedGrievanceData {
  grievor: Partial<Grievor> & { local?: string }; // Single grievor for backward compatibility with local for bargaining unit matching
  workInformation: Partial<WorkInformation>;
  statement: string;
  settlementDesired: string;
  articlesViolated: string;
  category: string;
}

// Wrapper for the LLM-based grievance form parser
async function parseGrievanceFormInternal(
  fileContent: string
): Promise<ParsedGrievanceData & { category: string }> {
  return await parseGrievanceFormWithCategories(fileContent);
}

// Internal implementations

async function fetchGrievanceStepInfoInternal(grievanceId: string) {
  try {
    const stepInfo = await fetchGrievanceStepInfoPrisma(grievanceId);
    return stepInfo;
  } catch (error) {
    console.error("Error fetching grievance step info:", error);
    return null;
  }
}

async function fetchMultipleGrievanceStepInfoInternal(grievanceIds: string[]) {
  try {
    const stepInfo = await fetchMultipleGrievanceStepInfoPrisma(grievanceIds);
    return stepInfo;
  } catch (error) {
    console.error("Error fetching multiple grievance step info:", error);
    return {};
  }
}

async function advanceToNextStepInternal(
  grievanceId: string,
  outcomes: string
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("No user ID found in session");
  }
  const organizationId = await getOrganizationId();

  // Verify the grievance belongs to the organization and get current step info
  const grievance = await getGrievanceBasicInfoPrisma(
    grievanceId,
    organizationId
  );

  if (!grievance) {
    throw new Error("Grievance not found");
  }

  if (!outcomes.trim()) {
    throw new Error("Step outcomes are required");
  }

  try {
    // Get current step number
    const currentStepNumber = grievance.currentStepNumber || 1;
    const nextStepNumber = currentStepNumber + 1;

    // Create a step outcome record for the current step
    await createGrievanceStepOutcomePrisma(
      grievanceId,
      currentStepNumber,
      grievance.currentStage || "INFORMAL",
      outcomes,
      session.user.id
    );

    // Update the grievance to advance to the next step
    await updateGrievanceCurrentStepPrisma(
      grievanceId,
      organizationId,
      nextStepNumber,
      session.user.id
    );

    // Get step templates to calculate due date for the next step
    try {
      const stepTemplates = await fetchGrievanceStepsPrisma(grievanceId);
      const nextStepTemplate = stepTemplates.find(
        (step) => step.stepNumber === nextStepNumber
      );

      if (nextStepTemplate) {
        // Calculate due date based on template - for 0-day timelines, use today
        const dueDate = nextStepTemplate.timeLimitDays === 0
          ? new Date() // For 0-day timelines, set to today (no actual deadline)
          : nextStepTemplate.isCalendarDays
            ? addDays(new Date(), nextStepTemplate.timeLimitDays)
            : addBusinessDays(new Date(), nextStepTemplate.timeLimitDays);

        // Create the next step record with calculated due date
        await createGrievanceStepPrisma(grievanceId, {
          stepNumber: nextStepNumber,
          stage: nextStepTemplate.stage === "INFORMAL" ? "INFORMAL" : "FORMAL",
          dueDate,
        });
      }
    } catch (stepError) {
      console.error("Error creating next step with due date:", stepError);
    }

    // Log the step completion event
    await createGrievanceEventPrisma(
      grievanceId,
      session.user.id,
      "STEP_COMPLETED",
      JSON.stringify({
        previousStep: currentStepNumber,
        newStep: nextStepNumber,
        outcomes: outcomes,
      })
    );

    revalidatePath(`/product/grievances/${grievanceId}`);
    return { success: true, newStepNumber: nextStepNumber };
  } catch (error) {
    console.error("Error advancing to next step:", error);
    throw new Error("Failed to advance to next step");
  }
}

// Note-related server actions
async function createGrievanceNoteInternal(
  grievanceId: string,
  content: string
) {
  const { userId } = await getUserOrgFromSession();

  if (!content.trim()) {
    throw new Error("Note content is required");
  }

  try {
    const note = await createGrievanceNotePrisma(grievanceId, userId, content);

    // Log the note creation event
    await logGrievanceEvent(
      grievanceId,
      "TIMELINE_ENTRY_ADDED",
      null,
      `Note added: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`
    );

    revalidatePath(`/product/grievances/${grievanceId}`);
    return note;
  } catch (error) {
    console.error("Error creating grievance note:", error);
    throw new Error("Failed to create grievance note");
  }
}

async function fetchGrievanceNotesInternal(grievanceId: string) {
  try {
    const notes = await fetchGrievanceNotesPrisma(grievanceId);
    return notes;
  } catch (error) {
    console.error("Error fetching grievance notes:", error);
    throw new Error("Failed to fetch grievance notes");
  }
}

async function updateGrievanceNoteInternal(noteId: string, content: string) {
  const { userId } = await getUserOrgFromSession();

  if (!content.trim()) {
    throw new Error("Note content is required");
  }

  try {
    const note = await updateGrievanceNotePrisma(noteId, userId, content);
    revalidatePath(`/product/grievances/${note.grievanceId}`);
    return note;
  } catch (error) {
    console.error("Error updating grievance note:", error);
    throw new Error("Failed to update grievance note");
  }
}

async function deleteGrievanceNoteInternal(noteId: string) {
  const { userId } = await getUserOrgFromSession();

  try {
    // Get the note details before deletion for logging
    const note = await getGrievanceNotePrisma(noteId);

    if (!note) {
      throw new Error("Note not found");
    }

    await deleteGrievanceNotePrisma(noteId, userId);

    // Log the note deletion event
    await logGrievanceEvent(
      note.grievanceId,
      "TIMELINE_ENTRY_ADDED",
      null,
      `Note deleted: ${note.content.substring(0, 50)}${note.content.length > 50 ? "..." : ""}`
    );

    revalidatePath(`/product/grievances/${note.grievanceId}`);
  } catch (error) {
    console.error("Error deleting grievance note:", error);
    throw new Error("Failed to delete grievance note");
  }
}

async function regenerateAISummaryInternal(
  grievanceId: string
): Promise<{ success: boolean; summary?: string; error?: string }> {
  try {
    const organizationId = await getOrganizationId();

    // Fetch the grievance details
    const grievance = await fetchGrievanceByIdPrisma(
      grievanceId,
      organizationId
    );

    // Fetch the evidence for this grievance
    const evidence = await fetchEvidenceByGrievanceIdPrisma(grievanceId);

    if (!grievance.report) {
      return { success: false, error: "Grievance report not found" };
    }

    // Parse JSON fields safely
    const grievors = grievance.report.grievors
      ? Array.isArray(grievance.report.grievors)
        ? grievance.report.grievors
        : typeof grievance.report.grievors === "string"
          ? JSON.parse(grievance.report.grievors)
          : []
      : [];

    const workInformation = grievance.report.workInformation
      ? typeof grievance.report.workInformation === "string"
        ? JSON.parse(grievance.report.workInformation)
        : grievance.report.workInformation
      : {};

    // Regenerate the AI summary with evidence
    const aiSummary = await generateGrievanceAISummary(
      grievance.report.statement,
      grievance.report.articlesViolated,
      grievance.report.settlementDesired,
      Array.isArray(grievors) ? grievors[0] : null,
      workInformation,
      evidence
    );

    if (!aiSummary) {
      return { success: false, error: "Failed to generate AI summary" };
    }

    // Update the grievance with the new AI summary
    await updateGrievanceAISummaryPrisma(grievanceId, aiSummary);

    revalidatePath(`/product/grievances/${grievanceId}`);

    return { success: true, summary: aiSummary };
  } catch (error) {
    console.error("Error regenerating AI summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function regenerateGrievancePDFInternal(grievanceId: string) {
  try {
    const organizationId = await getOrganizationId();

    // Fetch the grievance details including the report
    const grievance = await fetchGrievanceByIdPrisma(
      grievanceId,
      organizationId
    );
    if (!grievance) {
      throw new Error("Grievance not found");
    }

    // Check if we have a report with the grievance data
    if (!grievance.report) {
      throw new Error("No grievance report found - cannot regenerate PDF");
    }

    // Import the PDF generation function and evidence creation
    const { generatePrintFriendlyGrievancePDF } = await import(
      "@/app/actions/pdf-generation-print-friendly"
    );
    const { createEvidencePrisma } = await import(
      "@/app/actions/prisma/evidence-actions"
    );

    // Safely parse JSON fields and reconstruct the form data from the grievance report
    let grievors = [];
    let workInformation = {
      employer: "",
      supervisor: "",
      jobTitle: "",
      workLocation: "",
      employmentStatus: "",
    };

    try {
      // Handle grievors (should be an array)
      if (grievance.report.grievors) {
        grievors =
          typeof grievance.report.grievors === "string"
            ? JSON.parse(grievance.report.grievors)
            : grievance.report.grievors;
      }

      // Handle workInformation (should be an object)
      if (grievance.report.workInformation) {
        const parsedWorkInfo =
          typeof grievance.report.workInformation === "string"
            ? JSON.parse(grievance.report.workInformation)
            : grievance.report.workInformation;

        // Merge with defaults to ensure all required properties exist
        workInformation = {
          employer: parsedWorkInfo.employer || "",
          supervisor: parsedWorkInfo.supervisor || "",
          jobTitle: parsedWorkInfo.jobTitle || "",
          workLocation: parsedWorkInfo.workLocation || "",
          employmentStatus: parsedWorkInfo.employmentStatus || "",
        };
      }
    } catch (parseError) {
      console.error("Error parsing JSON fields:", parseError);
      throw new Error("Failed to parse grievance data");
    }

    const formData = {
      grievors,
      workInformation,
      statement: grievance.report.statement || "",
      settlementDesired: grievance.report.settlementDesired || "",
      articlesViolated: grievance.report.articlesViolated || null,
      type: grievance.type,
      currentStage: grievance.currentStage,
      filedAt: grievance.filedAt || undefined,
      agreementId: grievance.agreementId,
      bargainingUnitId: grievance.bargainingUnitId,
      bargainingUnit: grievance.bargainingUnit,
    };

    // Generate the new PDF
    const pdfResult = await generatePrintFriendlyGrievancePDF(formData);

    if (!pdfResult.success || !pdfResult.fileId) {
      throw new Error(pdfResult.error || "Failed to generate PDF");
    }

    // Create new evidence for the regenerated PDF
    let evidenceName = "Regenerated Grievance Form";
    if (grievance.currentStage === "FORMAL") {
      evidenceName = "Regenerated Filed Grievance";
    } else if (grievance.currentStage === "INFORMAL") {
      evidenceName = "Regenerated Logged Complaint";
    }

    await createEvidencePrisma({
      name: evidenceName,
      type: "File",
      source: pdfResult.fileId,
      date: new Date(),
      facts: {},
      summary: "Regenerated PDF with updated formatting",
      eventDate: null,
      grievanceId: grievanceId,
      organizationId: grievance.organizationId,
      status: "completed", // PDF generation is completed
    });
    // Event logging now handled in createEvidencePrisma

    revalidatePath(`/product/grievances/${grievanceId}`);

    return { success: true, fileId: pdfResult.fileId };
  } catch (error) {
    console.error("Error regenerating grievance PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Exported wrapped versions
export const deleteGrievanceWithConfirmation = withAuth(
  deleteGrievanceWithConfirmationInternal
);
export const deleteGrievanceWithoutRevalidation = withAuth(
  deleteGrievanceWithoutRevalidationInternal
);
export const deleteGrievanceEvidence = withAuth(
  deleteGrievanceEvidenceInternal
);
export const fetchAgreementById = withAuth(fetchAgreementByIdInternal);
export const fetchGrievanceAgreement = withAuth(
  fetchGrievanceAgreementInternal
);
export const updateGrievanceAgreement = withAuth(
  updateGrievanceAgreementInternal
);
export const updateGrievanceCategory = withAuth(
  updateGrievanceCategoryInternal
);
export const fetchEvidenceById = withAuth(fetchEvidenceByIdInternal);
export const updateGrievanceStatus = withAuth(updateGrievanceStatusInternal);
export const updateGrievanceAssignee = withAuth(
  updateGrievanceAssigneeInternal
);
export const updateGrievanceField = withAuth(updateGrievanceFieldInternal);
export const updateGrievanceCost = withAuth(updateGrievanceCostInternal);
export const askAIAboutGrievance = withAuth(askAIAboutGrievanceInternal);
export const fetchGrievanceDetails = withAuth(fetchGrievanceDetailsInternal);
export const fetchAllGrievances = withAuth(fetchAllGrievancesInternal);
export const fetchAllGrievancesWithCount = withAuth(fetchAllGrievancesWithCountInternal);
export const searchAllGrievances = withAuth(searchAllGrievancesInternal);
export const checkGrievanceStatusAndNextSteps = withAuth(
  checkGrievanceStatusAndNextStepsInternal
);
export const generateGrievanceBook = withAuth(generateGrievanceBookInternal);
export const createGrievance = withAuth(createGrievanceInternal);
export const validateStatusTransition = withAuth(
  validateStatusTransitionInternal
);
export const processWithdrawal = withAuth(processWithdrawalInternal);
export const processSettlement = withAuth(processSettlementInternal);
export const processRemainingIssues = withAuth(processRemainingIssuesInternal);
export const parseGrievanceForm = withAuth(parseGrievanceFormInternal);
export const fetchGrievanceStepInfo = withAuth(fetchGrievanceStepInfoInternal);
export const fetchMultipleGrievanceStepInfo = withAuth(
  fetchMultipleGrievanceStepInfoInternal
);
export const advanceToNextStep = withAuth(advanceToNextStepInternal);
export const createGrievanceNote = withAuth(createGrievanceNoteInternal);
export const fetchGrievanceNotes = withAuth(fetchGrievanceNotesInternal);
export const updateGrievanceNote = withAuth(updateGrievanceNoteInternal);
export const deleteGrievanceNote = withAuth(deleteGrievanceNoteInternal);
export const regenerateAISummary = withAuth(regenerateAISummaryInternal);
export const regenerateGrievancePDF = withAuth(regenerateGrievancePDFInternal);

// Step Outcomes
async function fetchGrievanceStepOutcomesInternal(grievanceId: string) {
  return await fetchGrievanceStepOutcomesPrisma(grievanceId);
}

export const fetchGrievanceStepOutcomes = withAuth(fetchGrievanceStepOutcomesInternal);

// Assessment Generation
async function generateGrievanceAssessmentInternal(grievanceId: string) {
  const { generateAIContent } = await import("@/app/actions/llm/analysis");
  const { getEstablishedFacts } = await import("@/app/actions/established-facts");
  const { extractEvidencePdfContent } = await import("@/app/actions/evidence");
  const { getCachedDisciplineContext } = await import("@/app/actions/grievance-discipline-cache");

  const organizationId = await getOrganizationId();

  // Fetch grievance details
  const grievance = await fetchGrievanceByIdPrisma(grievanceId, organizationId);
  if (!grievance) {
    throw new Error("Grievance not found");
  }

  const grievanceDetails = await fetchGrievanceListItemByIdPrisma(grievanceId);
  if (!grievanceDetails) {
    throw new Error("Grievance details not found");
  }

  // Get established facts (stipulated facts)
  const establishedFactsData = await getEstablishedFacts(grievanceId);
  const establishedFacts = establishedFactsData?.facts || null;

  // Process evidence
  const evidence = await fetchEvidenceByGrievanceIdPrisma(grievanceId);
  const processedEvidence: any[] = [];

  for (const ev of evidence) {
    try {
      const content = await extractEvidencePdfContent(ev.id);
      processedEvidence.push({
        name: ev.name,
        summary: ev.summary,
        content: content || null,
        facts: ev.facts,
      });
    } catch (error) {
      console.error(`Failed to extract content for evidence ${ev.id}:`, error);
    }
  }

  // Get discipline guidance if cached
  let disciplineContext = '';
  try {
    const cached = await getCachedDisciplineContext(grievanceId);
    if (cached?.relevantSections) {
      disciplineContext = `
DISCIPLINE GUIDANCE (Brown & Beatty - Canadian Employment Law):
${cached.relevantSections}`;
    }
  } catch (error) {
    console.log('No cached discipline context available');
  }

  // Parse grievance report data
  const report = grievance.report;
  const grievors = Array.isArray(report?.grievors) ? report.grievors as Array<{
    firstName: string;
    lastName: string;
    address?: string;
    city?: string;
    postalCode?: string;
    email?: string;
    memberNumber?: string;
    phoneNumber?: string;
  }> : [];
  const workInformation = (report?.workInformation || {
    employer: '',
    supervisor: '',
    jobTitle: '',
    workLocation: '',
    employmentStatus: '',
  }) as {
    employer: string;
    supervisor: string;
    jobTitle: string;
    workLocation: string;
    employmentStatus: string;
  };

  // Build the assessment prompt
  const assessmentPrompt = `Review this case and consider who has the strongest position. Then, provide a breakdown of the strengths of the case from the Employer and the Union perspective.

${establishedFacts ? `
STIPULATED FACTS (AUTHORITATIVE - These override any conflicting evidence):
${establishedFacts}

CRITICAL INSTRUCTION: The stipulated facts above are DEFINITIVE and AUTHORITATIVE. They have been reviewed and verified. If any other evidence or context contradicts these stipulated facts, the stipulated facts ALWAYS take precedence.
` : ''}

GRIEVANCE CONTEXT:
Statement: ${report?.statement || 'Not provided'}
Articles Violated: ${report?.articlesViolated || 'Not specified'}
Settlement Desired: ${report?.settlementDesired || 'Not specified'}
${disciplineContext}

IMPORTANT:
${establishedFacts
  ? '- STIPULATED FACTS OVERRIDE EVERYTHING: The stipulated facts provided above are the only source of truth. Ignore any conflicting evidence.'
  : '- Use all available evidence to form your assessment.'
}
- When referencing discipline guidance, include citations (e.g., "Page 12", "Section 4.2")
- Connect all reference material directly to this specific grievance situation
- Provide practical, actionable insights based on the available information
- Always write "Employee" instead of "EE" and "Employer" instead of "ER"

FORMATTING REQUIREMENTS:
- Use markdown formatting for structure and readability
- Use ## for main section headings (e.g., "## Union Strengths", "## Employer Strengths", "## Overall Assessment")
- Use **bold text** for emphasis on key points
- Use bullet points (- ) for lists of strengths, weaknesses, or factors
- Keep paragraphs concise and well-spaced
- Start each major section with a heading

STRUCTURE YOUR RESPONSE AS FOLLOWS:
1. Brief overview paragraph
2. ## Union Strengths (with bullet points)
3. ## Employer Strengths (with bullet points)
4. ## Overall Assessment (conclusion paragraph)

Please provide a comprehensive, well-formatted assessment.`;

  // Generate the assessment using AI
  const assessment = await generateAIContent('custom', {
    grievors,
    workInformation,
    statement: report?.statement,
    articlesViolated: report?.articlesViolated ? [report.articlesViolated] : [],
    settlementDesired: report?.settlementDesired,
    evidence: processedEvidence,
    question: assessmentPrompt,
  });

  const assessmentText = typeof assessment === 'string' ? assessment :
                        assessment?.answer ||
                        JSON.stringify(assessment);

  // Save assessment to database
  await updateGrievanceAssessmentPrisma(grievanceId, assessmentText);

  // Also regenerate the AI summary with current evidence
  try {
    await regenerateAISummaryInternal(grievanceId);
  } catch (error) {
    console.error('Failed to regenerate AI summary during assessment:', error);
    // Don't fail the whole operation if summary regeneration fails
  }

  revalidatePath(`/product/grievances/${grievanceId}`);

  return {
    success: true,
    assessment: assessmentText,
  };
}

export const generateGrievanceAssessment = withAuth(generateGrievanceAssessmentInternal);
