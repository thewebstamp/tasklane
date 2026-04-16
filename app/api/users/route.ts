import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ok, withErrorHandler } from "@/lib/response";
import { query } from "@/lib/db";
import type { SafeUser } from "@/types";

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireRole(["admin", "staff"]);

  const url = new URL(req.url);
  const role = url.searchParams.get("role");
  const active = url.searchParams.get("active");

  const args: unknown[] = [];
  const where: string[] = [];

  if (role) {
    args.push(role);
    where.push(`role = $${args.length}`);
  }
  if (active !== null && active !== undefined) {
    args.push(active === "true");
    where.push(`is_active = $${args.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const users = await query<SafeUser>(
    `
    SELECT id, name, email, role, avatar_url, is_active, created_at, updated_at
    FROM users ${whereClause}
    ORDER BY name ASC
  `,
    args,
  );

  return ok(users);
});
