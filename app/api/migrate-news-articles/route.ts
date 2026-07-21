// TEMPORARY one-shot migration for the live preview db branch (Phase 1:
// newsroom articles). Removed after running — see git history.
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }
  await db.execute(sql`CREATE TABLE IF NOT EXISTS articles (
    id text PRIMARY KEY,
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    excerpt text NOT NULL DEFAULT '',
    body text NOT NULL DEFAULT '',
    cover_image_url text,
    author text NOT NULL DEFAULT 'Yufora',
    status text NOT NULL DEFAULT 'draft',
    published_at timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS articles_status_idx ON articles (status, published_at)`,
  );
  const check = await db.execute(
    sql`SELECT to_regclass('public.articles') AS t`,
  );
  return Response.json({ migrated: check.rows[0]?.t === "articles" });
}
