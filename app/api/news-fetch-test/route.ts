// TEMPORARY preview-only harness: exercises the REAL fetch→parse→sanitize→
// dedupe ingest pipeline against a live feed on Vercel (this box has no
// outbound network). Removed after verification.
import { NextRequest } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsItems, newsSources } from "@/lib/db/schema";
import { ingestOneSource } from "@/lib/news/ingest";

const TEST_TITLE = "__fetch_test__";

export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }

  // Always start clean (cascade removes the test source's items).
  await db.delete(newsSources).where(eq(newsSources.title, TEST_TITLE));

  if (req.nextUrl.searchParams.get("cleanup") === "1") {
    return Response.json({ cleaned: true });
  }

  const feed =
    req.nextUrl.searchParams.get("feed") ?? "https://feeds.npr.org/1001/rss.xml";

  const [src] = await db
    .insert(newsSources)
    .values({ type: "rss", url: feed, title: TEST_TITLE })
    .returning();

  const result = await ingestOneSource(src.id);

  const items = await db
    .select({
      title: newsItems.title,
      excerpt: newsItems.excerpt,
      link: newsItems.link,
    })
    .from(newsItems)
    .where(eq(newsItems.sourceId, src.id))
    .limit(3);

  const unsafe = /<script|onerror=|onload=|javascript:/i;
  const sample = items.map((i) => ({
    title: i.title.slice(0, 70),
    excerptLen: i.excerpt.length,
    excerptSafe: !unsafe.test(i.excerpt),
    linkHttps: i.link.startsWith("https://"),
  }));

  // SSRF guard proof: private-host feed must be refused.
  const [ssrfSrc] = await db
    .insert(newsSources)
    .values({
      type: "rss",
      url: "http://169.254.169.254/latest/meta-data/",
      title: TEST_TITLE,
    })
    .returning();
  const ssrf = await ingestOneSource(ssrfSrc.id);

  const anyUnsafe = sample.some((s) => !s.excerptSafe);

  // Leave the good test source in place so the queue is visible; drop the
  // SSRF probe source.
  await db
    .delete(newsSources)
    .where(and(eq(newsSources.id, ssrfSrc.id), isNotNull(newsSources.id)));

  return Response.json({
    ingest: result,
    sample,
    anyUnsafe,
    ssrfBlocked: !ssrf.ok && /allowed|host/i.test(ssrf.error ?? ""),
    ssrfError: ssrf.error,
  });
}
