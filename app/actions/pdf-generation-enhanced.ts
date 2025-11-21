"use server";

import { requireAuth } from "@/app/actions/auth";
import { GrievanceFormData } from "@/app/lib/definitions";
import { prisma } from "@/app/lib/db";
import { storageService } from "@/app/server/services/storage-service";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

// Color palette for professional look
const colors = {
  primary: rgb(0.039, 0.153, 0.396), // Deep blue (#0A2764)
  secondary: rgb(0.2, 0.3, 0.5), // Muted blue
  accent: rgb(0.95, 0.95, 0.95), // Light gray for backgrounds
  text: rgb(0.1, 0.1, 0.1), // Almost black
  textLight: rgb(0.4, 0.4, 0.4), // Gray text
  border: rgb(0.8, 0.8, 0.8), // Light gray border
  signature: rgb(0.6, 0.6, 0.6), // Signature line color
};

interface DrawTextOptions {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  font: PDFFont;
  fontSize?: number;
  color?: ReturnType<typeof rgb>;
  maxWidth?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
}

// Enhanced text drawing with better word wrapping and alignment
function drawText(options: DrawTextOptions): number {
  const {
    page,
    text,
    x,
    y,
    font,
    fontSize = 12,
    color = colors.text,
    maxWidth = 500,
    lineHeight = fontSize * 1.5,
    align = "left",
  } = options;

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  // Word wrapping
  for (const word of words) {
    const testLine = currentLine + (currentLine ? " " : "") + word;
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Draw each line
  let currentY = y;
  for (const line of lines) {
    let drawX = x;

    if (align === "center") {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);
      drawX = x + (maxWidth - lineWidth) / 2;
    } else if (align === "right") {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);
      drawX = x + maxWidth - lineWidth;
    }

    page.drawText(line, {
      x: drawX,
      y: currentY,
      size: fontSize,
      font,
      color,
    });
    currentY -= lineHeight;
  }

  return currentY;
}

// Draw a section with proper formatting
function drawSection(
  page: PDFPage,
  title: string,
  content: string | string[],
  x: number,
  y: number,
  width: number,
  helveticaBold: PDFFont,
  helvetica: PDFFont
): number {
  let yPosition = y;

  // Section background
  page.drawRectangle({
    x: x - 10,
    y: yPosition - 25,
    width: width + 20,
    height: 30,
    color: colors.accent,
  });

  // Section title
  drawText({
    page,
    text: title,
    x,
    y: yPosition,
    font: helveticaBold,
    fontSize: 13,
    color: colors.primary,
    maxWidth: width,
  });

  yPosition -= 30;

  // Section content
  if (Array.isArray(content)) {
    for (const item of content) {
      yPosition = drawText({
        page,
        text: `• ${item}`,
        x: x + 15,
        y: yPosition,
        font: helvetica,
        fontSize: 11,
        color: colors.text,
        maxWidth: width - 15,
        lineHeight: 18,
      });
      yPosition -= 5;
    }
  } else {
    yPosition = drawText({
      page,
      text: content,
      x: x + 15,
      y: yPosition,
      font: helvetica,
      fontSize: 11,
      color: colors.text,
      maxWidth: width - 15,
      lineHeight: 18,
    });
  }

  return yPosition - 20;
}

