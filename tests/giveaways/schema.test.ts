import { setupDb, client } from "./_harness";
import { test } from "node:test";
import assert from "node:assert/strict";

test("schema applies to a fresh database", async () => {
  await setupDb();
  const { rows } = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name like 'giveaway_%' order by 1",
  );
  assert.deepEqual(
    rows.map((r) => r.table_name),
    [
      "giveaway_campaigns",
      "giveaway_claims",
      "giveaway_donations",
      "giveaway_draws",
      "giveaway_entrants",
      "giveaway_entries",
    ],
  );
});
