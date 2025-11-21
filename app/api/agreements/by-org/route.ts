import { NextRequest, NextResponse } from "next/server";
import { fetchAgreementsPrisma } from "@/app/actions/prisma/agreement-actions";

export async function POST(req: NextRequest) {
  const { organizationId } = await req.json();
  if (!organizationId) {
    return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
  }
  try {
    const agreements = await fetchAgreementsPrisma(organizationId);
    return NextResponse.json({ agreements });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch agreements" }, { status: 500 });
  }
} 