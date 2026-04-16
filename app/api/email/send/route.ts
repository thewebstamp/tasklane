import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseBody, SendEmailSchema } from "@/lib/validators";
import { ok, badRequest, serverError, withErrorHandler } from "@/lib/response";
import { sendEmail } from "@/services/email.service";
import { trackEvent } from "@/services/analytics.service";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireRole(["admin", "staff"]);

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const { data, error } = parseBody(SendEmailSchema, body);
  if (error || !data) return badRequest(error ?? "Invalid data");

  const result = await sendEmail({
    to: data.to,
    template_id: data.template_id,
    subject: data.subject,
    body_html: data.body_html,
    body_text: data.body_text,
    variables: data.variables as Record<string, string>,
    request_id: data.request_id,
    sentBy: session.sub,
  });

  if (!result.success) {
    return serverError(result.error ?? "Failed to send email");
  }

  trackEvent(
    session.sub,
    "email_sent",
    "email_log",
    result.logId ?? undefined,
  ).catch(console.error);

  return ok({ log_id: result.logId }, "Email sent successfully");
});
