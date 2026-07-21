// TEMPORARY one-shot migration + demo seed for the live preview db branch.
// Adds wall_entries and charities.ticker_stripe_account_id, points the
// seeded test charity's ticker at the rehearsal connected account, and adds
// two attested demo names. Removed after running.
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }
  await db.execute(
    sql`ALTER TABLE charities ADD COLUMN IF NOT EXISTS ticker_stripe_account_id text`,
  );
  await db.execute(sql`CREATE TABLE IF NOT EXISTS wall_entries (
    id text PRIMARY KEY,
    charity_id text NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
    name text NOT NULL,
    amount_cents integer,
    created_at timestamp NOT NULL DEFAULT now()
  )`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS wall_entries_charity_idx ON wall_entries (charity_id)`,
  );
  await db.execute(
    sql`UPDATE charities SET ticker_stripe_account_id = 'acct_1TvLFA0BrKgAtrEL' WHERE slug = 'riverside-animal-rescue'`,
  );
  await db.execute(sql`INSERT INTO wall_entries (id, charity_id, name, amount_cents)
    SELECT gen_random_uuid(), id, 'The Graham Family', 50000 FROM charities WHERE slug = 'riverside-animal-rescue'
    AND NOT EXISTS (SELECT 1 FROM wall_entries WHERE name = 'The Graham Family')`);
  await db.execute(sql`INSERT INTO wall_entries (id, charity_id, name, amount_cents)
    SELECT gen_random_uuid(), id, 'Riverside Hardware Co.', NULL FROM charities WHERE slug = 'riverside-animal-rescue'
    AND NOT EXISTS (SELECT 1 FROM wall_entries WHERE name = 'Riverside Hardware Co.')`);
  return Response.json({ migrated: true });
}
