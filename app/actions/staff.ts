"use server";

import { revalidatePath } from "next/cache";
import { MemberRole } from "@prisma/client";
import { getOrganizationId } from "./organization";
import { withAuth } from "./auth";
import {
  updateStaffMemberSchema,
  removeStaffMemberSchema,
  idSchema,
  validateJSON,
  sanitizeString,
} from "@/app/lib/validations";
import { z } from "zod";
import { sendStaffInvitationEmail } from "@/lib/auth/emails";
import { getServerSession } from "@/lib/auth/server-session";
import {
  fetchOrganizationStaffPrisma,
  updateStaffMemberPrisma,
  removeStaffMemberPrisma,
  inviteStaffMemberPrisma,
  getUserByEmailPrisma,
} from "@/app/actions/prisma/user-management-actions";
import { fetchBargainingUnitsPrisma } from "@/app/actions/prisma/bargaining-unit-actions";

export type StaffMemberWithBargainingUnits = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  role: MemberRole;
  lastLogin?: string;
  // Invitation status fields
  emailVerified: boolean;
  invitedAt: Date | null;
  invitationAcceptedAt: Date | null;
  bargainingUnits: Array<{
    id: string;
    name: string;
    role: MemberRole;
  }>;
};

export type AvailableUser = {
  id: string;
  name: string | null;
  email: string | null;
};

// Schema for invitation validation
const inviteStaffMemberSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  title: z.string().optional(),
  role: z.nativeEnum(MemberRole),
  bargainingUnitIds: z.array(z.string()).optional(),
});

// Internal implementations
async function fetchOrganizationStaffInternal(): Promise<
  StaffMemberWithBargainingUnits[]
> {
  try {
    const organizationId = await getOrganizationId();
    const organizationMembers = await fetchOrganizationStaffPrisma(organizationId);

    return organizationMembers.map((member): StaffMemberWithBargainingUnits => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      phone: (member.user as any).phone,
      title: (member.user as any).title,
      role: member.role,
      lastLogin: undefined, // We don't track this yet
      // Invitation status fields
      emailVerified: member.user.emailVerified,
      invitedAt: member.user.invitedAt,
      invitationAcceptedAt: member.user.invitationAcceptedAt,
      bargainingUnits: member.user.bargainingUnits.map((bu) => ({
        id: bu.bargainingUnitId,
        name: bu.bargainingUnit.name,
        role: bu.role,
      })),
    }));
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch organization staff.");
  }
}

async function updateStaffMemberInternal(
  memberId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    title?: string;
    role?: MemberRole;
    bargainingUnitIds?: string[];
  }
): Promise<void> {
  try {
    // Validate input data
    const validatedData = validateJSON(updateStaffMemberSchema, {
      memberId,
      ...data,
    });

    // Sanitize string inputs
    const sanitizedName = validatedData.name
      ? sanitizeString(validatedData.name)
      : undefined;
    const sanitizedEmail = validatedData.email
      ? sanitizeString(validatedData.email)
      : undefined;
    const sanitizedPhone = validatedData.phone
      ? sanitizeString(validatedData.phone)
      : undefined;
    const sanitizedTitle = validatedData.title
      ? sanitizeString(validatedData.title)
      : undefined;

    const organizationId = await getOrganizationId();

    // Validate all bargaining unit IDs if provided
    if (validatedData.bargainingUnitIds !== undefined) {
      validatedData.bargainingUnitIds.forEach((id) => idSchema.parse(id));
    }

    // Use service layer to update staff member
    await updateStaffMemberPrisma(validatedData.memberId, organizationId, {
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      title: sanitizedTitle,
      role: validatedData.role,
      bargainingUnitIds: validatedData.bargainingUnitIds,
    });

    revalidatePath("/product/settings/staff", "page");
  } catch (error) {
    console.error("Database Error:", error);
    if (error instanceof Error && error.message.includes("Validation failed")) {
      throw error; // Re-throw validation errors with original message
    }
    throw new Error(
      error instanceof Error ? error.message : "Failed to update staff member."
    );
  }
}

