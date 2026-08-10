import "server-only";
import { parseVideoUrl } from "@/lib/video";
import { safeFetchText } from "./fetch";
import { normalizeLink } from "./parse";

export type ResolvedLink = {
  kind: "article" | "youtube" | "instagram";
  title: string;
  link: string;
  externalId: string;
  author: string | null;
  imageUrl: string | null;
  /** Safe youtube-nocookie embed URL, when the link is a video. */
  embedUrl: string | null;
};

/**
 * Resolves a pasted URL into a draft news item.
 * - YouTube → our OWN safe youtube-nocookie embed (via parseVideoUrl); we
 *   never render provider-supplied iframe HTML.
 * - Instagram → link-out card with best-effort metadata (no embed script).
 * - Anything else → article card, enriched from Open Graph tags.
 *
 * The editor fills in / edits the title + excerpt afterwards; this only
 * seeds sensible defaults. Never throws — returns a minimal item on failure.
 */
export async function resolveLink(rawUrl: string): Promise<ResolvedLink | null> {
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;

  const link = normalizeLink(u.toString());
  const host = u.hostname.replace(/^www\./, "");

  // YouTube — reuse the vetted parser; build our own embed.
  const video = parseVideoUrl(u.toString());
  if (video?.provider === "youtube") {
    const meta = await fetchOEmbed(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(u.toString())}&format=json`,
    );
    return {
      kind: "youtube",
      title: meta?.title ?? "YouTube video",
      link,
      externalId: link,
      author: meta?.author_name ?? "YouTube",
      imageUrl: meta?.thumbnail_url ?? null,
      embedUrl: video.embedUrl,
    };
  }

  // Instagram — link-out only (no embed script injection). Best-effort title.
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return {
      kind: "instagram",
      title: "Instagram post",
      link,
      externalId: link,
      author: instagramHandle(u) ?? "Instagram",
      imageUrl: null,
      embedUrl: null,
    };
  }

  // Generic article — enrich from Open Graph.
  const og = await fetchOpenGraph(u.toString());
  return {
    kind: "article",
    title: og.title ?? u.hostname,
    link,
    externalId: link,
    author: og.siteName ?? host,
    imageUrl: og.image ?? null,
    embedUrl: null,
  };
}

/**
 * Resolves common YouTube inputs to the channel's Atom feed URL
 * (…/feeds/videos.xml?channel_id=UC…). Accepts a direct feed URL, a raw
 * channel id, a /channel/UC… URL, or a @handle/custom URL (fetched to
 * extract the channel id). Returns null if it can't resolve — the editor
 * then pastes the feed URL directly.
 */
export async function resolveYoutubeFeed(input: string): Promise<string | null> {
  const raw = input.trim();
  if (/feeds\/videos\.xml\?channel_id=UC[\w-]{20,}/.test(raw)) return raw;

  const idOnly = raw.match(/^(UC[\w-]{20,})$/)?.[1];
  if (idOnly) return feedFor(idOnly);

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/.test(u.hostname)) return null;

  const chan = u.pathname.match(/\/channel\/(UC[\w-]{20,})/)?.[1];
  if (chan) return feedFor(chan);

  // @handle or /c/name or /user/name → fetch the page, extract the channel id.
  const res = await safeFetchText(u.toString(), "text/html");
  if (!res.ok) return null;
  const found =
    res.text.match(/"channelId":"(UC[\w-]{20,})"/)?.[1] ??
    res.text.match(/itemprop="channelId"\s+content="(UC[\w-]{20,})"/)?.[1] ??
    res.text.match(/\/channel\/(UC[\w-]{20,})/)?.[1];
  return found ? feedFor(found) : null;
}

function feedFor(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

function instagramHandle(u: URL): string | null {
  const seg = u.pathname.split("/").filter(Boolean);
  // /{handle}/... but not the reserved /p/ /reel/ /tv/
  if (seg.length && !["p", "reel", "reels", "tv", "explore"].includes(seg[0])) {
    return "@" + seg[0];
  }
  return null;
}

type OEmbed = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

async function fetchOEmbed(endpoint: string): Promise<OEmbed | null> {
  const res = await safeFetchText(endpoint, "application/json");
  if (!res.ok) return null;
  try {
    return JSON.parse(res.text) as OEmbed;
  } catch {
    return null;
  }
}

async function fetchOpenGraph(
  url: string,
): Promise<{ title: string | null; image: string | null; siteName: string | null }> {
  const res = await safeFetchText(url, "text/html,application/xhtml+xml");
  if (!res.ok) return { title: null, image: null, siteName: null };
  const html = res.text.slice(0, 200_000); // only the head matters
  return {
    title: metaContent(html, "og:title") ?? titleTag(html),
    image: safeImage(metaContent(html, "og:image")),
    siteName: metaContent(html, "og:site_name"),
  };
}

function metaContent(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const c = tag.match(/content=["']([^"']*)["']/i)?.[1];
  return c ? decodeEntities(c.trim()) : null;
}

function titleTag(html: string): string | null {
  const t = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  return t ? decodeEntities(t.trim()) : null;
}

function safeImage(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
