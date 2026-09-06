import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth(async (req: any) => {
  // Dev bypass
  if (process.env.AUTH_DISABLED === "true") return NextResponse.next();

  const { pathname } = req.nextUrl;
  const session = req.auth;

  const publicPaths = [
    "/auth/signin", "/auth/error", "/api/auth",
    "/icon.svg", "/favicon.ico", "/manifest.json",
  ];

  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/join/")) return NextResponse.next();
  if (pathname.startsWith("/api/health") || pathname.startsWith("/api/discovery")) return NextResponse.next();

  if (!session) {
    const url = new URL("/auth/signin", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
