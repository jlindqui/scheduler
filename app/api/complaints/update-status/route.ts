import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-session";
import { getOrganizationId } from "@/app/actions/organization";
import { prisma } from "@/app/lib/db";


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    const organizationId = await getOrganizationId();

    if (!session?.user?.id || !organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const complaintId = formData.get("complaintId") as string;
    const status = formData.get("status") as string;
    const resolution = formData.get("resolution") as string;

    if (!complaintId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["OPEN", "CLOSED", "GRIEVED", "DELETED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      status: status,
      lastUpdatedById: session.user.id,
    };

    // Add resolution if provided
    if (resolution !== null && resolution !== undefined) {
      updateData.resolution = resolution;
    }

    // Update the complaint status in the database
    try {
      const updatedComplaint = await prisma.complaint.update({
        where: {
          id: complaintId,
          organizationId: organizationId,
        },
        data: updateData,
      });

      return NextResponse.json({ success: true, complaint: updatedComplaint });
    } catch (dbError) {
      console.error("Database error updating complaint status:", dbError);
      return NextResponse.json(
        { error: "Database error updating complaint status" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating complaint status:", error);
    return NextResponse.json(
      { error: "Failed to update complaint status" },
      { status: 500 }
    );
  }
}
