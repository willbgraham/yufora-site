import "server-only";
import { createHash } from "node:crypto";
import path from "node:path";

/**
 * Photo storage with the same fallback principle as email/db:
 * - Vercel Blob configured → Blob (production). Two auth styles exist:
 *   classic BLOB_READ_WRITE_TOKEN, or the newer OIDC flow where the store
 *   connection injects BLOB_STORE_ID and the SDK exchanges the deployment's
 *   identity token automatically. Either counts as configured.
 * - otherwise, local dev   → files under .uploads/, served by
 *                            /api/uploads/[...path]
 * - otherwise, production  → clear error
 */
function blobConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID,
  );
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_PHOTOS_PER_PRODUCT = 8;

export function photoValidationError(file: File): string | null {
  if (!ALLOWED_TYPES[file.type]) {
    return "Photos must be JPEG, PNG, WebP, or GIF.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Each photo must be under 8MB.";
  }
  return null;
}

export async function savePhoto(
  file: File,
  productId: string,
): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("Unsupported image type");

  const name = `${crypto.randomUUID()}.${ext}`;

  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`products/${productId}/${name}`, file, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Blob storage is not configured — connect a Blob store in Vercel (Storage → Blob) to enable photo uploads.",
    );
  }

  // Local dev: write to .uploads/ (gitignored), serve via /api/uploads.
  const { mkdir, writeFile } = await import("node:fs/promises");
  const dir = path.join(process.cwd(), ".uploads", "products", productId);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, name),
    Buffer.from(await file.arrayBuffer()),
  );
  return `/api/uploads/products/${productId}/${name}`;
}

/** Best-effort delete; storage orphans are acceptable, broken rows are not. */
export async function deletePhotoBlob(url: string): Promise<void> {
  try {
    if (url.startsWith("/api/uploads/")) {
      const rel = url.replace("/api/uploads/", "");
      // Path traversal guard even though we wrote these paths ourselves.
      const base = path.join(process.cwd(), ".uploads");
      const target = path.resolve(base, rel);
      if (!target.startsWith(base + path.sep)) return;
      const { unlink } = await import("node:fs/promises");
      await unlink(target);
      return;
    }
    if (blobConfigured()) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch (err) {
    console.warn("[storage] photo delete failed (ignored)", err);
  }
}

/** Stable ETag for locally served files. */
export function etagFor(buf: Buffer): string {
  return `"${createHash("sha1").update(buf).digest("hex")}"`;
}
