import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  parseBody,
  CreateRequestSchema,
  PaginationSchema,
} from "@/lib/validators";
import { ok, created, badRequest, withErrorHandler } from "@/lib/response";
import { listRequests, createRequest } from "@/services/requests.service";
import { evaluateWorkflowRules } from "@/services/workflows.service";
import { trackEvent } from "@/services/analytics.service";

// ─────────────────────────────────────────────
// GET requests (list)
// ─────────────────────────────────────────────

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await requireAuth();

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const { data, error } = parseBody(PaginationSchema, params);
  if (error || !data) return badRequest(error ?? "Invalid query params");

  const result = await listRequests(data, session.sub, session.role);

  return ok(result);
});

// ─────────────────────────────────────────────
// POST request (create)
// ─────────────────────────────────────────────

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireAuth();

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const { data, error } = parseBody(CreateRequestSchema, body);
  if (error || !data) return badRequest(error ?? "Invalid data");

  // Normalize nullable fields
  const normalizedData = {
    ...data,
    due_date: data.due_date ?? undefined,
    assigned_to: data.assigned_to ?? undefined,
  };

  // Create the request
  const request = await createRequest(normalizedData, session.sub);

  // Fire workflow rules asynchronously (non-blocking)
  evaluateWorkflowRules("on_create", request, session.sub).catch(console.error);

  // Track analytics event
  trackEvent(session.sub, "request_created", "request", request.id).catch(
    console.error,
  );

  return created(request, "Request submitted successfully");
});
