import { neon, neonConfig } from "@neondatabase/serverless";

// Enable connection pooling for serverless environments
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Initialize Neon client
export const sql = neon(process.env.DATABASE_URL);

/**
 * Execute a raw parameterized query.
 * Usage: await query('SELECT * FROM users WHERE id = $1', [userId])
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  try {
    const result = await sql.query(text, params); // ✅ FIXED
    return result as T[];
  } catch (error) {
    console.error("[DB Error]", { text, params, error });
    throw new Error(
      error instanceof Error ? error.message : "Database query failed",
    );
  }
}

/**
 * Fetch a single row or null if not found.
 */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Execute a write query (INSERT/UPDATE/DELETE) and return affected rows.
 */
export async function execute<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  return query<T>(text, params);
}