// Draw signature fields
function drawSignatureFields(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  helvetica: PDFFont,
  helveticaBold: PDFFont
): number {
  let yPosition = y;

  // Title for signature section
  drawText({
    page,
    text: "SIGNATURES",
    x,
    y: yPosition,
    font: helveticaBold,
    fontSize: 13,
    color: colors.primary,
  });

  yPosition -= 40;

  // Create two columns for signatures
  const columnWidth = (width - 40) / 2;

  // Grievor signature
  page.drawLine({
    start: { x, y: yPosition },
    end: { x: x + columnWidth, y: yPosition },
    thickness: 1,
    color: colors.signature,
  });

  drawText({
    page,
    text: "Grievor Signature",
    x,
    y: yPosition - 15,
    font: helvetica,
    fontSize: 10,
    color: colors.textLight,
  });

  drawText({
    page,
    text: "Date: _____________________",
    x,
    y: yPosition - 30,
    font: helvetica,
    fontSize: 10,
    color: colors.textLight,
  });

  // Union Representative signature
  const unionX = x + columnWidth + 40;
  page.drawLine({
    start: { x: unionX, y: yPosition },
    end: { x: unionX + columnWidth, y: yPosition },
    thickness: 1,
    color: colors.signature,
  });

  drawText({
    page,
    text: "Union Representative",
    x: unionX,
    y: yPosition - 15,
    font: helvetica,
    fontSize: 10,
    color: colors.textLight,
  });

  drawText({
    page,
    text: "Date: _____________________",
    x: unionX,
    y: yPosition - 30,
    font: helvetica,
    fontSize: 10,
    color: colors.textLight,
  });

  yPosition -= 60;

  // Print name fields
  drawText({
    page,
    text: "Print Name: _____________________",
    x,
    y: yPosition,
    font: helvetica,
    fontSize: 10,
    color: colors.textLight,
  });

  drawText({
    page,
    text: "Print Name: _____________________",
    x: unionX,
    y: yPosition,
    font: helvetica,
    fontSize: 10,
    color: colors.textLight,
  });

  return yPosition - 30;
}

// Draw footer with page number and metadata
function drawFooter(
  page: PDFPage,
  pageNumber: number,
  totalPages: number,
  width: number,
  helvetica: PDFFont
): void {
  const footerY = 40;

  // Footer line
  page.drawLine({
    start: { x: 60, y: footerY + 20 },
    end: { x: width - 60, y: footerY + 20 },
    thickness: 1,
    color: colors.border,
  });

  // Document info
  drawText({
    page,
    text: `Generated on ${new Date().toLocaleDateString("en-CA")} at ${new Date().toLocaleTimeString("en-CA")}`,
    x: 60,
    y: footerY,
    font: helvetica,
    fontSize: 9,
    color: colors.textLight,
  });

  // Page number
  drawText({
    page,
    text: `Page ${pageNumber} of ${totalPages}`,
    x: width - 120,
    y: footerY,
    font: helvetica,
    fontSize: 9,
    color: colors.textLight,
  });
}

