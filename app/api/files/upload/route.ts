import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadFile, fileToBuffer, validateFile } from "@/lib/cloudinary";
import { saveFile } from "@/services/files.service";
import { trackEvent } from "@/services/analytics.service";
import {
  created,
  badRequest,
  serverError,
  withErrorHandler,
} from "@/lib/response";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireAuth();

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return badRequest("Expected multipart/form-data");
  }

  const file = formData.get("file");
  const requestId = formData.get("request_id") as string | null;
  const isPublic = formData.get("is_public") === "true";

  if (!file || typeof file === "string") {
    return badRequest('No file provided. Send the file as "file" field.');
  }

  // Validate type and size
  const validation = validateFile(file);
  if (!validation.valid) {
    return badRequest(validation.error ?? "Invalid file");
  }

  // Convert to Buffer for Cloudinary
  let buffer: Buffer;
  try {
    buffer = await fileToBuffer(file);
  } catch {
    return serverError("Failed to read file data");
  }

  // Upload to Cloudinary
  let uploadResult;
  try {
    uploadResult = await uploadFile(
      buffer,
      file.name,
      "saas-platform/requests",
    );
  } catch (err) {
    console.error("[Cloudinary Upload Error]", err);
    return serverError("File upload failed. Please try again.");
  }

  // Save record to DB
  const record = await saveFile({
    request_id: requestId || null,
    uploaded_by: session.sub,
    filename: uploadResult.filename,
    original_name: uploadResult.original_name,
    cloudinary_id: uploadResult.cloudinary_id,
    cloudinary_url: uploadResult.cloudinary_url,
    file_type: uploadResult.file_type,
    file_size: uploadResult.file_size,
    is_public: isPublic,
  });

  // Track
  trackEvent(session.sub, "file_uploaded", "file", record.id).catch(
    console.error,
  );

  return created(record, "File uploaded successfully");
});
