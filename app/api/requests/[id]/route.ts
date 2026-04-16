/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { parseBody, UpdateRequestSchema } from "@/lib/validators";
import { ok, badRequest, notFound, withErrorHandler } from "@/lib/response";
import {
  getRequest,
  updateRequest,
  deleteRequest,
} from "@/services/requests.service";
import { evaluateWorkflowRules } from "@/services/workflows.service";
import { trackEvent } from "@/services/analytics.service";

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────

type Context = { params: { id: string } };

// ─────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────

export const GET = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  if (!ctx) return notFound("Invalid context");

  const { params } = (await ctx as any);
  const resolvedParams = await params;

  const session = await requireAuth();

  const request = await getRequest(resolvedParams.id, session.sub, session.role);
  if (!request) return notFound("Request not found");

  return ok(request);
});

// ─────────────────────────────────────────────
// PATCH
// ─────────────────────────────────────────────

export const PATCH = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  if (!ctx) return notFound("Invalid context");

  const { params } = (await ctx as any);
  const resolvedParams = await params;

  const session = await requireAuth();

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const { data, error } = parseBody(UpdateRequestSchema, body);
  if (error || !data) return badRequest(error ?? "Invalid data");

  const normalizedData = {
    ...data,
    due_date: data.due_date ?? undefined,
  };

  const updated = await updateRequest(
    resolvedParams.id,
    normalizedData,
    session.sub,
    session.role,
  );

  if (!updated) return notFound("Request not found or access denied");

  if (data.status) {
    evaluateWorkflowRules("on_status_change", updated, session.sub, {
      newStatus: data.status,
    }).catch(console.error);
  }

  if (data.assigned_to !== undefined) {
    evaluateWorkflowRules("on_assign", updated, session.sub).catch(console.error);
  }

  trackEvent(session.sub, "request_updated", "request", updated.id).catch(console.error);

  return ok(updated, "Request updated successfully");
});

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export const DELETE = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  if (!ctx) return notFound("Invalid context");

  const { params } = (await ctx as any);
  const resolvedParams = await params;

  await requireRole(["admin"]);

  const deleted = await deleteRequest(resolvedParams.id);
  if (!deleted) return notFound("Request not found");

  return ok(null, "Request deleted");
});