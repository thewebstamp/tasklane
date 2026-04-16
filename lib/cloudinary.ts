import { v2 as cloudinary } from "cloudinary";

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface UploadResult {
  cloudinary_id: string;
  cloudinary_url: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
}

// ─────────────────────────────────────────────
// Upload a file buffer to Cloudinary
// ─────────────────────────────────────────────

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  folder = "saas-platform",
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve({
          cloudinary_id: result.public_id,
          cloudinary_url: result.secure_url,
          filename: result.public_id.split("/").pop() ?? result.public_id,
          original_name: originalName,
          file_type:
            result.resource_type === "image"
              ? result.format
              : result.resource_type,
          file_size: result.bytes,
        });
      },
    );

    uploadStream.end(buffer);
  });
}

// ─────────────────────────────────────────────
// Delete a file from Cloudinary
// ─────────────────────────────────────────────

export async function deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
}

// ─────────────────────────────────────────────
// Generate a signed URL for secure access
// ─────────────────────────────────────────────

export function getSignedUrl(
  publicId: string,
  expiresInSeconds = 3600,
): string {
  return cloudinary.url(publicId, {
    sign_url: true,
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
}

// ─────────────────────────────────────────────
// Parse multipart form data (Next.js route handler)
// ─────────────────────────────────────────────

/**
 * Convert a Web API File object to a Buffer for Cloudinary upload.
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Validate file before upload.
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
  ];

  if (file.size > MAX_SIZE) {
    return { valid: false, error: "File size must be under 25MB" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed` };
  }

  return { valid: true };
}
