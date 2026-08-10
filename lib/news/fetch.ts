import "server-only";

/**
 * Guarded fetch for admin-supplied feed/oEmbed/article URLs.
 *
 * Phase 2 guards: https/http only, reject obvious private/loopback/metadata
 * hosts, no redirect following, 8s timeout, response-size cap, no credentials.
 * These stop the easy SSRF cases. The full DNS-rebinding defense (pin the
 * socket to the validated IP via request-filtering-agent) lands in Phase 3;
 * until then treat these URLs as semi-trusted (they're admin-entered).
 */

const MAX_BYTES = 3 * 1024 * 1024; // 3MB
const TIMEOUT_MS = 8000;

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  ) {
    return true;
  }
  // IPv4 literal ranges: loopback, private, link-local (incl. cloud metadata).
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local + 169.254.169.254
  }
  // IPv6 unique-local / link-local.
  if (/^f[cd][0-9a-f]{2}:/i.test(h) || /^fe80:/i.test(h)) return true;
  return false;
}

export type FetchResult =
  | { ok: true; status: number; text: string; contentType: string | null }
  | { ok: false; status: number; error: string };

export async function safeFetchText(
  url: string,
  accept?: string,
): Promise<FetchResult> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, status: 0, error: "Invalid URL" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { ok: false, status: 0, error: "Only http(s) URLs are allowed" };
  }
  if (isPrivateHost(u.hostname)) {
    return { ok: false, status: 0, error: "That host isn't allowed" };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(u, {
      signal: ctrl.signal,
      redirect: "error", // no redirect-based SSRF; Phase 3 validates per hop
      credentials: "omit",
      headers: {
        "User-Agent": "YuforaNewsroom/1.0 (+https://yufora.com)",
        Accept:
          accept ??
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });

    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }

    // Size-capped read (guards decompression/large-body abuse).
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return sizeChecked(text, res.status, res.headers.get("content-type"));
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          return { ok: false, status: res.status, error: "Response too large" };
        }
        chunks.push(value);
      }
    }
    const text = new TextDecoder().decode(concat(chunks, total));
    return { ok: true, status: res.status, text, contentType: res.headers.get("content-type") };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, error: /abort/i.test(msg) ? "Timed out" : msg };
  } finally {
    clearTimeout(timer);
  }
}

function sizeChecked(
  text: string,
  status: number,
  contentType: string | null,
): FetchResult {
  if (text.length > MAX_BYTES) {
    return { ok: false, status, error: "Response too large" };
  }
  return { ok: true, status, text, contentType };
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
