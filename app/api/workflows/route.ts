import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseBody, CreateWorkflowSchema } from "@/lib/validators";
import { ok, created, badRequest, withErrorHandler } from "@/lib/response";
import { query, execute } from "@/lib/db";
import type { DBWorkflowRule } from "@/types";

export const GET = withErrorHandler(async () => {
  await requireRole(["admin"]);

  const rules = await query<DBWorkflowRule>(`
    SELECT w.*, u.name AS creator_name
    FROM workflow_rules w
    LEFT JOIN users u ON u.id = w.created_by
    ORDER BY w.created_at DESC
  `);

  return ok(rules);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireRole(["admin"]);

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const { data, error } = parseBody(CreateWorkflowSchema, body);
  if (error || !data) return badRequest(error ?? "Invalid data");

  const rows = await execute<DBWorkflowRule>(
    `
    INSERT INTO workflow_rules
      (name, description, trigger_event, conditions, actions, is_active, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `,
    [
      data.name,
      data.description ?? null,
      data.trigger_event,
      JSON.stringify(data.conditions),
      JSON.stringify(data.actions),
      data.is_active ?? true,
      session.sub,
    ],
  );

  return created(rows[0], "Workflow rule created");
});
