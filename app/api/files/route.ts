import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listFiles } from "@/services/files.service";
import { ok, badRequest, withErrorHandler } from "@/lib/response";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await requireAuth();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const per_page = Math.min(
    50,
    parseInt(url.searchParams.get("per_page") ?? "20"),
  );
  const requestId = url.searchParams.get("request_id") ?? undefined;
  const uploadedBy = url.searchParams.get("uploaded_by") ?? undefined;

  const result = await listFiles({
    page,
    per_page,
    requestId,
    uploadedBy,
    viewerId: session.sub,
    viewerRole: session.role,
  });

  return ok(result);
});
