import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  // Rate limit: 3 per hour per IP
  const limited = rateLimit(req, "contact");
  if (limited) return limited;

  try {
    const body = await req.json();

    // Verify CAPTCHA
    const captchaValid = await verifyTurnstileToken(body.captchaToken);
    if (!captchaValid) {
      return NextResponse.json(
        { error: "Verifikimi CAPTCHA deshtoi. Provoni perseri." },
        { status: 400 }
      );
    }

    const {
      companyName,
      contactName,
      email,
      phone,
      position,
      employees,
      industry,
      documentsPerMonth,
      needsCertificateAuthority,
      needsApiIntegration,
      needsWhiteLabel,
      needsCustomTemplates,
      currentSolution,
      message,
    } = body;

    if (!companyName || !contactName || !email || !employees || !industry || !documentsPerMonth) {
      return NextResponse.json({ error: "Plotesoni fushat e detyrueshme" }, { status: 400 });
    }

    const contactRequest = await prisma.contactRequest.create({
      data: {
        companyName,
        contactName,
        email,
        phone: phone || null,
        position: position || null,
        employees,
        industry,
        documentsPerMonth,
        needsCertificateAuthority: !!needsCertificateAuthority,
        needsApiIntegration: !!needsApiIntegration,
        needsWhiteLabel: !!needsWhiteLabel,
        needsCustomTemplates: !!needsCustomTemplates,
        currentSolution: currentSolution || null,
        message: message || null,
      },
    });

    return NextResponse.json({ success: true, data: { id: contactRequest.id } });
  } catch {
    return NextResponse.json({ error: "Gabim ne server" }, { status: 500 });
  }
}
