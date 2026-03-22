import crypto from "crypto";
import { prisma } from "./db";
import { sendVerificationCode } from "./email";
import { verifyTotp } from "./totp";

const MAX_ATTEMPTS = 5;
const MAX_EMAIL_SENDS_PER_HOUR = 20;
const CODE_EXPIRY_MINUTES = 5;

/**
 * Step 1: Send 6-digit OTP code via email
 */
export async function sendSigningOtp(
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  // Rate limit: max 3 sends per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCodes = await prisma.verificationCode.count({
    where: {
      userId,
      type: "EMAIL",
      createdAt: { gt: oneHourAgo },
    },
  });

  if (recentCodes >= MAX_EMAIL_SENDS_PER_HOUR) {
    return {
      success: false,
      error: "Keni arritur limitin e dergimeve. Provoni pas 1 ore.",
    };
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  await prisma.verificationCode.create({
    data: {
      userId,
      code,
      type: "EMAIL",
      expiresAt,
    },
  });

  const sent = await sendVerificationCode(email, code);
  if (!sent) {
    return { success: false, error: "Gabim ne dergim te emailit" };
  }

  return { success: true };
}

/**
 * Step 1 verify: Check the email OTP code
 */
export async function verifySigningOtp(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  // Check attempts
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentAttempts = await prisma.verificationCode.count({
    where: {
      userId,
      type: "EMAIL",
      used: true,
      createdAt: { gt: fiveMinAgo },
    },
  });

  if (recentAttempts >= MAX_ATTEMPTS) {
    return {
      success: false,
      error: "Shume tentativa. Provoni perseri me vone.",
    };
  }

  const verificationCode = await prisma.verificationCode.findFirst({
    where: {
      userId,
      code,
      type: "EMAIL",
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verificationCode) {
    return { success: false, error: "Kodi i pavlefshem ose i skaduar" };
  }

  await prisma.verificationCode.update({
    where: { id: verificationCode.id },
    data: { used: true },
  });

  return { success: true };
}

/**
 * Step 2: Verify TOTP code from Google Authenticator
 */
export async function verifySigningTotp(
  userId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true, kycStatus: true },
  });

  if (!user) {
    return { success: false, error: "Perdoruesi nuk u gjet" };
  }

  if (user.kycStatus !== "VERIFIED") {
    return {
      success: false,
      error: "KYC nuk eshte verifikuar. Shkoni ne Settings > KYC.",
    };
  }

  if (!user.totpEnabled || !user.totpSecret) {
    return {
      success: false,
      error: "TOTP nuk eshte aktivizuar. Shkoni ne Settings > Security.",
    };
  }

  const isValid = verifyTotp(user.totpSecret, token);
  if (!isValid) {
    return { success: false, error: "Kodi TOTP i gabuar" };
  }

  return { success: true };
}

/**
 * Full 2-step verification for signing
 */
export async function canUserSign(userId: string): Promise<{
  canSign: boolean;
  reason?: string;
  redirectTo?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      kycStatus: true,
      totpEnabled: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return { canSign: false, reason: "Perdoruesi nuk u gjet" };
  }

  if (!user.emailVerified) {
    return {
      canSign: false,
      reason: "Email nuk eshte verifikuar",
      redirectTo: "/settings/kyc",
    };
  }

  if (user.kycStatus !== "VERIFIED") {
    return {
      canSign: false,
      reason: "KYC nuk eshte verifikuar",
      redirectTo: "/settings/kyc",
    };
  }

  if (!user.totpEnabled) {
    return {
      canSign: false,
      reason: "2FA nuk eshte aktivizuar",
      redirectTo: "/settings/security",
    };
  }

  return { canSign: true };
}
