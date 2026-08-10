export type ParsedVideo = {
  provider: "youtube" | "vimeo";
  /** Privacy-friendly embed URL (youtube-nocookie / player.vimeo with dnt). */
  embedUrl: string;
};

/**
 * v1 video is link-based: charities paste a YouTube or Vimeo URL.
 * Returns null for anything else — which doubles as validation.
 */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "");
  const idOk = (s: string) => /^[\w-]{5,20}$/.test(s);

  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = url.searchParams.get("v");
    if (v && idOk(v)) return yt(v);
    const shorts = url.pathname.match(/^\/shorts\/([\w-]{5,20})/);
    if (shorts) return yt(shorts[1]);
    const embed = url.pathname.match(/^\/embed\/([\w-]{5,20})/);
    if (embed) return yt(embed[1]);
    return null;
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return idOk(id) ? yt(id) : null;
  }
  if (host === "vimeo.com") {
    const m = url.pathname.match(/^\/(\d{6,12})(?:$|\/)/);
    return m
      ? {
          provider: "vimeo",
          embedUrl: `https://player.vimeo.com/video/${m[1]}?dnt=1`,
        }
      : null;
  }
  return null;
}

function yt(id: string): ParsedVideo {
  return {
    provider: "youtube",
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
  };
}
