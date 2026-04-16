/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ok, badRequest, notFound, withErrorHandler } from "@/lib/response";
import {
  getTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/services/email.service";

// ─────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────

export const GET = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  if (!ctx) return notFound("Invalid context");

  const { params } = (await ctx as any);
  const resolvedParams = await params;

  await requireRole(["admin", "staff"]);

  const template = await getTemplate(resolvedParams.id);
  if (!template) return notFound("Template not found");

  return ok(template);
});

// ─────────────────────────────────────────────
// PATCH
// ─────────────────────────────────────────────

export const PATCH = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  if (!ctx) return notFound("Invalid context");

  const { params } = (await ctx as any);
  const resolvedParams = await params;

  await requireRole(["admin"]);

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const updated = await updateTemplate(resolvedParams.id, body);
  if (!updated) return notFound("Template not found");

  return ok(updated, "Template updated");
});

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export const DELETE = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  if (!ctx) return notFound("Invalid context");

  const { params } = (await ctx as any);
  const resolvedParams = await params;

  await requireRole(["admin"]);

  const deleted = await deleteTemplate(resolvedParams.id);
  if (!deleted) return notFound("Template not found");

  return ok(null, "Template deleted");
});