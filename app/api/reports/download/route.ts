import { getServerSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.organization?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, startDate, endDate, grievanceType, status, bargainingUnit } =
      await request.json();

    if (!data?.grievances) {
      return NextResponse.json(
        { error: "No grievances data provided" },
        { status: 400 }
      );
    }

    // Create CSV content
    const headers = [
      "ID",
      "Filed Date",
      "Status",
      "Type",
      "Category",
      "Stage",
      "Grievor Name",
      "Bargaining Unit",
      "Assigned To",
      "Creator",
      "Current Step",
      "Is Overdue",
      "Estimated Cost",
      "Actual Cost",
      "Cost Variance",
      "Resolution Date",
      "Resolution Status",
      "Last Updated",
    ];

    const csvRows = [headers.join(",")];

    // Add data rows
    data.grievances.forEach((grievance: any) => {
      const row = [
        grievance.id,
        new Date(grievance.filedAt).toLocaleDateString(),
        grievance.status,
        grievance.type,
        grievance.category || "",
        grievance.stage || "",
        `"${grievance.grievorName || ""}"`, // Quoted to handle commas in names
        `"${grievance.bargainingUnitName || ""}"`,
        `"${grievance.assignedTo || ""}"`,
        `"${grievance.creator || ""}"`,
        grievance.currentStep || "",
        grievance.isOverdue ? "Yes" : "No",
        grievance.estimatedCost || "",
        grievance.actualCost || "",
        grievance.costVariance || "0",
        grievance.resolutionDate
          ? new Date(grievance.resolutionDate).toLocaleDateString()
          : "",
        grievance.resolutionStatus || "",
        new Date(grievance.lastUpdated).toLocaleDateString(),
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");

    // Return CSV as blob
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="grievances-export.csv"',
      },
    });
  } catch (error) {
    console.error("Error generating CSV:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
