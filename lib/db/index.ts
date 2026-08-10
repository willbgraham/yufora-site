import "server-only";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

/**
 * Driver switch:
 * - DATABASE_URL set (Neon/any Postgres) → node-postgres pool
 * - otherwise, local dev             → PGlite (embedded Postgres in .pglite/)
 * - otherwise, production            → clear error at first query
 *
 * The exported `db` is a lazy proxy: nothing connects at import time, so
 * `next build` succeeds with no database configured — the same principle as
 * the lead form's missing-API-key fallback.
 */
/* Synchronous requires are deliberate here: the driver must be chosen at
   runtime, and only one of the two ever loads. Static imports would pull
   both into every bundle. */
/* eslint-disable @typescript-eslint/no-require-imports */
function createDb(): Db {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { Pool } = require("pg") as typeof import("pg");
    const { drizzle } =
      require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
    return drizzle(new Pool({ connectionString: url }), { schema });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. The admin area needs a Postgres database — add DATABASE_URL in Vercel project settings.",
    );
  }

  // Local development: embedded Postgres, no install needed.
  const { PGlite } =
    require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  const { drizzle } =
    require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  const client = new PGlite(".pglite");
  // PGlite's query API matches node-postgres for everything drizzle uses.
  return drizzle(client, { schema }) as unknown as Db;
}
/* eslint-enable @typescript-eslint/no-require-imports */

const globalForDb = globalThis as unknown as { __yuforaDb?: Db };

function lazyDb(): Db {
  let real: Db | null = null;
  return new Proxy({} as Db, {
    get(_target, prop) {
      real ??= createDb();
      const value = real[prop as keyof Db];
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

/** Cached on globalThis so Next.js dev-mode HMR doesn't open multiple PGlite handles. */
export const db: Db = (globalForDb.__yuforaDb ??= lazyDb());

export { schema };
