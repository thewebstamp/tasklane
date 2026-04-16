import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";
import { parseBody, LoginSchema } from "@/lib/validators";
import { ok, badRequest, unauthorized, withErrorHandler } from "@/lib/response";
import type { DBUser } from "@/types";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const parsed = parseBody(LoginSchema, body);
  if (parsed.error) return badRequest(parsed.error);

  const data = parsed.data!; // Non-null after error check

  // Fetch user by email
  const rows = await query<DBUser>(
    "SELECT * FROM users WHERE email = $1 AND is_active = true LIMIT 1",
    [data.email.toLowerCase().trim()],
  );

  const user = rows[0];

  // Constant-time password comparison
  const passwordValid = user
    ? await bcrypt.compare(data.password, user.password_hash)
    : await bcrypt.compare(
        data.password,
        "$2b$12$invalidhashfortimingreasons000000000000000000000",
      );

  if (!user || !passwordValid) {
    return unauthorized("Invalid email or password");
  }

  // Sign JWT and set cookie
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  await setAuthCookie(token);

  return ok(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
    },
    "Logged in successfully",
  );
});
