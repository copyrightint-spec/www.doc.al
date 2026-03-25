import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendContactAdminNotification } from "@/lib/email";

export async function POST(req: NextRequest) {
  // Rate limit: 3 per hour per IP
  const limited = rateLimit(req, "contact");
  if (limited) return limited;

  try {
    const body = await req.json();

    // Verify CAPTCHA (if token provided - simple form may not have it)
    if (body.captchaToken) {
      const captchaValid = await verifyTurnstileToken(body.captchaToken);
      if (!captchaValid) {
        return NextResponse.json(
          { error: "Verifikimi CAPTCHA deshtoi. Provoni perseri." },
          { status: 400 }
        );
      }
    }

    // Detect simple contact form vs enterprise form
    const isSimpleForm = body.name && body.subject && !body.companyName;

    if (isSimpleForm) {
      // Simple contact form: name, email, subject, message
      const { name, email, subject, message } = body;

      if (!name || !email || !subject || !message) {
        return NextResponse.json({ error: "Plotesoni fushat e detyrueshme" }, { status: 400 });
      }

      const contactRequest = await prisma.contactRequest.create({
        data: {
          companyName: "N/A",
          contactName: name,
          email,
          employees: "N/A",
          industry: "N/A",
          documentsPerMonth: "N/A",
          message: `[${subject}]\n\n${message}`,
        },
      });

      // Send admin notification email
      sendContactAdminNotification({
        contactName: name,
        email,
        companyName: null,
        subject,
        message,
        createdAt: new Date(),
      }).catch((err) => console.error("Failed to send admin notification:", err));

      return NextResponse.json({ success: true, data: { id: contactRequest.id } });
    }

    // Enterprise contact form
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

    // Send admin notification email
    sendContactAdminNotification({
      contactName,
      email,
      companyName,
      subject: `Kerkese organizate: ${companyName}`,
      message: message || `${employees} punonjes, ${industry}, ${documentsPerMonth} dok/muaj`,
      createdAt: new Date(),
    }).catch((err) => console.error("Failed to send admin notification:", err));

    return NextResponse.json({ success: true, data: { id: contactRequest.id } });
  } catch {
    return NextResponse.json({ error: "Gabim ne server" }, { status: 500 });
  }
}
