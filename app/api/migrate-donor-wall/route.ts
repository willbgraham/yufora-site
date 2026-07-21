// TEMPORARY one-shot migration for the live preview db branch.
// Adds contributions.display_preference. Removed after running.
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }
  await db.execute(
    sql`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS display_preference text NOT NULL DEFAULT 'anonymous'`,
  );
  const check = await db.execute(
    sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'contributions' AND column_name = 'display_preference'`,
  );
  return Response.json({ migrated: check.rows.length === 1 });
}
