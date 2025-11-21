"use server";

import { requireAuth } from "@/app/actions/auth";
import { GrievanceFormData } from "@/app/lib/definitions";
import { prisma } from "@/app/lib/db";
import { storageService } from "@/app/server/services/storage-service";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import { STORAGE_BUCKETS } from "@/app/server/services/storage-config";

// Color palette - minimal colors for print
const colors = {
  black: rgb(0, 0, 0),
  darkGray: rgb(0.2, 0.2, 0.2),
  gray: rgb(0.5, 0.5, 0.5),
  lightGray: rgb(0.7, 0.7, 0.7),
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

// Text drawing with word wrapping
function drawText(options: DrawTextOptions): number {
  const {
    page,
    text,
    x,
    y,
    font,
    fontSize = 11,
    color = colors.black,
    maxWidth = 500,
    lineHeight = fontSize * 1.4,
    align = "left",
  } = options;

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

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

// Clean section with just text and subtle borders
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

  // Section title with underline
  drawText({
    page,
    text: title,
    x,
    y: yPosition,
    font: helveticaBold,
    fontSize: 12,
    color: colors.black,
    maxWidth: width,
  });

  yPosition -= 15;

  // Subtle underline for title
  page.drawLine({
    start: { x, y: yPosition + 10 },
    end: { x: x + width, y: yPosition + 10 },
    thickness: 0.5,
    color: colors.lightGray,
  });

  yPosition -= 10;

  // Section content
  if (Array.isArray(content)) {
    for (const item of content) {
      yPosition = drawText({
        page,
        text: item,
        x: x + 20,
        y: yPosition,
        font: helvetica,
        fontSize: 11,
        color: colors.darkGray,
        maxWidth: width - 20,
        lineHeight: 16,
      });
      yPosition -= 3;
    }
  } else {
    yPosition = drawText({
      page,
      text: content,
      x: x + 20,
      y: yPosition,
      font: helvetica,
      fontSize: 11,
      color: colors.darkGray,
      maxWidth: width - 20,
      lineHeight: 16,
    });
  }

  return yPosition - 25;
}

// Employment information section with horizontal layout
function drawEmploymentSection(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  workInfo: any,
  helveticaBold: PDFFont,
  helvetica: PDFFont
): number {
  let yPosition = y;

  // Section title with underline
  drawText({
    page,
    text: "EMPLOYMENT INFORMATION",
    x,
    y: yPosition,
    font: helveticaBold,
    fontSize: 12,
    color: colors.black,
    maxWidth: width,
  });

  yPosition -= 15;

  // Subtle underline for title
  page.drawLine({
    start: { x, y: yPosition + 10 },
    end: { x: x + width, y: yPosition + 10 },
    thickness: 0.5,
    color: colors.lightGray,
  });

  yPosition -= 15;

  // First row: Employer and Job Title
  const leftCol = x + 20;
  const rightCol = x + width / 2 + 20;
  const colWidth = (width - 40) / 2 - 20;

  if (workInfo.employer) {
    drawText({
      page,
      text: `Employer: ${workInfo.employer}`,
      x: leftCol,
      y: yPosition,
      font: helvetica,
      fontSize: 11,
      color: colors.darkGray,
      maxWidth: colWidth,
    });
  }

  if (workInfo.jobTitle) {
    drawText({
      page,
      text: `Job Title: ${workInfo.jobTitle}`,
      x: rightCol,
      y: yPosition,
      font: helvetica,
      fontSize: 11,
      color: colors.darkGray,
      maxWidth: colWidth,
    });
  }

  yPosition -= 16;

  // Second row: Work Location and Supervisor
  if (workInfo.workLocation) {
    drawText({
      page,
      text: `Work Location: ${workInfo.workLocation}`,
      x: leftCol,
      y: yPosition,
      font: helvetica,
      fontSize: 11,
      color: colors.darkGray,
      maxWidth: colWidth,
    });
  }

  if (workInfo.supervisor) {
    drawText({
      page,
      text: `Supervisor: ${workInfo.supervisor}`,
      x: rightCol,
      y: yPosition,
      font: helvetica,
      fontSize: 11,
      color: colors.darkGray,
      maxWidth: colWidth,
    });
  }

  yPosition -= 16;

  // Third row: Employment Status (centered if it's the only one)
  if (workInfo.employmentStatus) {
    drawText({
      page,
      text: `Employment Status: ${workInfo.employmentStatus}`,
      x: leftCol,
      y: yPosition,
      font: helvetica,
      fontSize: 11,
      color: colors.darkGray,
      maxWidth: colWidth,
    });
    yPosition -= 16;
  }

  return yPosition - 10;
}

// Clean signature fields
function drawSignatureFields(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  helvetica: PDFFont,
  helveticaBold: PDFFont
): number {
  let yPosition = y;

  // Title
  drawText({
    page,
    text: "SIGNATURES",
    x,
    y: yPosition,
    font: helveticaBold,
    fontSize: 12,
    color: colors.black,
  });

  yPosition -= 40;

  const columnWidth = (width - 60) / 2;

  // Grievor signature
  page.drawLine({
    start: { x, y: yPosition },
    end: { x: x + columnWidth, y: yPosition },
    thickness: 0.5,
    color: colors.black,
  });

  drawText({
    page,
    text: "Grievor Signature",
    x,
    y: yPosition - 15,
    font: helvetica,
    fontSize: 9,
    color: colors.gray,
  });

  drawText({
    page,
    text: "Print Name: _________________________________",
    x,
    y: yPosition - 35,
    font: helvetica,
    fontSize: 9,
    color: colors.gray,
  });

  drawText({
    page,
    text: "Date: _____________________",
    x,
    y: yPosition - 50,
    font: helvetica,
    fontSize: 9,
    color: colors.gray,
  });

  // Union Representative signature
  const unionX = x + columnWidth + 60;
  page.drawLine({
    start: { x: unionX, y: yPosition },
    end: { x: unionX + columnWidth, y: yPosition },
    thickness: 0.5,
    color: colors.black,
  });

  drawText({
    page,
    text: "Union Representative",
    x: unionX,
    y: yPosition - 15,
    font: helvetica,
    fontSize: 9,
    color: colors.gray,
  });

  drawText({
    page,
    text: "Print Name: _________________________________",
    x: unionX,
    y: yPosition - 35,
    font: helvetica,
    fontSize: 9,
    color: colors.gray,
  });

  drawText({
    page,
    text: "Date: _____________________",
    x: unionX,
    y: yPosition - 50,
    font: helvetica,
    fontSize: 9,
    color: colors.gray,
  });

  return yPosition - 70;
}

// Minimal footer
function drawFooter(
  page: PDFPage,
  pageNumber: number,
  totalPages: number,
  width: number,
  helvetica: PDFFont
): void {
  const footerY = 30;

  // Simple footer text
  drawText({
    page,
    text: `Page ${pageNumber} of ${totalPages}`,
    x: width / 2 - 30,
    y: footerY,
    font: helvetica,
    fontSize: 8,
    color: colors.gray,
  });
}

export async function generatePrintFriendlyGrievancePDF(
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

    // Page 1
    const page1 = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page1.getSize();
    const leftMargin = 72; // 1 inch margins
    const rightMargin = width - 72;
    const contentWidth = rightMargin - leftMargin;

    let yPosition = height - 72;

    // Document title - centered and prominent
    const docType =
      formData.currentStage === "FORMAL"
        ? "FORMAL GRIEVANCE"
        : "INFORMAL COMPLAINT";

    drawText({
      page: page1,
      text: docType,
      x: leftMargin,
      y: yPosition,
      font: helveticaBold,
      fontSize: 18,
      color: colors.black,
      maxWidth: contentWidth,
      align: "center",
    });

    yPosition -= 30;

    // Date and type
    drawText({
      page: page1,
      text: `Date Filed: ${new Date(
        formData.filedAt || new Date()
      ).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      x: leftMargin,
      y: yPosition,
      font: helvetica,
      fontSize: 10,
      color: colors.gray,
      maxWidth: contentWidth,
      align: "center",
    });

    yPosition -= 15;

    drawText({
      page: page1,
      text: `Grievance Type: ${formData.type || "INDIVIDUAL"}`,
      x: leftMargin,
      y: yPosition,
      font: helvetica,
      fontSize: 10,
      color: colors.gray,
      maxWidth: contentWidth,
      align: "center",
    });

    yPosition -= 25;

    // Agreement info if available
    if (agreement || bargainingUnit) {
      const infoText = [
        agreement ? `Agreement: ${agreement.name}` : "",
        bargainingUnit ? `Bargaining Unit: ${bargainingUnit.name}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      drawText({
        page: page1,
        text: infoText,
        x: leftMargin,
        y: yPosition,
        font: helvetica,
        fontSize: 10,
        color: colors.gray,
        maxWidth: contentWidth,
        align: "center",
      });
      yPosition -= 30;
    }

    // Horizontal separator
    page1.drawLine({
      start: { x: leftMargin, y: yPosition },
      end: { x: rightMargin, y: yPosition },
      thickness: 0.5,
      color: colors.lightGray,
    });

    yPosition -= 30;

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

    // Employment Information - using horizontal layout
    yPosition = drawEmploymentSection(
      page1,
      leftMargin,
      yPosition,
      contentWidth,
      formData.workInformation || {},
      helveticaBold,
      helvetica
    );

    // Check if we need a second page
    if (yPosition < 350) {
      // Add footer to first page
      drawFooter(page1, 1, 2, width, helvetica);

      // Create second page
      const page2 = pdfDoc.addPage([612, 792]);
      yPosition = height - 72;

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

      // Signature fields
      yPosition = drawSignatureFields(
        page2,
        leftMargin,
        Math.max(yPosition, 250),
        contentWidth,
        helvetica,
        helveticaBold
      );

      // Footer with Brown & Beatty
      page2.drawLine({
        start: { x: leftMargin, y: 60 },
        end: { x: rightMargin, y: 60 },
        thickness: 0.5,
        color: colors.lightGray,
      });

      drawText({
        page: page2,
        text: "Generated by Brown & Beatty AI - Labour Relations Management System",
        x: leftMargin,
        y: 45,
        font: helvetica,
        fontSize: 8,
        color: colors.gray,
      });

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

      // Footer with Brown & Beatty
      page1.drawLine({
        start: { x: leftMargin, y: 60 },
        end: { x: rightMargin, y: 60 },
        thickness: 0.5,
        color: colors.lightGray,
      });

      drawText({
        page: page1,
        text: "Generated by Brown & Beatty AI - Labour Relations Management System",
        x: leftMargin,
        y: 45,
        font: helvetica,
        fontSize: 8,
        color: colors.gray,
      });

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
    console.error("Error generating print-friendly PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}
