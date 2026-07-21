import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsItems, newsSources } from "@/lib/db/schema";
import { safeFetchText } from "./fetch";
import { normalizeLink, parseFeed } from "./parse";
import { sanitizeExcerptHtml } from "./sanitize";

export type IngestResult = {
  ok: boolean;
  fetched: number;
  inserted: number;
  error?: string;
};

/**
 * Pull one source's feed, parse, sanitize, and insert NEW items as pending.
 * Idempotent: the (source_id, external_id) unique index dedupes on re-fetch,
 * and the editorial overlay columns are never touched here. Updates source
 * health for the manager. Never throws — errors are recorded on the source.
 */
export async function ingestOneSource(sourceId: string): Promise<IngestResult> {
  const rows = await db
    .select()
    .from(newsSources)
    .where(eq(newsSources.id, sourceId))
    .limit(1);
  const source = rows[0];
  if (!source) return { ok: false, fetched: 0, inserted: 0, error: "Source not found" };

  const res = await safeFetchText(source.url);
  if (!res.ok) {
    await db
      .update(newsSources)
      .set({
        lastFetchedAt: new Date(),
        lastStatus: "error",
        lastError: res.error,
      })
      .where(eq(newsSources.id, sourceId));
    return { ok: false, fetched: 0, inserted: 0, error: res.error };
  }

  let inserted = 0;
  let fetched = 0;
  try {
    const feed = await parseFeed(res.text);
    fetched = feed.items.length;

    for (const item of feed.items) {
      const link = normalizeLink(item.link);
      const done = await db
        .insert(newsItems)
        .values({
          sourceId,
          kind: source.type === "youtube" ? "youtube" : "article",
          externalId: item.externalId,
          title: item.title.slice(0, 300),
          excerpt: sanitizeExcerptHtml(item.rawHtml),
          rawExcerpt: item.rawHtml.slice(0, 20000),
          link,
          imageUrl: item.imageUrl,
          embedUrl:
            source.type === "youtube" ? youtubeEmbed(item.link) : null,
          author: item.author ?? source.title,
          publishedAt: item.publishedAt,
          status: "pending",
        })
        .onConflictDoNothing({
          target: [newsItems.sourceId, newsItems.externalId],
        })
        .returning({ id: newsItems.id });
      if (done.length > 0) inserted++;
    }

    await db
      .update(newsSources)
      .set({ lastFetchedAt: new Date(), lastStatus: "ok", lastError: null })
      .where(eq(newsSources.id, sourceId));

    return { ok: true, fetched, inserted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(newsSources)
      .set({ lastFetchedAt: new Date(), lastStatus: "error", lastError: msg })
      .where(eq(newsSources.id, sourceId));
    return { ok: false, fetched, inserted, error: msg };
  }
}

/** youtube-nocookie embed for a watch URL from the Atom feed. */
function youtubeEmbed(watchUrl: string): string | null {
  try {
    const u = new URL(watchUrl);
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{5,20}$/.test(v)) {
      return `https://www.youtube-nocookie.com/embed/${v}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}
