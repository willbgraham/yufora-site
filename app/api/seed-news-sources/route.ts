// TEMPORARY preview-only route to seed verified newsroom sources and ingest
// them once, so the staging review queue has real content. Removed after use.
import { sql, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsItems, newsSources } from "@/lib/db/schema";
import { ingestOneSource } from "@/lib/news/ingest";

type Seed = { type: "rss" | "youtube"; url: string; title: string };

const SOURCES: Seed[] = [
  { type: "rss", url: "https://nonprofitquarterly.org/feed/", title: "Nonprofit Quarterly" },
  { type: "rss", url: "https://insidecharity.org/feed/", title: "Inside Charity" },
  { type: "rss", url: "https://philanthropywomen.org/feed/", title: "Philanthropy Women" },
  { type: "rss", url: "https://ssir.org/site/rss_2.0", title: "Stanford Social Innovation Review" },
  { type: "rss", url: "https://thenonprofittimes.com/feed/", title: "The NonProfit Times" },
  {
    type: "youtube",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCavdVHbAHk06wT9zS_aYQRg",
    title: "charity: water",
  },
  {
    type: "youtube",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCId9tO5LYlJKgNQKEzgjYOg",
    title: "Doctors Without Borders (MSF)",
  },
];

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }

  // Belt-and-suspenders: ensure the Phase-2 tables exist on this db branch.
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

  const report: Array<Record<string, unknown>> = [];

  for (const s of SOURCES) {
    // Idempotent by URL.
    let existing = (
      await db.select().from(newsSources).where(eq(newsSources.url, s.url)).limit(1)
    )[0];
    if (!existing) {
      existing = (
        await db
          .insert(newsSources)
          .values({ type: s.type, url: s.url, title: s.title })
          .returning()
      )[0];
    }
    try {
      const result = await ingestOneSource(existing.id);
      report.push({ title: s.title, type: s.type, ...result });
    } catch (err) {
      report.push({
        title: s.title,
        type: s.type,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const pending = await db
    .select({ id: newsItems.id })
    .from(newsItems)
    .where(eq(newsItems.status, "pending"));
  const samples = await db
    .select({ title: newsItems.title, author: newsItems.author, kind: newsItems.kind })
    .from(newsItems)
    .where(eq(newsItems.status, "pending"))
    .orderBy(desc(newsItems.publishedAt))
    .limit(8);

  return Response.json({
    seeded: SOURCES.length,
    report,
    pendingTotal: pending.length,
    samples,
  });
}
