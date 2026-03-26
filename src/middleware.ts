import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decode } from "@auth/core/jwt";

const publicPaths = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/explorer",
  "/verify",
  "/sign",
  "/certificates",
  "/si-funksionon",
  "/api/auth",
  "/api/v1",
  "/api/timestamp",
  "/api/explorer",
  "/api/certificates/public",
  "/api/ca",
  "/api/crl",
  "/api/ocsp",
  "/api/cron",
  "/api/contact",
  "/api/verify",
  "/api/stamles",
  "/api/email/track",
  "/api/logo",
  "/contact",
  "/verify/seal",
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

async function getTokenRole(req: NextRequest): Promise<string | null> {
  const tokenValue =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!tokenValue) return null;

  try {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) return null;

    const decoded = await decode({
      token: tokenValue,
      secret,
      salt:
        req.cookies.get("__Secure-authjs.session-token")?.value
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
    });

    return (decoded?.role as string) || null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for session token (NextAuth sets this cookie)
  const token =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!token) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Block non-admin users from /admin routes
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const role = await getTokenRole(req);

    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      const dashboardUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Block non-admin users from /api/admin routes
  if (pathname.startsWith("/api/admin")) {
    const role = await getTokenRole(req);

    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
