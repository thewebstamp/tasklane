import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";
import { parseBody, RegisterSchema } from "@/lib/validators";
import {
  created,
  badRequest,
  conflict,
  withErrorHandler,
} from "@/lib/response";
import type { DBUser } from "@/types";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const parsed = parseBody(RegisterSchema, body);
  if (parsed.error) return badRequest(parsed.error);

  const data = parsed.data!; // non-null after error check

  const email = data.email.toLowerCase().trim();

  // Check if email is already taken
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [email],
  );

  if (existing) {
    return conflict("An account with this email already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Insert new user
  const rows = await query<DBUser>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, avatar_url, is_active, created_at`,
    [data.name.trim(), email, passwordHash, data.role],
  );

  const user = rows[0];

  // Sign JWT and set cookie
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  await setAuthCookie(token);

  return created(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
    },
    "Account created successfully",
  );
});
