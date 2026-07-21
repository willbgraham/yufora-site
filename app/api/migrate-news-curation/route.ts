// TEMPORARY one-shot migration for the live preview db branch (Phase 2:
// newsroom curation — sources + items). Removed after running.
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }
  await db.execute(sql`CREATE TABLE IF NOT EXISTS news_sources (
    id text PRIMARY KEY,
    type text NOT NULL,
    url text NOT NULL,
    title text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    last_fetched_at timestamp,
    last_status text,
    last_error text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS news_sources_active_idx ON news_sources (active)`,
  );

  await db.execute(sql`CREATE TABLE IF NOT EXISTS news_items (
    id text PRIMARY KEY,
    source_id text REFERENCES news_sources(id) ON DELETE CASCADE,
    kind text NOT NULL DEFAULT 'article',
    external_id text NOT NULL,
    title text NOT NULL,
    excerpt text NOT NULL DEFAULT '',
    raw_excerpt text,
    link text NOT NULL,
    image_url text,
    embed_url text,
    author text,
    published_at timestamp,
    edited_title text,
    edited_excerpt text,
    editor_note text,
    status text NOT NULL DEFAULT 'pending',
    approved_at timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS news_items_status_idx ON news_items (status, published_at)`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS news_items_source_idx ON news_items (source_id)`,
  );
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS news_items_source_ext_idx ON news_items (source_id, external_id)`,
  );

  const check = await db.execute(
    sql`SELECT to_regclass('public.news_sources') AS s, to_regclass('public.news_items') AS i`,
  );
  return Response.json({
    migrated:
      check.rows[0]?.s === "news_sources" && check.rows[0]?.i === "news_items",
  });
}
