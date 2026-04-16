import { query, queryOne, execute } from "@/lib/db";
import { sendMail, interpolate } from "@/lib/mailer";
import type {
  DBEmailTemplate,
  DBEmailLog,
  SendEmailInput,
  EmailStatus,
} from "@/types";

// ─────────────────────────────────────────────
// Template CRUD
// ─────────────────────────────────────────────

export async function listTemplates(): Promise<DBEmailTemplate[]> {
  return query<DBEmailTemplate>(
    "SELECT * FROM email_templates ORDER BY name ASC",
  );
}

export async function getTemplate(id: string): Promise<DBEmailTemplate | null> {
  return queryOne<DBEmailTemplate>(
    "SELECT * FROM email_templates WHERE id = $1 LIMIT 1",
    [id],
  );
}

export async function getTemplateByName(
  name: string,
): Promise<DBEmailTemplate | null> {
  return queryOne<DBEmailTemplate>(
    "SELECT * FROM email_templates WHERE name = $1 LIMIT 1",
    [name],
  );
}

export async function createTemplate(input: {
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[];
  createdBy: string;
}): Promise<DBEmailTemplate> {
  const rows = await execute<DBEmailTemplate>(
    `
    INSERT INTO email_templates (name, subject, body_html, body_text, variables, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,
    [
      input.name,
      input.subject,
      input.body_html,
      input.body_text,
      JSON.stringify(input.variables),
      input.createdBy,
    ],
  );
  return rows[0];
}

export async function updateTemplate(
  id: string,
  input: Partial<{
    name: string;
    subject: string;
    body_html: string;
    body_text: string;
    variables: string[];
  }>,
): Promise<DBEmailTemplate | null> {
  const sets: string[] = [];
  const args: unknown[] = [];

  if (input.name !== undefined) {
    args.push(input.name);
    sets.push(`name = $${args.length}`);
  }
  if (input.subject !== undefined) {
    args.push(input.subject);
    sets.push(`subject = $${args.length}`);
  }
  if (input.body_html !== undefined) {
    args.push(input.body_html);
    sets.push(`body_html = $${args.length}`);
  }
  if (input.body_text !== undefined) {
    args.push(input.body_text);
    sets.push(`body_text = $${args.length}`);
  }
  if (input.variables !== undefined) {
    args.push(JSON.stringify(input.variables));
    sets.push(`variables = $${args.length}`);
  }

  if (sets.length === 0) return null;

  args.push(id);
  const rows = await execute<DBEmailTemplate>(
    `
    UPDATE email_templates SET ${sets.join(", ")} WHERE id = $${args.length} RETURNING *
  `,
    args,
  );
  return rows[0] ?? null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const rows = await execute<{ id: string }>(
    "DELETE FROM email_templates WHERE id = $1 RETURNING id",
    [id],
  );
  return rows.length > 0;
}

// ─────────────────────────────────────────────
// Email Log
// ─────────────────────────────────────────────

export async function listEmailLog(opts: {
  page: number;
  per_page: number;
  request_id?: string;
  status?: EmailStatus;
}): Promise<{ data: DBEmailLog[]; total: number }> {
  const { page, per_page, request_id, status } = opts;
  const offset = (page - 1) * per_page;

  const args: unknown[] = [];
  const where: string[] = [];

  if (request_id) {
    args.push(request_id);
    where.push(`request_id = $${args.length}`);
  }
  if (status) {
    args.push(status);
    where.push(`status = $${args.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM email_log ${whereClause}`,
    args,
  );
  const total = parseInt(countRow?.count ?? "0");

  args.push(per_page, offset);
  const data = await query<DBEmailLog>(
    `
    SELECT * FROM email_log ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${args.length - 1} OFFSET $${args.length}
  `,
    args,
  );

  return { data, total };
}

// ─────────────────────────────────────────────
// Core send function — resolves template, interpolates, sends, logs
// ─────────────────────────────────────────────

export async function sendEmail(
  input: SendEmailInput & {
    sentBy?: string;
    variables?: Record<string, string>;
  },
): Promise<{ success: boolean; logId: string | null; error?: string }> {
  let subject = input.subject ?? "";
  let body_html = input.body_html ?? "";
  let body_text = input.body_text ?? "";
  let templateId: string | null = input.template_id ?? null;

  // Resolve template if provided
  if (input.template_id) {
    const tpl = await getTemplate(input.template_id);
    if (!tpl) {
      return { success: false, logId: null, error: "Email template not found" };
    }
    const vars = input.variables ?? {};
    subject = interpolate(tpl.subject, vars);
    body_html = interpolate(tpl.body_html, vars);
    body_text = interpolate(tpl.body_text, vars);
    templateId = tpl.id;
  }

  if (!subject || !body_html) {
    return {
      success: false,
      logId: null,
      error: "Email subject and body are required",
    };
  }

  // Create log entry in queued state
  const logRows = await execute<DBEmailLog>(
    `
    INSERT INTO email_log
      (request_id, template_id, sent_by, to_address, subject, body_html, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'queued')
    RETURNING *
  `,
    [
      input.request_id ?? null,
      templateId,
      input.sentBy ?? null,
      input.to,
      subject,
      body_html,
    ],
  );

  const logEntry = logRows[0];

  // Attempt delivery
  const result = await sendMail({
    to: input.to,
    subject,
    html: body_html,
    text: body_text,
  });

  // Update log with outcome
  const finalStatus: EmailStatus = result.success ? "sent" : "failed";
  await execute(
    `UPDATE email_log
     SET status = $1, sent_at = $2, error_msg = $3
     WHERE id = $4`,
    [
      finalStatus,
      result.success ? new Date().toISOString() : null,
      result.error ?? null,
      logEntry.id,
    ],
  );

  return {
    success: result.success,
    logId: logEntry.id,
    error: result.error,
  };
}

// ─────────────────────────────────────────────
// Send to request participants (helper used by workflow engine)
// ─────────────────────────────────────────────

export async function sendToRequestParticipants(opts: {
  requestId: string;
  templateId: string;
  to: "submitter" | "assignee" | string; // email or role keyword
  variables: Record<string, string>;
  sentBy?: string;
}): Promise<void> {
  const { requestId, templateId, to, variables, sentBy } = opts;

  let email = to;

  if (to === "submitter" || to === "assignee") {
    const rows = await query<{
      submitter_email: string;
      assignee_email: string | null;
    }>(
      `
      SELECT u1.email AS submitter_email, u2.email AS assignee_email
      FROM requests r
      JOIN users u1 ON u1.id = r.submitted_by
      LEFT JOIN users u2 ON u2.id = r.assigned_to
      WHERE r.id = $1 LIMIT 1
    `,
      [requestId],
    );

    const row = rows[0];
    if (!row) return;

    email =
      to === "submitter"
        ? row.submitter_email
        : (row.assignee_email ?? row.submitter_email);
  }

  await sendEmail({
    to: email,
    template_id: templateId,
    request_id: requestId,
    variables,
    sentBy,
  });
}

// ─────────────────────────────────────────────
// Seed default templates (called from migration or admin panel)
// ─────────────────────────────────────────────

export async function seedDefaultTemplates(adminId: string): Promise<void> {
  const defaults = [
    {
      name: "request_received",
      subject: "Your request has been received — {{title}}",
      body_html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <div style="background:#6366f1;padding:32px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Request Received</h1>
          </div>
          <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
            <p>Hi <strong>{{submitter_name}}</strong>,</p>
            <p>We've received your request: <strong>"{{title}}"</strong></p>
            <p>Your request has been assigned <strong>{{priority}}</strong> priority and is currently <strong>pending review</strong>. You'll hear from us soon.</p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:24px 0">
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Request Details</p>
              <p style="margin:0;font-weight:600">{{title}}</p>
              <p style="margin:4px 0 0;font-size:14px;color:#64748b">Priority: {{priority}}</p>
            </div>
            <p style="font-size:14px;color:#64748b">If you have any questions, simply reply to this email.</p>
            <p style="margin-top:32px;font-size:14px;color:#94a3b8">— The FlowDesk Team</p>
          </div>
        </div>
      `.trim(),
      body_text:
        'Hi {{submitter_name}}, your request "{{title}}" has been received with {{priority}} priority. We will be in touch soon.',
      variables: ["submitter_name", "title", "priority"],
    },
    {
      name: "request_assigned",
      subject: "Request assigned to you — {{title}}",
      body_html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <div style="background:#6366f1;padding:32px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Request Assigned</h1>
          </div>
          <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
            <p>Hi <strong>{{assignee_name}}</strong>,</p>
            <p>A request has been assigned to you: <strong>"{{title}}"</strong></p>
            <p>Submitted by <strong>{{submitter_name}}</strong> with <strong>{{priority}}</strong> priority.</p>
            <p style="font-size:14px;color:#64748b">Please review and take action as soon as possible.</p>
            <p style="margin-top:32px;font-size:14px;color:#94a3b8">— The FlowDesk Team</p>
          </div>
        </div>
      `.trim(),
      body_text:
        'Hi {{assignee_name}}, request "{{title}}" from {{submitter_name}} has been assigned to you. Priority: {{priority}}.',
      variables: ["assignee_name", "title", "submitter_name", "priority"],
    },
    {
      name: "request_completed",
      subject: "Your request has been completed — {{title}}",
      body_html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <div style="background:#10b981;padding:32px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">✓ Request Completed</h1>
          </div>
          <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
            <p>Hi <strong>{{submitter_name}}</strong>,</p>
            <p>Great news! Your request has been marked as <strong>completed</strong>:</p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:24px 0">
              <p style="margin:0;font-weight:600">{{title}}</p>
            </div>
            <p style="font-size:14px;color:#64748b">If you have any follow-up questions, simply reply to this email.</p>
            <p style="margin-top:32px;font-size:14px;color:#94a3b8">— The FlowDesk Team</p>
          </div>
        </div>
      `.trim(),
      body_text:
        'Hi {{submitter_name}}, your request "{{title}}" has been completed. Thank you for using FlowDesk.',
      variables: ["submitter_name", "title"],
    },
    {
      name: "request_status_update",
      subject: "Request update — {{title}}",
      body_html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <div style="background:#3b82f6;padding:32px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Status Update</h1>
          </div>
          <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
            <p>Hi <strong>{{submitter_name}}</strong>,</p>
            <p>The status of your request <strong>"{{title}}"</strong> has been updated to <strong>{{new_status}}</strong>.</p>
            <p style="font-size:14px;color:#64748b">We'll keep you informed as things progress.</p>
            <p style="margin-top:32px;font-size:14px;color:#94a3b8">— The FlowDesk Team</p>
          </div>
        </div>
      `.trim(),
      body_text:
        'Hi {{submitter_name}}, your request "{{title}}" status has been updated to {{new_status}}.',
      variables: ["submitter_name", "title", "new_status"],
    },
  ];

  for (const tpl of defaults) {
    const existing = await getTemplateByName(tpl.name);
    if (!existing) {
      await createTemplate({ ...tpl, createdBy: adminId });
      console.log(`[Email Templates] Seeded: ${tpl.name}`);
    }
  }
}
