import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getRequest } from "@/services/requests.service";
import { getRequestFiles } from "@/services/files.service";
import { ok, notFound, withErrorHandler } from "@/lib/response";

type Context = { params: { id: string } };

export const GET = withErrorHandler(async (_req: NextRequest, ctx?: unknown) => {
  const session = await requireAuth();

  const { params } = ctx as Context;

  const request = await getRequest(params.id, session.sub, session.role);
  if (!request) return notFound("Request not found");

  const files = await getRequestFiles(params.id);

  return ok(files);
});