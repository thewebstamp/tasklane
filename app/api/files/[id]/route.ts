import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFile, deleteFileRecord } from "@/services/files.service";
import { deleteFile, getSignedUrl } from "@/lib/cloudinary";
import { ok, notFound, forbidden, withErrorHandler } from "@/lib/response";
import { trackEvent } from "@/services/analytics.service";

type Context = { params: Promise<{ id: string }> };

// ─────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────

export const GET = withErrorHandler(
  async (_req: NextRequest, ctx?: unknown) => {
    if (!ctx) return notFound("Invalid context");

    const { id } = await (ctx as Context).params;

    const session = await requireAuth();

    const file = await getFile(id, session.sub, session.role);
    if (!file) return notFound("File not found");

    const url = file.is_public
      ? file.cloudinary_url
      : getSignedUrl(file.cloudinary_id, 3600);

    return ok({ ...file, access_url: url });
  },
);

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export const DELETE = withErrorHandler(
  async (_req: NextRequest, ctx?: unknown) => {
    if (!ctx) return notFound("Invalid context");

    const { id } = await (ctx as Context).params;

    const session = await requireAuth();

    const file = await getFile(id, session.sub, session.role);
    if (!file) return notFound("File not found");

    if (file.uploaded_by !== session.sub && session.role !== "admin") {
      return forbidden("You do not have permission to delete this file");
    }

    try {
      await deleteFile(file.cloudinary_id);
    } catch (err) {
      console.error("[Cloudinary Delete Error]", err);
    }

    await deleteFileRecord(id);

    trackEvent(session.sub, "file_deleted", "file", id).catch(console.error);

    return ok(null, "File deleted successfully");
  },
);