export async function generateEnhancedGrievancePDF(
  formData: GrievanceFormData
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    await requireAuth();

    // Get agreement and bargaining unit details
    const [agreement, bargainingUnit] = await Promise.all([
      formData.agreementId
        ? prisma.agreement.findUnique({
            where: { id: formData.agreementId },
            select: { name: true },
          })
        : null,
      formData.bargainingUnitId
        ? prisma.bargainingUnit.findUnique({
            where: { id: formData.bargainingUnitId },
            select: { name: true },
          })
        : null,
    ]);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Page 1
    const page1 = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page1.getSize();
    const leftMargin = 60;
    const rightMargin = width - 60;
    const contentWidth = rightMargin - leftMargin;

    // Start from top with margin
    let yPosition = height - 60;

    // Document title
    const docType =
      formData.currentStage === "FORMAL"
        ? "FORMAL GRIEVANCE"
        : "INFORMAL COMPLAINT";
    yPosition -= 20;

    drawText({
      page: page1,
      text: docType,
      x: leftMargin,
      y: yPosition,
      font: helveticaBold,
      fontSize: 20,
      color: colors.primary,
      maxWidth: contentWidth,
      align: "center",
    });

    yPosition -= 25;

    // Grievance type
    drawText({
      page: page1,
      text: `Type: ${formData.type || "INDIVIDUAL"}`,
      x: leftMargin,
      y: yPosition,
      font: helveticaBold,
      fontSize: 12,
      color: colors.text,
      maxWidth: contentWidth,
      align: "center",
    });
    yPosition -= 20;

    drawText({
      page: page1,
      text: `Filed on: ${new Date(
        formData.filedAt || new Date()
      ).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      x: leftMargin,
      y: yPosition,
      font: helvetica,
      fontSize: 11,
      color: colors.textLight,
      maxWidth: contentWidth,
      align: "center",
    });

    yPosition -= 35;

    // Agreement and Bargaining Unit info
    if (agreement || bargainingUnit) {
      const agreementText = agreement ? `Agreement: ${agreement.name}` : "";
      const unitText = bargainingUnit
        ? `Bargaining Unit: ${bargainingUnit.name}`
        : "";
      const infoText = [agreementText, unitText].filter(Boolean).join(" | ");

      drawText({
        page: page1,
        text: infoText,
        x: leftMargin,
        y: yPosition,
        font: helvetica,
        fontSize: 11,
        color: colors.secondary,
        maxWidth: contentWidth,
        align: "center",
      });
      yPosition -= 30;
    }

    // Grievor Information
    const grievorNames = formData.grievors?.map(
      (g) => `${g.firstName} ${g.lastName}`
    ) || ["Not specified"];
    yPosition = drawSection(
      page1,
      "GRIEVOR(S)",
      grievorNames,
      leftMargin,
      yPosition,
      contentWidth,
      helveticaBold,
      helvetica
    );

    // Employment Information
    const workInfo = formData.workInformation || {};
    const employmentDetails = [
      `Employer: ${(workInfo as any).employer || "Not specified"}`,
      `Job Title: ${(workInfo as any).jobTitle || "Not specified"}`,
      `Work Location: ${(workInfo as any).workLocation || "Not specified"}`,
      `Supervisor: ${(workInfo as any).supervisor || "Not specified"}`,
      `Employment Status: ${(workInfo as any).employmentStatus || "Not specified"}`,
    ];

    yPosition = drawSection(
      page1,
      "EMPLOYMENT INFORMATION",
      employmentDetails,
      leftMargin,
      yPosition,
      contentWidth,
      helveticaBold,
      helvetica
    );

    // Check if we need a second page
    if (yPosition < 300) {
      // Add footer to first page
      drawFooter(page1, 1, 2, width, helvetica);

      // Create second page
      const page2 = pdfDoc.addPage([612, 792]);
      yPosition = height - 60;

      // Statement of Grievance
      yPosition = drawSection(
        page2,
        "STATEMENT OF GRIEVANCE",
        formData.statement || "No statement provided",
        leftMargin,
        yPosition,
        contentWidth,
        helveticaBold,
        helvetica
      );

      // Articles Violated
      if (formData.articlesViolated) {
        yPosition = drawSection(
          page2,
          "ARTICLES VIOLATED",
          formData.articlesViolated,
          leftMargin,
          yPosition,
          contentWidth,
          helveticaBold,
          helvetica
        );
      }

      // Settlement Desired
      yPosition = drawSection(
        page2,
        "SETTLEMENT DESIRED",
        formData.settlementDesired || "Not specified",
        leftMargin,
        yPosition,
        contentWidth,
        helveticaBold,
        helvetica
      );

      // Signature fields on second page
      yPosition = drawSignatureFields(
        page2,
        leftMargin,
        Math.max(yPosition, 200),
        contentWidth,
        helvetica,
        helveticaBold
      );

      // Footer for second page
      drawFooter(page2, 2, 2, width, helvetica);
    } else {
      // Everything fits on one page
      yPosition = drawSection(
        page1,
        "STATEMENT OF GRIEVANCE",
        formData.statement || "No statement provided",
        leftMargin,
        yPosition,
        contentWidth,
        helveticaBold,
        helvetica
      );

      if (formData.articlesViolated) {
        yPosition = drawSection(
          page1,
          "ARTICLES VIOLATED",
          formData.articlesViolated,
          leftMargin,
          yPosition,
          contentWidth,
          helveticaBold,
          helvetica
        );
      }

      yPosition = drawSection(
        page1,
        "SETTLEMENT DESIRED",
        formData.settlementDesired || "Not specified",
        leftMargin,
        yPosition,
        contentWidth,
        helveticaBold,
        helvetica
      );

      // Signature fields
      yPosition = drawSignatureFields(
        page1,
        leftMargin,
        Math.max(yPosition, 200),
        contentWidth,
        helvetica,
        helveticaBold
      );

      // Footer
      drawFooter(page1, 1, 1, width, helvetica);
    }

    // Save and upload PDF
    const pdfBytes = await pdfDoc.save();
    const fileName = `grievance-${formData.currentStage?.toLowerCase()}-${Date.now()}.pdf`;

    // Save the PDF to storage
    await storageService.saveFile(
      "grievance",
      fileName,
      Buffer.from(pdfBytes),
      "application/pdf"
    );

    return {
      success: true,
      fileId: fileName,
    };
  } catch (error) {
    console.error("Error generating enhanced PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}
