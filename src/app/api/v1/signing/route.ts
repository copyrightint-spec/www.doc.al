import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSigningInvitation } from "@/lib/email";
import { z } from "zod";
import crypto from "crypto";

const signingSchema = z.object({
  documentTitle: z.string().min(1),
  documentUrl: z.string().url().optional(),
  documentHash: z.string().optional(),
  signers: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().min(1),
      order: z.number().int().min(0).default(0),
    })
  ).min(1),
  message: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(365).default(30),
  companyName: z.string().optional(),
  companyLogo: z.string().url().optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  templateId: z.string().optional(),
  callbackUrl: z.string().url().optional(),
});

async function authenticateApiKey(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const keyRaw = authHeader.slice(7);
  const keyHash = crypto.createHash("sha256").update(keyRaw).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: keyHash },
    include: {
      user: { include: { organization: true } },
    },
  });

  if (!apiKey || !apiKey.active) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
    }

    const body = await req.json();
    const validated = signingSchema.parse(body);

    // Use org info for branding if not provided
    const companyName = validated.companyName || apiKey.user.organization?.name || "doc.al";
    const companyLogo = validated.companyLogo || apiKey.user.organization?.logo || null;
    const brandColor = validated.brandColor || apiKey.user.organization?.primaryColor || "#dc2626";

    // Create the document record
    const fileHash = validated.documentHash || crypto.createHash("sha256").update(validated.documentTitle + Date.now()).digest("hex");

    const document = await prisma.document.create({
      data: {
        title: validated.documentTitle,
        fileName: `${validated.documentTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.pdf`,
        fileHash,
        fileUrl: validated.documentUrl || `/api-documents/${fileHash}`,
        fileSize: 0,
        status: "PENDING_SIGNATURE",
        ownerId: apiKey.user.id,
        organizationId: apiKey.user.organizationId,
      },
    });

    // Create signing request with company branding
    const expiresAt = new Date(Date.now() + validated.expiresInDays * 24 * 60 * 60 * 1000);

    const signingRequest = await prisma.signingRequest.create({
      data: {
        documentId: document.id,
        requesterId: apiKey.user.id,
        recipientEmails: validated.signers.map((s) => s.email),
        message: validated.message,
        companyName,
        companyLogo,
        brandColor,
        templateId: validated.templateId || null,
        expiresAt,
      },
    });

    // Create signature entries with secure tokens
    const signatures = await Promise.all(
      validated.signers.map((signer) =>
        prisma.signature.create({
          data: {
            documentId: document.id,
            signerEmail: signer.email,
            signerName: signer.name,
            order: signer.order,
            token: crypto.randomBytes(32).toString("hex"),
          },
        })
      )
    );

    // Send email invitations with company branding
    const baseUrl = process.env.NEXTAUTH_URL || "https://www.doc.al";
    for (const sig of signatures) {
      await sendSigningInvitation(
        sig.signerEmail,
        sig.signerName,
        document.title,
        `${baseUrl}/sign/${sig.token}`,
        companyName,
        {
          companyName,
          companyLogo,
          brandColor,
          message: validated.message,
          expiresAt,
        }
      );
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "API_SIGNING_REQUEST_CREATED",
        entityType: "SigningRequest",
        entityId: signingRequest.id,
        userId: apiKey.user.id,
        metadata: {
          apiKeyId: apiKey.id,
          companyName,
          documentId: document.id,
          signerCount: validated.signers.length,
          signerEmails: validated.signers.map((s) => s.email),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        signingRequestId: signingRequest.id,
        documentId: document.id,
        status: signingRequest.status,
        expiresAt: signingRequest.expiresAt,
        signers: signatures.map((s) => ({
          id: s.id,
          name: s.signerName,
          email: s.signerEmail,
          signingUrl: `${baseUrl}/sign/${s.token}`,
          status: s.status,
        })),
        tracking: {
          statusUrl: `${baseUrl}/api/v1/signing/${signingRequest.id}/status`,
        },
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Validation error",
        details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      }, { status: 400 });
    }
    console.error("API signing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - List signing requests for API user
export async function GET(req: NextRequest) {
  try {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const where: Record<string, unknown> = {
      requesterId: apiKey.user.id,
    };
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.signingRequest.findMany({
        where,
        include: {
          document: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.signingRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
