import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import type { UserRole, KycStatus } from "@/generated/prisma/enums";
import { checkAccountLockout, recordFailedLogin, clearFailedLogins } from "./rate-limit";
import { verifyTurnstileToken } from "./turnstile";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      kycStatus: KycStatus;
      totpEnabled: boolean;
      organizationId: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: UserRole;
    kycStatus: KycStatus;
    totpEnabled: boolean;
    organizationId: string | null;
  }

  interface JWT {
    role: UserRole;
    kycStatus: KycStatus;
    totpEnabled: boolean;
    organizationId: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Captcha", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Verify CAPTCHA token
        const captchaValid = await verifyTurnstileToken(credentials.captchaToken as string);
        if (!captchaValid) {
          throw new Error("Verifikimi CAPTCHA deshtoi. Provoni perseri.");
        }

        const email = credentials.email as string;

        // Account lockout check
        const lockout = checkAccountLockout(email);
        if (lockout.locked) {
          throw new Error(`Llogaria eshte bllokuar. Provoni pas ${lockout.remainingMinutes} minutash.`);
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          recordFailedLogin(email);
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          recordFailedLogin(email);
          return null;
        }

        // Clear failed login counter on success
        clearFailedLogins(email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          kycStatus: user.kycStatus,
          totpEnabled: user.totpEnabled,
          organizationId: user.organizationId,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.kycStatus = user.kycStatus;
        token.totpEnabled = user.totpEnabled;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.kycStatus = token.kycStatus as KycStatus;
        session.user.totpEnabled = token.totpEnabled as boolean;
        session.user.organizationId = token.organizationId as string | null;
      }
      return session;
    },
  },
});
