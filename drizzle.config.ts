import { defineConfig } from "drizzle-kit";

/**
 * `npm run db:push` syncs the schema:
 * - with DATABASE_URL set → against that Postgres (Neon in production)
 * - without               → against the local PGlite dir (stop `next dev`
 *                           first; PGlite is single-process)
 */
export default process.env.DATABASE_URL
  ? defineConfig({
      dialect: "postgresql",
      schema: "./lib/db/schema.ts",
      out: "./drizzle",
      dbCredentials: { url: process.env.DATABASE_URL },
    })
  : defineConfig({
      dialect: "postgresql",
      driver: "pglite",
      schema: "./lib/db/schema.ts",
      out: "./drizzle",
      dbCredentials: { url: "./.pglite" },
    });
