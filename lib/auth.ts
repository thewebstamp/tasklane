import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { JWTPayload, AuthSession, UserRole } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? "7d";
const COOKIE_NAME = process.env.COOKIE_NAME ?? "saas_session";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

// ─────────────────────────────────────────────
// Token utilities
// ─────────────────────────────────────────────

export function signToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Cookie helpers
// ─────────────────────────────────────────────

/**
 * Returns cookie options for set/delete.
 */
export function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAge ?? 60 * 60 * 24 * 7, // 7 days
  };
}

/**
 * Set the auth cookie. Called after successful login/register.
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, cookieOptions());
}

/**
 * Clear the auth cookie. Called on logout.
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", cookieOptions(0));
}

// ─────────────────────────────────────────────
// Session retrieval
// ─────────────────────────────────────────────

/**
 * Get the current session from cookies (Server Components / Route Handlers).
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token) as AuthSession | null;
}

/**
 * Get session from a raw NextRequest (used in middleware).
 */
export function getSessionFromRequest(req: NextRequest): AuthSession | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token) as AuthSession | null;
}

// ─────────────────────────────────────────────
// Role guards
// ─────────────────────────────────────────────

export function isAdmin(session: AuthSession): boolean {
  return session.role === "admin";
}

export function isStaffOrAdmin(session: AuthSession): boolean {
  return session.role === "admin" || session.role === "staff";
}

export function hasRole(session: AuthSession, roles: UserRole[]): boolean {
  return roles.includes(session.role);
}

// ─────────────────────────────────────────────
// Route handler auth helpers
// ─────────────────────────────────────────────

/**
 * Require authentication in a route handler.
 * Returns the session or throws a 401 response.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return session;
}

/**
 * Require a specific role in a route handler.
 */
export async function requireRole(roles: UserRole[]): Promise<AuthSession> {
  const session = await requireAuth();
  if (!hasRole(session, roles)) {
    throw new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}
