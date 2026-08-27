import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, images, icons, and auth pages
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") || // e.g. favicon.ico, images
    pathname === "/favicon.ico";

  const sessionCookie = request.cookies.get("myqian_session")?.value;

  // If user is accessing a protected route without a session cookie, redirect to login
  if (!isPublicRoute && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is already authenticated and visits login or register, redirect to home
  if (sessionCookie && (pathname === "/login" || pathname === "/register")) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
