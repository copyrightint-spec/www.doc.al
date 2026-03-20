import * as OTPAuth from "otpauth";
import crypto from "crypto";

const TOTP_ENCRYPTION_KEY = process.env.CERTIFICATE_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "";

function encryptSecret(plaintext: string): string {
  if (!TOTP_ENCRYPTION_KEY) return plaintext;
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(TOTP_ENCRYPTION_KEY, "totp-salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `enc:${iv.toString("hex")}:${encrypted}`;
}

function decryptSecret(data: string): string {
  if (!data.startsWith("enc:")) return data; // Backward compatible with unencrypted
  const [, ivHex, encrypted] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = crypto.scryptSync(TOTP_ENCRYPTION_KEY, "totp-salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function generateTotpSecret(email: string): {
  secret: string;
  uri: string;
} {
  const totp = new OTPAuth.TOTP({
    issuer: "doc.al",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: encryptSecret(totp.secret.base32),
    uri: totp.toString(),
  };
}

export function verifyTotp(secret: string, token: string): boolean {
  const decrypted = decryptSecret(secret);
  const totp = new OTPAuth.TOTP({
    issuer: "doc.al",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(decrypted),
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}
