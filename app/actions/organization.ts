"use server";

import { revalidatePath } from "next/cache";
import {
  fetchOrganizationUsersPrisma,
  findUserByEmailPrisma,
  findOrganizationMemberPrisma,
  createOrganizationMemberPrisma,
  deleteOrganizationMemberPrisma,
  fetchUsersNotInAnyOrganizationPrisma,
  createOrganizationPrisma,
  fetchUserOrganizationsPrisma,
  findOrganizationMembershipPrisma,
  updateUserOrganizationPrisma,
} from "@/app/actions/prisma/organization-actions";
import { OrganizationType } from "@prisma/client";
import { withAuth, withSuperAdmin, withOrgAdmin } from "./auth";
import { getServerSession } from "@/lib/auth/server-session";

// Internal implementations
async function getOrganizationIdInternal() {
  const session = await getServerSession();
  const organizationId = session?.user?.organization?.id;

  if (!organizationId) {
    throw new Error("No organization ID found in session");
  }

  return organizationId;
}

async function getOrganizationTypeInternal(): Promise<
  "HR" | "Union" | "Local" | "LAW_FIRM" | null
> {
  const session = await getServerSession();
  return session?.user?.organization?.organizationType ?? null;
}

async function isCurrentOrganizationTypeInternal(
  targetType: "HR" | "Union" | "Local" | "LAW_FIRM"
): Promise<boolean> {
  const organizationType = await getOrganizationType();
  return organizationType === targetType;
}

async function fetchOrganizationUsersInternal() {
  const organizationId = await getOrganizationId();
  return fetchOrganizationUsersPrisma(organizationId);
}

async function addUserToOrganizationInternal(
  email: string,
  role: "Admin" | "Member" = "Member"
) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // Check if user exists
  const user = await findUserByEmailPrisma(email);

  // Check if user is already a member
  const existingMember = await findOrganizationMemberPrisma(
    organizationId,
    user.id
  );

  if (existingMember) {
    throw new Error("User is already a member of this organization");
  }

  // Add user to organization
  await createOrganizationMemberPrisma(organizationId, user.id, role);

  revalidatePath("/product/admin/organizations");
}

async function removeUserFromOrganizationInternal(userId: string) {
  const organizationId = await getOrganizationId();
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // Check if user is trying to remove themselves
  if (session.user.id === userId) {
    throw new Error("Cannot remove yourself from the organization");
  }

  // Remove user from organization
  await deleteOrganizationMemberPrisma(organizationId, userId);

  revalidatePath("/product/admin/organizations");
}

async function fetchUsersNotInAnyOrganizationInternal() {
  return fetchUsersNotInAnyOrganizationPrisma();
}

async function createOrganizationInternal(formData: FormData) {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const name = formData.get("name") as string;
  const organizationType = formData.get("organizationType") as OrganizationType;

  if (!name || !organizationType) {
    throw new Error("Name and organization type are required");
  }

  try {
    // Create the organization using the Prisma function
    const organization = await createOrganizationPrisma(
      name,
      organizationType,
      session.user.id
    );

    revalidatePath("/product/admin/organizations");
    return { success: true, organization };
  } catch (error) {
    console.error("Error creating organization:", error);
    throw new Error("Failed to create organization");
  }
}

async function fetchUserOrganizationsInternal() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  try {
    const currentOrgId = session.user.organization?.id;
    return await fetchUserOrganizationsPrisma(session.user.id, currentOrgId);
  } catch (error) {
    console.error("Error fetching user organizations:", error);
    throw new Error("Failed to fetch organizations");
  }
}

async function switchOrganizationInternal(organizationId: string) {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  try {
    // Verify the user is a member of this organization
    const membership = await findOrganizationMembershipPrisma(
      session.user.id,
      organizationId
    );

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Update the user's current organization
    await updateUserOrganizationPrisma(session.user.id, organizationId);

    revalidatePath("/product/admin/organizations");
    return { success: true };
  } catch (error) {
    console.error("Error switching organization:", error);
    throw new Error("Failed to switch organization");
  }
}

// Exported wrapped versions
export const getOrganizationId = withAuth(getOrganizationIdInternal);
export const getOrganizationType = withAuth(getOrganizationTypeInternal);
export const isCurrentOrganizationType = withAuth(
  isCurrentOrganizationTypeInternal
);
export const fetchOrganizationUsers = withAuth(
  fetchOrganizationUsersInternal
);
export const addUserToOrganization = withOrgAdmin(
  addUserToOrganizationInternal
);
export const removeUserFromOrganization = withOrgAdmin(
  removeUserFromOrganizationInternal
);
export const fetchUsersNotInAnyOrganization = withSuperAdmin(
  fetchUsersNotInAnyOrganizationInternal
);
export const createOrganization = withSuperAdmin(createOrganizationInternal);
export const fetchUserOrganizations = withAuth(fetchUserOrganizationsInternal);
export const switchOrganization = withAuth(switchOrganizationInternal);
