import { query, queryOne, execute } from "@/lib/db";
import type { DBFile, PaginatedResult } from "@/types";

// ─────────────────────────────────────────────
// List files (paginated, scoped by role)
// ─────────────────────────────────────────────
export async function listFiles(opts: {
  page: number;
  per_page: number;
  requestId?: string;
  uploadedBy?: string;
  viewerId: string;
  viewerRole: string;
}): Promise<PaginatedResult<DBFile & { uploader_name: string | null }>> {
  const { page, per_page, requestId, uploadedBy, viewerId, viewerRole } = opts;
  const isStaff = viewerRole === "admin" || viewerRole === "staff";
  const offset = (page - 1) * per_page;

  const args: unknown[] = [];
  const where: string[] = [];

  if (!isStaff) {
    args.push(viewerId);
    where.push(`f.uploaded_by = $${args.length}`);
  }
  if (requestId) {
    args.push(requestId);
    where.push(`f.request_id = $${args.length}`);
  }
  if (uploadedBy) {
    args.push(uploadedBy);
    where.push(`f.uploaded_by = $${args.length}`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const baseQuery = `
    FROM files f
    LEFT JOIN users u ON u.id = f.uploaded_by
    ${whereClause}
  `;

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) ${baseQuery}`,
    args,
  );
  const total = parseInt(countRow?.count ?? "0");

  args.push(per_page, offset);
  const data = await query<DBFile & { uploader_name: string | null }>(
    `
    SELECT f.*, u.name AS uploader_name
    ${baseQuery}
    ORDER BY f.created_at DESC
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
// Get single file
// ─────────────────────────────────────────────
export async function getFile(
  id: string,
  viewerId: string,
  viewerRole: string,
): Promise<(DBFile & { uploader_name: string | null }) | null> {
  const isStaff = viewerRole === "admin" || viewerRole === "staff";

  return queryOne<DBFile & { uploader_name: string | null }>(
    `
    SELECT f.*, u.name AS uploader_name
    FROM files f
    LEFT JOIN users u ON u.id = f.uploaded_by
    WHERE f.id = $1
    ${isStaff ? "" : "AND f.uploaded_by = $2"}
    LIMIT 1
  `,
    isStaff ? [id] : [id, viewerId],
  );
}

// ─────────────────────────────────────────────
// Save file record after Cloudinary upload
// ─────────────────────────────────────────────
export async function saveFile(input: {
  request_id?: string | null;
  uploaded_by: string;
  filename: string;
  original_name: string;
  cloudinary_id: string;
  cloudinary_url: string;
  file_type: string;
  file_size: number;
  is_public?: boolean;
}): Promise<DBFile> {
  const rows = await execute<DBFile>(
    `
    INSERT INTO files
      (request_id, uploaded_by, filename, original_name,
       cloudinary_id, cloudinary_url, file_type, file_size, is_public)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `,
    [
      input.request_id ?? null,
      input.uploaded_by,
      input.filename,
      input.original_name,
      input.cloudinary_id,
      input.cloudinary_url,
      input.file_type,
      input.file_size,
      input.is_public ?? false,
    ],
  );
  return rows[0];
}

// ─────────────────────────────────────────────
// Delete file record
// ─────────────────────────────────────────────
export async function deleteFileRecord(id: string): Promise<DBFile | null> {
  const rows = await execute<DBFile>(
    "DELETE FROM files WHERE id = $1 RETURNING *",
    [id],
  );
  return rows[0] ?? null;
}

// ─────────────────────────────────────────────
// Get files attached to a request
// ─────────────────────────────────────────────
export async function getRequestFiles(
  requestId: string,
): Promise<(DBFile & { uploader_name: string | null })[]> {
  return query<DBFile & { uploader_name: string | null }>(
    `
    SELECT f.*, u.name AS uploader_name
    FROM files f
    LEFT JOIN users u ON u.id = f.uploaded_by
    WHERE f.request_id = $1
    ORDER BY f.created_at DESC
  `,
    [requestId],
  );
}

// ─────────────────────────────────────────────
// Attach/detach file to a request
// ─────────────────────────────────────────────
export async function attachFileToRequest(
  fileId: string,
  requestId: string,
): Promise<DBFile | null> {
  const rows = await execute<DBFile>(
    "UPDATE files SET request_id = $1 WHERE id = $2 RETURNING *",
    [requestId, fileId],
  );
  return rows[0] ?? null;
}
