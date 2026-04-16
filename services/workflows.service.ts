import { query } from "@/lib/db";
import type { DBRequest, DBWorkflowRule, WorkflowConditions } from "@/types";

/**
 * Evaluate all active workflow rules for a given trigger event.
 * Called asynchronously after request mutations — never blocks the API response.
 */
export async function evaluateWorkflowRules(
  trigger: string,
  request: DBRequest,
  actorId: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  // Fetch all active rules for this trigger
  const rules = await query<DBWorkflowRule>(
    `SELECT * FROM workflow_rules
     WHERE trigger_event = $1 AND is_active = true
     ORDER BY created_at ASC`,
    [trigger],
  );

  for (const rule of rules) {
    try {
      if (
        conditionsMatch(rule.conditions as WorkflowConditions, request, context)
      ) {
        await executeActions(rule, request, actorId);
      }
    } catch (err) {
      // Log rule failures — never propagate
      console.error(`[Workflow] Rule "${rule.name}" failed:`, err);
    }
  }
}

// ─────────────────────────────────────────────
// Condition matching
// ─────────────────────────────────────────────
function conditionsMatch(
  conditions: WorkflowConditions,
  request: DBRequest,
  context: Record<string, unknown>,
): boolean {
  // Empty conditions = always matches
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
// (Full implementation in Phase 7 — stubs ensure compile safety now)
// ─────────────────────────────────────────────
async function executeActions(
  rule: DBWorkflowRule,
  request: DBRequest,
  actorId: string,
): Promise<void> {
  const actions = Array.isArray(rule.actions) ? rule.actions : [];

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
        if (template_id && to) {
          const { sendToRequestParticipants } =
            await import("@/services/email.service");

          // Build base variables from the request
          const varRows = await query<{
            submitter_name: string;
            submitter_email: string;
            assignee_name: string | null;
            title: string;
            status: string;
            priority: string;
          }>(
            `
            SELECT u1.name AS submitter_name, u1.email AS submitter_email,
                   u2.name AS assignee_name,
                   r.title, r.status, r.priority
            FROM requests r
            JOIN users u1 ON u1.id = r.submitted_by
            LEFT JOIN users u2 ON u2.id = r.assigned_to
            WHERE r.id = $1 LIMIT 1
          `,
            [request.id],
          );

          const vars = varRows[0];
          if (vars) {
            await sendToRequestParticipants({
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
          }
        }
        break;
      }
    }
  }
}
