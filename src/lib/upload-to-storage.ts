import { createClient } from "@/lib/supabase/client";

export type StoredUpload = {
  bucket: string;
  path: string;
  name: string;
  type: string;
  size: number;
};

export type UploadPurpose = "quiz" | "flashcard" | "material";

/**
 * Upload a file STRAIGHT to Supabase Storage from the browser, bypassing the
 * Vercel function (whose request body is capped at ~4.5 MB). We first ask our
 * own API for a short-lived signed upload URL (server-authorized), then PUT the
 * bytes directly to Supabase. The caller then sends only the returned
 * {bucket, path} reference to the generate/share API.
 */
export async function uploadToStorage(
  file: File,
  purpose: UploadPurpose,
): Promise<StoredUpload> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
      purpose,
    }),
  });
  if (!signRes.ok) {
    const b = await signRes.json().catch(() => ({}));
    throw new Error(b.error || "Could not start the upload.");
  }
  const { bucket, path, token } = (await signRes.json()) as {
    bucket: string;
    path: string;
    token: string;
  };

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || undefined,
    });
  if (error) {
    throw new Error(error.message || "Upload failed. Please try again.");
  }

  return { bucket, path, name: file.name, type: file.type, size: file.size };
}

// Files at or below this go straight through the API as multipart, the simple,
// reliable path that needs no Storage at all. Vercel caps a function body at
// ~4.5 MB, so we stay safely under that and only route LARGER files through
// Storage (which bypasses the cap but adds a dependency that can fail).
const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024;

/**
 * Attach a source file to a generate/OCR request. Small files are appended
 * directly (no Storage round-trip, so generation keeps working even if Storage
 * is misconfigured); only files too large for the Vercel body cap are uploaded
 * to Storage first and passed by reference. The API routes accept either shape.
 */
export async function appendSourceFile(
  fd: FormData,
  file: File,
  purpose: UploadPurpose,
): Promise<void> {
  if (file.size <= DIRECT_UPLOAD_LIMIT) {
    fd.append("file", file);
    return;
  }
  const up = await uploadToStorage(file, purpose);
  fd.append("bucket", up.bucket);
  fd.append("path", up.path);
  fd.append("fileName", up.name);
  fd.append("fileType", up.type);
}
