import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseBody, RequestCommentSchema } from "@/lib/validators";
import {
  ok,
  created,
  badRequest,
  notFound,
  withErrorHandler,
} from "@/lib/response";
import {
  getRequest,
  getComments,
  addComment,
} from "@/services/requests.service";

// ─────────────────────────────────────────────
// helper type
// ─────────────────────────────────────────────

type Context = { params: Promise<{ id: string }> };

// ─────────────────────────────────────────────
// GET comments
// ─────────────────────────────────────────────

export const GET = withErrorHandler(
  async (_req: NextRequest, ctx?: unknown) => {
    if (!ctx) return notFound("Invalid context");

    const { params } = (await ctx) as Context;
    const { id } = await params;

    const session = await requireAuth();

    const request = await getRequest(id, session.sub, session.role);
    if (!request) return notFound("Request not found");

    const comments = await getComments(id);
    return ok(comments);
  },
);

// ─────────────────────────────────────────────
// POST comment
// ─────────────────────────────────────────────

export const POST = withErrorHandler(
  async (req: NextRequest, ctx?: unknown) => {
    if (!ctx) return notFound("Invalid context");

    const { params } = (await ctx) as Context;
    const { id } = await params;

    const session = await requireAuth();

    const request = await getRequest(id, session.sub, session.role);
    if (!request) return notFound("Request not found");

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body");

    const { data, error } = parseBody(RequestCommentSchema, body);
    if (error || !data) return badRequest(error ?? "Invalid data");

    const comment = await addComment(id, session.sub, data.content, data.type);

    return created(comment, "Comment added");
  },
);
