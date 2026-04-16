import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth";
import { parseBody, ChangePasswordSchema } from "@/lib/validators";
import {
  ok,
  badRequest,
  forbidden,
  unauthorized,
  withErrorHandler,
} from "@/lib/response";
import { queryOne, execute } from "@/lib/db";
import type { DBUser } from "@/types";

type Context = { params: { id: string } };

export const POST = withErrorHandler(async (req: NextRequest, ctx?: unknown) => {
  const { params } = ctx as Context;

  const session = await requireAuth();

  // Only the account owner can change their password
  if (session.sub !== params.id) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const { data, error } = parseBody(ChangePasswordSchema, body);
  if (error || !data) return badRequest(error ?? "Invalid data");

  // Fetch current hash
  const user = await queryOne<Pick<DBUser, "id" | "password_hash">>(
    "SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1",
    [session.sub],
  );
  if (!user) return unauthorized();

  // Verify current password
  const valid = await bcrypt.compare(data.current_password, user.password_hash);
  if (!valid) return badRequest("Current password is incorrect");

  // Hash and update
  const newHash = await bcrypt.hash(data.new_password, 12);

  await execute("UPDATE users SET password_hash = $1 WHERE id = $2", [
    newHash,
    session.sub,
  ]);

  return ok(null, "Password changed successfully");
});
