"use server";

import { requireAuth } from "@/app/actions/auth";
import { GrievanceFormData } from "@/app/lib/definitions";
import { prisma } from "@/app/lib/db";
import { storageService } from "@/app/server/services/storage-service";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateGrievancePDF(
  formData: GrievanceFormData
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    await requireAuth();

    // Get agreement details for PDF header
    const agreement = formData.agreementId
      ? await prisma.agreement.findUnique({
          where: { id: formData.agreementId },
          select: { name: true },
        })
      : null;

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();

    let yPosition = height - 60; // Start from top with margin
    const leftMargin = 60;
    const rightMargin = width - 60;
    const lineHeight = 20;
    const sectionSpacing = 30;

    // Helper function to add text with word wrapping
    const addText = (
      text: string,
      x: number,
      y: number,
      font = helveticaFont,
      fontSize = 12,
      maxWidth = rightMargin - leftMargin
    ) => {
      const words = text.split(" ");
      let line = "";
      let currentY = y;

      for (const word of words) {
        const testLine = line + (line ? " " : "") + word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (textWidth > maxWidth && line) {
          page.drawText(line, {
            x,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          line = word;
          currentY -= lineHeight;
        } else {
          line = testLine;
        }
      }

      if (line) {
        page.drawText(line, {
          x,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        currentY -= lineHeight;
      }

      return currentY;
    };

    // Header
    const title =
      formData.currentStage === "FORMAL"
        ? "FORMAL GRIEVANCE"
        : "INFORMAL COMPLAINT";
    const titleWidth = helveticaBoldFont.widthOfTextAtSize(title, 18);
    page.drawText(title, {
      x: (width - titleWidth) / 2,
      y: yPosition,
      size: 18,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Agreement name
    const agreementName = agreement?.name || "Collective Agreement";
    const agreementWidth = helveticaFont.widthOfTextAtSize(agreementName, 12);
    page.drawText(agreementName, {
      x: (width - agreementWidth) / 2,
      y: yPosition,
      size: 12,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    yPosition -= sectionSpacing + 10;

    // Horizontal line
    page.drawLine({
      start: { x: leftMargin, y: yPosition },
      end: { x: rightMargin, y: yPosition },
      thickness: 2,
      color: rgb(0, 0, 0),
    });
    yPosition -= sectionSpacing;

    // Grievor(s) section
    page.drawText("GRIEVOR(S):", {
      x: leftMargin,
      y: yPosition,
      size: 14,
      font: helveticaBoldFont,
    });
    yPosition -= lineHeight + 5;

    if (formData.grievors && formData.grievors.length > 0) {
      for (const grievor of formData.grievors) {
        yPosition = addText(
          `${grievor.firstName} ${grievor.lastName}`,
          leftMargin + 20,
          yPosition
        );
      }
    } else {
      yPosition = addText("No grievors specified", leftMargin + 20, yPosition);
    }
    yPosition -= sectionSpacing;

    // Employment Information section
    page.drawText("EMPLOYMENT INFORMATION:", {
      x: leftMargin,
      y: yPosition,
      size: 14,
      font: helveticaBoldFont,
    });
    yPosition -= lineHeight + 5;

    const workInfo = formData.workInformation || {};
    yPosition = addText(
      `Employer: ${(workInfo as any).employer || "Not specified"}`,
      leftMargin + 20,
      yPosition
    );
    yPosition = addText(
      `Job Title: ${(workInfo as any).jobTitle || "Not specified"}`,
      leftMargin + 20,
      yPosition
    );
    yPosition = addText(
      `Work Location: ${(workInfo as any).workLocation || "Not specified"}`,
      leftMargin + 20,
      yPosition
    );
    yPosition = addText(
      `Supervisor: ${(workInfo as any).supervisor || "Not specified"}`,
      leftMargin + 20,
      yPosition
    );
    yPosition -= sectionSpacing;

    // Grievance Statement section
    page.drawText("GRIEVANCE STATEMENT:", {
      x: leftMargin,
      y: yPosition,
      size: 14,
      font: helveticaBoldFont,
    });
    yPosition -= lineHeight + 5;
    yPosition = addText(
      formData.statement || "No statement provided",
      leftMargin + 20,
      yPosition
    );
    yPosition -= sectionSpacing;

    // Articles Violated section (if present)
    if (formData.articlesViolated) {
      page.drawText("ARTICLES VIOLATED:", {
        x: leftMargin,
        y: yPosition,
        size: 14,
        font: helveticaBoldFont,
      });
      yPosition -= lineHeight + 5;
      yPosition = addText(
        formData.articlesViolated,
        leftMargin + 20,
        yPosition
      );
      yPosition -= sectionSpacing;
    }

    // Settlement Desired section
    page.drawText("SETTLEMENT DESIRED:", {
      x: leftMargin,
      y: yPosition,
      size: 14,
      font: helveticaBoldFont,
    });
    yPosition -= lineHeight + 5;
    yPosition = addText(
      formData.settlementDesired || "No settlement specified",
      leftMargin + 20,
      yPosition
    );
    yPosition -= sectionSpacing;

    // Footer
    yPosition = Math.max(yPosition, 80); // Ensure footer stays at bottom
    page.drawLine({
      start: { x: leftMargin, y: yPosition },
      end: { x: rightMargin, y: yPosition },
      thickness: 1,
      color: rgb(0.6, 0.6, 0.6),
    });
    yPosition -= 20;

    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Type: ${formData.type || "INDIVIDUAL"}`, {
      x: leftMargin,
      y: yPosition - 15,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText("Generated by: B&B Grievance Management System", {
      x: leftMargin,
      y: yPosition - 30,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();

    // Create filename and save directly to storage
    const fileName = `grievance-${formData.currentStage?.toLowerCase()}-${Date.now()}.pdf`;
    const pdfBuffer = Buffer.from(pdfBytes);

    // Save to storage using StorageService
    await storageService.saveFile(
      "grievance",
      fileName,
      pdfBuffer,
      "application/pdf"
    );

    return {
      success: true,
      fileId: fileName, // This is the filename that will be used as fileSource
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}
