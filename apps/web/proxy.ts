import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Session-getter middleware: uses the repo's casted `auth()` session signature
// (next-auth v5 beta.31 types carry no middleware-handler overload). Public paths
// bypass before any session fetch.
export default async function middleware(request: NextRequest) {
  // Dev bypass
  if (process.env.AUTH_DISABLED === "true") return NextResponse.next();

  const { pathname } = request.nextUrl;

  const publicPaths = ["/auth/signin", "/auth/error", "/api/auth", "/icon.svg", "/favicon.ico", "/manifest.json"];

  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/join/")) return NextResponse.next();
  if (pathname.startsWith("/api/health") || pathname.startsWith("/api/discovery")) return NextResponse.next();

  const session = await auth();
  if (!session) {
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