async function removeStaffMemberInternal(memberId: string): Promise<void> {
  try {
    // Validate input data
    const validatedData = validateJSON(removeStaffMemberSchema, { memberId });
    const organizationId = await getOrganizationId();

    // Use service layer to remove staff member
    await removeStaffMemberPrisma(validatedData.memberId, organizationId);
    revalidatePath("/product/settings/staff", "page");
  } catch (error) {
    console.error("Database Error:", error);
    if (error instanceof Error && error.message.includes("Validation failed")) {
      throw error; // Re-throw validation errors with original message
    }
    throw new Error(
      error instanceof Error ? error.message : "Failed to remove staff member."
    );
  }
}

async function fetchAvailableBargainingUnitsInternal(): Promise<
  Array<{ id: string; name: string }>
> {
  try {
    const organizationId = await getOrganizationId();
    const bargainingUnits = await fetchBargainingUnitsPrisma(organizationId);

    return bargainingUnits.map((bu) => ({
      id: bu.id,
      name: bu.name,
    }));
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch bargaining units.");
  }
}

async function inviteStaffMemberInternal(data: {
  email: string;
  name: string;
  phone?: string;
  title?: string;
  role: MemberRole;
  bargainingUnitIds?: string[];
}): Promise<{ success: boolean; message: string }> {
  try {
    // Get session early as we need it for multiple things
    const session = await getServerSession();
    
    // Validate input data
    const validatedData = inviteStaffMemberSchema.parse(data);

    // Sanitize string inputs
    const sanitizedName = sanitizeString(validatedData.name);
    const sanitizedEmail = sanitizeString(validatedData.email.toLowerCase());
    const sanitizedPhone = validatedData.phone ? sanitizeString(validatedData.phone) : undefined;
    const sanitizedTitle = validatedData.title ? sanitizeString(validatedData.title) : undefined;

    const organizationId = await getOrganizationId();

    // Get the inviter's information
    const inviterUserId = session?.user?.id;
    
    // Use service layer to invite staff member
    const result = await inviteStaffMemberPrisma(organizationId, {
      email: sanitizedEmail,
      name: sanitizedName,
      phone: sanitizedPhone,
      title: sanitizedTitle,
      role: validatedData.role,
      bargainingUnitIds: validatedData.bargainingUnitIds,
      invitedBy: inviterUserId,
    });

    if (!result.success) {
      return result;
    }

    // Verify the database update actually worked before sending email
    const verification = await getUserByEmailPrisma(sanitizedEmail);
    
    if (!verification?.pendingOrganizationId || !verification?.invitedAt) {
      console.error('Database verification failed - invitation data not properly saved');
      return {
        success: false,
        message: "Failed to save invitation data. Please try again.",
      };
    }

    const isNewUser = result.isNewUser;
    // Send invitation email
    try {
      const inviterName = session?.user?.name || "Administrator";
      const organizationName =
        session?.user?.organization?.name || "your organization";

      // Use verified data for token generation
      const invitedAt = verification.invitedAt;

      const emailResult = await sendStaffInvitationEmail(
        sanitizedName,
        sanitizedEmail,
        organizationName,
        inviterName,
        validatedData.role,
        isNewUser,
        invitedAt
      );

      if (!emailResult.success) {
        console.warn("Failed to send invitation email:", emailResult.error);
        // Don't fail the entire invitation if email fails
      }
    } catch (emailError) {
      console.warn("Error sending invitation email:", emailError);
      // Don't fail the entire invitation if email fails
    }

    revalidatePath("/product/settings/staff", "page");

    return {
      success: true,
      message: `Invitation sent to ${sanitizedName}. They will be added to your organization when they accept the invitation.`,
    };
  } catch (error) {
    console.error("Database Error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation failed: ${error.errors.map((e) => e.message).join(", ")}`,
      };
    }
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to invite staff member.",
    };
  }
}

// Exported wrapped versions
export const fetchOrganizationStaff = withAuth(fetchOrganizationStaffInternal);
export const updateStaffMember = withAuth(updateStaffMemberInternal);
export const removeStaffMember = withAuth(removeStaffMemberInternal);
export const fetchAvailableBargainingUnits = withAuth(
  fetchAvailableBargainingUnitsInternal
);
export const inviteStaffMember = withAuth(inviteStaffMemberInternal);
