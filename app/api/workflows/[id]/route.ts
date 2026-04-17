import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseBody, UpdateWorkflowSchema } from "@/lib/validators";
import { ok, badRequest, notFound, withErrorHandler } from "@/lib/response";
import { queryOne, execute } from "@/lib/db";
import type { DBWorkflowRule } from "@/types";

type Context = { params: Promise<{ id: string }> };

// ─────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────

export const GET = withErrorHandler(
  async (_req: NextRequest, ctx?: unknown) => {
    if (!ctx) return notFound("Invalid context");

    const { id } = await (ctx as Context).params;

    await requireRole(["admin"]);

    const rule = await queryOne<DBWorkflowRule>(
      "SELECT * FROM workflow_rules WHERE id = $1 LIMIT 1",
      [id],
    );

    if (!rule) return notFound("Workflow rule not found");

    return ok(rule);
  },
);

// ─────────────────────────────────────────────
// PATCH
// ─────────────────────────────────────────────

export const PATCH = withErrorHandler(
  async (req: NextRequest, ctx?: unknown) => {
    if (!ctx) return notFound("Invalid context");

    const { id } = await (ctx as Context).params;

    await requireRole(["admin"]);

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body");

    const { data, error } = parseBody(UpdateWorkflowSchema, body);
    if (error || !data) return badRequest(error ?? "Invalid data");

    const sets: string[] = [];
    const args: unknown[] = [];

    if (data.name !== undefined) {
      args.push(data.name);
      sets.push(`name = $${args.length}`);
    }

    if (data.description !== undefined) {
      args.push(data.description ?? null);
      sets.push(`description = $${args.length}`);
    }

    if (data.trigger_event !== undefined) {
      args.push(data.trigger_event);
      sets.push(`trigger_event = $${args.length}`);
    }

    if (data.conditions !== undefined) {
      args.push(JSON.stringify(data.conditions));
      sets.push(`conditions = $${args.length}`);
    }

    if (data.actions !== undefined) {
      args.push(JSON.stringify(data.actions));
      sets.push(`actions = $${args.length}`);
    }

    if (data.is_active !== undefined) {
      args.push(data.is_active);
      sets.push(`is_active = $${args.length}`);
    }

    if (sets.length === 0) {
      return badRequest("No fields to update");
    }

    args.push(id);

    const rows = await execute<DBWorkflowRule>(
      `
    UPDATE workflow_rules
    SET ${sets.join(", ")}
    WHERE id = $${args.length}
    RETURNING *
  `,
      args,
    );

    if (!rows[0]) return notFound("Workflow rule not found");

    return ok(rows[0], "Workflow rule updated");
  },
);

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export const DELETE = withErrorHandler(
  async (_req: NextRequest, ctx?: unknown) => {
    if (!ctx) return notFound("Invalid context");

    const { id } = await (ctx as Context).params;

    await requireRole(["admin"]);

    const rows = await execute<{ id: string }>(
      "DELETE FROM workflow_rules WHERE id = $1 RETURNING id",
      [id],
    );

    if (!rows[0]) return notFound("Workflow rule not found");

    return ok(null, "Workflow rule deleted");
  },
);
