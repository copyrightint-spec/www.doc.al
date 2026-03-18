import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "docal-mail",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  tls: { rejectUnauthorized: false },
});

/**
 * POST /api/auth/forgot-password
 *
 * Sends a password reset email with a secure token.
 * Always returns success to prevent email enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token as a verification code
      await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code: token,
          type: "EMAIL",
          expiresAt,
        },
      });

      const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;

      try {
        await transporter.sendMail({
          from: "doc.al <noreply@doc.al>",
          to: user.email,
          subject: "Rivendosni Fjalekalimin - doc.al",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #1e293b;">Rivendos Fjalekalimin</h2>
              <p style="color: #64748b;">Keni kerkuar te ndryshoni fjalekalimin tuaj ne doc.al.</p>
              <p style="color: #64748b;">Klikoni butonin me poshte per te vendosur nje fjalekalim te ri:</p>
              <a href="${resetUrl}" style="display: inline-block; background: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
                Ndrysho Fjalekalimin
              </a>
              <p style="color: #94a3b8; font-size: 12px;">Ky link skadon pas 1 ore.</p>
              <p style="color: #94a3b8; font-size: 12px;">Nese nuk e keni kerkuar kete, injoroni kete email.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("[ForgotPassword] Email send failed:", emailError);
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ForgotPassword] Error:", error);
    return NextResponse.json({ success: true });
  }
}
