"use server";

import { prisma } from "@/app/lib/db";
import { getServerSession } from "@/lib/auth/server-session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  title: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const organizationSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  organizationType: z.enum(["HR", "Union", "LAW_FIRM"], {
    required_error: "Please select an organization type",
  }),
});

export async function updateUserProfile(formData: FormData) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      title: formData.get("title") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      timezone: formData.get("timezone") as string || undefined,
    };

    const validated = profileSchema.parse(data);
    const fullName = `${validated.firstName} ${validated.lastName}`.trim();

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: fullName,
        title: validated.title || null,
        phone: validated.phone || null,
        timezone: validated.timezone || null,
      },
    });

    revalidatePath("/product/settings/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Failed to update profile" };
  }
}

export async function changePassword(formData: FormData) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || !session?.user?.email) {
      return { success: false, error: "Not authenticated" };
    }

    const data = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const validated = passwordSchema.parse(data);

    // Get the user's account with password
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "credential"
      },
      select: {
        id: true,
        password: true,
      }
    });

    if (!account?.password) {
      return { success: false, error: "Password authentication not enabled for this account" };
    }

    // Verify the current password using better-auth
    const { headers } = await import("next/headers");
    const headersList = await headers();

    const result = await auth.api.changePassword({
      body: {
        currentPassword: validated.currentPassword,
        newPassword: validated.newPassword,
        revokeOtherSessions: false,
      },
      headers: headersList
    });

    if (!result) {
      return { success: false, error: "Current password is incorrect" };
    }

    revalidatePath("/product/settings/profile");
    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Failed to change password. Please check your current password." };
  }
}

export async function updateOrganization(formData: FormData) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if user is admin
    const userRole = session.user.organization?.members?.find(
      (member) => member.userId === session.user.id
    )?.role;
    const isAdmin = userRole === "Admin" || session.user.isSuperAdmin;

    if (!isAdmin) {
      return { success: false, error: "Only administrators can update organization information" };
    }

    const organizationId = session.user.organization?.id;
    if (!organizationId) {
      return { success: false, error: "No organization found" };
    }

    const data = {
      organizationName: formData.get("organizationName") as string,
      organizationType: formData.get("organizationType") as string,
    };

    const validated = organizationSchema.parse(data);

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: validated.organizationName,
        organizationType: validated.organizationType as any,
      },
    });

    revalidatePath("/product/settings/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating organization:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Failed to update organization" };
  }
}

export async function updateOrganizationLogo(logoFilename: string) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if user is admin
    const userRole = session.user.organization?.members?.find(
      (member) => member.userId === session.user.id
    )?.role;
    const isAdmin = userRole === "Admin" || session.user.isSuperAdmin;

    if (!isAdmin) {
      return { success: false, error: "Only administrators can update organization logo" };
    }

    const organizationId = session.user.organization?.id;
    if (!organizationId) {
      return { success: false, error: "No organization found" };
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoFilename: logoFilename,
      },
    });

    revalidatePath("/product/settings/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating organization logo:", error);
    return { success: false, error: "Failed to update organization logo" };
  }
}

export async function getUserAuthProvider() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return null;
    }

    // Check if user has a password-based account or OAuth account
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id },
      select: { providerId: true },
    });

    return account?.providerId || null;
  } catch (error) {
    console.error("Error fetching user auth provider:", error);
    return null;
  }
}
