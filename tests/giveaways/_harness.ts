/**
 * Test harness: an in-memory PGlite database with the real schema applied,
 * installed as the app's db singleton (lib/db/index.ts reads
 * globalThis.__yuforaDb) — no production code change, and no contact with
 * the local .pglite directory or Neon. Import this FIRST in every test file.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../lib/db/schema";

const client = new PGlite();
const testDb = drizzle(client, { schema });
(globalThis as unknown as { __yuforaDb?: unknown }).__yuforaDb = testDb;

let ready: Promise<void> | null = null;

export function setupDb(): Promise<void> {
  ready ??= (async () => {
    const { generateDrizzleJson, generateMigration } = await import(
      "drizzle-kit/api"
    );
    const statements = await generateMigration(
      generateDrizzleJson({}),
      generateDrizzleJson(schema as unknown as Record<string, unknown>),
    );
    for (const statement of statements) await client.exec(statement);
  })();
  return ready;
}

export { client, testDb, schema };

export async function seedCharity(slug: string, ownerEmail = `${slug}-owner@example.com`) {
  const [owner] = await testDb
    .insert(schema.user)
    .values({ name: "Owner", email: ownerEmail })
    .returning();
  const [charity] = await testDb
    .insert(schema.charities)
    .values({ name: `${slug} Foundation`, slug, ownerUserId: owner.id })
    .returning();
  return { owner, charity };
}
