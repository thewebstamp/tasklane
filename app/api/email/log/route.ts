import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ok, withErrorHandler } from "@/lib/response";
import { listEmailLog } from "@/services/email.service";
import type { EmailStatus } from "@/types";

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireRole(["admin", "staff"]);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const per_page = Math.min(
    50,
    parseInt(url.searchParams.get("per_page") ?? "20"),
  );
  const request_id = url.searchParams.get("request_id") ?? undefined;
  const status = url.searchParams.get("status") as EmailStatus | undefined;

  const result = await listEmailLog({ page, per_page, request_id, status });
  return ok(result);
});
