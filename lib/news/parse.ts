import "server-only";
import Parser from "rss-parser";

export type ParsedItem = {
  externalId: string;
  title: string;
  link: string;
  rawHtml: string; // unsanitized content, sanitized later
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date | null;
};

export type ParsedFeed = { title: string | null; items: ParsedItem[] };

type Item = {
  guid?: string;
  id?: string;
  title?: string;
  link?: string;
  creator?: string;
  author?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  enclosure?: { url?: string; type?: string };
  mediaThumbnail?: { $?: { url?: string } };
};

const parser: Parser<{ title?: string }, Item> = new Parser({
  timeout: 8000,
  customFields: {
    item: [["media:thumbnail", "mediaThumbnail"]],
  },
});

/** Parse RSS/Atom (incl. YouTube's Atom feed) from an XML string. No network. */
export async function parseFeed(xml: string): Promise<ParsedFeed> {
  const feed = await parser.parseString(xml);
  const items: ParsedItem[] = (feed.items ?? [])
    .map((it): ParsedItem | null => {
      const link = (it.link ?? "").trim();
      const title = (it.title ?? "").trim();
      if (!link || !title) return null;
      const externalId = (it.guid || it.id || link).trim();
      return {
        externalId,
        title,
        link,
        rawHtml: it.content || it.summary || it.contentSnippet || "",
        imageUrl:
          it.mediaThumbnail?.$?.url ??
          (it.enclosure?.type?.startsWith("image/") ? it.enclosure.url ?? null : null),
        author: it.creator || it.author || feed.title || null,
        publishedAt: it.isoDate ? new Date(it.isoDate) : null,
      };
    })
    .filter((x): x is ParsedItem => x !== null);

  return { title: feed.title ?? null, items };
}

/** Normalize a link for dedup/identity: drop tracking params, trailing slash. */
export function normalizeLink(raw: string): string {
  try {
    const u = new URL(raw);
    for (const p of [...u.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$|^mc_/i.test(p)) u.searchParams.delete(p);
    }
    u.hash = "";
    let s = u.toString();
    s = s.replace(/\/$/, "");
    return s;
  } catch {
    return raw.trim();
  }
}
