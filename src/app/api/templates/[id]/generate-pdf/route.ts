import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.signingTemplate.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { isPublic: true },
          ...(session.user.organizationId
            ? [{ organizationId: session.user.organizationId }]
            : []),
        ],
      },
      include: {
        organization: { select: { name: true, logo: true } },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template nuk u gjet" }, { status: 404 });
    }

    // Get field values from request body
    const body = await req.json();
    const fieldValues: Record<string, string> = body.fieldValues || {};

    // Parse pdfme template
    const pdfmeData = template.pdfmeTemplate
      ? typeof template.pdfmeTemplate === "string"
        ? JSON.parse(template.pdfmeTemplate)
        : template.pdfmeTemplate
      : null;

    if (!pdfmeData || !pdfmeData.schemas) {
      return NextResponse.json(
        { error: "Template nuk ka format pdfme" },
        { status: 400 }
      );
    }

    // Dynamic import to avoid SSR issues with pdfme
    const { generate } = await import("@pdfme/generator");
    const { BLANK_PDF } = await import("@pdfme/common");
    const schemas = await import("@pdfme/schemas");

    // Build plugins
    const plugins = {
      text: schemas.text,
      image: schemas.image,
      checkbox: schemas.checkbox,
      date: schemas.date,
      dateTime: schemas.dateTime,
      select: schemas.select,
      line: schemas.line,
      rectangle: schemas.rectangle,
      ellipse: schemas.ellipse,
      svg: schemas.svg,
      qrcode: schemas.barcodes.qrcode,
      gs1datamatrix: schemas.barcodes.gs1datamatrix,
      table: schemas.table,
    };

    // Build base PDF with org branding
    const { createBlankPdfWithBranding } = await import("@/lib/pdfme-footer");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let basePdf: any = BLANK_PDF;
    const pageCount = pdfmeData.schemas?.length || 1;

    if (pdfmeData.basePdf && pdfmeData.basePdf !== "BLANK") {
      // If base PDF data is stored, use it
      if (typeof pdfmeData.basePdf === "string" && pdfmeData.basePdf.length > 100) {
        const binaryStr = atob(pdfmeData.basePdf);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        basePdf = bytes;
      }
    } else {
      // Use branded blank PDF with org logo in header
      basePdf = createBlankPdfWithBranding(
        pageCount,
        undefined, // org logo data URI would need to be fetched and converted
        template.organization?.name || undefined,
      );
    }

    // Build inputs - map field values to pdfme schema names
    // For draft generation, use schema's default content as fallback
    const inputs: Record<string, string>[] = pdfmeData.schemas.map(
      (pageSchemas: Record<string, unknown>[]) => {
        const pageInput: Record<string, string> = {};
        if (Array.isArray(pageSchemas)) {
          for (const schema of pageSchemas) {
            const s = schema as { name?: string; type?: string; content?: string };
            const name = s.name || "";
            const schemaType = s.type || "text";

            if (fieldValues[name]) {
              pageInput[name] = fieldValues[name];
            } else if (s.content) {
              // Use template's default content for draft
              pageInput[name] = s.content;
            } else if (schemaType === "text") {
              pageInput[name] = name; // Show field name as placeholder
            } else {
              // For image/barcode types with no content, use empty string
              // pdfme handles empty content gracefully for most types
              pageInput[name] = "";
            }
          }
        }
        return pageInput;
      }
    );

    // Generate PDF
    const pdfmeTemplate = {
      basePdf,
      schemas: pdfmeData.schemas,
    };

    const pdf = await generate({
      template: pdfmeTemplate,
      inputs,
      plugins,
    });

    // Return PDF as downloadable file
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${template.name.replace(/[^a-zA-Z0-9-_]/g, "_")}_draft.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Gabim gjate gjenerimit te PDF" },
      { status: 500 }
    );
  }
}
