import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { ok, unauthorized, withErrorHandler } from "@/lib/response";
import type { SafeUser } from "@/types";

export const GET = withErrorHandler(async () => {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = await queryOne<SafeUser>(
    `SELECT id, name, email, role, avatar_url, is_active, created_at, updated_at
     FROM users WHERE id = $1 AND is_active = true LIMIT 1`,
    [session.sub],
  );

  if (!user) return unauthorized("Account not found or inactive");

  return ok(user);
});
