import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// ─────────────────────────────────────────────
// Route configuration
// ─────────────────────────────────────────────

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/requests",
  "/files",
  "/workflows",
  "/team",
  "/analytics",
  "/settings",
  "/api/requests",
  "/api/files",
  "/api/workflows",
  "/api/users",
  "/api/analytics",
  "/api/email",
];

// Routes that require admin role
const ADMIN_ONLY_ROUTES = [
  "/team",
  "/workflows",
  "/api/users",
  "/api/workflows",
];

// Routes that require staff or admin
const STAFF_ROUTES = ["/analytics", "/api/analytics"];

// Public routes (no auth needed)
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function unauthorizedResponse(isApi: boolean, url: URL): NextResponse {
  if (isApi) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const loginUrl = new URL("/login", url);
  loginUrl.searchParams.set("redirect", url.pathname);
  return NextResponse.redirect(loginUrl);
}

function forbiddenResponse(isApi: boolean): NextResponse {
  if (isApi) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }
  return NextResponse.redirect(new URL("/dashboard", "http://localhost"));
}

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const isApi = isApiRoute(pathname);

  // Skip static files, Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow public routes without auth
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  // Check if route needs protection
  const needsAuth = matchesRoute(pathname, PROTECTED_ROUTES);
  if (!needsAuth) {
    return NextResponse.next();
  }

  // Validate session
  const session = getSessionFromRequest(req);

  if (!session) {
    return unauthorizedResponse(isApi, req.nextUrl);
  }

  // Admin-only route check
  if (matchesRoute(pathname, ADMIN_ONLY_ROUTES) && session.role !== "admin") {
    return forbiddenResponse(isApi);
  }

  // Staff+ route check
  if (
    matchesRoute(pathname, STAFF_ROUTES) &&
    session.role !== "admin" &&
    session.role !== "staff"
  ) {
    return forbiddenResponse(isApi);
  }

  // Inject user info into request headers for route handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", session.sub);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-user-email", session.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
