import { query, queryOne, execute } from "@/lib/db";
import type {
  RequestWithUsers,
  DBRequest,
  PaginatedResult,
  PaginationParams,
  CreateRequestInput,
  UpdateRequestInput,
  RequestCommentWithUser,
  RequestStatus,
} from "@/types";

// ─────────────────────────────────────────────
// Allowed sort columns (whitelist — prevents SQL injection)
// ─────────────────────────────────────────────
const ALLOWED_SORT = new Set([
  "created_at",
  "updated_at",
  "title",
  "status",
  "priority",
  "due_date",
]);

// ─────────────────────────────────────────────
// List requests with filtering / pagination
// ─────────────────────────────────────────────
export async function listRequests(
  params: PaginationParams,
  viewerId: string,
  viewerRole: string,
): Promise<PaginatedResult<RequestWithUsers>> {
  const {
    page = 1,
    per_page = 20,
    search,
    status,
    priority,
    assigned_to,
    sort_by = "created_at",
    sort_dir = "desc",
  } = params;

  const isStaff = viewerRole === "admin" || viewerRole === "staff";
  const sortCol = ALLOWED_SORT.has(sort_by) ? sort_by : "created_at";
  const sortDir = sort_dir === "asc" ? "ASC" : "DESC";
  const offset = (page - 1) * per_page;

  const args: unknown[] = [];
  const where: string[] = [];

  // Role filter
  if (!isStaff) {
    args.push(viewerId);
    where.push(`r.submitted_by = $${args.length}`);
  }

  // Status filter
  if (status) {
    args.push(status);
    where.push(`r.status = $${args.length}`);
  }

  // Priority filter
  if (priority) {
    args.push(priority);
    where.push(`r.priority = $${args.length}`);
  }

  // Assigned to filter
  if (assigned_to) {
    args.push(assigned_to);
    where.push(`r.assigned_to = $${args.length}`);
  }

  // Search
  if (search) {
    args.push(`%${search.toLowerCase()}%`);
    where.push(
      `(lower(r.title) LIKE $${args.length} OR lower(r.description) LIKE $${args.length})`,
    );
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const baseQuery = `
    FROM requests r
    JOIN users u1 ON u1.id = r.submitted_by
    LEFT JOIN users u2 ON u2.id = r.assigned_to
    ${whereClause}
  `;

  // Total count
  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) ${baseQuery}`,
    args,
  );
  const total = parseInt(countRow?.count ?? "0");

  // Paginated data
  args.push(per_page, offset);
  const data = await query<RequestWithUsers>(
    `
    SELECT
      r.*,
      u1.name  AS submitter_name,
      u1.email AS submitter_email,
      u2.name  AS assignee_name,
      u2.email AS assignee_email
    ${baseQuery}
    ORDER BY r.${sortCol} ${sortDir}
    LIMIT $${args.length - 1} OFFSET $${args.length}
  `,
    args,
  );

  return {
    data,
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  };
}

// ─────────────────────────────────────────────
// Get single request
// ─────────────────────────────────────────────
export async function getRequest(
  id: string,
  viewerId: string,
  viewerRole: string,
): Promise<RequestWithUsers | null> {
  const isStaff = viewerRole === "admin" || viewerRole === "staff";

  return queryOne<RequestWithUsers>(
    `
    SELECT
      r.*,
      u1.name  AS submitter_name,
      u1.email AS submitter_email,
      u2.name  AS assignee_name,
      u2.email AS assignee_email
    FROM requests r
    JOIN users u1 ON u1.id = r.submitted_by
    LEFT JOIN users u2 ON u2.id = r.assigned_to
    WHERE r.id = $1
    ${isStaff ? "" : "AND r.submitted_by = $2"}
    LIMIT 1
  `,
    isStaff ? [id] : [id, viewerId],
  );
}

// ─────────────────────────────────────────────
// Create request
// ─────────────────────────────────────────────
export async function createRequest(
  input: CreateRequestInput,
  submittedBy: string,
): Promise<DBRequest> {
  const rows = await execute<DBRequest>(
    `
    INSERT INTO requests (title, description, priority, due_date, assigned_to, form_data, submitted_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `,
    [
      input.title,
      input.description ?? null,
      input.priority ?? "medium",
      input.due_date ?? null,
      input.assigned_to ?? null,
      JSON.stringify(input.form_data ?? {}),
      submittedBy,
    ],
  );

  return rows[0];
}

// ─────────────────────────────────────────────
// Update request
// ─────────────────────────────────────────────
export async function updateRequest(
  id: string,
  input: UpdateRequestInput,
  viewerId: string,
  viewerRole: string,
): Promise<DBRequest | null> {
  const isStaff = viewerRole === "admin" || viewerRole === "staff";

  // Build SET clause dynamically (only provided fields)
  const sets: string[] = [];
  const args: unknown[] = [];

  const fields: [keyof UpdateRequestInput, string][] = [
    ["title", "title"],
    ["description", "description"],
    ["status", "status"],
    ["priority", "priority"],
    ["due_date", "due_date"],
    ["assigned_to", "assigned_to"],
  ];

  for (const [key, col] of fields) {
    if (key in input) {
      args.push(input[key] ?? null);
      sets.push(`${col} = $${args.length}`);
    }
  }

  if ("form_data" in input && input.form_data !== undefined) {
    args.push(JSON.stringify(input.form_data));
    sets.push(`form_data = $${args.length}`);
  }

  // Normalize status type (fix TS narrowing issue)
  const status = input.status as RequestStatus | undefined;

  // Mark completed_at when status changes
  if (status) {
    sets.push(
      status === "completed" ? `completed_at = now()` : `completed_at = NULL`,
    );
  }

  if (sets.length === 0) return null;

  args.push(id);
  const idParam = `$${args.length}`;

  const ownerClause = isStaff ? "" : ` AND submitted_by = $${args.length + 1}`;
  if (!isStaff) args.push(viewerId);

  const rows = await execute<DBRequest>(
    `
    UPDATE requests
    SET ${sets.join(", ")}
    WHERE id = ${idParam}${ownerClause}
    RETURNING *
  `,
    args,
  );

  return rows[0] ?? null;
}

// ─────────────────────────────────────────────
// Delete request (admin only)
// ─────────────────────────────────────────────
export async function deleteRequest(id: string): Promise<boolean> {
  const rows = await execute<{ id: string }>(
    "DELETE FROM requests WHERE id = $1 RETURNING id",
    [id],
  );
  return rows.length > 0;
}

// ─────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────
export async function getComments(
  requestId: string,
): Promise<RequestCommentWithUser[]> {
  return query<RequestCommentWithUser>(
    `
    SELECT
      c.*,
      u.name       AS user_name,
      u.avatar_url AS user_avatar
    FROM request_comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.request_id = $1
    ORDER BY c.created_at ASC
  `,
    [requestId],
  );
}

export async function addComment(
  requestId: string,
  userId: string,
  content: string,
  type: string = "comment",
): Promise<RequestCommentWithUser> {
  const rows = await execute<RequestCommentWithUser>(
    `
    WITH inserted AS (
      INSERT INTO request_comments (request_id, user_id, content, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    )
    SELECT i.*, u.name AS user_name, u.avatar_url AS user_avatar
    FROM inserted i
    LEFT JOIN users u ON u.id = i.user_id
  `,
    [requestId, userId, content, type],
  );

  return rows[0];
}
