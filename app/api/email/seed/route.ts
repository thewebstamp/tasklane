import { requireRole } from "@/lib/auth";
import { ok, withErrorHandler } from "@/lib/response";
import { seedDefaultTemplates } from "@/services/email.service";

export const POST = withErrorHandler(async () => {
  const session = await requireRole(["admin"]);
  await seedDefaultTemplates(session.sub);
  return ok(null, "Default templates seeded successfully");
});
