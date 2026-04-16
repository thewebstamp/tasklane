import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseBody, CreateEmailTemplateSchema } from "@/lib/validators";
import {
  ok,
  created,
  badRequest,
  conflict,
  withErrorHandler,
} from "@/lib/response";
import {
  listTemplates,
  createTemplate,
  getTemplateByName,
} from "@/services/email.service";

export const GET = withErrorHandler(async () => {
  await requireRole(["admin", "staff"]);
  const templates = await listTemplates();
  return ok(templates);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireRole(["admin"]);

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const { data, error } = parseBody(CreateEmailTemplateSchema, body);
  if (error || !data) return badRequest(error ?? "Invalid data");

  const existing = await getTemplateByName(data.name);
  if (existing) return conflict(`Template "${data.name}" already exists`);

  const template = await createTemplate({
    ...data,
    variables: data.variables ?? [],
    createdBy: session.sub,
  });

  return created(template, "Email template created");
});
