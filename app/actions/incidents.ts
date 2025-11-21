"use server";

import {
  fetchIncidentsPrisma,
  fetchIncidentByIdPrisma,
  createIncidentPrisma,
  updateIncidentPrisma,
  deleteIncidentPrisma,
  updateIncidentStatusPrisma,
  updateIncidentAssigneePrisma,
  IncidentListItem,
} from "@/app/actions/prisma/incident-actions";
import { revalidatePath } from "next/cache";
import { withAuth } from "./auth";
import { getOrganizationId } from "./organization";
import { getUserOrgFromSession, withRetry } from "@/app/lib/error-handling";
import { getServerSession } from "@/lib/auth/server-session";

async function fetchAllIncidentsInternal(): Promise<IncidentListItem[]> {
  const organizationId = await getOrganizationId();

  try {
    const incidents = await fetchIncidentsPrisma(organizationId);
    return incidents;
  } catch (error) {
    console.error("Error fetching incidents:", error);
    throw new Error("Failed to fetch incidents");
  }
}

async function fetchIncidentByIdInternal(id: string) {
  const organizationId = await getOrganizationId();

  try {
    const incident = await fetchIncidentByIdPrisma(id, organizationId);

    if (!incident) {
      throw new Error("Incident not found");
    }

    return incident;
  } catch (error) {
    console.error("Error fetching incident:", error);
    throw new Error("Failed to fetch incident");
  }
}

async function createIncidentInternal(data: {
  category?: string;
  description?: string;
  bargainingUnit?: string;
  employees?: any;
  agreementId?: string;
  status?: string;
}) {
  const { userId, organizationId } = await getUserOrgFromSession();

  try {
    const incident = await createIncidentPrisma({
      organizationId,
      category: data.category,
      description: data.description,
      bargainingUnit: data.bargainingUnit,
      employees: data.employees,
      creatorId: userId,
      agreementId: data.agreementId,
      status: data.status,
    });

    revalidatePath("/product/incidents");
    return { success: true, incident };
  } catch (error) {
    console.error("Error creating incident:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create incident";
    return { success: false, error: errorMessage };
  }
}

async function updateIncidentInternal(
  id: string,
  data: {
    category?: string;
    description?: string;
    bargainingUnit?: string;
    employees?: any;
    agreementId?: string;
    status?: string;
  }
) {
  const { userId, organizationId } = await getUserOrgFromSession();

  try {
    const result = await withRetry(async () => {
      return await updateIncidentPrisma(id, organizationId, {
        ...data,
        lastUpdatedById: userId,
      });
    });

    revalidatePath(`/product/incidents/${id}`);
    return { success: true, incident: result };
  } catch (error) {
    console.error("Error updating incident:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update incident";
    return { success: false, error: errorMessage };
  }
}

async function deleteIncidentInternal(id: string) {
  const organizationId = await getOrganizationId();

  try {
    await deleteIncidentPrisma(id, organizationId);
    revalidatePath("/product/incidents");
    return { success: true };
  } catch (error) {
    console.error("Error deleting incident:", error);
    throw new Error("Failed to delete incident");
  }
}

async function resolveIncidentInternal(id: string, resolutionDetails: any) {
  const { userId, organizationId } = await getUserOrgFromSession();

  try {
    const incident = await updateIncidentStatusPrisma(
      id,
      organizationId,
      "RESOLVED",
      userId
    );

    revalidatePath(`/product/incidents/${id}`);
    return { success: true, incident };
  } catch (error) {
    console.error("Error resolving incident:", error);
    throw new Error("Failed to resolve incident");
  }
}

async function updateIncidentStatusInternal(id: string, status: string) {
  const { userId, organizationId } = await getUserOrgFromSession();

  try {
    const result = await withRetry(async () => {
      return await updateIncidentStatusPrisma(
        id,
        organizationId,
        status,
        userId
      );
    });

    revalidatePath(`/product/incidents/${id}`);
    return { success: true, incident: result };
  } catch (error) {
    console.error("Error updating incident status:", error);
    throw new Error("Failed to update incident status");
  }
}

async function updateIncidentAssigneeInternal({
  incidentId,
  assignedToId,
}: {
  incidentId: string;
  assignedToId: string | null;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("No user ID found in session");
  }
  const organizationId = await getOrganizationId();

  // Verify the incident belongs to the organization
  const incident = await fetchIncidentByIdPrisma(incidentId, organizationId);
  if (!incident) {
    throw new Error("Incident not found");
  }

  const updatedIncident = await updateIncidentAssigneePrisma(
    incidentId,
    organizationId,
    assignedToId,
    session.user.id
  );

  revalidatePath(`/product/incidents/${incidentId}`);
  return updatedIncident;
}

// Exported wrapped versions
export const fetchAllIncidents = withAuth(fetchAllIncidentsInternal);
export const fetchIncidentById = withAuth(fetchIncidentByIdInternal);
export const createIncident = withAuth(createIncidentInternal);
export const updateIncident = withAuth(updateIncidentInternal);
export const deleteIncident = withAuth(deleteIncidentInternal);
export const resolveIncident = withAuth(resolveIncidentInternal);
export const updateIncidentStatus = withAuth(updateIncidentStatusInternal);
export const updateIncidentAssignee = withAuth(updateIncidentAssigneeInternal);

// Re-export the interface for external use
export type { IncidentListItem };
