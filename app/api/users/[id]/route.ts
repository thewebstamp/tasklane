import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseBody, UpdateUserSchema } from "@/lib/validators";
import {
  ok,
  badRequest,
  notFound,
  forbidden,
  withErrorHandler,
} from "@/lib/response";
import { queryOne, execute } from "@/lib/db";
import type { SafeUser } from "@/types";

type Context = { params: Promise<{ id: string }> };

// ─────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────

export const GET = withErrorHandler(
  async (_req: NextRequest, ctx?: unknown) => {
    if (!ctx) return notFound("Invalid context");

    const { id } = await (ctx as Context).params;

    const session = await requireAuth();

    // Users can fetch their own profile; admins can fetch anyone
    if (session.sub !== id && session.role !== "admin") {
      return forbidden();
    }

    const user = await queryOne<SafeUser>(
      `SELECT id, name, email, role, avatar_url, is_active, created_at, updated_at
     FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );

    if (!user) return notFound("User not found");

    return ok(user);
  },
);

// ─────────────────────────────────────────────
// PATCH
// ─────────────────────────────────────────────

export const PATCH = withErrorHandler(
  async (req: NextRequest, ctx?: unknown) => {
    if (!ctx) return notFound("Invalid context");

    const { id } = await (ctx as Context).params;

    const session = await requireAuth();

    // Users can only update their own name; admins can update role/is_active
    if (session.sub !== id && session.role !== "admin") {
      return forbidden();
    }

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body");

    const { data, error } = parseBody(UpdateUserSchema, body);
    if (error || !data) return badRequest(error ?? "Invalid data");

    // Non-admins cannot change role or is_active
    if (session.role !== "admin") {
      delete data.role;
      delete data.is_active;
    }

    const sets: string[] = [];
    const args: unknown[] = [];

    if (data.name !== undefined) {
      args.push(data.name);
      sets.push(`name = $${args.length}`);
    }

    if (data.role !== undefined) {
      args.push(data.role);
      sets.push(`role = $${args.length}`);
    }

    if (data.is_active !== undefined) {
      args.push(data.is_active);
      sets.push(`is_active = $${args.length}`);
    }

    if (sets.length === 0) return badRequest("No fields to update");

    args.push(id);

    const rows = await execute<SafeUser>(
      `
      UPDATE users SET ${sets.join(", ")}
      WHERE id = $${args.length}
      RETURNING id, name, email, role, avatar_url, is_active, created_at, updated_at
    `,
      args,
    );

    if (!rows[0]) return notFound("User not found");

    return ok(rows[0], "Profile updated");
  },
);
