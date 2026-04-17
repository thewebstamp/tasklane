/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "@/lib/db";
import type {
  DBRequest,
  DBWorkflowRule,
  WorkflowConditions,
  WorkflowActionDef,
} from "@/types";

/**
 * Evaluate all active workflow rules for a given trigger event.
 * Always awaited by the caller — never fire-and-forget in serverless.
 */
export async function evaluateWorkflowRules(
  trigger: string,
  request: DBRequest,
  actorId: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  const rules = await query<DBWorkflowRule>(
    `SELECT * FROM workflow_rules
     WHERE trigger_event = $1 AND is_active = true
     ORDER BY created_at ASC`,
    [trigger],
  );

  for (const rule of rules) {
    try {
      // ── FIX 2: JSONB columns may come back as a string from Neon if they
      // were double-encoded on insert. Normalise here before using them.
      const conditions = parseJsonField<WorkflowConditions>(
        rule.conditions,
        {},
      );
      const actions = parseJsonField<WorkflowActionDef[]>(rule.actions, []);

      if (conditionsMatch(conditions, request, context)) {
        await executeActions(rule.name, actions, request, actorId);
      }
    } catch (err) {
      // Log per-rule failures — never propagate so one bad rule can't block others
      console.error(`[Workflow] Rule "${rule.name}" failed:`, err);
    }
  }
}

// ─────────────────────────────────────────────
// FIX 2 + 3: Safe JSONB field parser
// Neon's serverless driver returns JSONB already parsed, but if the value was
// double-encoded (JSON.stringify on an object before INSERT), it comes back
// as a string. This handles both cases safely.
// ─────────────────────────────────────────────
function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

// ─────────────────────────────────────────────
// Condition matching
// ─────────────────────────────────────────────
function conditionsMatch(
  conditions: WorkflowConditions,
  request: DBRequest,
  context: Record<string, unknown>,
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  if (conditions.status) {
    const target = context.newStatus ?? request.status;
    if (conditions.status !== target) return false;
  }

  if (conditions.priority && conditions.priority !== request.priority)
    return false;

  if ("assigned_to" in conditions) {
    if (conditions.assigned_to !== request.assigned_to) return false;
  }

  return true;
}

// ─────────────────────────────────────────────
// Action execution
// ─────────────────────────────────────────────
async function executeActions(
  ruleName: string,
  actions: WorkflowActionDef[],
  request: DBRequest,
  actorId: string,
): Promise<void> {
  if (!Array.isArray(actions) || actions.length === 0) {
    console.warn(`[Workflow] Rule "${ruleName}" has no actions — skipping`);
    return;
  }

  for (const action of actions) {
    switch (action.type) {
      case "set_status": {
        const { status } = action.payload as { status: string };
        if (status && status !== request.status) {
          await query(
            `UPDATE requests SET status = $1, updated_at = now() WHERE id = $2`,
            [status, request.id],
          );
        }
        break;
      }

      case "assign_user": {
        const { user_id } = action.payload as { user_id: string };
        if (user_id) {
          await query(
            `UPDATE requests SET assigned_to = $1, updated_at = now() WHERE id = $2`,
            [user_id, request.id],
          );
        }
        break;
      }

      case "add_comment": {
        const { content } = action.payload as { content: string };
        if (content) {
          await query(
            `INSERT INTO request_comments (request_id, user_id, content, type)
             VALUES ($1, $2, $3, 'system')`,
            [request.id, actorId, content],
          );
        }
        break;
      }

      case "send_email": {
        const { template_id, to } = action.payload as {
          template_id: string;
          to: string;
        };

        if (!template_id) {
          console.warn(
            `[Workflow] Rule "${ruleName}" send_email action missing template_id`,
          );
          break;
        }
        if (!to) {
          console.warn(
            `[Workflow] Rule "${ruleName}" send_email action missing "to" field`,
          );
          break;
        }

        const { sendToRequestParticipants } =
          await import("@/services/email.service");

        // Fetch request context for variable interpolation
        const varRows = await query<{
          submitter_name: string;
          submitter_email: string;
          assignee_name: string | null;
          title: string;
          status: string;
          priority: string;
        }>(
          `
          SELECT u1.name  AS submitter_name,
                 u1.email AS submitter_email,
                 u2.name  AS assignee_name,
                 r.title, r.status, r.priority
          FROM requests r
          JOIN  users u1 ON u1.id = r.submitted_by
          LEFT JOIN users u2 ON u2.id = r.assigned_to
          WHERE r.id = $1 LIMIT 1
        `,
          [request.id],
        );

        const vars = varRows[0];
        if (!vars) {
          console.warn(
            `[Workflow] send_email: could not find request ${request.id} for variables`,
          );
          break;
        }

        // FIX 4: surface errors instead of silently swallowing them
        const result = await sendToRequestParticipants({
          requestId: request.id,
          templateId: template_id,
          to,
          variables: {
            submitter_name: vars.submitter_name,
            submitter_email: vars.submitter_email,
            assignee_name: vars.assignee_name ?? "",
            title: vars.title,
            status: vars.status,
            priority: vars.priority,
            new_status: vars.status,
          },
          sentBy: actorId,
        });

        if (result && !result.success) {
          console.error(
            `[Workflow] Rule "${ruleName}" email failed:`,
            result.error,
          );
        }

        break;
      }

      default:
        console.warn(`[Workflow] Unknown action type: ${(action as any).type}`);
    }
  }
}
