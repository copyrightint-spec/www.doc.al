import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = [
  "/",
  "/auth/login",
  "/auth/register",
  "/explorer",
  "/verify",
  "/sign",
  "/api/auth",
  "/api/v1",
  "/api/timestamp/verify",
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
