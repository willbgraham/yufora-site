// TEMPORARY one-shot migration for the live preview db branch (its
// connection string is deployment-internal). Adds charities.embed_page_url.
// Removed after running — see git history.
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }
  await db.execute(
    sql`ALTER TABLE charities ADD COLUMN IF NOT EXISTS embed_page_url text`,
  );
  const check = await db.execute(
    sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'charities' AND column_name = 'embed_page_url'`,
  );
  return Response.json({ migrated: check.rows.length === 1 });
}
