import { NextResponse, NextRequest } from "next/server";
import type { ApiSuccess, ApiError } from "@/types";

// ─────────────────────────────────────────────
// Success responses
// ─────────────────────────────────────────────

export function ok<T>(
  data: T,
  message?: string,
  status = 200,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { success: true, data, ...(message ? { message } : {}) },
    { status },
  );
}

export function created<T>(
  data: T,
  message?: string,
): NextResponse<ApiSuccess<T>> {
  return ok(data, message, 201);
}

// ─────────────────────────────────────────────
// Error responses
// ─────────────────────────────────────────────

export function badRequest(
  error: string,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error, ...(details ? { details } : {}) },
    { status: 400 },
  );
}

export function unauthorized(error = "Unauthorized"): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 401 });
}

export function forbidden(error = "Forbidden"): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 403 });
}

export function notFound(error = "Resource not found"): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 404 });
}

export function conflict(error: string): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 409 });
}

export function serverError(
  error = "Internal server error",
): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 500 });
}

// ─────────────────────────────────────────────
// Error handler wrapper for route handlers
// ─────────────────────────────────────────────

/**
 * Wraps a route handler to catch thrown Response objects
 * and unexpected errors uniformly.
 */
export function withErrorHandler(
  handler: (req: NextRequest, ctx?: unknown) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx?: unknown): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof Response) {
        return new NextResponse(error.body, {
          status: error.status,
          headers: error.headers,
        });
      }

      console.error("[Route Handler Error]", error);

      return serverError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    }
  };
}
