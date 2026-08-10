import { NextRequest } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { etagFor } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Serves locally stored dev uploads from .uploads/.
 * In production photos live on Vercel Blob and this route just 404s.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;

  const base = path.join(process.cwd(), ".uploads");
  const target = path.resolve(base, ...segments);
  // Path traversal guard.
  if (!target.startsWith(base + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  const type = CONTENT_TYPES[path.extname(target).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  try {
    const buf = await readFile(target);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: etagFor(buf),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
